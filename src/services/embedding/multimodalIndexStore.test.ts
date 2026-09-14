import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getStoredEmbeddings,
  saveStoredEmbedding,
  saveBatchStoredEmbeddings,
  removeStoredEmbedding,
  clearAllStoredEmbeddings,
  getStoredEmbeddingCount,
  MULTIMODAL_EMBEDDING_KEY,
} from './multimodalIndexStore';
import * as indexedDbAccessModule from '@/services/db/indexedDbAccess';
import type { MultimodalEmbeddingItem } from './embeddingTypes';

describe('multimodalIndexStore', () => {
  let mockStorage: Record<string, any> = {};

  beforeEach(() => {
    mockStorage = {};
    vi.spyOn(indexedDbAccessModule, 'getKeyValue').mockImplementation(async (key: string) => {
      return mockStorage[key];
    });
    vi.spyOn(indexedDbAccessModule, 'setKeyValue').mockImplementation(async (key: string, val: any) => {
      mockStorage[key] = val;
    });
    vi.spyOn(indexedDbAccessModule, 'deleteKeyValue').mockImplementation(async (key: string) => {
      delete mockStorage[key];
    });
  });

  const sampleItem: MultimodalEmbeddingItem = {
    id: 'file-1',
    name: 'photo.jpg',
    type: 'image/jpeg',
    category: 'image',
    embedding: [0.1, 0.2, 0.3],
    updatedAt: 1700000000,
  };

  it('retrieves empty record when no embeddings stored', async () => {
    const embeddings = await getStoredEmbeddings();
    expect(embeddings).toEqual({});
    expect(await getStoredEmbeddingCount()).toBe(0);
  });

  it('saves and retrieves an embedding item', async () => {
    await saveStoredEmbedding(sampleItem);

    const embeddings = await getStoredEmbeddings();
    expect(embeddings['file-1']).toEqual(sampleItem);
    expect(await getStoredEmbeddingCount()).toBe(1);
  });

  it('saves multiple items in batch', async () => {
    const item2: MultimodalEmbeddingItem = {
      id: 'file-2',
      name: 'doc.pdf',
      type: 'application/pdf',
      category: 'document',
      embedding: [0.4, 0.5, 0.6],
      updatedAt: 1700000010,
    };

    await saveBatchStoredEmbeddings([sampleItem, item2]);

    const embeddings = await getStoredEmbeddings();
    expect(Object.keys(embeddings)).toHaveLength(2);
    expect(embeddings['file-2']).toEqual(item2);
    expect(await getStoredEmbeddingCount()).toBe(2);
  });

  it('removes an embedding item by id', async () => {
    await saveStoredEmbedding(sampleItem);
    await removeStoredEmbedding('file-1');

    const embeddings = await getStoredEmbeddings();
    expect(embeddings['file-1']).toBeUndefined();
    expect(await getStoredEmbeddingCount()).toBe(0);
  });

  it('clears all embeddings', async () => {
    await saveStoredEmbedding(sampleItem);
    await clearAllStoredEmbeddings();

    expect(mockStorage[MULTIMODAL_EMBEDDING_KEY]).toBeUndefined();
    const count = await getStoredEmbeddingCount();
    expect(count).toBe(0);
  });
});

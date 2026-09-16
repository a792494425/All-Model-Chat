import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getStoredEmbedding,
  getStoredEmbeddingIds,
  getStoredEmbeddings,
  saveStoredEmbedding,
  saveBatchStoredEmbeddings,
  removeStoredEmbedding,
  removeStoredEmbeddings,
  clearAllStoredEmbeddings,
  getStoredEmbeddingCount,
  updateStoredEmbeddingName,
  ensureLegacyEmbeddingsMigrated,
  resetLegacyMigrationForTest,
  MULTIMODAL_EMBEDDING_KEY,
} from './multimodalIndexStore';
import * as indexedDbAccessModule from '@/services/db/indexedDbAccess';
import { EMBEDDINGS_STORE } from '@/services/db/dbSchema';
import type { MultimodalEmbeddingItem } from './embeddingTypes';

describe('multimodalIndexStore', () => {
  let mockStore: Record<string, any> = {};
  let mockLegacy: Record<string, any> = {};

  beforeEach(() => {
    mockStore = {};
    mockLegacy = {};
    resetLegacyMigrationForTest();

    vi.spyOn(indexedDbAccessModule, 'getItem').mockImplementation(async (store: string, key: string) => {
      return store === EMBEDDINGS_STORE ? mockStore[key] : mockLegacy[key];
    });
    vi.spyOn(indexedDbAccessModule, 'getAll').mockImplementation(async (store: string) => {
      return store === EMBEDDINGS_STORE ? Object.values(mockStore) : [];
    });
    vi.spyOn(indexedDbAccessModule, 'getAllKeys').mockImplementation(async (store: string) => {
      return store === EMBEDDINGS_STORE ? Object.keys(mockStore) : [];
    });
    vi.spyOn(indexedDbAccessModule, 'countAll').mockImplementation(async (store: string) => {
      return store === EMBEDDINGS_STORE ? Object.keys(mockStore).length : 0;
    });
    vi.spyOn(indexedDbAccessModule, 'putMany').mockImplementation(async (store: string, values: any[]) => {
      if (store !== EMBEDDINGS_STORE) return;
      values.forEach((value) => {
        mockStore[value.id] = value;
      });
    });
    vi.spyOn(indexedDbAccessModule, 'deleteMany').mockImplementation(async (store: string, keys: IDBValidKey[]) => {
      if (store !== EMBEDDINGS_STORE) return;
      keys.forEach((key) => {
        delete mockStore[String(key)];
      });
    });
    vi.spyOn(indexedDbAccessModule, 'clearStore').mockImplementation(async (store: string) => {
      if (store === EMBEDDINGS_STORE) mockStore = {};
    });
    vi.spyOn(indexedDbAccessModule, 'getKeyValue').mockImplementation(async (key: string) => mockLegacy[key]);
    vi.spyOn(indexedDbAccessModule, 'setKeyValue').mockImplementation(async (key: string, val: any) => {
      mockLegacy[key] = val;
    });
    vi.spyOn(indexedDbAccessModule, 'deleteKeyValue').mockImplementation(async (key: string) => {
      delete mockLegacy[key];
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

  const item2: MultimodalEmbeddingItem = {
    id: 'file-2',
    name: 'doc.pdf',
    type: 'application/pdf',
    category: 'document',
    embedding: [0.4, 0.5, 0.6],
    updatedAt: 1700000010,
  };

  it('retrieves empty state when no embeddings stored', async () => {
    expect(await getStoredEmbeddings()).toEqual({});
    expect(await getStoredEmbeddingCount()).toBe(0);
    expect(await getStoredEmbeddingIds()).toEqual(new Set());
  });

  it('saves and retrieves an embedding item', async () => {
    await saveStoredEmbedding(sampleItem);

    expect(await getStoredEmbedding('file-1')).toEqual(sampleItem);
    expect(await getStoredEmbeddingCount()).toBe(1);
  });

  it('reads a single embedding without touching other records', async () => {
    await saveStoredEmbedding(sampleItem);
    await saveBatchStoredEmbeddings([item2]);

    const getItemSpy = vi.spyOn(indexedDbAccessModule, 'getItem');
    const getAllSpy = vi.spyOn(indexedDbAccessModule, 'getAll');
    getItemSpy.mockClear();
    getAllSpy.mockClear();

    await getStoredEmbedding('file-2');

    expect(getItemSpy).toHaveBeenCalledTimes(1);
    // Regression guard for the O(n^2) blowup: resolving one embedding must never
    // materialize the whole index.
    expect(getAllSpy).not.toHaveBeenCalled();
  });

  it('writes a single embedding without rewriting the whole index', async () => {
    await saveBatchStoredEmbeddings([sampleItem, item2]);

    const putManySpy = vi.spyOn(indexedDbAccessModule, 'putMany');
    const getAllSpy = vi.spyOn(indexedDbAccessModule, 'getAll');
    putManySpy.mockClear();
    getAllSpy.mockClear();

    const updated = { ...sampleItem, embedding: [9, 9, 9] };
    await saveStoredEmbedding(updated);

    expect(getAllSpy).not.toHaveBeenCalled();
    expect(putManySpy).toHaveBeenCalledWith(EMBEDDINGS_STORE, [updated]);
    // Sibling records survive the single-record write.
    expect(mockStore['file-2']).toEqual(item2);
  });

  it('counts without materializing the vectors', async () => {
    await saveBatchStoredEmbeddings([sampleItem, item2]);

    const getAllSpy = vi.spyOn(indexedDbAccessModule, 'getAll');
    getAllSpy.mockClear();

    expect(await getStoredEmbeddingCount()).toBe(2);
    expect(getAllSpy).not.toHaveBeenCalled();
  });

  it('lists ids without materializing the vectors', async () => {
    await saveBatchStoredEmbeddings([sampleItem, item2]);

    expect(await getStoredEmbeddingIds()).toEqual(new Set(['file-1', 'file-2']));
  });

  it('saves multiple items in batch', async () => {
    await saveBatchStoredEmbeddings([sampleItem, item2]);

    const embeddings = await getStoredEmbeddings();
    expect(Object.keys(embeddings)).toHaveLength(2);
    expect(embeddings['file-2']).toEqual(item2);
    expect(await getStoredEmbeddingCount()).toBe(2);
  });

  it('removes an embedding item by id', async () => {
    await saveStoredEmbedding(sampleItem);
    await removeStoredEmbedding('file-1');

    expect(await getStoredEmbedding('file-1')).toBeUndefined();
    expect(await getStoredEmbeddingCount()).toBe(0);
  });

  it('removes several embeddings in one transaction', async () => {
    await saveBatchStoredEmbeddings([sampleItem, item2]);
    await removeStoredEmbeddings(['file-1', 'file-2']);

    expect(await getStoredEmbeddingCount()).toBe(0);
  });

  it('clears all embeddings', async () => {
    await saveStoredEmbedding(sampleItem);
    await clearAllStoredEmbeddings();

    expect(await getStoredEmbeddingCount()).toBe(0);
  });

  it('migrates the legacy single-record index once and deletes it', async () => {
    mockLegacy[MULTIMODAL_EMBEDDING_KEY] = { 'file-1': sampleItem };

    await ensureLegacyEmbeddingsMigrated();

    expect(mockStore['file-1']).toEqual(sampleItem);
    expect(mockLegacy[MULTIMODAL_EMBEDDING_KEY]).toBeUndefined();
    expect(await getStoredEmbeddingCount()).toBe(1);
  });

  it('runs the legacy migration at most once', async () => {
    mockLegacy[MULTIMODAL_EMBEDDING_KEY] = { 'file-1': sampleItem };
    const deleteSpy = vi.spyOn(indexedDbAccessModule, 'deleteKeyValue');
    deleteSpy.mockClear();

    await ensureLegacyEmbeddingsMigrated();
    await ensureLegacyEmbeddingsMigrated();
    await getStoredEmbeddingIds();

    expect(deleteSpy).toHaveBeenCalledTimes(1);
  });

  it('updates the name of an existing stored embedding', async () => {
    await saveStoredEmbedding(sampleItem);
    await updateStoredEmbeddingName('file-1', 'renamed_sunset.jpg');

    const updated = await getStoredEmbedding('file-1');
    expect(updated).toBeDefined();
    expect(updated?.name).toBe('renamed_sunset.jpg');
    expect(updated?.category).toBe(sampleItem.category);
    expect(updated?.embedding).toEqual(sampleItem.embedding);
  });
});

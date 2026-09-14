import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  searchMultimodalByText,
  searchMultimodalByImage,
  indexAllHistoricalItems,
} from './multimodalSearchEngine';
import * as geminiServiceModule from './geminiEmbeddingService';
import * as indexStoreModule from './multimodalIndexStore';
import { dbService } from '@/services/db/dbService';
import type { MultimodalEmbeddingItem } from './embeddingTypes';

describe('multimodalSearchEngine', () => {
  const sampleItems: Record<string, MultimodalEmbeddingItem> = {
    'item-1': {
      id: 'item-1',
      name: 'cat_running.png',
      type: 'image/png',
      category: 'image',
      embedding: [0.9, 0.1, 0],
      updatedAt: 1000,
    },
    'item-2': {
      id: 'item-2',
      name: 'dog_barking.png',
      type: 'image/png',
      category: 'image',
      embedding: [0.1, 0.9, 0],
      updatedAt: 1000,
    },
    'item-3': {
      id: 'item-3',
      name: 'financial_report.pdf',
      type: 'application/pdf',
      category: 'document',
      embedding: [0.0, 0.0, 0.9],
      updatedAt: 1000,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(indexStoreModule, 'getStoredEmbeddings').mockResolvedValue(sampleItems);
  });

  describe('searchMultimodalByText', () => {
    it('ranks items by cosine similarity to text query embedding', async () => {
      // Query embedding matches item-1 closest
      vi.spyOn(geminiServiceModule, 'generateQueryEmbedding').mockResolvedValue([0.95, 0.05, 0]);

      const results = await searchMultimodalByText('a playful kitty', { minSimilarity: 0.1 });

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].item.id).toBe('item-1');
      expect(results[0].similarity).toBeGreaterThan(0.8);
    });

    it('filters by category when specified', async () => {
      vi.spyOn(geminiServiceModule, 'generateQueryEmbedding').mockResolvedValue([0.1, 0.1, 0.8]);

      const results = await searchMultimodalByText('document report', {
        category: 'document',
        minSimilarity: 0.1,
      });

      expect(results).toHaveLength(1);
      expect(results[0].item.category).toBe('document');
      expect(results[0].item.id).toBe('item-3');
    });

    it('returns empty array when query is empty', async () => {
      const results = await searchMultimodalByText('   ');
      expect(results).toEqual([]);
    });
  });

  describe('searchMultimodalByImage', () => {
    it('ranks items by similarity to query image embedding', async () => {
      vi.spyOn(geminiServiceModule, 'generateMediaEmbedding').mockResolvedValue([0.1, 0.95, 0]);

      const dummyImage = new Blob(['img'], { type: 'image/png' });
      const results = await searchMultimodalByImage(dummyImage, { minSimilarity: 0.1 });

      expect(results[0].item.id).toBe('item-2');
      expect(results[0].similarity).toBeGreaterThan(0.8);
    });
  });

  describe('indexAllHistoricalItems', () => {
    it('indexes unindexed items and reports progress', async () => {
      vi.spyOn(indexStoreModule, 'getStoredEmbeddings').mockResolvedValue({
        'item-1': sampleItems['item-1'],
      });

      const mockLibraryItem = {
        id: 'new-photo',
        name: 'beach.jpg',
        type: 'image/jpeg',
      } as any;

      vi.spyOn(dbService, 'getStandaloneLibraryFiles').mockResolvedValue([mockLibraryItem]);
      vi.spyOn(dbService, 'getAllHistoricalSessionFiles').mockResolvedValue([]);
      vi.spyOn(dbService, 'getDeletedLibraryFileIds').mockResolvedValue([]);
      vi.spyOn(dbService, 'fetchLibraryFileBlob').mockResolvedValue(new Blob(['data'], { type: 'image/jpeg' }));
      vi.spyOn(geminiServiceModule, 'generateMediaEmbedding').mockResolvedValue([0.5, 0.5, 0]);
      const saveSpy = vi.spyOn(indexStoreModule, 'saveStoredEmbedding').mockResolvedValue();

      const progressUpdates: any[] = [];
      const result = await indexAllHistoricalItems((p) => progressUpdates.push(p));

      expect(result.indexed).toBe(1);
      expect(result.skipped).toBe(0);
      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'new-photo',
          name: 'beach.jpg',
          category: 'image',
        }),
      );
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1].phase).toBe('completed');
    });
  });
});

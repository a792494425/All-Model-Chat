import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMultimodalSearchStore } from './multimodalSearchStore';
import * as searchEngineModule from '@/services/embedding/multimodalSearchEngine';
import * as indexStoreModule from '@/services/embedding/multimodalIndexStore';

describe('useMultimodalSearchStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMultimodalSearchStore.getState().reset();
  });

  it('initializes with default state', () => {
    const state = useMultimodalSearchStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.searchQuery).toBe('');
    expect(state.searchImage).toBeNull();
    expect(state.categoryFilter).toBe('all');
    expect(state.results).toEqual([]);
    expect(state.isSearching).toBe(false);
    expect(state.isIndexing).toBe(false);
    expect(state.isAutoIndexEnabled).toBe(true);
  });

  it('toggles isAutoIndexEnabled', () => {
    useMultimodalSearchStore.getState().setIsAutoIndexEnabled(false);
    expect(useMultimodalSearchStore.getState().isAutoIndexEnabled).toBe(false);

    useMultimodalSearchStore.getState().setIsAutoIndexEnabled(true);
    expect(useMultimodalSearchStore.getState().isAutoIndexEnabled).toBe(true);
  });

  it('opens and closes modal', () => {
    useMultimodalSearchStore.getState().openModal('initial query');
    expect(useMultimodalSearchStore.getState().isOpen).toBe(true);
    expect(useMultimodalSearchStore.getState().searchQuery).toBe('initial query');

    useMultimodalSearchStore.getState().closeModal();
    expect(useMultimodalSearchStore.getState().isOpen).toBe(false);
  });

  it('sets search image and clears it', () => {
    const dummyBlob = new Blob(['data'], { type: 'image/png' });
    useMultimodalSearchStore.getState().setSearchImage(dummyBlob, 'blob:mock-url');

    expect(useMultimodalSearchStore.getState().searchImage).toBe(dummyBlob);
    expect(useMultimodalSearchStore.getState().searchImagePreviewUrl).toBe('blob:mock-url');

    useMultimodalSearchStore.getState().clearSearchImage();
    expect(useMultimodalSearchStore.getState().searchImage).toBeNull();
    expect(useMultimodalSearchStore.getState().searchImagePreviewUrl).toBeNull();
  });

  it('executes text search and updates results', async () => {
    const mockResults = [
      {
        item: {
          id: 'test-1',
          name: 'sunset.png',
          type: 'image/png',
          category: 'image' as const,
          embedding: [0.1],
          updatedAt: 1000,
        },
        similarity: 0.88,
      },
    ];

    vi.spyOn(searchEngineModule, 'searchMultimodalByText').mockResolvedValue(mockResults);

    useMultimodalSearchStore.getState().setSearchQuery('sunset');
    await useMultimodalSearchStore.getState().executeSearch();

    expect(searchEngineModule.searchMultimodalByText).toHaveBeenCalledWith('sunset', {
      category: 'all',
    });
    expect(useMultimodalSearchStore.getState().results).toEqual(mockResults);
    expect(useMultimodalSearchStore.getState().isSearching).toBe(false);
  });

  it('executes image search when searchImage is set', async () => {
    const dummyBlob = new Blob(['img'], { type: 'image/png' });
    const mockResults = [
      {
        item: {
          id: 'img-res',
          name: 'similar.png',
          type: 'image/png',
          category: 'image' as const,
          embedding: [0.2],
          updatedAt: 1000,
        },
        similarity: 0.95,
      },
    ];

    vi.spyOn(searchEngineModule, 'searchMultimodalByImage').mockResolvedValue(mockResults);

    useMultimodalSearchStore.getState().setSearchImage(dummyBlob, 'blob:url');
    await useMultimodalSearchStore.getState().executeSearch();

    expect(searchEngineModule.searchMultimodalByImage).toHaveBeenCalledWith(dummyBlob, {
      category: 'all',
    });
    expect(useMultimodalSearchStore.getState().results).toEqual(mockResults);
  });

  it('triggers indexing and updates progress', async () => {
    vi.spyOn(searchEngineModule, 'indexAllHistoricalItems').mockImplementation(async (onProgress) => {
      onProgress?.({
        total: 2,
        current: 1,
        phase: 'indexing',
        currentItemName: 'file1.png',
      });
      onProgress?.({
        total: 2,
        current: 2,
        phase: 'completed',
      });
      return { indexed: 2, skipped: 0, total: 2 };
    });
    vi.spyOn(indexStoreModule, 'getStoredEmbeddingCount').mockResolvedValue(2);

    await useMultimodalSearchStore.getState().triggerIndexing();

    expect(searchEngineModule.indexAllHistoricalItems).toHaveBeenCalled();
    expect(useMultimodalSearchStore.getState().isIndexing).toBe(false);
    expect(useMultimodalSearchStore.getState().indexedCount).toBe(2);
  });
});

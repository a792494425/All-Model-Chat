import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { autoIndexingQueue } from './autoIndexingQueue';
import * as multimodalSearchEngine from './multimodalSearchEngine';
import * as multimodalIndexStore from './multimodalIndexStore';
import { dbService } from '@/services/db/dbService';
import { useMultimodalSearchStore } from '@/stores/multimodalSearchStore';
import * as geminiEmbeddingService from './geminiEmbeddingService';
import type { LibraryItem, SavedChatSession } from '@/types';

vi.mock('./geminiEmbeddingService', () => ({
  hasConfiguredApiKey: vi.fn().mockResolvedValue(true),
}));

vi.mock('./multimodalIndexStore', () => ({
  getStoredEmbedding: vi.fn(),
  // Present so the regression guard below can assert it is never used.
  getStoredEmbeddings: vi.fn(),
  getStoredEmbeddingIds: vi.fn(),
  getStoredEmbeddingCount: vi.fn(),
  removeStoredEmbeddings: vi.fn(),
  saveStoredIndexStats: vi.fn(),
}));

vi.mock('./multimodalSearchEngine', () => ({
  indexSingleItem: vi.fn(),
}));

describe('autoIndexingQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMultimodalSearchStore.setState({ isAutoIndexEnabled: true });
    autoIndexingQueue.resetForTest();
    vi.mocked(geminiEmbeddingService.hasConfiguredApiKey).mockResolvedValue(true);
    vi.mocked(multimodalIndexStore.getStoredEmbedding).mockResolvedValue(undefined);
    vi.mocked(multimodalIndexStore.getStoredEmbeddingIds).mockResolvedValue(new Set());
    vi.mocked(multimodalIndexStore.getStoredEmbeddingCount).mockResolvedValue(0);
    vi.mocked(multimodalIndexStore.removeStoredEmbeddings).mockResolvedValue();
    vi.mocked(multimodalIndexStore.saveStoredIndexStats).mockResolvedValue();
    vi.mocked(multimodalSearchEngine.indexSingleItem).mockResolvedValue({
      status: 'indexed',
      item: {
        id: 'test-item',
        name: 'test.png',
        type: 'image/png',
        category: 'image',
        embedding: [0.1, 0.2],
        updatedAt: Date.now(),
      },
    });
  });

  afterEach(() => {
    autoIndexingQueue.resetForTest();
    vi.useRealTimers();
  });

  it('enqueues unindexed items and processes them', async () => {
    vi.useFakeTimers();

    const item: LibraryItem = {
      id: 'file-1',
      name: 'sunset.jpg',
      type: 'image/jpeg',
      size: 1024,
      timestamp: Date.now(),
      source: 'uploaded',
      isStandalone: true,
    };

    autoIndexingQueue.enqueueItems([item]);
    expect(autoIndexingQueue.getQueueLength()).toBe(1);

    await vi.runAllTimersAsync();

    // The queue deliberately stores a payload-free descriptor, so that a large
    // backlog cannot pin file blobs in memory.
    expect(multimodalSearchEngine.indexSingleItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'file-1', name: 'sunset.jpg', type: 'image/jpeg', size: 1024 }),
    );
    const [entry] = vi.mocked(multimodalSearchEngine.indexSingleItem).mock.calls[0];
    expect(entry).not.toHaveProperty('rawFile');
    expect(entry).not.toHaveProperty('dataUrl');
    expect(autoIndexingQueue.getQueueLength()).toBe(0);
    expect(autoIndexingQueue.isBusy()).toBe(false);
  });

  it('skips items that already have embeddings stored', async () => {
    vi.useFakeTimers();

    vi.mocked(multimodalIndexStore.getStoredEmbedding).mockResolvedValue({
      id: 'file-already-done',
      name: 'done.jpg',
      type: 'image/jpeg',
      category: 'image',
      embedding: [0.1, 0.2],
      updatedAt: Date.now(),
    });

    const item: LibraryItem = {
      id: 'file-already-done',
      name: 'done.jpg',
      type: 'image/jpeg',
      size: 1024,
      timestamp: Date.now(),
      source: 'uploaded',
      isStandalone: true,
    };

    autoIndexingQueue.enqueueItems([item]);
    await vi.runAllTimersAsync();

    expect(multimodalSearchEngine.indexSingleItem).not.toHaveBeenCalled();
    expect(autoIndexingQueue.getQueueLength()).toBe(0);
  });

  it('deduplicates items with identical IDs in the pending queue', async () => {
    vi.useFakeTimers();

    const item: LibraryItem = {
      id: 'file-dup',
      name: 'dup.png',
      type: 'image/png',
      size: 512,
      timestamp: Date.now(),
      source: 'uploaded',
      isStandalone: true,
    };

    autoIndexingQueue.enqueueItems([item, item, { ...item }]);
    expect(autoIndexingQueue.getQueueLength()).toBe(1);

    await vi.runAllTimersAsync();
    expect(multimodalSearchEngine.indexSingleItem).toHaveBeenCalledTimes(1);
  });

  it('extracts and enqueues files from chat sessions', async () => {
    vi.useFakeTimers();

    const session: SavedChatSession = {
      id: 'session-123',
      title: 'Design discussion',
      timestamp: Date.now(),
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Here is the diagram',
          timestamp: new Date(),
          files: [
            {
              id: 'diagram-file-1',
              name: 'architecture.png',
              type: 'image/png',
              size: 2048,
              dataUrl: 'data:image/png;base64,abc',
            },
          ],
        },
      ],
      settings: {} as never,
    };

    autoIndexingQueue.enqueueSession(session);
    expect(autoIndexingQueue.getQueueLength()).toBe(1);

    await vi.runAllTimersAsync();
    expect(multimodalSearchEngine.indexSingleItem).toHaveBeenCalled();
  });

  it('removes items from queue and stored embeddings on delete', async () => {
    const item1: LibraryItem = {
      id: 'del-1',
      name: 'delete1.jpg',
      type: 'image/jpeg',
      size: 100,
      timestamp: Date.now(),
      source: 'uploaded',
      isStandalone: true,
    };
    const item2: LibraryItem = {
      id: 'keep-2',
      name: 'keep2.jpg',
      type: 'image/jpeg',
      size: 100,
      timestamp: Date.now(),
      source: 'uploaded',
      isStandalone: true,
    };

    autoIndexingQueue.enqueueItems([item1, item2]);
    expect(autoIndexingQueue.getQueueLength()).toBe(2);

    await autoIndexingQueue.removeItems(['del-1']);

    expect(autoIndexingQueue.getQueueLength()).toBe(1);
    expect(multimodalIndexStore.removeStoredEmbeddings).toHaveBeenCalledWith(['del-1']);
  });

  it('performs idle catchup scan for unindexed historical items', async () => {
    vi.useFakeTimers();

    const standalone: LibraryItem[] = [
      {
        id: 'catchup-1',
        name: 'unindexed.png',
        type: 'image/png',
        size: 500,
        timestamp: Date.now(),
        source: 'uploaded',
        isStandalone: true,
      },
    ];

    vi.mocked(dbService.getStandaloneLibraryFiles).mockResolvedValue(standalone);
    vi.mocked(dbService.getAllHistoricalSessionFiles).mockResolvedValue([]);
    vi.mocked(dbService.getDeletedLibraryFileIds).mockResolvedValue([]);
    vi.mocked(multimodalIndexStore.getStoredEmbeddingIds).mockResolvedValue(new Set());

    autoIndexingQueue.startIdleCatchup(100);

    await vi.advanceTimersByTimeAsync(150);
    await vi.runAllTimersAsync();

    expect(multimodalSearchEngine.indexSingleItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'catchup-1', name: 'unindexed.png', type: 'image/png', size: 500 }),
    );
  });

  it('retries a transient failure a bounded number of times and drains the queue', async () => {
    vi.useFakeTimers();

    vi.mocked(multimodalSearchEngine.indexSingleItem)
      .mockRejectedValueOnce(new Error('API quota exceeded'))
      .mockResolvedValueOnce({
        status: 'indexed',
        item: {
          id: 'item-2',
          name: 'item2.png',
          type: 'image/png',
          category: 'image',
          embedding: [0.3],
          updatedAt: Date.now(),
        },
      });

    const item1: LibraryItem = {
      id: 'err-1',
      name: 'failing.png',
      type: 'image/png',
      size: 100,
      timestamp: Date.now(),
      source: 'uploaded',
      isStandalone: true,
    };
    const item2: LibraryItem = {
      id: 'ok-2',
      name: 'success.png',
      type: 'image/png',
      size: 200,
      timestamp: Date.now(),
      source: 'uploaded',
      isStandalone: true,
    };

    autoIndexingQueue.enqueueItems([item1, item2]);
    await vi.runAllTimersAsync();

    // item1 rejects once (requeued with backoff), item2 succeeds, then item1 is
    // retried and succeeds: the queue drains instead of losing or spinning on it.
    expect(multimodalSearchEngine.indexSingleItem).toHaveBeenCalledTimes(3);
    expect(autoIndexingQueue.getQueueLength()).toBe(0);
  }, 20000);

  it('stops retrying an item after the attempt cap so a missing API key cannot spin forever', async () => {
    vi.useFakeTimers();

    vi.mocked(multimodalSearchEngine.indexSingleItem).mockRejectedValue(new Error('API key is required'));

    const item: LibraryItem = {
      id: 'always-fails',
      name: 'broken.png',
      type: 'image/png',
      size: 10,
      timestamp: Date.now(),
      source: 'uploaded',
      isStandalone: true,
    };

    autoIndexingQueue.enqueueItems([item]);
    await vi.runAllTimersAsync();

    expect(multimodalSearchEngine.indexSingleItem).toHaveBeenCalledTimes(3);
    expect(autoIndexingQueue.getQueueLength()).toBe(0);
    expect(autoIndexingQueue.isBusy()).toBe(false);
  }, 20000);

  it('does not re-read the whole index for each processed item', async () => {
    vi.useFakeTimers();

    const items: LibraryItem[] = Array.from({ length: 5 }, (_, index) => ({
      id: `bulk-${index}`,
      name: `bulk-${index}.png`,
      type: 'image/png',
      size: 10,
      timestamp: Date.now(),
      source: 'uploaded',
      isStandalone: true,
    }));

    autoIndexingQueue.enqueueItems(items);
    await vi.runAllTimersAsync();

    expect(multimodalSearchEngine.indexSingleItem).toHaveBeenCalledTimes(5);
    // The O(n^2) regression guard: per-item lookups only, never a full load.
    expect(multimodalIndexStore.getStoredEmbedding).toHaveBeenCalledTimes(5);
    expect(multimodalIndexStore.getStoredEmbeddings).not.toHaveBeenCalled();
  }, 20000);

  it('does not enqueue or index items when isAutoIndexEnabled is false', async () => {
    vi.useFakeTimers();
    useMultimodalSearchStore.getState().setIsAutoIndexEnabled(false);

    const item: LibraryItem = {
      id: 'disabled-1',
      name: 'disabled.png',
      type: 'image/png',
      size: 100,
      timestamp: Date.now(),
      source: 'uploaded',
      isStandalone: true,
    };

    autoIndexingQueue.enqueueItems([item]);
    expect(autoIndexingQueue.getQueueLength()).toBe(0);

    await vi.runAllTimersAsync();
    expect(multimodalSearchEngine.indexSingleItem).not.toHaveBeenCalled();
  });

  it('clears pending queue when isAutoIndexEnabled is switched off', async () => {
    vi.useFakeTimers();

    const item1: LibraryItem = {
      id: 'pending-1',
      name: 'p1.png',
      type: 'image/png',
      size: 100,
      timestamp: Date.now(),
      source: 'uploaded',
      isStandalone: true,
    };
    const item2: LibraryItem = {
      id: 'pending-2',
      name: 'p2.png',
      type: 'image/png',
      size: 200,
      timestamp: Date.now(),
      source: 'uploaded',
      isStandalone: true,
    };

    autoIndexingQueue.enqueueItems([item1, item2]);
    expect(autoIndexingQueue.getQueueLength()).toBe(2);

    useMultimodalSearchStore.getState().setIsAutoIndexEnabled(false);
    expect(autoIndexingQueue.getQueueLength()).toBe(0);

    await vi.runAllTimersAsync();
    expect(multimodalSearchEngine.indexSingleItem).not.toHaveBeenCalled();
  });

  it('yields and skips processing when Web Lock is held by another tab', async () => {
    vi.useFakeTimers();

    const mockRequest = vi.fn().mockImplementation(async (_name, _options, callback) => {
      // Simulate lock unavailable ({ ifAvailable: true } returned null)
      return callback(null);
    });

    const originalNavigator = globalThis.navigator;
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        ...originalNavigator,
        locks: { request: mockRequest } as unknown as LockManager,
      },
      configurable: true,
      writable: true,
    });

    try {
      const item: LibraryItem = {
        id: 'locked-tab-item',
        name: 'locked.png',
        type: 'image/png',
        size: 100,
        timestamp: Date.now(),
        source: 'uploaded',
        isStandalone: true,
      };

      autoIndexingQueue.enqueueItems([item]);
      await vi.runAllTimersAsync();

      expect(mockRequest).toHaveBeenCalledWith(
        'amc_auto_indexing_worker',
        { ifAvailable: true },
        expect.any(Function),
      );
      expect(multimodalSearchEngine.indexSingleItem).not.toHaveBeenCalled();
      expect(autoIndexingQueue.getQueueLength()).toBe(1);
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
        writable: true,
      });
    }
  });

  it('does not process items and clears queue when no API key is configured', async () => {
    vi.useFakeTimers();
    vi.mocked(geminiEmbeddingService.hasConfiguredApiKey).mockResolvedValue(false);

    const item: LibraryItem = {
      id: 'no-key-item',
      name: 'file.png',
      type: 'image/png',
      size: 100,
      timestamp: Date.now(),
      source: 'uploaded',
      isStandalone: true,
    };

    autoIndexingQueue.enqueueItems([item]);
    await vi.runAllTimersAsync();

    expect(multimodalSearchEngine.indexSingleItem).not.toHaveBeenCalled();
    expect(autoIndexingQueue.getQueueLength()).toBe(0);
  });
});

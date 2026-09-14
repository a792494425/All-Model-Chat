import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { autoIndexingQueue } from './autoIndexingQueue';
import * as multimodalSearchEngine from './multimodalSearchEngine';
import * as multimodalIndexStore from './multimodalIndexStore';
import { dbService } from '@/services/db/dbService';
import type { LibraryItem, SavedChatSession } from '@/types';

vi.mock('./multimodalIndexStore', () => ({
  getStoredEmbeddings: vi.fn(),
  saveStoredEmbedding: vi.fn(),
  removeStoredEmbedding: vi.fn(),
}));

vi.mock('./multimodalSearchEngine', () => ({
  indexSingleItem: vi.fn(),
}));

describe('autoIndexingQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    autoIndexingQueue.resetForTest();
    vi.mocked(multimodalIndexStore.getStoredEmbeddings).mockResolvedValue({});
    vi.mocked(multimodalIndexStore.removeStoredEmbedding).mockResolvedValue();
    vi.mocked(multimodalSearchEngine.indexSingleItem).mockResolvedValue({
      id: 'test-item',
      name: 'test.png',
      type: 'image/png',
      category: 'image',
      embedding: [0.1, 0.2],
      updatedAt: Date.now(),
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

    expect(multimodalSearchEngine.indexSingleItem).toHaveBeenCalledWith(item);
    expect(autoIndexingQueue.getQueueLength()).toBe(0);
    expect(autoIndexingQueue.isBusy()).toBe(false);
  });

  it('skips items that already have embeddings stored', async () => {
    vi.useFakeTimers();

    vi.mocked(multimodalIndexStore.getStoredEmbeddings).mockResolvedValue({
      'file-already-done': {
        id: 'file-already-done',
        name: 'done.jpg',
        type: 'image/jpeg',
        category: 'image',
        embedding: [0.1, 0.2],
        updatedAt: Date.now(),
      },
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
    expect(multimodalIndexStore.removeStoredEmbedding).toHaveBeenCalledWith('del-1');
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
    vi.mocked(multimodalIndexStore.getStoredEmbeddings).mockResolvedValue({});

    autoIndexingQueue.startIdleCatchup(100);

    await vi.advanceTimersByTimeAsync(150);
    await vi.runAllTimersAsync();

    expect(multimodalSearchEngine.indexSingleItem).toHaveBeenCalledWith(standalone[0]);
  });

  it('gracefully handles indexing errors without crashing the queue', async () => {
    vi.useFakeTimers();

    vi.mocked(multimodalSearchEngine.indexSingleItem)
      .mockRejectedValueOnce(new Error('API quota exceeded'))
      .mockResolvedValueOnce({
        id: 'item-2',
        name: 'item2.png',
        type: 'image/png',
        category: 'image',
        embedding: [0.3],
        updatedAt: Date.now(),
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

    expect(multimodalSearchEngine.indexSingleItem).toHaveBeenCalledTimes(2);
    expect(autoIndexingQueue.getQueueLength()).toBe(0);
  });
});

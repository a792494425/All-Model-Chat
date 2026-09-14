import { dbService } from '@/services/db/dbService';
import { extractLibraryItemsFromSessions } from '@/utils/library/libraryFiles';
import { getStoredEmbeddings, removeStoredEmbedding } from './multimodalIndexStore';
import { indexSingleItem } from './multimodalSearchEngine';
import { useMultimodalSearchStore } from '@/stores/multimodalSearchStore';
import type { LibraryItem, SavedChatSession } from '@/types';

class AutoIndexingQueue {
  private queue: LibraryItem[] = [];
  private enqueuedIds = new Set<string>();
  private isProcessing = false;
  private isCatchupScheduled = false;
  private idleCallbackId: number | null = null;
  private timerId: ReturnType<typeof setTimeout> | null = null;

  /**
   * Enqueues items to be indexed in the background during idle time.
   */
  public enqueueItems(items: LibraryItem[]): void {
    if (!items || items.length === 0) return;

    for (const item of items) {
      if (!item || !item.id || this.enqueuedIds.has(item.id)) continue;
      this.enqueuedIds.add(item.id);
      this.queue.push(item);
    }

    this.scheduleNext();
  }

  /**
   * Extracts files from a session and enqueues them for background indexing.
   */
  public enqueueSession(session: SavedChatSession): void {
    if (!session?.messages) return;
    const items = extractLibraryItemsFromSessions([session]);
    this.enqueueItems(items);
  }

  /**
   * Removes items from the pending queue and deletes their stored embeddings.
   */
  public async removeItems(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    this.queue = this.queue.filter((item) => !idSet.has(item.id));
    for (const id of ids) {
      this.enqueuedIds.delete(id);
      await removeStoredEmbedding(id).catch(() => {});
    }
    void useMultimodalSearchStore.getState().refreshIndexStats();
  }

  /**
   * Starts a non-blocking idle catchup scan after app initialization.
   */
  public startIdleCatchup(delayMs = 3000): void {
    if (this.isCatchupScheduled) return;
    this.isCatchupScheduled = true;

    setTimeout(() => {
      void this.runCatchupScan();
    }, delayMs);
  }

  private async runCatchupScan(): Promise<void> {
    try {
      const [standalone, historical, deletedIds, stored] = await Promise.all([
        dbService.getStandaloneLibraryFiles(),
        dbService.getAllHistoricalSessionFiles(),
        dbService.getDeletedLibraryFileIds(),
        getStoredEmbeddings(),
      ]);

      const deletedSet = new Set(deletedIds);
      const unindexed: LibraryItem[] = [];

      for (const item of standalone) {
        if (!deletedSet.has(item.id) && (!stored[item.id] || !stored[item.id].embedding?.length)) {
          unindexed.push(item);
        }
      }

      for (const item of historical) {
        if (!deletedSet.has(item.id) && (!stored[item.id] || !stored[item.id].embedding?.length)) {
          unindexed.push(item);
        }
      }

      if (unindexed.length > 0) {
        this.enqueueItems(unindexed);
      }
    } catch {
      // Gracefully ignore scan errors
    }
  }

  private scheduleNext(): void {
    if (this.isProcessing || this.queue.length === 0) return;

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      if (this.idleCallbackId !== null) return;
      this.idleCallbackId = window.requestIdleCallback(
        () => {
          this.idleCallbackId = null;
          void this.processNext();
        },
        { timeout: 1500 },
      );
    } else {
      if (this.timerId !== null) return;
      this.timerId = setTimeout(() => {
        this.timerId = null;
        void this.processNext();
      }, 300);
    }
  }

  private async processNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const item = this.queue.shift();

    if (item) {
      try {
        const stored = await getStoredEmbeddings();
        if (!stored[item.id] || !stored[item.id].embedding?.length) {
          await indexSingleItem(item);
          void useMultimodalSearchStore.getState().refreshIndexStats();
        }
      } catch {
        // Failed to index single item (e.g. no API key configured or network error)
        // Silently skip without crashing
      } finally {
        this.enqueuedIds.delete(item.id);
      }
    }

    this.isProcessing = false;

    if (this.queue.length > 0) {
      this.scheduleNext();
    }
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public isBusy(): boolean {
    return this.isProcessing || this.queue.length > 0;
  }

  public resetForTest(): void {
    this.queue = [];
    this.enqueuedIds.clear();
    this.isProcessing = false;
    this.isCatchupScheduled = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (typeof window !== 'undefined' && 'cancelIdleCallback' in window && this.idleCallbackId !== null) {
      window.cancelIdleCallback(this.idleCallbackId);
      this.idleCallbackId = null;
    }
  }
}

export const autoIndexingQueue = new AutoIndexingQueue();

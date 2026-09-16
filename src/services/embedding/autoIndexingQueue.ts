import { dbService } from '@/services/db/dbService';
import { extractLibraryItemsFromSessions } from '@/utils/library/libraryFiles';
import {
  getStoredEmbedding,
  getStoredEmbeddingCount,
  getStoredEmbeddingIds,
  removeStoredEmbeddings,
  saveStoredIndexStats,
} from './multimodalIndexStore';
import { indexSingleItem } from './multimodalSearchEngine';
import { hasConfiguredApiKey } from './geminiEmbeddingService';
import { useMultimodalSearchStore } from '@/stores/multimodalSearchStore';
import type { IndexableLibraryItem } from './embeddingTypes';
import type { LibraryItem, SavedChatSession } from '@/types';

/** Name of the Web Lock used to coordinate background indexing across browser tabs. */
const AUTO_INDEXING_LOCK_NAME = 'amc_auto_indexing_worker';

/**
 * Items that fail repeatedly (no API key, permanent network/auth errors) must not
 * be retried forever: every retry costs a payload read and an API call. After
 * this many consecutive failures an item is parked until the queue is reset
 * (settings change, manual reindex) or the page is reloaded.
 */
const MAX_CONSECUTIVE_ATTEMPTS = 3;

/** Delay applied after a failed item before the next item is attempted. */
const FAILURE_BACKOFF_MS = 2000;

/** Emit an index-stats refresh at most this often during a long run. */
const STATS_REFRESH_INTERVAL_MS = 1500;

type QueueEntry = IndexableLibraryItem & { attempts: number };

/**
 * Strips the heavy payload from a library item. The queue only ever holds these
 * descriptors, so a large backlog cannot pin entire file libraries in memory.
 */
const toQueueEntry = (item: LibraryItem): QueueEntry => ({
  id: item.id,
  name: item.name,
  type: item.type,
  size: item.size,
  timestamp: item.timestamp,
  sessionId: item.sessionId,
  sessionTitle: item.sessionTitle,
  messageId: item.messageId,
  isStandalone: item.isStandalone,
  attempts: 0,
});

class AutoIndexingQueue {
  private queue: QueueEntry[] = [];
  private enqueuedIds = new Set<string>();
  private isProcessing = false;
  private isCatchupScheduled = false;
  private idleCallbackId: number | null = null;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private backoffUntil = 0;
  private lastStatsRefreshAt = 0;
  private indexedSinceStatsRefresh = 0;

  /**
   * Checks if auto-indexing is currently enabled in settings.
   */
  public isAutoIndexEnabled(): boolean {
    return useMultimodalSearchStore.getState().isAutoIndexEnabled;
  }

  /**
   * Clears the pending queue and cancels any pending idle/timer callbacks.
   */
  public clear(): void {
    this.queue = [];
    this.enqueuedIds.clear();
    this.isProcessing = false;
    this.isCatchupScheduled = false;
    this.backoffUntil = 0;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (typeof window !== 'undefined' && 'cancelIdleCallback' in window && this.idleCallbackId !== null) {
      window.cancelIdleCallback(this.idleCallbackId);
      this.idleCallbackId = null;
    }
  }

  /**
   * Enqueues items to be indexed in the background during idle time.
   *
   * Only lightweight descriptors are retained; callers may pass full library
   * items and their payloads are dropped here.
   */
  public enqueueItems(items: LibraryItem[] | IndexableLibraryItem[]): void {
    if (!this.isAutoIndexEnabled()) return;
    if (!items || items.length === 0) return;

    let added = false;
    for (const item of items) {
      if (!item || !item.id || this.enqueuedIds.has(item.id)) continue;
      this.enqueuedIds.add(item.id);
      this.queue.push({ ...toQueueEntry(item as LibraryItem), attempts: 0 });
      added = true;
    }

    if (added) {
      this.scheduleNext();
    }
  }

  /**
   * Extracts files from a session and enqueues them for background indexing.
   */
  public enqueueSession(session: SavedChatSession): void {
    if (!this.isAutoIndexEnabled()) return;
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
    }
    await removeStoredEmbeddings(ids).catch(() => {});
    void useMultimodalSearchStore.getState().refreshIndexStats();
  }

  /**
   * Starts a non-blocking idle catchup scan after app initialization.
   */
  public startIdleCatchup(delayMs = 3000): void {
    if (!this.isAutoIndexEnabled()) return;
    if (this.isCatchupScheduled) return;
    this.isCatchupScheduled = true;

    setTimeout(async () => {
      if (!this.isAutoIndexEnabled()) {
        this.isCatchupScheduled = false;
        return;
      }
      const hasKey = await hasConfiguredApiKey().catch(() => false);
      if (!hasKey) {
        this.isCatchupScheduled = false;
        return;
      }
      void this.runCatchupScan();
    }, delayMs);
  }

  private async runCatchupScan(): Promise<void> {
    try {
      const [standalone, historical, deletedIds, storedIds] = await Promise.all([
        dbService.getStandaloneLibraryFiles(),
        dbService.getAllHistoricalSessionFiles(),
        dbService.getDeletedLibraryFileIds(),
        // Reads primary keys only; the vectors are never materialized here.
        getStoredEmbeddingIds(),
      ]);

      const deletedSet = new Set(deletedIds);
      const seen = new Set<string>();
      const unindexed: IndexableLibraryItem[] = [];

      const collect = (item: LibraryItem) => {
        if (!item?.id || deletedSet.has(item.id) || seen.has(item.id)) return;
        seen.add(item.id);
        if (!storedIds.has(item.id)) {
          unindexed.push(toQueueEntry(item));
        }
      };

      for (const item of standalone) collect(item);
      for (const item of historical) collect(item);

      if (unindexed.length > 0) {
        this.enqueueItems(unindexed);
      }
    } catch {
      // Gracefully ignore scan errors
    }
  }

  private scheduleNext(): void {
    if (this.isProcessing || this.queue.length === 0) return;

    const delay = Math.max(0, this.backoffUntil - Date.now());
    if (delay > 0) {
      if (this.timerId !== null) return;
      this.timerId = setTimeout(() => {
        this.timerId = null;
        this.scheduleNext();
      }, delay);
      return;
    }

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
    if (!this.isAutoIndexEnabled()) {
      this.clear();
      return;
    }

    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    const hasKey = await hasConfiguredApiKey().catch(() => false);
    if (!hasKey) {
      this.clear();
      return;
    }

    this.isProcessing = true;

    const hasLocks =
      typeof navigator !== 'undefined' && 'locks' in navigator && typeof navigator.locks?.request === 'function';

    if (hasLocks) {
      await navigator.locks.request(AUTO_INDEXING_LOCK_NAME, { ifAvailable: true }, async (lock) => {
        if (!lock) {
          // Another browser tab is currently holding the indexing lock.
          // Release processing flag and yield so tabs do not compete.
          this.isProcessing = false;
          return;
        }
        await this.executeProcessingCycle();
      });
    } else {
      await this.executeProcessingCycle();
    }
  }

  private async executeProcessingCycle(): Promise<void> {
    const entry = this.queue.shift();

    if (entry) {
      let requeued = false;

      try {
        // Single-record lookup: never loads the rest of the index.
        const stored = await getStoredEmbedding(entry.id);
        if (!stored || !stored.embedding?.length) {
          const result = await indexSingleItem(entry);
          if (result.status === 'indexed') {
            this.indexedSinceStatsRefresh++;
          }
          // Both outcomes are terminal for this item, including permanent skips
          // such as oversized files, which must not be retried.
        }
      } catch {
        // Transient failure (no API key configured, network error, ...). Retry a
        // bounded number of times with a backoff instead of hammering the API.
        if (entry.attempts + 1 < MAX_CONSECUTIVE_ATTEMPTS) {
          entry.attempts++;
          this.queue.push(entry);
          this.backoffUntil = Date.now() + FAILURE_BACKOFF_MS;
          requeued = true;
        }
      }

      if (!requeued) {
        // The item left the queue: release its id so the dedupe set cannot grow
        // forever. Retried items keep theirs because they are still pending.
        this.enqueuedIds.delete(entry.id);
      }

      this.refreshStatsIfDue();
    }

    this.isProcessing = false;

    if (this.queue.length > 0) {
      this.scheduleNext();
    }
  }

  /**
   * Refreshes the persisted index statistics at most once per interval, instead
   * of re-reading the whole index after every single item.
   */
  private refreshStatsIfDue(): void {
    const now = Date.now();
    const isRunFinishing = this.queue.length === 0;

    if (!isRunFinishing && this.indexedSinceStatsRefresh === 0) return;
    if (!isRunFinishing && now - this.lastStatsRefreshAt < STATS_REFRESH_INTERVAL_MS) return;

    this.lastStatsRefreshAt = now;
    this.indexedSinceStatsRefresh = 0;

    void getStoredEmbeddingCount()
      .then((count) => {
        saveStoredIndexStats({ indexedCount: count, updatedAt: Date.now() });
        useMultimodalSearchStore.setState({ indexedCount: count });
      })
      .catch(() => {
        // Statistics are advisory only.
      });
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public isBusy(): boolean {
    return this.isProcessing || this.queue.length > 0;
  }

  public resetForTest(): void {
    this.clear();
    this.lastStatsRefreshAt = 0;
    this.indexedSinceStatsRefresh = 0;
  }
}

export const autoIndexingQueue = new AutoIndexingQueue();

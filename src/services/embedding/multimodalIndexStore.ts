import {
  clearStore,
  countAll,
  deleteKeyValue,
  deleteMany,
  getAll,
  getAllKeys,
  getItem,
  getKeyValue,
  putMany,
  setKeyValue,
} from '@/services/db/indexedDbAccess';
import { EMBEDDINGS_STORE } from '@/services/db/dbSchema';
import type { MultimodalEmbeddingItem } from './embeddingTypes';

/**
 * Legacy location: every embedding used to live inside this single key-value
 * record. Reading or writing one embedding therefore loaded and rewrote the
 * entire index, which is what made background indexing grow O(n^2) in memory.
 * Kept only so existing installations can be migrated once.
 */
export const MULTIMODAL_EMBEDDING_KEY = 'amc_multimodal_embeddings_v1';

export type MultimodalEmbeddingMap = Record<string, MultimodalEmbeddingItem>;

let legacyMigration: Promise<void> | null = null;

const migrateLegacyEmbeddings = async (): Promise<void> => {
  let legacy: MultimodalEmbeddingMap | undefined;
  try {
    legacy = await getKeyValue<MultimodalEmbeddingMap>(MULTIMODAL_EMBEDDING_KEY);
  } catch {
    return;
  }

  if (!legacy || typeof legacy !== 'object') {
    return;
  }

  const items = Object.values(legacy).filter((item) => !!item && typeof item.id === 'string');
  try {
    await putMany(EMBEDDINGS_STORE, items);
    await deleteKeyValue(MULTIMODAL_EMBEDDING_KEY);
  } catch {
    // Leave the legacy record in place so the migration can be retried later.
  }
};

/**
 * Runs the one-time legacy migration at most once per session, and only if the
 * pre-v6 key-value record still exists.
 */
export const ensureLegacyEmbeddingsMigrated = (): Promise<void> => {
  if (!legacyMigration) {
    legacyMigration = migrateLegacyEmbeddings();
  }
  return legacyMigration;
};

/** Test seam: forget that the legacy migration already ran. */
export const resetLegacyMigrationForTest = (): void => {
  legacyMigration = null;
};

/**
 * Loads a single stored embedding. This is the hot path used while indexing and
 * it never touches the rest of the index.
 */
export const getStoredEmbedding = async (id: string): Promise<MultimodalEmbeddingItem | undefined> => {
  if (!id) return undefined;
  try {
    return await getItem<MultimodalEmbeddingItem>(EMBEDDINGS_STORE, id);
  } catch {
    return undefined;
  }
};

/**
 * Returns the ids of every indexed item without materializing their vectors.
 */
export const getStoredEmbeddingIds = async (): Promise<Set<string>> => {
  await ensureLegacyEmbeddingsMigrated();
  try {
    const keys = await getAllKeys(EMBEDDINGS_STORE);
    return new Set(keys.filter((key): key is string => typeof key === 'string'));
  } catch {
    return new Set();
  }
};

/**
 * Loads every stored embedding. Only search needs this; indexing must not use it.
 */
export const getStoredEmbeddings = async (): Promise<MultimodalEmbeddingMap> => {
  await ensureLegacyEmbeddingsMigrated();
  try {
    const items = await getAll<MultimodalEmbeddingItem>(EMBEDDINGS_STORE);
    const map: MultimodalEmbeddingMap = {};
    for (const item of items) {
      if (item?.id) {
        map[item.id] = item;
      }
    }
    return map;
  } catch {
    return {};
  }
};

/**
 * Saves a single embedding item. Replaces only that record.
 */
export const saveStoredEmbedding = async (item: MultimodalEmbeddingItem): Promise<void> => {
  await putMany(EMBEDDINGS_STORE, [item]);
};

/**
 * Updates the name of a stored embedding item when a library file is renamed.
 */
export const updateStoredEmbeddingName = async (id: string, newName: string): Promise<void> => {
  if (!id || !newName) return;
  const existing = await getStoredEmbedding(id);
  if (!existing) return;
  await saveStoredEmbedding({
    ...existing,
    name: newName,
    updatedAt: Date.now(),
  });
};

/**
 * Saves a batch of embedding items in one transaction.
 */
export const saveBatchStoredEmbeddings = async (items: MultimodalEmbeddingItem[]): Promise<void> => {
  await putMany(EMBEDDINGS_STORE, items);
};

/**
 * Removes a single embedding item by ID.
 */
export const removeStoredEmbedding = async (id: string): Promise<void> => {
  if (!id) return;
  await deleteMany(EMBEDDINGS_STORE, [id]);
};

/**
 * Removes several embedding items in one transaction.
 */
export const removeStoredEmbeddings = async (ids: string[]): Promise<void> => {
  const keys = ids.filter(Boolean);
  if (keys.length === 0) return;
  await deleteMany(EMBEDDINGS_STORE, keys);
};

/**
 * Clears all multimodal embeddings, including any un-migrated legacy record.
 */
export const clearAllStoredEmbeddings = async (): Promise<void> => {
  await clearStore(EMBEDDINGS_STORE);
  try {
    await deleteKeyValue(MULTIMODAL_EMBEDDING_KEY);
  } catch {
    // The legacy record is best-effort cleanup at this point.
  }
};

/**
 * Returns the number of indexed items. Uses IDBObjectStore.count so the vectors
 * are never deserialized.
 */
export const getStoredEmbeddingCount = async (): Promise<number> => {
  await ensureLegacyEmbeddingsMigrated();
  try {
    return await countAll(EMBEDDINGS_STORE);
  } catch {
    return 0;
  }
};

/**
 * Persists the app-level statistics counters consumed by the search store.
 * Kept here so the index store remains the owner of embedding persistence.
 */
const MULTIMODAL_INDEX_STATS_KEY = 'amc_multimodal_index_stats_v1';

export interface MultimodalIndexStats {
  indexedCount: number;
  updatedAt: number;
}

export const getStoredIndexStats = async (): Promise<MultimodalIndexStats | undefined> => {
  try {
    const stats = await getKeyValue<MultimodalIndexStats>(MULTIMODAL_INDEX_STATS_KEY);
    return stats && typeof stats.indexedCount === 'number' ? stats : undefined;
  } catch {
    return undefined;
  }
};

export const saveStoredIndexStats = async (stats: MultimodalIndexStats): Promise<void> => {
  try {
    await setKeyValue<MultimodalIndexStats>(MULTIMODAL_INDEX_STATS_KEY, stats);
  } catch {
    // Statistics are advisory; failing to persist them must not break indexing.
  }
};

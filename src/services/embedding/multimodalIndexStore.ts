import { getKeyValue, setKeyValue, deleteKeyValue } from '@/services/db/indexedDbAccess';
import type { MultimodalEmbeddingItem } from './embeddingTypes';

export const MULTIMODAL_EMBEDDING_KEY = 'amc_multimodal_embeddings_v1';

export type MultimodalEmbeddingMap = Record<string, MultimodalEmbeddingItem>;

/**
 * Loads all stored multimodal embedding items from IndexedDB.
 */
export const getStoredEmbeddings = async (): Promise<MultimodalEmbeddingMap> => {
  try {
    const data = await getKeyValue<MultimodalEmbeddingMap>(MULTIMODAL_EMBEDDING_KEY);
    return data || {};
  } catch {
    return {};
  }
};

/**
 * Saves a single embedding item into IndexedDB.
 */
export const saveStoredEmbedding = async (item: MultimodalEmbeddingItem): Promise<void> => {
  const current = await getStoredEmbeddings();
  current[item.id] = item;
  await setKeyValue<MultimodalEmbeddingMap>(MULTIMODAL_EMBEDDING_KEY, current);
};

/**
 * Saves a batch of embedding items into IndexedDB.
 */
export const saveBatchStoredEmbeddings = async (items: MultimodalEmbeddingItem[]): Promise<void> => {
  if (items.length === 0) return;
  const current = await getStoredEmbeddings();
  for (const item of items) {
    current[item.id] = item;
  }
  await setKeyValue<MultimodalEmbeddingMap>(MULTIMODAL_EMBEDDING_KEY, current);
};

/**
 * Removes an embedding item by ID from IndexedDB.
 */
export const removeStoredEmbedding = async (id: string): Promise<void> => {
  const current = await getStoredEmbeddings();
  if (current[id]) {
    delete current[id];
    await setKeyValue<MultimodalEmbeddingMap>(MULTIMODAL_EMBEDDING_KEY, current);
  }
};

/**
 * Clears all multimodal embeddings from IndexedDB.
 */
export const clearAllStoredEmbeddings = async (): Promise<void> => {
  await deleteKeyValue(MULTIMODAL_EMBEDDING_KEY);
};

/**
 * Returns the count of indexed items.
 */
export const getStoredEmbeddingCount = async (): Promise<number> => {
  const current = await getStoredEmbeddings();
  return Object.keys(current).length;
};

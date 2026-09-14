import { dbService } from '@/services/db/dbService';
import {
  computeCosineSimilarity,
  generateDocumentEmbedding,
  generateMediaEmbedding,
  generateQueryEmbedding,
} from './geminiEmbeddingService';
import { getStoredEmbeddings, saveStoredEmbedding } from './multimodalIndexStore';
import type {
  MultimodalEmbeddingItem,
  MultimodalIndexProgress,
  MultimodalMediaCategory,
  MultimodalSearchFilter,
  MultimodalSearchResult,
} from './embeddingTypes';
import type { LibraryItem } from '@/types';

const resolveMediaCategory = (mimeType: string): MultimodalMediaCategory => {
  const cleanType = (mimeType || '').toLowerCase();
  if (cleanType.startsWith('image/')) return 'image';
  if (cleanType.startsWith('video/')) return 'video';
  if (cleanType.startsWith('audio/')) return 'audio';
  if (cleanType === 'application/pdf') return 'document';
  return 'document';
};

/**
 * Searches stored multimodal embeddings by a natural language query.
 */
export const searchMultimodalByText = async (
  query: string,
  options: MultimodalSearchFilter = {},
): Promise<MultimodalSearchResult[]> => {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const queryEmbedding = await generateQueryEmbedding(trimmed);
  const stored = await getStoredEmbeddings();
  const items = Object.values(stored);

  const { category = 'all', minSimilarity = 0.25, limit = 40 } = options;

  const results: MultimodalSearchResult[] = [];

  for (const item of items) {
    if (category !== 'all' && item.category !== category) {
      continue;
    }

    const similarity = computeCosineSimilarity(queryEmbedding, item.embedding);
    if (similarity >= minSimilarity) {
      results.push({
        item,
        similarity,
      });
    }
  }

  // Sort descending by similarity
  results.sort((a, b) => b.similarity - a.similarity);

  return results.slice(0, limit);
};

/**
 * Searches stored multimodal embeddings using an image as input (以图搜图).
 */
export const searchMultimodalByImage = async (
  imageBlob: Blob,
  options: MultimodalSearchFilter = {},
): Promise<MultimodalSearchResult[]> => {
  const mimeType = imageBlob.type || 'image/png';
  const queryEmbedding = await generateMediaEmbedding(imageBlob, mimeType);
  const stored = await getStoredEmbeddings();
  const items = Object.values(stored);

  const { category = 'all', minSimilarity = 0.25, limit = 40 } = options;

  const results: MultimodalSearchResult[] = [];

  for (const item of items) {
    if (category !== 'all' && item.category !== category) {
      continue;
    }

    const similarity = computeCosineSimilarity(queryEmbedding, item.embedding);
    if (similarity >= minSimilarity) {
      results.push({
        item,
        similarity,
      });
    }
  }

  results.sort((a, b) => b.similarity - a.similarity);

  return results.slice(0, limit);
};

/**
 * Indexes a single library item and saves its embedding into the vector store.
 */
export const indexSingleItem = async (fileItem: LibraryItem): Promise<MultimodalEmbeddingItem | null> => {
  const blob = await dbService.fetchLibraryFileBlob(fileItem);
  if (!blob) {
    return null;
  }

  const mimeType = fileItem.type || blob.type || 'application/octet-stream';
  const category = resolveMediaCategory(mimeType);

  let embedding: number[];

  if (category === 'image' || category === 'audio' || category === 'video' || mimeType === 'application/pdf') {
    embedding = await generateMediaEmbedding(blob, mimeType);
  } else {
    const textContent = fileItem.textContent || (await blob.text().catch(() => ''));
    embedding = await generateDocumentEmbedding(fileItem.name, textContent);
  }

  const embeddingItem: MultimodalEmbeddingItem = {
    id: fileItem.id,
    name: fileItem.name,
    type: mimeType,
    category,
    embedding,
    size: fileItem.size || blob.size,
    thumbnailUrl: fileItem.dataUrl?.startsWith('data:image') ? fileItem.dataUrl : undefined,
    sessionId: fileItem.sessionId,
    sessionTitle: fileItem.sessionTitle,
    messageId: fileItem.messageId,
    isStandalone: fileItem.isStandalone,
    createdAt: fileItem.timestamp,
    updatedAt: Date.now(),
  };

  await saveStoredEmbedding(embeddingItem);
  return embeddingItem;
};

/**
 * Scans all library files and historical chat attachments to index them into vector store.
 */
export const indexAllHistoricalItems = async (
  onProgress?: (progress: MultimodalIndexProgress) => void,
  options: { forceReindex?: boolean } = {},
): Promise<{ indexed: number; skipped: number; total: number }> => {
  onProgress?.({
    total: 0,
    current: 0,
    phase: 'scanning',
  });

  const [standalone, historical, deletedIds, stored] = await Promise.all([
    dbService.getStandaloneLibraryFiles(),
    dbService.getAllHistoricalSessionFiles(),
    dbService.getDeletedLibraryFileIds(),
    getStoredEmbeddings(),
  ]);

  const deletedSet = new Set(deletedIds);
  const fileMap = new Map<string, LibraryItem>();

  for (const file of standalone) {
    if (!deletedSet.has(file.id)) {
      fileMap.set(file.id, file);
    }
  }

  for (const file of historical) {
    if (!deletedSet.has(file.id) && !fileMap.has(file.id)) {
      fileMap.set(file.id, file);
    }
  }

  const allFiles = Array.from(fileMap.values());
  const pendingFiles = options.forceReindex
    ? allFiles
    : allFiles.filter((f) => !stored[f.id] || !stored[f.id].embedding?.length);

  const total = pendingFiles.length;
  let indexed = 0;
  let skipped = allFiles.length - pendingFiles.length;

  onProgress?.({
    total,
    current: 0,
    phase: 'indexing',
  });

  for (let i = 0; i < total; i++) {
    const fileItem = pendingFiles[i];

    onProgress?.({
      total,
      current: i + 1,
      currentItemName: fileItem.name,
      phase: 'indexing',
    });

    try {
      const item = await indexSingleItem(fileItem);
      if (item) {
        indexed++;
      } else {
        skipped++;
      }
    } catch {
      // Failed to index single file - gracefully continue
      skipped++;
    }
  }

  onProgress?.({
    total,
    current: total,
    phase: 'completed',
  });

  return { indexed, skipped, total: allFiles.length };
};

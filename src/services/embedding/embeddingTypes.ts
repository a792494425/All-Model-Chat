export type MultimodalMediaCategory = 'image' | 'video' | 'audio' | 'document' | 'text';

export interface MultimodalEmbeddingItem {
  id: string;
  name: string;
  type: string;
  category: MultimodalMediaCategory;
  embedding: number[];
  size?: number;
  thumbnailUrl?: string;
  sessionId?: string;
  sessionTitle?: string;
  messageId?: string;
  isStandalone?: boolean;
  createdAt?: number;
  updatedAt: number;
}

/**
 * The lightweight descriptor the background queue and the indexer operate on.
 *
 * It deliberately carries no `rawFile`/`dataUrl`/`textContent` payload: holding
 * those for every pending item kept entire libraries resident in memory. The
 * payload is resolved one item at a time, right before it is embedded.
 */
export interface IndexableLibraryItem {
  id: string;
  name: string;
  type: string;
  size?: number;
  timestamp?: number;
  sessionId?: string;
  sessionTitle?: string;
  messageId?: string;
  isStandalone?: boolean;
}

/** Why an item was not embedded, so callers can skip retrying permanent failures. */
export type IndexSkipReason = 'too-large' | 'no-content' | 'missing-payload' | 'duration-exceeded';

export interface MultimodalSearchResult {
  item: MultimodalEmbeddingItem;
  similarity: number; // 0.0 to 1.0 (or percentage)
}

export interface MultimodalIndexProgress {
  total: number;
  current: number;
  currentItemName?: string;
  phase: 'idle' | 'scanning' | 'indexing' | 'completed' | 'error';
  error?: string;
}

export interface MultimodalSearchFilter {
  category?: MultimodalMediaCategory | 'all';
  minSimilarity?: number; // default e.g. 0.4
  limit?: number; // default e.g. 30
}

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

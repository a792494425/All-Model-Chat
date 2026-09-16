import type { MultimodalMediaCategory } from './embeddingTypes';

/**
 * Embedding a media file requires base64-encoding it in memory (Gemini inline
 * data), which costs roughly 3-4x the file size across the temporaries involved
 * (data URL string, split base64 string, SDK payload). Without a cap, indexing a
 * single large video could allocate hundreds of megabytes and kill the tab.
 *
 * These limits bound the transient allocations per indexed item.
 */
export const MAX_EMBEDDING_MEDIA_BYTES = 20 * 1024 * 1024;
const MAX_EMBEDDING_DOCUMENT_BYTES = 20 * 1024 * 1024;

/** Official limits from Gemini Embedding 2 specification */
export const MAX_EMBEDDING_PDF_PAGES = 6;
export const MAX_EMBEDDING_AUDIO_SECONDS = 180;
export const MAX_EMBEDDING_VIDEO_SECONDS = 120;

/** Cap on the extracted text handed to the document embedding model.
 * 16,000 characters comfortably fits within the 8,192 token limit across CJK and Latin scripts.
 */
export const MAX_EMBEDDING_TEXT_CHARS = 16_000;

const resolveCategoryLimit = (category: MultimodalMediaCategory): number =>
  category === 'document' || category === 'text' ? MAX_EMBEDDING_DOCUMENT_BYTES : MAX_EMBEDDING_MEDIA_BYTES;

/**
 * Returns true when a file is too large to embed inline. `size` is optional
 * because some callers only know the size after the payload has been resolved;
 * an unknown size is not treated as oversized here.
 */
export const isOversizedForEmbedding = (category: MultimodalMediaCategory, size: number | undefined): boolean => {
  if (size === undefined || !Number.isFinite(size) || size < 0) {
    return false;
  }
  return size > resolveCategoryLimit(category);
};

/**
 * Truncates extracted document text to the embedding budget.
 */
export const truncateEmbeddingText = (text: string): string => {
  if (text.length <= MAX_EMBEDDING_TEXT_CHARS) {
    return text;
  }
  return text.slice(0, MAX_EMBEDDING_TEXT_CHARS);
};

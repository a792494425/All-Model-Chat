import { describe, it, expect } from 'vitest';
import {
  MAX_EMBEDDING_MEDIA_BYTES,
  MAX_EMBEDDING_TEXT_CHARS,
  MAX_EMBEDDING_PDF_PAGES,
  MAX_EMBEDDING_AUDIO_SECONDS,
  MAX_EMBEDDING_VIDEO_SECONDS,
  isOversizedForEmbedding,
  truncateEmbeddingText,
} from './embeddingLimits';

describe('embeddingLimits', () => {
  describe('constants', () => {
    it('defines official Gemini Embedding 2 limits', () => {
      expect(MAX_EMBEDDING_PDF_PAGES).toBe(6);
      expect(MAX_EMBEDDING_AUDIO_SECONDS).toBe(180);
      expect(MAX_EMBEDDING_VIDEO_SECONDS).toBe(120);
      expect(MAX_EMBEDDING_TEXT_CHARS).toBe(16_000);
    });
  });
  describe('isOversizedForEmbedding', () => {
    it('accepts a media file at the limit', () => {
      expect(isOversizedForEmbedding('video', MAX_EMBEDDING_MEDIA_BYTES)).toBe(false);
    });

    it('rejects a media file above the limit', () => {
      expect(isOversizedForEmbedding('video', MAX_EMBEDDING_MEDIA_BYTES + 1)).toBe(true);
    });

    it('rejects an oversized image and audio file', () => {
      expect(isOversizedForEmbedding('image', MAX_EMBEDDING_MEDIA_BYTES + 1)).toBe(true);
      expect(isOversizedForEmbedding('audio', MAX_EMBEDDING_MEDIA_BYTES + 1)).toBe(true);
    });

    it('rejects an oversized document', () => {
      expect(isOversizedForEmbedding('document', MAX_EMBEDDING_MEDIA_BYTES * 10)).toBe(true);
    });

    it('treats an unknown size as acceptable so the real size can be checked later', () => {
      expect(isOversizedForEmbedding('video', undefined)).toBe(false);
      expect(isOversizedForEmbedding('video', Number.NaN)).toBe(false);
    });
  });

  describe('truncateEmbeddingText', () => {
    it('leaves short text untouched', () => {
      expect(truncateEmbeddingText('hello')).toBe('hello');
    });

    it('truncates text beyond the embedding budget', () => {
      const long = 'x'.repeat(MAX_EMBEDDING_TEXT_CHARS + 500);
      const result = truncateEmbeddingText(long);
      expect(result).toHaveLength(MAX_EMBEDDING_TEXT_CHARS);
    });
  });
});

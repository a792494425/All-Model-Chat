import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  computeCosineSimilarity,
  generateQueryEmbedding,
  generateMediaEmbedding,
  generateDocumentEmbedding,
  DEFAULT_EMBEDDING_MODEL,
  EMBEDDING_DIMENSION,
} from './geminiEmbeddingService';
import * as apiClientModule from '@/services/api/apiClient';
import * as fileEncodingModule from '@/utils/file/fileEncoding';
import { dbService } from '@/services/db/dbService';

describe('geminiEmbeddingService', () => {
  const mockEmbedContent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(dbService, 'getAppSettings').mockResolvedValue({
      apiKey: 'test-api-key',
    } as any);
    vi.spyOn(apiClientModule, 'getConfiguredApiClient').mockResolvedValue({
      models: {
        embedContent: mockEmbedContent,
      },
    } as any);
  });

  describe('computeCosineSimilarity', () => {
    it('returns 1 for identical unit vectors', () => {
      const vec = [1, 0, 0];
      expect(computeCosineSimilarity(vec, vec)).toBeCloseTo(1.0, 5);
    });

    it('returns 0 for orthogonal vectors', () => {
      const vecA = [1, 0, 0];
      const vecB = [0, 1, 0];
      expect(computeCosineSimilarity(vecA, vecB)).toBeCloseTo(0.0, 5);
    });

    it('returns correct similarity for arbitrarily normalized vectors', () => {
      const vecA = [0.6, 0.8];
      const vecB = [0.8, 0.6];
      // dot product = 0.48 + 0.48 = 0.96
      expect(computeCosineSimilarity(vecA, vecB)).toBeCloseTo(0.96, 5);
    });

    it('handles zero magnitude or different lengths gracefully', () => {
      expect(computeCosineSimilarity([], [])).toBe(0);
      expect(computeCosineSimilarity([1, 2], [1])).toBe(0);
      expect(computeCosineSimilarity([0, 0], [0, 0])).toBe(0);
    });
  });

  describe('generateQueryEmbedding', () => {
    it('calls embedContent with asymmetric query task prefix and 768 outputDimensionality', async () => {
      const mockVector = new Array(768).fill(0.1);
      mockEmbedContent.mockResolvedValue({
        embeddings: [{ values: mockVector }],
      });

      const result = await generateQueryEmbedding('a cute orange cat');

      expect(apiClientModule.getConfiguredApiClient).toHaveBeenCalledWith('test-api-key');
      expect(mockEmbedContent).toHaveBeenCalledWith({
        model: DEFAULT_EMBEDDING_MODEL,
        contents: 'task: search result | query: a cute orange cat',
        config: {
          outputDimensionality: EMBEDDING_DIMENSION,
        },
      });
      expect(result).toEqual(mockVector);
    });

    it('throws error when no embedding values returned', async () => {
      mockEmbedContent.mockResolvedValue({ embeddings: [] });
      await expect(generateQueryEmbedding('test query')).rejects.toThrow('No embedding returned');
    });
  });

  describe('generateMediaEmbedding', () => {
    it('encodes blob to base64 and embeds with inlineData without task prefix', async () => {
      const mockVector = new Array(768).fill(0.2);
      mockEmbedContent.mockResolvedValue({
        embeddings: [{ values: mockVector }],
      });
      vi.spyOn(fileEncodingModule, 'blobToBase64').mockResolvedValue('base64encodeddata');

      const dummyBlob = new Blob(['image content'], { type: 'image/png' });
      const result = await generateMediaEmbedding(dummyBlob, 'image/png');

      expect(fileEncodingModule.blobToBase64).toHaveBeenCalledWith(dummyBlob);
      expect(mockEmbedContent).toHaveBeenCalledWith({
        model: DEFAULT_EMBEDDING_MODEL,
        contents: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: 'base64encodeddata',
            },
          },
        ],
        config: {
          outputDimensionality: EMBEDDING_DIMENSION,
        },
      });
      expect(result).toEqual(mockVector);
    });
  });

  describe('generateDocumentEmbedding', () => {
    it('formats document with title and text structure', async () => {
      const mockVector = new Array(768).fill(0.3);
      mockEmbedContent.mockResolvedValue({
        embeddings: [{ values: mockVector }],
      });

      const result = await generateDocumentEmbedding('My Notes', 'Content of the note');

      expect(mockEmbedContent).toHaveBeenCalledWith({
        model: DEFAULT_EMBEDDING_MODEL,
        contents: 'title: My Notes | text: Content of the note',
        config: {
          outputDimensionality: EMBEDDING_DIMENSION,
        },
      });
      expect(result).toEqual(mockVector);
    });

    it('handles empty title with title: none format', async () => {
      const mockVector = new Array(768).fill(0.3);
      mockEmbedContent.mockResolvedValue({
        embeddings: [{ values: mockVector }],
      });

      await generateDocumentEmbedding('', 'Content without title');

      expect(mockEmbedContent).toHaveBeenCalledWith({
        model: DEFAULT_EMBEDDING_MODEL,
        contents: 'title: none | text: Content without title',
        config: {
          outputDimensionality: EMBEDDING_DIMENSION,
        },
      });
    });
  });
});

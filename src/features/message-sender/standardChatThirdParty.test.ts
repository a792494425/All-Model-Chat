import { describe, expect, it, vi } from 'vitest';
import type { ContentPart } from '@/types/chat';
import {
  normalizePartsForNonAnthropicProvider,
  normalizeHistoryForNonAnthropicProvider,
  routeThrownStreamError,
} from './standardChatThirdParty';

vi.mock('@/utils/file/pdfTextExtraction', () => ({
  extractPdfTextFromBase64: vi.fn(async (base64: string) => {
    if (base64 === 'empty-doc') return '';
    return 'Extracted sample PDF text';
  }),
}));

describe('standardChatThirdParty utilities', () => {
  describe('normalizePartsForNonAnthropicProvider', () => {
    it('extracts text from PDF inlineData and converts to text part', async () => {
      const parts: ContentPart[] = [
        { text: 'Hello' },
        { inlineData: { mimeType: 'application/pdf', data: 'valid-base64' } } as unknown as ContentPart,
      ];

      const result = await normalizePartsForNonAnthropicProvider(parts);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ text: 'Hello' });
      expect(result[1]).toEqual({
        text: '[Document (PDF)]\nExtracted sample PDF text',
      });
    });

    it('handles empty extracted text with a fallback notice', async () => {
      const parts: ContentPart[] = [
        { inlineData: { mimeType: 'application/pdf', data: 'empty-doc' } } as unknown as ContentPart,
      ];

      const result = await normalizePartsForNonAnthropicProvider(parts);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        text: '[Document (PDF)]\n(Text content could not be extracted from this PDF)',
      });
    });

    it('leaves non-pdf inlineData parts untouched', async () => {
      const imagePart = { inlineData: { mimeType: 'image/png', data: 'png-bytes' } } as unknown as ContentPart;
      const result = await normalizePartsForNonAnthropicProvider([imagePart]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(imagePart);
    });
  });

  describe('normalizeHistoryForNonAnthropicProvider', () => {
    it('normalizes parts across all history turns', async () => {
      const history = [
        {
          role: 'user' as const,
          parts: [{ inlineData: { mimeType: 'application/pdf', data: 'valid-base64' } } as unknown as ContentPart],
        },
        {
          role: 'model' as const,
          parts: [{ text: 'Here is the summary' }],
        },
      ];

      const result = await normalizeHistoryForNonAnthropicProvider(history);

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('user');
      expect(result[0].parts[0]).toEqual({
        text: '[Document (PDF)]\nExtracted sample PDF text',
      });
      expect(result[1].parts[0]).toEqual({ text: 'Here is the summary' });
    });
  });

  describe('routeThrownStreamError', () => {
    it('calls streamOnError when runner throws', async () => {
      const onError = vi.fn();
      await routeThrownStreamError(async () => {
        throw new Error('Boom');
      }, onError);

      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Boom' }));
    });

    it('does not call streamOnError when runner succeeds', async () => {
      const onError = vi.fn();
      await routeThrownStreamError(async () => {
        // success
      }, onError);

      expect(onError).not.toHaveBeenCalled();
    });
  });
});

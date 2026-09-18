import { describe, expect, it, vi } from 'vitest';
import type { ContentPart } from '@/types/chat';
import {
  executeThirdPartyChat,
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

vi.mock('@/services/api/openaiResponsesApi', () => ({
  generateOpenAIResponsesTurnApi: vi.fn(),
  sendOpenAIResponsesNonStream: vi.fn(),
  sendOpenAIResponsesStream: vi.fn(),
}));

vi.mock('@/services/api/openaiCompatibleApi', () => ({
  generateOpenAICompatibleTurnApi: vi.fn(),
  sendOpenAICompatibleMessageNonStream: vi.fn(),
  sendOpenAICompatibleMessageStream: vi.fn(),
}));

vi.mock('@/services/api/anthropicApi', () => ({
  generateAnthropicTurnApi: vi.fn(),
  sendAnthropicMessageNonStream: vi.fn(),
  sendAnthropicMessageStream: vi.fn(),
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

  describe('executeThirdPartyChat with tools', () => {
    it('dispatches to generateOpenAIResponsesTurnApi when protocol is openai-responses', async () => {
      const { generateOpenAIResponsesTurnApi } = await import('@/services/api/openaiResponsesApi');
      const { generateOpenAICompatibleTurnApi } = await import('@/services/api/openaiCompatibleApi');

      (generateOpenAIResponsesTurnApi as any).mockResolvedValue({
        modelContent: { role: 'model', parts: [{ text: 'done' }] },
        parts: [{ text: 'done' }],
        thoughts: undefined,
        usage: undefined,
        functionCalls: [],
      });

      const streamOnPart = vi.fn();
      const wrappedStreamOnComplete = vi.fn();

      await executeThirdPartyChat({
        activeProvider: {
          id: 'p-1',
          name: 'ResponsesProvider',
          protocol: 'openai-responses',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key',
        } as any,
        apiModelId: 'gpt-4o',
        keyToUse: 'test-key',
        sessionToUpdate: {} as any,
        historyForChat: [],
        finalRole: 'user',
        finalParts: [{ text: 'use tool' }],
        combinedClientFunctions: {
          testTool: {
            declaration: { name: 'testTool', description: 'desc', parameters: {} },
            handler: vi.fn(),
          },
        },
        newAbortController: new AbortController(),
        generationId: 'gen-1',
        insertInternalToolMessages: vi.fn(),
        streamOnPart,
        onThoughtChunk: vi.fn(),
        streamOnError: vi.fn(),
        streamOnComplete: vi.fn(),
        wrappedStreamOnComplete,
        nonStreamOnComplete: vi.fn(),
        isStreamingEnabled: true,
      });

      expect(generateOpenAIResponsesTurnApi).toHaveBeenCalled();
      expect(generateOpenAICompatibleTurnApi).not.toHaveBeenCalled();
      expect(streamOnPart).toHaveBeenCalledWith({ text: 'done' }, { recordFirstToken: false, source: 'third-party' });
      expect(wrappedStreamOnComplete).toHaveBeenCalled();
    });
  });
});

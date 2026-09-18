import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { transcribeAudioWithGemini, extractWordAnnotations } from './geminiTranscribeService';

// Mock dependencies
vi.mock('@/services/api/fileApi', () => ({
  uploadFileApi: vi.fn(),
  deleteFileApi: vi.fn(),
}));

vi.mock('@/services/api/apiClient', () => ({
  getConfiguredApiClient: vi.fn(),
  getConfiguredApiClientContext: vi.fn(),
}));

vi.mock('@/services/logService', () => ({
  logService: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { uploadFileApi, deleteFileApi } from '@/services/api/fileApi';
import { getConfiguredApiClient, getConfiguredApiClientContext } from '@/services/api/apiClient';

describe('geminiTranscribeService', () => {
  const mockApiKey = 'test-gemini-api-key';
  const mockBlob = new Blob(['mock audio wav data'], { type: 'audio/wav' });
  const mockFileName = 'test-video.wav';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('extractWordAnnotations', () => {
    it('should correctly extract word_info annotations from interaction response', () => {
      const mockInteraction = {
        id: 'interactions/123',
        steps: [
          {
            id: 'step_1',
            type: 'model_output',
            content: [
              {
                type: 'text',
                text: 'Hello world',
                annotations: [
                  {
                    type: 'word_info',
                    text: 'Hello',
                    start_offset: '0.100s',
                    end_offset: '0.450s',
                    speaker: 'spk_0',
                  },
                  {
                    type: 'word_info',
                    text: 'world',
                    start_offset: '0.500s',
                    end_offset: '0.900s',
                    speaker: 'spk_0',
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = extractWordAnnotations(mockInteraction);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        text: 'Hello',
        start_offset: '0.100s',
        end_offset: '0.450s',
        speaker: 'spk_0',
      });
      expect(result[1]).toEqual({
        text: 'world',
        start_offset: '0.500s',
        end_offset: '0.900s',
        speaker: 'spk_0',
      });
    });

    it('should handle missing or malformed steps gracefully', () => {
      expect(extractWordAnnotations(null)).toEqual([]);
      expect(extractWordAnnotations({})).toEqual([]);
      expect(extractWordAnnotations({ steps: [] })).toEqual([]);
      expect(extractWordAnnotations({ steps: [{ content: [] }] })).toEqual([]);
    });
  });

  describe('transcribeAudioWithGemini', () => {
    it('should throw if apiKey is empty', async () => {
      const controller = new AbortController();
      await expect(transcribeAudioWithGemini('', mockBlob, mockFileName, controller.signal)).rejects.toThrow(
        'API key is required',
      );
    });

    it('should throw immediately if signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(transcribeAudioWithGemini(mockApiKey, mockBlob, mockFileName, controller.signal)).rejects.toThrow();

      expect(uploadFileApi).not.toHaveBeenCalled();
    });

    it('should successfully upload audio, invoke gemini-3.5-transcribe, and clean up temporary file', async () => {
      const controller = new AbortController();
      const progressPhases: string[] = [];

      const mockUploadedFile = {
        name: 'files/audio-temp-123',
        uri: 'https://generativelanguage.googleapis.com/v1beta/files/audio-temp-123',
        mimeType: 'audio/wav',
      };

      vi.mocked(uploadFileApi).mockImplementation(async (_key, _file, _mime, _disp, _sig, onProgress) => {
        onProgress?.(50, 100);
        onProgress?.(100, 100);
        return mockUploadedFile as any;
      });

      const mockCreate = vi.fn().mockResolvedValue({
        id: 'interactions/res-1',
        steps: [
          {
            content: [
              {
                annotations: [
                  {
                    type: 'word_info',
                    text: 'Bonjour',
                    start_offset: '0.200s',
                    end_offset: '0.600s',
                  },
                ],
              },
            ],
          },
        ],
      });

      vi.mocked(getConfiguredApiClient).mockResolvedValue({
        interactions: {
          create: mockCreate,
        },
      } as any);

      vi.mocked(deleteFileApi).mockResolvedValue();

      const result = await transcribeAudioWithGemini(
        mockApiKey,
        mockBlob,
        mockFileName,
        controller.signal,
        (phase, percent) => {
          progressPhases.push(`${phase}:${percent ?? ''}`);
        },
      );

      // Verify upload was called with File object created from Blob
      expect(uploadFileApi).toHaveBeenCalledTimes(1);
      const [calledApiKey, calledFile, calledMime] = vi.mocked(uploadFileApi).mock.calls[0];
      expect(calledApiKey).toBe(mockApiKey);
      expect(calledFile.name).toBe(mockFileName);
      expect(calledMime).toBe('audio/wav');

      // Verify progress reporting
      expect(progressPhases).toContain('uploading:50');
      expect(progressPhases).toContain('uploading:100');
      expect(progressPhases).toContain('transcribing:');

      // Verify interactions.create payload
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-3.5-transcribe',
          input: [
            {
              type: 'audio',
              uri: mockUploadedFile.uri,
              mime_type: 'audio/wav',
            },
          ],
          generation_config: {
            transcription_config: {
              mode: {
                type: 'verbatim',
                timestamp_granularities: ['word'],
              },
            },
          },
        }),
        expect.anything(),
      );

      // Verify result
      expect(result).toEqual([
        {
          text: 'Bonjour',
          start_offset: '0.200s',
          end_offset: '0.600s',
          speaker: undefined,
        },
      ]);

      // Verify cleanup of uploaded file
      expect(deleteFileApi).toHaveBeenCalledWith(mockApiKey, mockUploadedFile.name);
    });

    it('should clean up uploaded file even when transcription fails', async () => {
      const controller = new AbortController();
      const mockUploadedFile = {
        name: 'files/audio-temp-err',
        uri: 'https://generativelanguage.googleapis.com/v1beta/files/audio-temp-err',
        mimeType: 'audio/wav',
      };

      vi.mocked(uploadFileApi).mockResolvedValue(mockUploadedFile as any);

      const mockCreate = vi.fn().mockRejectedValue(new Error('Transcription service error'));
      vi.mocked(getConfiguredApiClient).mockResolvedValue({
        interactions: {
          create: mockCreate,
        },
      } as any);

      vi.mocked(deleteFileApi).mockResolvedValue();

      await expect(transcribeAudioWithGemini(mockApiKey, mockBlob, mockFileName, controller.signal)).rejects.toThrow(
        'Transcription service error',
      );

      expect(deleteFileApi).toHaveBeenCalledWith(mockApiKey, mockUploadedFile.name);
    });

    it('should fallback to REST API if interactions.create is not present on client', async () => {
      const controller = new AbortController();
      const mockUploadedFile = {
        name: 'files/audio-rest-123',
        uri: 'https://generativelanguage.googleapis.com/v1beta/files/audio-rest-123',
        mimeType: 'audio/wav',
      };

      vi.mocked(uploadFileApi).mockResolvedValue(mockUploadedFile as any);
      vi.mocked(getConfiguredApiClient).mockResolvedValue({} as any);

      const mockFetchResponse = {
        ok: true,
        json: async () => ({
          steps: [
            {
              content: [
                {
                  annotations: [
                    {
                      type: 'word_info',
                      text: 'Fallback',
                      start_offset: '1.000s',
                      end_offset: '1.500s',
                    },
                  ],
                },
              ],
            },
          ],
        }),
      };

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue(mockFetchResponse as any);

      vi.mocked(getConfiguredApiClientContext).mockResolvedValue({
        apiBaseUrl: 'https://custom-proxy.com',
        proxyBaseUrl: null,
      } as any);

      try {
        const result = await transcribeAudioWithGemini(mockApiKey, mockBlob, mockFileName, controller.signal);
        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('Fallback');
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1beta/interactions'),
          expect.objectContaining({
            method: 'POST',
          }),
        );
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});

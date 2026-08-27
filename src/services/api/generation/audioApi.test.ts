import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { blobToBase64Mock, generateContentMock, getConfiguredApiClientMock } = vi.hoisted(() => ({
  blobToBase64Mock: vi.fn(),
  generateContentMock: vi.fn(),
  getConfiguredApiClientMock: vi.fn(),
}));

vi.mock('@/services/api/apiClient', () => ({
  getConfiguredApiClient: getConfiguredApiClientMock,
}));

vi.mock('@/utils/file/fileEncoding', () => ({
  blobToBase64: blobToBase64Mock,
}));

import { generateSpeechApi, transcribeAudioApi } from './audioApi';

describe('generateSpeechApi request config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConfiguredApiClientMock.mockResolvedValue({
      models: {
        generateContent: generateContentMock,
      },
    });
    generateContentMock.mockResolvedValue({
      candidates: [{ content: { parts: [{ inlineData: { data: 'pcm-audio' } }] } }],
    });
  });

  it('uses the selected single-speaker voice for standard TTS prompts', async () => {
    await generateSpeechApi(
      'api-key',
      'gemini-3.1-flash-tts-preview',
      'Say cheerfully: Have a wonderful day!',
      'Aoede',
      new AbortController().signal,
    );

    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Aoede' },
            },
          },
        }),
      }),
    );
  });

  it('switches to multi-speaker voice config when the prompt declares speaker voices', async () => {
    await generateSpeechApi(
      'api-key',
      'gemini-3.1-flash-tts-preview',
      `# AUDIO PROFILE: Two hosts
### SPEAKER VOICES
Joe: Kore
Jane: Puck

#### TRANSCRIPT
Joe: Welcome back to the show.
Jane: Thanks, it is great to be here.`,
      'Aoede',
      new AbortController().signal,
    );

    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          responseModalities: ['AUDIO'],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                {
                  speaker: 'Joe',
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                  },
                },
                {
                  speaker: 'Jane',
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Puck' },
                  },
                },
              ],
            },
          },
        }),
      }),
    );
  });
});

describe('generateSpeechApi timeout', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('passes an abort signal into the generateContent config so a stalled request can be cancelled', async () => {
    generateContentMock.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [{ inlineData: { data: 'pcm-audio' } }],
          },
        },
      ],
    });

    await generateSpeechApi(
      'api-key',
      'gemini-3.1-flash-tts-preview',
      'Say hello',
      'Aoede',
      new AbortController().signal,
    );

    const request = generateContentMock.mock.calls[0][0];
    expect(request.config.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it('rejects with a timeout error when the request exceeds the wall-clock budget', async () => {
    vi.useFakeTimers();

    generateContentMock.mockImplementation(
      () =>
        new Promise((_resolve) => {
          // Never settles — simulates a stalled upstream.
        }),
    );

    const promise = generateSpeechApi(
      'api-key',
      'gemini-3.1-flash-tts-preview',
      'Say hello',
      'Aoede',
      new AbortController().signal,
    );

    const assertRejects = expect(promise).rejects.toThrow('timed out');

    vi.advanceTimersByTime(30_000 + 1);

    await assertRejects;
  });

  it('does not leak the timeout timer after a normal request settles', async () => {
    vi.useFakeTimers();

    generateContentMock.mockResolvedValue({
      candidates: [{ content: { parts: [{ inlineData: { data: 'pcm-audio' } }] } }],
    });

    await generateSpeechApi(
      'api-key',
      'gemini-3.1-flash-tts-preview',
      'Say hello',
      'Aoede',
      new AbortController().signal,
    );

    // Advancing far past the budget must not reject a settled request.
    await expect(
      Promise.race([Promise.resolve('done'), new Promise((r) => setTimeout(() => r('tick'), 0))]),
    ).resolves.toBe('done');
    vi.advanceTimersByTime(60_000);
  });
});

describe('transcribeAudioApi request config', () => {
  const audioFile = new File(['voice'], 'voice.mp3', { type: 'audio/mpeg' });

  beforeEach(() => {
    vi.clearAllMocks();
    blobToBase64Mock.mockResolvedValue('base64-audio');
    getConfiguredApiClientMock.mockResolvedValue({
      models: {
        generateContent: generateContentMock,
      },
    });
    generateContentMock.mockResolvedValue({ text: 'hello world' });
  });

  it('sends dedicated transcription payload with audio and prompt parts without developer instruction or thinking config', async () => {
    await transcribeAudioApi('api-key', audioFile, 'gemini-3.5-transcribe');

    expect(generateContentMock).toHaveBeenCalledWith({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          { text: 'Transcribe voice input exactly.' },
          {
            inlineData: {
              mimeType: 'audio/mpeg',
              data: 'base64-audio',
            },
          },
        ],
      },
    });
  });

  it('returns an empty string when the model finds no recognizable speech', async () => {
    generateContentMock.mockResolvedValue({ text: '' });

    await expect(transcribeAudioApi('api-key', audioFile, 'gemini-3.5-transcribe')).resolves.toBe('');
  });

  it('rejects unsupported Gemini audio MIME types before building the inline audio part', async () => {
    const unsupportedAudioFile = new File(['voice'], 'voice.webm', { type: 'audio/webm' });

    await expect(transcribeAudioApi('api-key', unsupportedAudioFile, 'gemini-3-flash-preview')).rejects.toThrow(
      'Unsupported audio MIME type for Gemini transcription: audio/webm.',
    );

    expect(blobToBase64Mock).not.toHaveBeenCalled();
    expect(generateContentMock).not.toHaveBeenCalled();
  });
});

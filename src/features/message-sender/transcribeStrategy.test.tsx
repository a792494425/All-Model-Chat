import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTranslator } from '@/i18n/translations';
import { createAppSettings, createChatSettings } from '@/test/data/factories';
import type { UploadedFile } from '@/types';

const {
  transcribeAudioMock,
  prepareAudioMock,
  showNotificationMock,
  getAudioDurationSecondsMock,
  extractAudioFromVideoMock,
  transcribeAudioWithGeminiMock,
  getCachedSubtitlesMock,
  saveCachedSubtitlesMock,
} = vi.hoisted(() => ({
  transcribeAudioMock: vi.fn(),
  prepareAudioMock: vi.fn(),
  showNotificationMock: vi.fn(),
  getAudioDurationSecondsMock: vi.fn(),
  extractAudioFromVideoMock: vi.fn(),
  transcribeAudioWithGeminiMock: vi.fn(),
  getCachedSubtitlesMock: vi.fn(),
  saveCachedSubtitlesMock: vi.fn(),
}));

vi.mock('@/services/api/generation/audioApi', () => ({
  transcribeAudioApi: transcribeAudioMock,
}));

vi.mock('@/features/audio/audioCompression', () => ({
  prepareAudioForGeminiTranscription: prepareAudioMock,
}));

vi.mock('@/features/audio/audioDuration', () => ({
  getAudioDurationSeconds: getAudioDurationSecondsMock,
}));

vi.mock('@/utils/video-subtitles/extractAudioFromVideo', () => ({
  extractAudioFromVideo: extractAudioFromVideoMock,
}));

vi.mock('@/utils/video-subtitles/geminiTranscribeService', () => ({
  transcribeAudioWithGemini: transcribeAudioWithGeminiMock,
}));

vi.mock('@/utils/video-subtitles/subtitleCacheService', () => ({
  getCachedSubtitles: getCachedSubtitlesMock,
  saveCachedSubtitles: saveCachedSubtitlesMock,
}));

vi.mock('@/utils/browserCompletionFeedback', () => ({
  showNotification: showNotificationMock,
  playCompletionSound: vi.fn(),
}));

vi.mock('@/utils/chat/session', async () => {
  const { createChatSessionMockModule } = await import('@/test/doubles/moduleMocks');

  return createChatSessionMockModule();
});

vi.mock('@/utils/chat/ids', () => ({
  generateUniqueId: vi.fn(() => 'generated-session'),
}));

import { sendTranscribeMessage } from './transcribeStrategy';

describe('transcribeStrategy', () => {
  const fakeAudioFile: UploadedFile = {
    id: 'file-1',
    name: 'test-recording.mp3',
    type: 'audio/mpeg',
    size: 1024,
    rawFile: new File(['audio content'], 'test-recording.mp3', { type: 'audio/mpeg' }),
    uploadState: 'active',
  };

  const fakeVideoFile: UploadedFile = {
    id: 'file-video-1',
    name: 'test-video.mp4',
    type: 'video/mp4',
    size: 1024 * 1024,
    rawFile: new File(['video content'], 'test-video.mp4', { type: 'video/mp4' }),
    uploadState: 'active',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prepareAudioMock.mockImplementation(async (file) => file);
    transcribeAudioMock.mockResolvedValue('这是转录出来的文字内容');
    getAudioDurationSecondsMock.mockResolvedValue(600);
    extractAudioFromVideoMock.mockResolvedValue({
      audioBlob: new Blob(['audio wav data'], { type: 'audio/wav' }),
      durationSeconds: 42,
    });
    transcribeAudioWithGeminiMock.mockResolvedValue([
      {
        text: 'こんにちは世界。',
        start_offset: '0.000s',
        end_offset: '2.500s',
      },
    ]);
    getCachedSubtitlesMock.mockResolvedValue(null);
    saveCachedSubtitlesMock.mockResolvedValue(undefined);
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  });

  it('transcribes audio attachment and completes message turn with translated notifications', async () => {
    const abortController = new AbortController();
    const updateAndPersistSessions = vi.fn();
    const setActiveSessionId = vi.fn();
    const runMessageLifecycle = vi.fn(async ({ execute }) => execute());

    await act(async () => {
      await sendTranscribeMessage({
        keyToUse: 'api-key',
        activeSessionId: 'session-1',
        generationId: 'generation-1',
        abortController,
        appSettings: createAppSettings({
          isCompletionSoundEnabled: false,
          isCompletionNotificationEnabled: true,
        }),
        currentChatSettings: createChatSettings({
          modelId: 'gemini-3.5-transcribe',
          systemInstruction: '聊天系统提示词',
          transcriptionSystemInstruction: '转写格式要求',
          transcriptionLanguage: 'zh',
          transcriptionWordTimestamps: true,
          transcriptionSpeakerLabels: true,
          transcriptionSmartMode: true,
          transcriptionCustomVocabulary: 'AMC, Gemini',
        }),
        text: '请详细转写',
        files: [fakeAudioFile],
        t: getTranslator('zh'),
        updateAndPersistSessions,
        setActiveSessionId,
        runMessageLifecycle,
      });
    });

    expect(prepareAudioMock).toHaveBeenCalledWith(fakeAudioFile.rawFile, abortController.signal);
    expect(transcribeAudioMock).toHaveBeenCalledWith(
      'api-key',
      expect.anything(),
      'gemini-3.5-transcribe',
      expect.objectContaining({
        prompt: '请详细转写',
        systemInstruction: '转写格式要求',
        language: 'zh',
        wordTimestamps: true,
        speakerLabels: true,
        smartMode: true,
        customVocabulary: 'AMC, Gemini',
      }),
    );
    expect(transcribeAudioMock.mock.calls[0][3]).not.toEqual(
      expect.objectContaining({ systemInstruction: '聊天系统提示词' }),
    );
    expect(runMessageLifecycle).toHaveBeenCalledWith(expect.objectContaining({ errorPrefix: '语音转写错误' }));
    expect(showNotificationMock).toHaveBeenCalledWith(
      '转写已完成',
      expect.objectContaining({
        body: '音频转写已成功完成。',
      }),
    );
  });

  it('throws error when no media files are provided', async () => {
    const updateAndPersistSessions = vi.fn();
    const setActiveSessionId = vi.fn();
    const runMessageLifecycle = vi.fn();

    await expect(
      sendTranscribeMessage({
        keyToUse: 'api-key',
        activeSessionId: 'session-1',
        generationId: 'generation-1',
        abortController: new AbortController(),
        appSettings: createAppSettings(),
        currentChatSettings: createChatSettings({
          modelId: 'gemini-3.5-transcribe',
        }),
        text: '',
        files: [],
        t: getTranslator('zh'),
        updateAndPersistSessions,
        setActiveSessionId,
        runMessageLifecycle,
      }),
    ).rejects.toThrow('Gemini 3.5 Transcribe 需要上传音频或视频文件进行转写。');
  });

  it('transcribes video attachment, extracts audio, and formats SRT subtitles with timestamps', async () => {
    const abortController = new AbortController();
    const updateAndPersistSessions = vi.fn();
    const setActiveSessionId = vi.fn();
    let resultPatch: any = null;
    const runMessageLifecycle = vi.fn(async ({ execute }) => {
      const result = await execute();
      resultPatch = result.patch;
      return result;
    });

    await act(async () => {
      await sendTranscribeMessage({
        keyToUse: 'api-key',
        activeSessionId: 'session-1',
        generationId: 'generation-1',
        abortController,
        appSettings: createAppSettings(),
        currentChatSettings: createChatSettings({
          modelId: 'gemini-3.5-transcribe',
        }),
        text: '',
        files: [fakeVideoFile],
        t: getTranslator('zh'),
        updateAndPersistSessions,
        setActiveSessionId,
        runMessageLifecycle,
      });
    });

    expect(extractAudioFromVideoMock).toHaveBeenCalledWith(fakeVideoFile.rawFile, abortController.signal);
    expect(transcribeAudioWithGeminiMock).toHaveBeenCalledWith(
      'api-key',
      expect.anything(),
      'test-video-audio.wav',
      abortController.signal,
      undefined,
      42,
      expect.objectContaining({
        language: undefined,
        prompt: undefined,
        systemInstruction: undefined,
        customVocabulary: undefined,
      }),
    );
    expect(saveCachedSubtitlesMock).toHaveBeenCalledWith(
      fakeVideoFile,
      expect.objectContaining({
        durationSeconds: 42,
        srtContent: expect.stringContaining('こんにちは世界。'),
        vttContent: expect.stringContaining('こんにちは世界。'),
      }),
    );
    expect(resultPatch.content).toContain('test-video.mp4');
    expect(resultPatch.content).toContain('```srt');
    expect(resultPatch.content).toContain('こんにちは世界。');
  });

  it('reuses cached video subtitles if available without extracting audio', async () => {
    getCachedSubtitlesMock.mockResolvedValueOnce({
      cues: [
        {
          id: 1,
          startSeconds: 0,
          endSeconds: 5,
          startTimeSrt: '00:00:00,000',
          endTimeSrt: '00:00:05,000',
          startTimeVtt: '00:00:00.000',
          endTimeVtt: '00:00:05.000',
          text: '从缓存中读取的字幕',
        },
      ],
      srtContent: '1\n00:00:00,000 --> 00:00:05,000\n从缓存中读取的字幕\n',
      vttContent: 'WEBVTT\n\n1\n00:00:00.000 --> 00:00:05.000\n从缓存中读取的字幕\n',
      durationSeconds: 5,
      createdAt: Date.now(),
    });

    const abortController = new AbortController();
    const updateAndPersistSessions = vi.fn();
    const setActiveSessionId = vi.fn();
    let resultPatch: any = null;
    const runMessageLifecycle = vi.fn(async ({ execute }) => {
      const result = await execute();
      resultPatch = result.patch;
      return result;
    });

    await act(async () => {
      await sendTranscribeMessage({
        keyToUse: 'api-key',
        activeSessionId: 'session-1',
        generationId: 'generation-1',
        abortController,
        appSettings: createAppSettings(),
        currentChatSettings: createChatSettings({
          modelId: 'gemini-3.5-transcribe',
        }),
        text: '',
        files: [fakeVideoFile],
        t: getTranslator('zh'),
        updateAndPersistSessions,
        setActiveSessionId,
        runMessageLifecycle,
      });
    });

    // Audio extraction and Gemini API should NOT be called
    expect(extractAudioFromVideoMock).not.toHaveBeenCalled();
    expect(transcribeAudioWithGeminiMock).not.toHaveBeenCalled();
    expect(resultPatch.content).toContain('从缓存中读取的字幕');
    expect(resultPatch.content).toContain('从本地缓存加载');
  });

  it('transcribes audio attachment to SRT subtitles when transcriptionOutputSubtitles is true, saving to cache', async () => {
    const abortController = new AbortController();
    const updateAndPersistSessions = vi.fn();
    const setActiveSessionId = vi.fn();
    let resultPatch: any = null;
    const runMessageLifecycle = vi.fn(async ({ execute }) => {
      const result = await execute();
      resultPatch = result.patch;
      return result;
    });

    await act(async () => {
      await sendTranscribeMessage({
        keyToUse: 'api-key',
        activeSessionId: 'session-1',
        generationId: 'generation-1',
        abortController,
        appSettings: createAppSettings(),
        currentChatSettings: createChatSettings({
          modelId: 'gemini-3.5-transcribe',
          transcriptionOutputSubtitles: true,
        }),
        text: '',
        files: [fakeAudioFile],
        t: getTranslator('zh'),
        updateAndPersistSessions,
        setActiveSessionId,
        runMessageLifecycle,
      });
    });

    expect(extractAudioFromVideoMock).not.toHaveBeenCalled();
    expect(prepareAudioMock).toHaveBeenCalledWith(fakeAudioFile.rawFile, abortController.signal);
    expect(transcribeAudioWithGeminiMock).toHaveBeenCalledWith(
      'api-key',
      expect.anything(),
      'test-recording-audio.wav',
      abortController.signal,
      undefined,
      600,
      expect.objectContaining({
        language: undefined,
        prompt: undefined,
        systemInstruction: undefined,
        customVocabulary: undefined,
      }),
    );
    expect(saveCachedSubtitlesMock).toHaveBeenCalledWith(
      fakeAudioFile,
      expect.objectContaining({
        durationSeconds: 600,
        srtContent: expect.stringContaining('こんにちは世界。'),
        vttContent: expect.stringContaining('こんにちは世界。'),
      }),
    );
    expect(resultPatch.content).toContain('音频字幕提取结果');
    expect(resultPatch.content).toContain('test-recording.mp3');
    expect(resultPatch.content).toContain('```srt');
    expect(resultPatch.content).toContain('こんにちは世界。');
    expect(resultPatch.content).toContain('逐句时间轴');
  });

  it('reuses cached audio subtitles when transcriptionOutputSubtitles is true', async () => {
    getCachedSubtitlesMock.mockResolvedValueOnce({
      cues: [
        {
          id: 1,
          startSeconds: 0,
          endSeconds: 10,
          startTimeSrt: '00:00:00,000',
          endTimeSrt: '00:00:10,000',
          startTimeVtt: '00:00:00.000',
          endTimeVtt: '00:00:10.000',
          text: '缓存中的音频字幕',
        },
      ],
      srtContent: '1\n00:00:00,000 --> 00:00:10,000\n缓存中的音频字幕\n',
      vttContent: 'WEBVTT\n\n1\n00:00:00.000 --> 00:00:10.000\n缓存中的音频字幕\n',
      durationSeconds: 10,
      createdAt: Date.now(),
    });

    const abortController = new AbortController();
    const updateAndPersistSessions = vi.fn();
    const setActiveSessionId = vi.fn();
    let resultPatch: any = null;
    const runMessageLifecycle = vi.fn(async ({ execute }) => {
      const result = await execute();
      resultPatch = result.patch;
      return result;
    });

    await act(async () => {
      await sendTranscribeMessage({
        keyToUse: 'api-key',
        activeSessionId: 'session-1',
        generationId: 'generation-1',
        abortController,
        appSettings: createAppSettings(),
        currentChatSettings: createChatSettings({
          modelId: 'gemini-3.5-transcribe',
          transcriptionOutputSubtitles: true,
        }),
        text: '',
        files: [fakeAudioFile],
        t: getTranslator('zh'),
        updateAndPersistSessions,
        setActiveSessionId,
        runMessageLifecycle,
      });
    });

    expect(prepareAudioMock).not.toHaveBeenCalled();
    expect(transcribeAudioWithGeminiMock).not.toHaveBeenCalled();
    expect(resultPatch.content).toContain('音频字幕提取结果');
    expect(resultPatch.content).toContain('缓存中的音频字幕');
    expect(resultPatch.content).toContain('从本地缓存加载');
  });

  it('rejects audio longer than 30 minutes when word timestamps are enabled', async () => {
    getAudioDurationSecondsMock.mockResolvedValue(31 * 60);

    await expect(
      sendTranscribeMessage({
        keyToUse: 'api-key',
        activeSessionId: 'session-1',
        generationId: 'generation-1',
        abortController: new AbortController(),
        appSettings: createAppSettings(),
        currentChatSettings: createChatSettings({
          modelId: 'gemini-3.5-transcribe',
          transcriptionWordTimestamps: true,
        }),
        text: '',
        files: [fakeAudioFile],
        t: getTranslator('zh'),
        updateAndPersistSessions: vi.fn(),
        setActiveSessionId: vi.fn(),
        runMessageLifecycle: vi.fn(async ({ execute }) => execute()),
      }),
    ).rejects.toThrow('30 分钟');

    expect(transcribeAudioMock).not.toHaveBeenCalled();
  });

  it('rejects audio longer than 30 minutes when speaker labels are enabled', async () => {
    getAudioDurationSecondsMock.mockResolvedValue(45 * 60);

    await expect(
      sendTranscribeMessage({
        keyToUse: 'api-key',
        activeSessionId: 'session-1',
        generationId: 'generation-1',
        abortController: new AbortController(),
        appSettings: createAppSettings(),
        currentChatSettings: createChatSettings({
          modelId: 'gemini-3.5-transcribe',
          transcriptionSpeakerLabels: true,
        }),
        text: '',
        files: [fakeAudioFile],
        t: getTranslator('zh'),
        updateAndPersistSessions: vi.fn(),
        setActiveSessionId: vi.fn(),
        runMessageLifecycle: vi.fn(async ({ execute }) => execute()),
      }),
    ).rejects.toThrow('30 分钟');
  });

  it('allows audio between 30 and 60 minutes when no limiting features are enabled', async () => {
    getAudioDurationSecondsMock.mockResolvedValue(45 * 60);

    await expect(
      sendTranscribeMessage({
        keyToUse: 'api-key',
        activeSessionId: 'session-1',
        generationId: 'generation-1',
        abortController: new AbortController(),
        appSettings: createAppSettings(),
        currentChatSettings: createChatSettings({ modelId: 'gemini-3.5-transcribe' }),
        text: '',
        files: [fakeAudioFile],
        t: getTranslator('zh'),
        updateAndPersistSessions: vi.fn(),
        setActiveSessionId: vi.fn(),
        runMessageLifecycle: vi.fn(async ({ execute }) => execute()),
      }),
    ).resolves.toBeUndefined();

    expect(transcribeAudioMock).toHaveBeenCalledTimes(1);
  });

  it('rejects audio longer than 60 minutes even without limiting features', async () => {
    getAudioDurationSecondsMock.mockResolvedValue(61 * 60);

    await expect(
      sendTranscribeMessage({
        keyToUse: 'api-key',
        activeSessionId: 'session-1',
        generationId: 'generation-1',
        abortController: new AbortController(),
        appSettings: createAppSettings(),
        currentChatSettings: createChatSettings({ modelId: 'gemini-3.5-transcribe' }),
        text: '',
        files: [fakeAudioFile],
        t: getTranslator('zh'),
        updateAndPersistSessions: vi.fn(),
        setActiveSessionId: vi.fn(),
        runMessageLifecycle: vi.fn(async ({ execute }) => execute()),
      }),
    ).rejects.toThrow('60 分钟');

    expect(transcribeAudioMock).not.toHaveBeenCalled();
  });

  it('skips the duration guard when audio duration cannot be determined', async () => {
    getAudioDurationSecondsMock.mockResolvedValue(null);

    await expect(
      sendTranscribeMessage({
        keyToUse: 'api-key',
        activeSessionId: 'session-1',
        generationId: 'generation-1',
        abortController: new AbortController(),
        appSettings: createAppSettings(),
        currentChatSettings: createChatSettings({
          modelId: 'gemini-3.5-transcribe',
          transcriptionWordTimestamps: true,
        }),
        text: '',
        files: [fakeAudioFile],
        t: getTranslator('zh'),
        updateAndPersistSessions: vi.fn(),
        setActiveSessionId: vi.fn(),
        runMessageLifecycle: vi.fn(async ({ execute }) => execute()),
      }),
    ).resolves.toBeUndefined();

    expect(transcribeAudioMock).toHaveBeenCalledTimes(1);
  });
});

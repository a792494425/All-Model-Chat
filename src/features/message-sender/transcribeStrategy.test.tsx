import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTranslator } from '@/i18n/translations';
import { createAppSettings, createChatSettings } from '@/test/data/factories';
import type { UploadedFile } from '@/types';

const { transcribeAudioMock, prepareAudioMock, showNotificationMock } = vi.hoisted(() => ({
  transcribeAudioMock: vi.fn(),
  prepareAudioMock: vi.fn(),
  showNotificationMock: vi.fn(),
}));

vi.mock('@/services/api/generation/audioApi', () => ({
  transcribeAudioApi: transcribeAudioMock,
}));

vi.mock('@/features/audio/audioCompression', () => ({
  prepareAudioForGeminiTranscription: prepareAudioMock,
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

  beforeEach(() => {
    vi.clearAllMocks();
    prepareAudioMock.mockImplementation(async (file) => file);
    transcribeAudioMock.mockResolvedValue('这是转录出来的文字内容');
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  });

  it('transcribes audio attachment and completes message turn with translated notifications', async () => {
    const updateAndPersistSessions = vi.fn();
    const setActiveSessionId = vi.fn();
    const runMessageLifecycle = vi.fn(async ({ execute }) => execute());

    await act(async () => {
      await sendTranscribeMessage({
        keyToUse: 'api-key',
        activeSessionId: 'session-1',
        generationId: 'generation-1',
        abortController: new AbortController(),
        appSettings: createAppSettings({
          isCompletionSoundEnabled: false,
          isCompletionNotificationEnabled: true,
        }),
        currentChatSettings: createChatSettings({
          modelId: 'gemini-3.5-transcribe',
          systemInstruction: '转写格式要求',
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

    expect(prepareAudioMock).toHaveBeenCalledTimes(1);
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
    expect(runMessageLifecycle).toHaveBeenCalledWith(
      expect.objectContaining({ errorPrefix: '语音转写错误' }),
    );
    expect(showNotificationMock).toHaveBeenCalledWith(
      '转写已完成',
      expect.objectContaining({
        body: '音频转写已成功完成。',
      }),
    );
  });

  it('throws error when no audio files are provided', async () => {
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
    ).rejects.toThrow('Gemini 3.5 Transcribe 需要上传音频附件进行转写。');
  });
});

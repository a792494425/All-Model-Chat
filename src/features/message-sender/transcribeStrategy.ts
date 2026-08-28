import { type AppSettings, type ChatSettings as IndividualChatSettings, type UploadedFile } from '@/types';
import { transcribeAudioApi } from '@/services/api/generation/audioApi';
import { prepareAudioForGeminiTranscription } from '@/features/audio/audioCompression';
import { isAudioMimeType } from '@/utils/file/fileTypeClassification';
import { runOptimisticMessagePipeline, type MessageLifecycleRunner } from './messagePipeline';
import type { MessageSenderTranslator, SessionsUpdater } from './messageSenderTypes';

interface SendTranscribeMessageParams {
  keyToUse: string;
  activeSessionId: string | null;
  generationId: string;
  abortController: AbortController;
  appSettings: AppSettings;
  currentChatSettings: IndividualChatSettings;
  text: string;
  files: UploadedFile[];
  shouldLockKey?: boolean;
  updateAndPersistSessions: SessionsUpdater;
  setActiveSessionId: (id: string | null) => void;
  runMessageLifecycle: MessageLifecycleRunner;
  t: MessageSenderTranslator;
}

export const sendTranscribeMessage = async ({
  keyToUse,
  activeSessionId,
  generationId,
  abortController,
  appSettings,
  currentChatSettings,
  text,
  files,
  shouldLockKey,
  updateAndPersistSessions,
  setActiveSessionId,
  runMessageLifecycle,
  t,
}: SendTranscribeMessageParams) => {
  const audioFiles = files.filter((file) => isAudioMimeType(file.type));
  if (audioFiles.length === 0) {
    throw new Error(t('messageSenderTranscribeRequiresAudio'));
  }

  await runOptimisticMessagePipeline({
    activeSessionId,
    appSettings,
    currentChatSettings,
    updateAndPersistSessions,
    setActiveSessionId,
    text,
    files,
    generationId,
    shouldLockKey,
    keyToLock: keyToUse,
    abortController,
    errorPrefix: t('messageSenderTranscribeErrorPrefix'),
    runMessageLifecycle,
    execute: async () => {
      const results: string[] = [];

      for (const audioFile of audioFiles) {
        if (abortController.signal.aborted) {
          const abortError = new Error('aborted');
          abortError.name = 'AbortError';
          throw abortError;
        }

        let fileToTranscribe: File;
        if (audioFile.rawFile instanceof File) {
          fileToTranscribe = await prepareAudioForGeminiTranscription(audioFile.rawFile);
        } else if (audioFile.rawFile instanceof Blob) {
          const named = new File([audioFile.rawFile], audioFile.name || 'audio.mp3', {
            type: audioFile.type || audioFile.rawFile.type || 'audio/mpeg',
          });
          fileToTranscribe = await prepareAudioForGeminiTranscription(named);
        } else {
          throw new Error('Audio file data is missing or could not be loaded.');
        }

        const promptText = text.trim() ? text.trim() : undefined;
        const transcribedText = await transcribeAudioApi(
          keyToUse,
          fileToTranscribe,
          currentChatSettings.modelId,
          {
            prompt: promptText,
            systemInstruction: currentChatSettings.systemInstruction?.trim() || undefined,
            language: currentChatSettings.transcriptionLanguage || undefined,
            wordTimestamps: currentChatSettings.transcriptionWordTimestamps,
            speakerLabels: currentChatSettings.transcriptionSpeakerLabels,
            smartMode: currentChatSettings.transcriptionSmartMode,
            customVocabulary: currentChatSettings.transcriptionCustomVocabulary?.trim() || undefined,
            abortSignal: abortController.signal,
          },
        );

        if (abortController.signal.aborted) {
          const abortError = new Error('aborted');
          abortError.name = 'AbortError';
          throw abortError;
        }

        const outputText = transcribedText.trim() || t('transcriptionEmptyResult');
        if (audioFiles.length > 1) {
          results.push(`### 📄 ${audioFile.name}\n\n${outputText}`);
        } else {
          results.push(outputText);
        }
      }

      const finalContent = results.join('\n\n---\n\n') || t('transcriptionEmptyResult');

      return {
        patch: {
          isLoading: false,
          content: finalContent,
          generationEndTime: new Date(),
        },
        feedback: {
          notification: {
            title: t('messageSenderTranscribeReadyTitle'),
            body: t('messageSenderTranscribeReadyBody'),
          },
        },
      };
    },
  });
};

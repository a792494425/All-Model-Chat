import type { TaskSuggestionMode } from '@/types';
import type { MediaNavKind } from '@/stores/mediaNavStore';
import { type translations } from '@/i18n/translations';

interface GetChatInputPlaceholderOptions {
  isTranscribeModel?: boolean;
  taskSuggestionMode?: TaskSuggestionMode | null;
  activeMediaNavKind?: MediaNavKind | null;
  isLiveArtifactsPromptActive?: boolean;
  t: (key: keyof typeof translations) => string;
}

const TASK_PLACEHOLDER_KEY_MAP: Record<TaskSuggestionMode, keyof typeof translations> = {
  translate: 'chatInputPlaceholderTranslate',
  ocr: 'chatInputPlaceholderOcr',
  asr: 'chatInputPlaceholderAsr',
  srt: 'chatInputPlaceholderSrt',
  explain: 'chatInputPlaceholderExplain',
  summarize: 'chatInputPlaceholderSummarize',
};

const TASK_LIVE_ARTIFACTS_PLACEHOLDER_KEY_MAP: Record<TaskSuggestionMode, keyof typeof translations> = {
  translate: 'chatInputPlaceholderLiveArtifactsTranslate',
  ocr: 'chatInputPlaceholderLiveArtifactsOcr',
  asr: 'chatInputPlaceholderLiveArtifactsAsr',
  srt: 'chatInputPlaceholderLiveArtifactsSrt',
  explain: 'chatInputPlaceholderLiveArtifactsExplain',
  summarize: 'chatInputPlaceholderLiveArtifactsSummarize',
};

const MEDIA_NAV_PLACEHOLDER_KEY_MAP: Record<MediaNavKind, keyof typeof translations> = {
  image: 'chatInputPlaceholderImageNav',
  pdf: 'chatInputPlaceholderPdfNav',
  video: 'chatInputPlaceholderVideoNav',
  audio: 'chatInputPlaceholderAudioNav',
};

const MEDIA_NAV_LIVE_ARTIFACTS_PLACEHOLDER_KEY_MAP: Record<MediaNavKind, keyof typeof translations> = {
  image: 'chatInputPlaceholderLiveArtifactsImageNav',
  pdf: 'chatInputPlaceholderLiveArtifactsPdfNav',
  video: 'chatInputPlaceholderLiveArtifactsVideoNav',
  audio: 'chatInputPlaceholderLiveArtifactsAudioNav',
};

export const getChatInputPlaceholder = ({
  isTranscribeModel,
  taskSuggestionMode,
  activeMediaNavKind,
  isLiveArtifactsPromptActive,
  t,
}: GetChatInputPlaceholderOptions): string => {
  if (isTranscribeModel) {
    return t('chatInputPlaceholderTranscribe');
  }

  if (activeMediaNavKind) {
    if (isLiveArtifactsPromptActive) {
      const liveMediaKey = MEDIA_NAV_LIVE_ARTIFACTS_PLACEHOLDER_KEY_MAP[activeMediaNavKind];
      if (liveMediaKey) return t(liveMediaKey);
    }
    const mediaKey = MEDIA_NAV_PLACEHOLDER_KEY_MAP[activeMediaNavKind];
    if (mediaKey) return t(mediaKey);
  }

  if (isLiveArtifactsPromptActive && taskSuggestionMode) {
    const combinedKey = TASK_LIVE_ARTIFACTS_PLACEHOLDER_KEY_MAP[taskSuggestionMode];
    if (combinedKey) {
      return t(combinedKey);
    }
  }

  if (taskSuggestionMode) {
    const taskKey = TASK_PLACEHOLDER_KEY_MAP[taskSuggestionMode];
    if (taskKey) {
      return t(taskKey);
    }
  }

  if (isLiveArtifactsPromptActive) {
    return t('chatInputPlaceholderLiveArtifacts');
  }

  return t('chatInputPlaceholder');
};

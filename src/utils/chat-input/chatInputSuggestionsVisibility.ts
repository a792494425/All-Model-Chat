import type { ChatSettings } from '@/types';

export interface ChatSuggestionsVisibilityParams {
  canGenerateSuggestions: boolean;
  isExpanded: boolean;
  isSessionEmpty: boolean;
  firstUserMessage?: { text?: string; content?: string } | null;
  currentChatSettings?: ChatSettings | null;
}

export const didFirstMessageSelectSuggestion = (
  firstUserMessage?: { text?: string; content?: string } | null,
  currentChatSettings?: ChatSettings | null,
): boolean => {
  if (!firstUserMessage && !currentChatSettings) return false;
  const text = firstUserMessage?.text || firstUserMessage?.content || '';

  const hasLiveArtifactsDirective =
    text.includes('Live Artifacts') ||
    text.includes('HTML 卡片') ||
    text.includes('HTML 作品') ||
    text.includes('HTML 产物') ||
    text.includes('排版指令');

  const hasTaskDirective = text.includes('[Task Directive -');

  const hasActiveSettings = Boolean(
    currentChatSettings?.isVisualFormattingActive ||
    currentChatSettings?.isImageNavEnabled ||
    currentChatSettings?.isPdfNavEnabled ||
    currentChatSettings?.isVideoNavEnabled ||
    currentChatSettings?.isAudioNavEnabled ||
    currentChatSettings?.taskSuggestionMode ||
    currentChatSettings?.visionPromptMode,
  );

  return hasLiveArtifactsDirective || hasTaskDirective || hasActiveSettings;
};

export const shouldShowChatSuggestions = (params: ChatSuggestionsVisibilityParams): boolean => {
  const { canGenerateSuggestions, isExpanded, isSessionEmpty, firstUserMessage, currentChatSettings } = params;

  if (!canGenerateSuggestions || isExpanded) {
    return false;
  }

  if (isSessionEmpty) {
    return true;
  }

  return didFirstMessageSelectSuggestion(firstUserMessage, currentChatSettings);
};

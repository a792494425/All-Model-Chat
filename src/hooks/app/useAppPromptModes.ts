import { type Dispatch, type SetStateAction, useCallback } from 'react';
import type { SupportedLanguage } from '@/i18n/languageRegistry';
import { loadLiveArtifactsSystemPrompt } from '@/features/prompts/promptRegistry';
import { focusChatInput } from '@/utils/chat-input/focus';
import type { AppSettings, ChatSettings, InputCommand, SavedChatSession } from '@/types';
import { useVisionPromptModes } from './useVisionPromptModes';
import { useLiveUiPromptMode } from './useLiveUiPromptMode';

interface UseAppPromptModesOptions {
  language?: SupportedLanguage;
  appSettings: {
    systemInstruction?: string | null;
    isLiveArtifactsEnabled?: boolean;
    liveArtifactsPromptMode?: AppSettings['liveArtifactsPromptMode'];
    liveArtifactsSystemPrompt?: string | null;
    liveArtifactsSystemPrompts?: AppSettings['liveArtifactsSystemPrompts'];
  };
  setAppSettings: Dispatch<SetStateAction<AppSettings>>;
  activeChat: SavedChatSession | undefined;
  activeSessionId: string | null;
  currentChatSettings: ChatSettings;
  setCurrentChatSettings: (updater: (prev: ChatSettings) => ChatSettings) => void;
  handleSendMessage: (args: { text: string }) => void;
  setCommandedInput: (command: InputCommand) => void;
}

export const useAppPromptModes = ({
  language = 'zh',
  appSettings,
  setAppSettings,
  activeChat,
  activeSessionId,
  currentChatSettings,
  setCurrentChatSettings,
  handleSendMessage,
  setCommandedInput,
}: UseAppPromptModesOptions) => {
  const {
    isLiveArtifactsPromptActive,
    isLiveArtifactsPromptBusy,
    handleLoadLiveArtifactsPromptAndSave,
    handleDeactivateLiveArtifactsPrompt,
    toggleLiveArtifactsPrompt,
  } = useLiveUiPromptMode({
    language,
    appSettings,
    setAppSettings,
    activeChat,
    activeSessionId,
    currentChatSettings,
    setCurrentChatSettings,
    loadLiveArtifactsPrompt: (lang, mode) => loadLiveArtifactsSystemPrompt(lang, mode),
  });

  const { handleToggleBBoxMode, handleToggleGuideMode } = useVisionPromptModes({
    currentChatSettings,
    setAppSettings,
    setCurrentChatSettings,
  });

  const handleSuggestionClick = useCallback(
    async (type: 'homepage' | 'organize' | 'follow-up' | 'follow-up-fill', text: string) => {
      if (type === 'organize') {
        await toggleLiveArtifactsPrompt({ focusDelay: 50, focusCaret: 'end' });
        return;
      }

      if (type === 'follow-up') {
        handleSendMessage({ text });
        return;
      }

      setCommandedInput({ text: `${text}\n`, id: Date.now() });
      focusChatInput(50, { caret: 'end' });
    },
    [handleSendMessage, setCommandedInput, toggleLiveArtifactsPrompt],
  );

  return {
    handleLoadLiveArtifactsPromptAndSave,
    handleDeactivateLiveArtifactsPrompt,
    handleToggleBBoxMode,
    handleToggleGuideMode,
    handleSuggestionClick,
    isLiveArtifactsPromptActive,
    isLiveArtifactsPromptBusy,
  };
};

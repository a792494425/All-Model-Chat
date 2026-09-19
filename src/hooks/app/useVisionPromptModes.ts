import { type Dispatch, type SetStateAction, useCallback } from 'react';
import { isBboxSystemInstruction, isHdGuideSystemInstruction } from '@/features/prompts/promptRegistry';
import type { AppSettings, ChatSettings, VisionPromptMode } from '@/types';

interface UseVisionPromptModesOptions {
  currentChatSettings: ChatSettings;
  setAppSettings: Dispatch<SetStateAction<AppSettings>>;
  setCurrentChatSettings: (updater: (prev: ChatSettings) => ChatSettings) => void;
}

export const useVisionPromptModes = ({
  currentChatSettings,
  setAppSettings,
  setCurrentChatSettings,
}: UseVisionPromptModesOptions) => {
  const setCodePromptModeSettings = useCallback(
    (isCodeExecutionEnabled: boolean, visionPromptMode: VisionPromptMode = null) => {
      setAppSettings((prev) => ({
        ...prev,
        visionPromptMode,
        isCodeExecutionEnabled,
      }));
      setCurrentChatSettings((prev) => {
        if (prev.visionPromptMode === visionPromptMode && prev.isCodeExecutionEnabled === isCodeExecutionEnabled) {
          return prev;
        }
        return {
          ...prev,
          visionPromptMode,
          isCodeExecutionEnabled,
        };
      });
    },
    [setAppSettings, setCurrentChatSettings],
  );

  const toggleCodePromptMode = useCallback(
    async (isCurrentlyActive: boolean, mode: VisionPromptMode) => {
      if (isCurrentlyActive) {
        setCodePromptModeSettings(false, null);
        return;
      }

      setCodePromptModeSettings(true, mode);
    },
    [setCodePromptModeSettings],
  );

  const handleToggleBBoxMode = useCallback(async () => {
    const isCurrentlyActive =
      currentChatSettings.visionPromptMode === 'bbox' || isBboxSystemInstruction(currentChatSettings.systemInstruction);
    await toggleCodePromptMode(isCurrentlyActive, 'bbox');
  }, [currentChatSettings.systemInstruction, currentChatSettings.visionPromptMode, toggleCodePromptMode]);

  const handleToggleGuideMode = useCallback(async () => {
    const isCurrentlyActive =
      currentChatSettings.visionPromptMode === 'hdGuide' ||
      isHdGuideSystemInstruction(currentChatSettings.systemInstruction);
    await toggleCodePromptMode(isCurrentlyActive, 'hdGuide');
  }, [currentChatSettings.systemInstruction, currentChatSettings.visionPromptMode, toggleCodePromptMode]);

  return {
    handleToggleBBoxMode,
    handleToggleGuideMode,
  };
};

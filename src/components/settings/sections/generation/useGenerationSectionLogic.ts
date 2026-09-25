import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppSettings } from '@/types';
import { getCachedModelCapabilities } from '@/stores/modelCapabilitiesStore';
import { useSettingsUiStore } from '@/stores/settingsUiStore';

interface UseGenerationSectionLogicOptions {
  modelId: string;
  systemInstruction: string;
  stopSequences?: string[];
  onUpdateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export const useGenerationSectionLogic = ({
  modelId,
  systemInstruction,
  stopSequences,
  onUpdateSetting,
}: UseGenerationSectionLogicOptions) => {
  const isAdvancedModeEnabled = useSettingsUiStore((state) => state.isAdvancedModeEnabled);
  const [isSystemPromptExpanded, setIsSystemPromptExpanded] = useState(false);
  const [localPrompt, setLocalPrompt] = useState(systemInstruction);
  const [localStopSequences, setLocalStopSequences] = useState(() =>
    Array.isArray(stopSequences) ? stopSequences.join(', ') : '',
  );
  const skipNextPromptBlurCommitRef = useRef(false);

  useEffect(() => {
    setLocalPrompt(systemInstruction);
  }, [systemInstruction]);

  useEffect(() => {
    setLocalStopSequences(Array.isArray(stopSequences) ? stopSequences.join(', ') : '');
  }, [stopSequences]);

  const commitPromptIfNeeded = useCallback(() => {
    if (localPrompt !== systemInstruction) {
      onUpdateSetting('systemInstruction', localPrompt);
    }
  }, [localPrompt, systemInstruction, onUpdateSetting]);

  const handleOpenExpand = useCallback(() => {
    setIsSystemPromptExpanded(true);
  }, []);

  const handleCloseExpand = useCallback(() => {
    setIsSystemPromptExpanded(false);
  }, []);

  const handleSaveExpanded = useCallback(
    (newPrompt: string) => {
      setLocalPrompt(newPrompt);
      onUpdateSetting('systemInstruction', newPrompt);
    },
    [onUpdateSetting],
  );

  const handleClearPrompt = useCallback(() => {
    setLocalPrompt('');
    if (localPrompt !== '' || systemInstruction !== '') {
      onUpdateSetting('systemInstruction', '');
    }
  }, [localPrompt, systemInstruction, onUpdateSetting]);

  const handleStopSequencesBlur = useCallback(() => {
    const parsed = localStopSequences
      .split(',')
      .map((seq) => seq.trim())
      .filter(Boolean);
    onUpdateSetting('stopSequences', parsed.length > 0 ? parsed : undefined);
  }, [localStopSequences, onUpdateSetting]);

  const capabilities = getCachedModelCapabilities(modelId);
  const isNativeAudio = capabilities.isNativeAudioModel;
  const isSystemPromptSet = localPrompt.trim() !== '';

  return {
    isAdvancedModeEnabled,
    isSystemPromptExpanded,
    localPrompt,
    setLocalPrompt,
    localStopSequences,
    setLocalStopSequences,
    skipNextPromptBlurCommitRef,
    commitPromptIfNeeded,
    handleOpenExpand,
    handleCloseExpand,
    handleSaveExpanded,
    handleClearPrompt,
    handleStopSequencesBlur,
    capabilities,
    isNativeAudio,
    isSystemPromptSet,
  };
};

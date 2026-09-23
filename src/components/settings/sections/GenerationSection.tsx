import React from 'react';
import type { AppSettings } from '@/types';
import { useGenerationSectionLogic } from './generation/useGenerationSectionLogic';
import { TranscribeInfoCard } from './generation/TranscribeInfoCard';
import { SystemPromptCard } from './generation/SystemPromptCard';
import { BasicGenerationParamsCard } from './generation/BasicGenerationParamsCard';
import { AdvancedGenerationParamsCard } from './generation/AdvancedGenerationParamsCard';
import { AutoTitleCard } from './generation/AutoTitleCard';

interface GenerationSectionProps {
  isThirdPartyMode?: boolean;
  modelId: string;
  currentSettings: AppSettings;
  onUpdateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export const GenerationSection: React.FC<GenerationSectionProps> = ({
  isThirdPartyMode = false,
  modelId,
  currentSettings,
  onUpdateSetting,
}) => {
  const {
    systemInstruction,
    temperature,
    topP,
    mediaResolution,
    maxOutputTokens,
    stopSequences,
    presencePenalty,
    frequencyPenalty,
    seed,
  } = currentSettings;

  const topK = currentSettings.topK ?? 64;
  const isRawModeEnabled = currentSettings.isRawModeEnabled ?? false;
  const hideThinkingInContext = currentSettings.hideThinkingInContext ?? false;
  const alwaysKeepThinkingInContext = currentSettings.alwaysKeepThinkingInContext ?? false;

  const {
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
  } = useGenerationSectionLogic({
    modelId,
    systemInstruction,
    stopSequences,
    onUpdateSetting,
  });

  if (capabilities.isTranscribeModel || capabilities.isLiveTranscribe) {
    return <TranscribeInfoCard />;
  }

  return (
    <div className="space-y-5">
      <SystemPromptCard
        localPrompt={localPrompt}
        setLocalPrompt={setLocalPrompt}
        isSystemPromptSet={isSystemPromptSet}
        isSystemPromptExpanded={isSystemPromptExpanded}
        skipNextPromptBlurCommitRef={skipNextPromptBlurCommitRef}
        commitPromptIfNeeded={commitPromptIfNeeded}
        handleOpenExpand={handleOpenExpand}
        handleCloseExpand={handleCloseExpand}
        handleSaveExpanded={handleSaveExpanded}
        handleClearPrompt={handleClearPrompt}
      />

      <BasicGenerationParamsCard temperature={temperature} onUpdateSetting={onUpdateSetting} />

      {isAdvancedModeEnabled && (
        <AdvancedGenerationParamsCard
          modelId={modelId}
          isThirdPartyMode={isThirdPartyMode}
          topP={topP}
          topK={topK}
          maxOutputTokens={maxOutputTokens}
          localStopSequences={localStopSequences}
          setLocalStopSequences={setLocalStopSequences}
          handleStopSequencesBlur={handleStopSequencesBlur}
          presencePenalty={presencePenalty}
          frequencyPenalty={frequencyPenalty}
          seed={seed}
          mediaResolution={mediaResolution}
          isRawModeEnabled={isRawModeEnabled}
          hideThinkingInContext={hideThinkingInContext}
          alwaysKeepThinkingInContext={alwaysKeepThinkingInContext}
          capabilities={capabilities}
          isNativeAudio={isNativeAudio}
          onUpdateSetting={onUpdateSetting}
        />
      )}

      <AutoTitleCard currentSettings={currentSettings} onUpdateSetting={onUpdateSetting} />
    </div>
  );
};

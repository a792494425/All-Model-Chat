import React from 'react';
import type { ModelOption, ThirdPartyApiProtocol } from '@/types';
import { useModelConfigLogic } from './model-config/useModelConfigLogic';
import { ModelConfigHeader } from './model-config/ModelConfigHeader';
import { ModelConfigInfoTab } from './model-config/ModelConfigInfoTab';
import { ModelConfigParametersTab } from './model-config/ModelConfigParametersTab';
import { ModelConfigFooter } from './model-config/ModelConfigFooter';

export interface ModelConfigModalProps {
  isOpen: boolean;
  model: ModelOption | null;
  protocol?: ThirdPartyApiProtocol | 'gemini';
  existingModelIds?: string[];
  onClose: () => void;
  onSave: (updates: Partial<ModelOption>) => void;
}

export const ModelConfigModal: React.FC<ModelConfigModalProps> = ({
  isOpen,
  model,
  protocol,
  existingModelIds = [],
  onClose,
  onSave,
}) => {
  const logic = useModelConfigLogic({
    model,
    protocol,
    existingModelIds,
    onClose,
    onSave,
  });

  if (!isOpen || !model) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-2xl border border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)] p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        <ModelConfigHeader
          modelId={model.id}
          modelName={model.name}
          name={logic.name}
          id={logic.id}
          activeTab={logic.activeTab}
          setActiveTab={logic.setActiveTab}
          onClose={onClose}
        />

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4">
          {logic.activeTab === 'info' ? (
            <ModelConfigInfoTab
              name={logic.name}
              setName={logic.setName}
              id={logic.id}
              setId={logic.setId}
              copiedId={logic.copiedId}
              handleCopyId={logic.handleCopyId}
              isPinned={logic.isPinned}
              setIsPinned={logic.setIsPinned}
              contextWindow={logic.contextWindow}
              setContextWindow={logic.setContextWindow}
              capabilities={logic.capabilities}
              toggleCapability={logic.toggleCapability}
            />
          ) : (
            <ModelConfigParametersTab
              temperature={logic.temperature}
              setTemperature={logic.setTemperature}
              topP={logic.topP}
              setTopP={logic.setTopP}
              maxOutputTokens={logic.maxOutputTokens}
              setMaxOutputTokens={logic.setMaxOutputTokens}
              topK={logic.topK}
              setTopK={logic.setTopK}
              presencePenalty={logic.presencePenalty}
              setPresencePenalty={logic.setPresencePenalty}
              frequencyPenalty={logic.frequencyPenalty}
              setFrequencyPenalty={logic.setFrequencyPenalty}
              stopSequencesStr={logic.stopSequencesStr}
              setStopSequencesStr={logic.setStopSequencesStr}
              seed={logic.seed}
              setSeed={logic.setSeed}
              reasoningEffort={logic.reasoningEffort}
              setReasoningEffort={logic.setReasoningEffort}
              thinkingBudget={logic.thinkingBudget}
              setThinkingBudget={logic.setThinkingBudget}
              isOpenAI={logic.isOpenAI}
            />
          )}
        </div>

        <ModelConfigFooter
          onResetParameters={logic.handleResetParameters}
          onClose={onClose}
          onSave={logic.handleSave}
        />
      </div>
    </div>
  );
};

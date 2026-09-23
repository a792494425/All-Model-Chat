import React from 'react';
import { type ApiMode, type AppSettings, type ModelOption } from '@/types';
import { ModelSelector } from '@/components/settings/controls/ModelSelector';
import { LiveUiSection } from './LiveUiSection';
import { GenerationSection } from './GenerationSection';
import { LanguageVoiceSection } from './LanguageVoiceSection';
import { SelectionAskModelSection } from './SelectionAskModelSection';
import type { SettingsUpdateHandler } from '@/components/settings/settingsTypes';

interface ModelsSectionProps {
  modelId: string;
  setModelId: (id: string, apiMode?: ApiMode) => void;
  availableModels: ModelOption[];
  setAvailableModels: (models: ModelOption[]) => void;
  defaultModels?: ModelOption[];
  defaultApiMode?: ApiMode;
  isThirdPartyMode?: boolean;
  currentSettings: AppSettings;
  currentThemeId: string;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
  /** Badge text for the selected model; see ModelCatalogList.activeBadgeLabel. */
  activeModelBadgeLabel?: string;
}

export const ModelsSection: React.FC<ModelsSectionProps> = ({
  modelId,
  setModelId,
  availableModels,
  setAvailableModels,
  defaultModels,
  defaultApiMode,
  isThirdPartyMode = false,
  currentSettings,
  currentThemeId,
  onUpdateSettings,
  activeModelBadgeLabel,
}) => {
  const updateSetting: SettingsUpdateHandler = (key, value) => {
    onUpdateSettings({ [key]: value } as Partial<AppSettings>);
  };
  const geminiOnlyModels = availableModels
    .filter((model) => !model.apiMode || model.apiMode === 'gemini-native')
    .map((model) => {
      const nextModel = { ...model };
      delete nextModel.apiMode;
      return nextModel;
    });

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div data-settings-item="models-primary" className="space-y-4">
        <ModelSelector
          availableModels={availableModels}
          selectedModelId={modelId}
          onSelectModel={setModelId}
          setAvailableModels={setAvailableModels}
          defaultModels={defaultModels}
          defaultApiMode={defaultApiMode}
          activeBadgeLabel={activeModelBadgeLabel}
        />
      </div>

      <div className="space-y-4">
        <GenerationSection
          isThirdPartyMode={isThirdPartyMode}
          modelId={modelId}
          currentSettings={currentSettings}
          onUpdateSetting={updateSetting}
        />
      </div>

      {!isThirdPartyMode && (
        <div className="space-y-5">
          <SelectionAskModelSection
            settings={currentSettings}
            onUpdate={updateSetting}
            availableModels={availableModels}
          />

          <div data-settings-item="models-live-artifacts">
            <LiveUiSection
              currentSettings={currentSettings}
              currentThemeId={currentThemeId}
              onUpdateSetting={updateSetting}
            />
          </div>

          <div data-settings-item="models-tts-voice">
            <LanguageVoiceSection
              availableModels={geminiOnlyModels}
              currentSettings={currentSettings}
              onUpdateSetting={updateSetting}
            />
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { ChevronDown, Shield, Sparkles, Sliders, Layers, Bot, SlidersHorizontal, ArrowUpRight } from 'lucide-react';
import { type ApiMode, type AppSettings, type ModelOption } from '@/types';
import { useSettingsUiStore } from '@/stores/settingsUiStore';
import { ModelSelector } from '@/components/settings/controls/ModelSelector';
import {
  SETTINGS_SECTION_CARD_CLASS,
  SETTINGS_SEGMENTED_ACTIVE_CLASS,
  SETTINGS_SEGMENTED_IDLE_CLASS,
  SETTINGS_SEGMENTED_TRACK_CLASS,
} from '@/constants/designTokens';
import { LiveArtifactsSection } from './LiveArtifactsSection';
import { GenerationSection } from './GenerationSection';
import { LanguageVoiceSection } from './LanguageVoiceSection';
import { SafetySection } from './SafetySection';
import { SelectionAskModelSection } from './SelectionAskModelSection';
import type { SettingsUpdateHandler } from '@/components/settings/settingsTypes';

type ModelsSubTab = 'all' | 'catalog' | 'generation' | 'features' | 'safety';

const SUB_TABS: Array<{ id: ModelsSubTab; labelKey: string; icon: React.ElementType }> = [
  { id: 'all', labelKey: 'modelsSubNavAll', icon: Layers },
  { id: 'catalog', labelKey: 'modelsSubNavCatalog', icon: Bot },
  { id: 'generation', labelKey: 'modelsSubNavGeneration', icon: Sliders },
  { id: 'features', labelKey: 'modelsSubNavFeatures', icon: Sparkles },
  { id: 'safety', labelKey: 'modelsSubNavSafety', icon: Shield },
];

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
  const { t } = useI18n();
  const [activeSubTab, setActiveSubTab] = useState<ModelsSubTab>('all');
  const [isSafetyExpanded, setIsSafetyExpanded] = useState(false);

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

  const activeModel = availableModels.find((m) => m.id === modelId);
  const activeModelName = activeModel?.name || modelId;

  const connections = currentSettings.thirdPartyApi?.connections ?? [];
  const activeProvider = connections.find((c) => c.id === currentSettings.providerId);
  const isGemini = !isThirdPartyMode && (!currentSettings.providerId || currentSettings.providerId === 'gemini');
  const providerDisplayName = isGemini
    ? 'Google Gemini'
    : (activeProvider?.name || (currentSettings.providerId ? currentSettings.providerId.toUpperCase() : 'Custom Provider'));

  const showCatalog = isThirdPartyMode || activeSubTab === 'all' || activeSubTab === 'catalog';
  const showGeneration = isThirdPartyMode || activeSubTab === 'all' || activeSubTab === 'generation';
  const showFeatures = !isThirdPartyMode && (activeSubTab === 'all' || activeSubTab === 'features');
  const showSafety = !isThirdPartyMode && (activeSubTab === 'all' || activeSubTab === 'safety');

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="rounded-2xl border border-[var(--theme-border-secondary)]/50 bg-[var(--theme-bg-secondary)]/30 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-[var(--theme-bg-tertiary)]/70 text-[var(--theme-text-link)] shrink-0">
              <SlidersHorizontal size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--theme-text-secondary)]">
                  {t('modelsCurrentModelLabel')}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] border border-[var(--theme-border-secondary)]/40">
                  {providerDisplayName}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-[var(--theme-text-primary)] truncate">
                {activeModelName}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => useSettingsUiStore.getState().setActiveTab('providers')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--theme-border-secondary)]/60 bg-[var(--theme-bg-secondary)]/80 hover:bg-[var(--theme-bg-tertiary)] text-xs font-medium text-[var(--theme-text-primary)] transition-all cursor-pointer shadow-xs hover:border-[var(--theme-border-primary)]"
          >
            <span>{t('modelsManageProvidersAction')}</span>
            <ArrowUpRight size={13} className="text-[var(--theme-text-secondary)]" />
          </button>
        </div>

        <p className="text-xs text-[var(--theme-text-secondary)] leading-relaxed">
          {t('modelsCurrentActiveModelHint')}
        </p>
      </div>
      {!isThirdPartyMode && (
        <div className="flex justify-start overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className={SETTINGS_SEGMENTED_TRACK_CLASS} role="tablist" aria-label={t('settingsTabModels')}>
            {SUB_TABS.map(({ id, labelKey, icon: Icon }) => {
              const isActive = activeSubTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveSubTab(id)}
                  className={`flex items-center gap-1.5 ${isActive ? SETTINGS_SEGMENTED_ACTIVE_CLASS : SETTINGS_SEGMENTED_IDLE_CLASS}`}
                >
                  <Icon size={13} className="shrink-0" />
                  <span>{t(labelKey)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showCatalog && (
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
      )}

      {showGeneration && (
        <div className="space-y-4">
          <GenerationSection
            isThirdPartyMode={isThirdPartyMode}
            modelId={modelId}
            currentSettings={currentSettings}
            onUpdateSetting={updateSetting}
          />
        </div>
      )}

      {showFeatures && (
        <div className="space-y-5">
          <SelectionAskModelSection
            settings={currentSettings}
            onUpdate={updateSetting}
            availableModels={availableModels}
          />

          <div data-settings-item="models-live-artifacts">
            <LiveArtifactsSection
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

      {showSafety && (
        <div className={SETTINGS_SECTION_CARD_CLASS} data-settings-item="models-safety">
          <button
            type="button"
            onClick={() => setIsSafetyExpanded((prev) => !prev)}
            aria-expanded={isSafetyExpanded}
            aria-label={t('modelsSafetyToggleAria')}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span className="flex min-w-0 items-start gap-3">
              <Shield size={20} className="mt-0.5 flex-shrink-0 text-[var(--theme-text-link)]" strokeWidth={1.75} />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[var(--theme-text-primary)]">{t('safetyTitle')}</span>
                <span className="mt-1 block text-xs leading-relaxed text-[var(--theme-text-secondary)]">
                  {t('safetyDescription')}
                </span>
              </span>
            </span>
            <ChevronDown
              size={16}
              className={`flex-shrink-0 text-[var(--theme-text-secondary)] transition-transform duration-200 ${
                isSafetyExpanded ? 'rotate-180' : ''
              }`}
              strokeWidth={1.75}
            />
          </button>

          {isSafetyExpanded && (
            <div className="mt-4 border-t border-[var(--theme-border-secondary)]/60 pt-4">
              <SafetySection
                safetySettings={currentSettings.safetySettings}
                setSafetySettings={(safetySettings) => onUpdateSettings({ safetySettings })}
                showIntro={false}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

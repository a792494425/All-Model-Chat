import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AudioLines, Image as ImageIcon, Info, SquarePen, X } from 'lucide-react';
import { SETTINGS_INPUT_CLASS } from '@/constants/formClasses';
import { SMALL_ICON_BUTTON_CLASS } from '@/constants/buttonClasses';
import {
  SETTINGS_RANGE_SLIDER_CLASS,
  SETTINGS_SECTION_CARD_CLASS,
  SETTINGS_SECTION_LABEL_CLASS,
  SETTINGS_VALUE_BADGE_CLASS,
} from '@/constants/designTokens';
import { type AppSettings, MediaResolution } from '@/types';
import { getCachedModelCapabilities } from '@/stores/modelCapabilitiesStore';
import { useSettingsUiStore } from '@/stores/settingsUiStore';
import { useI18n } from '@/contexts/I18nContext';
import { Tooltip } from '@/components/shared/Tooltip';
import { Select } from '@/components/shared/Select';
import { ToggleItem } from '@/components/shared/ToggleItem';
import { TextEditorModal } from '@/components/modals/TextEditorModal';
import { AVAILABLE_TTS_VOICES } from '@/constants/voiceOptions';

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
  const { t } = useI18n();
  const { systemInstruction, temperature, topP, mediaResolution, ttsVoice } = currentSettings;
  const topK = currentSettings.topK ?? 64;
  const isRawModeEnabled = currentSettings.isRawModeEnabled ?? false;
  const hideThinkingInContext = currentSettings.hideThinkingInContext ?? false;
  const alwaysKeepThinkingInContext = currentSettings.alwaysKeepThinkingInContext ?? false;
  const isAdvancedModeEnabled = useSettingsUiStore((state) => state.isAdvancedModeEnabled);
  const [isSystemPromptExpanded, setIsSystemPromptExpanded] = useState(false);
  const [localPrompt, setLocalPrompt] = useState(systemInstruction);
  const skipNextPromptBlurCommitRef = useRef(false);

  useEffect(() => {
    setLocalPrompt(systemInstruction);
  }, [systemInstruction]);

  const commitPromptIfNeeded = useCallback(() => {
    if (localPrompt !== systemInstruction) {
      onUpdateSetting('systemInstruction', localPrompt);
    }
  }, [localPrompt, onUpdateSetting, systemInstruction]);

  const handleOpenExpand = () => {
    commitPromptIfNeeded();
    setIsSystemPromptExpanded(true);
  };

  const handleClearPrompt = () => {
    setLocalPrompt('');
    if (localPrompt !== '' || systemInstruction !== '') {
      onUpdateSetting('systemInstruction', '');
    }
  };

  const capabilities = getCachedModelCapabilities(modelId);
  const isNativeAudio = capabilities.isNativeAudioModel;
  const isSystemPromptSet = localPrompt.trim() !== '';
  const inputBaseClasses =
    'w-full p-2.5 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-offset-0 text-sm';

  return (
    <div className="space-y-5">
      <div className={`${SETTINGS_SECTION_CARD_CLASS} space-y-3`} data-settings-item="models-system-prompt">
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="system-prompt-input"
            className="flex min-w-0 items-center gap-2 text-sm font-medium text-[var(--theme-text-primary)]"
          >
            <span className={SETTINGS_SECTION_LABEL_CLASS}>{t('settingsSystemPrompt')}</span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium normal-case tracking-normal ${
                isSystemPromptSet
                  ? 'bg-[var(--theme-bg-success)] text-[var(--theme-text-success)]'
                  : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)]'
              }`}
            >
              {isSystemPromptSet ? t('settingsSystemPromptEnabled') : t('settingsSystemPromptUnset')}
            </span>
          </label>
          <div className="flex shrink-0 items-center gap-1">
            {isSystemPromptSet && (
              <button
                type="button"
                onClick={handleClearPrompt}
                className={`${SMALL_ICON_BUTTON_CLASS} flex h-8 w-8 items-center justify-center hover:text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)]/10`}
                title={t('settingsClearSystemPrompt')}
                aria-label={t('settingsClearSystemPrompt')}
              >
                <X size={14} />
              </button>
            )}
            <button
              type="button"
              onPointerDown={() => {
                skipNextPromptBlurCommitRef.current = true;
              }}
              onClick={handleOpenExpand}
              className={`${SMALL_ICON_BUTTON_CLASS} flex h-8 w-8 items-center justify-center hover:text-[var(--theme-text-link)]`}
              title={t('settingsExpandSystemPromptEditor')}
              aria-label={t('settingsExpandSystemPromptEditor')}
            >
              <SquarePen size={14} />
            </button>
          </div>
        </div>
        <textarea
          id="system-prompt-input"
          value={localPrompt}
          onChange={(event) => setLocalPrompt(event.target.value)}
          onBlur={() => {
            if (skipNextPromptBlurCommitRef.current) {
              skipNextPromptBlurCommitRef.current = false;
              return;
            }
            commitPromptIfNeeded();
          }}
          rows={3}
          className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS} resize-y min-h-[112px] custom-scrollbar`}
          placeholder={t('chatBehaviorSystemPromptPlaceholder')}
          aria-label={t('settingsSystemPromptAria')}
        />
      </div>

      <TextEditorModal
        isOpen={isSystemPromptExpanded}
        onClose={() => setIsSystemPromptExpanded(false)}
        title={t('settingsSystemPrompt')}
        value={systemInstruction}
        onChange={(value) => onUpdateSetting('systemInstruction', value)}
        placeholder={t('chatBehaviorSystemPromptPlaceholder')}
        confirmLabel={t('settingsSaveAndClose')}
      />

      <div className={`${SETTINGS_SECTION_CARD_CLASS} space-y-3`} data-settings-item="models-temperature">
        <div className="flex items-center justify-between">
          <label htmlFor="temperature-slider" className={`${SETTINGS_SECTION_LABEL_CLASS} flex items-center gap-2`}>
            {t('settingsTemperature')}
            <Tooltip text={t('chatBehaviorTempTooltip')}>
              <Info size={14} className="text-[var(--theme-text-secondary)] cursor-help" strokeWidth={1.5} />
            </Tooltip>
          </label>
          <span className={SETTINGS_VALUE_BADGE_CLASS}>{Number(temperature).toFixed(2)}</span>
        </div>
        <input
          id="temperature-slider"
          type="range"
          min="0"
          max="2"
          step="0.05"
          value={temperature}
          onChange={(event) => onUpdateSetting('temperature', parseFloat(event.target.value))}
          className={SETTINGS_RANGE_SLIDER_CLASS}
        />
      </div>

      <div className={`${SETTINGS_SECTION_CARD_CLASS} space-y-3`} data-settings-item="models-top-p">
        <div className="flex items-center justify-between">
          <label htmlFor="top-p-slider" className={`${SETTINGS_SECTION_LABEL_CLASS} flex items-center gap-2`}>
            {t('settingsTopP')}
            <Tooltip text={t('chatBehaviorTopPTooltip')}>
              <Info size={14} className="text-[var(--theme-text-secondary)] cursor-help" strokeWidth={1.5} />
            </Tooltip>
          </label>
          <span className={SETTINGS_VALUE_BADGE_CLASS}>{Number(topP).toFixed(2)}</span>
        </div>
        <input
          id="top-p-slider"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={topP}
          onChange={(event) => onUpdateSetting('topP', parseFloat(event.target.value))}
          className={SETTINGS_RANGE_SLIDER_CLASS}
        />
      </div>

      {isAdvancedModeEnabled && (
        <div className={`${SETTINGS_SECTION_CARD_CLASS} space-y-5`} data-settings-item="models-advanced">
          <span className={SETTINGS_SECTION_LABEL_CLASS}>{t('settingsAdvancedParamsTitle')}</span>

          {!isThirdPartyMode && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="top-k-slider" className={`${SETTINGS_SECTION_LABEL_CLASS} flex items-center gap-2`}>
                  {t('settingsTopK')}
                  <Tooltip text={t('settingsTopKTooltip')}>
                    <Info size={14} className="text-[var(--theme-text-secondary)] cursor-help" strokeWidth={1.5} />
                  </Tooltip>
                </label>
                <span className={SETTINGS_VALUE_BADGE_CLASS}>{topK}</span>
              </div>
              <input
                id="top-k-slider"
                type="range"
                min="0"
                max="128"
                step="1"
                value={topK}
                onChange={(event) => onUpdateSetting('topK', parseInt(event.target.value, 10))}
                className={SETTINGS_RANGE_SLIDER_CLASS}
              />
            </div>
          )}

          {!isThirdPartyMode && mediaResolution && (
            <div data-settings-item="models-media-resolution">
              <Select
                id="media-resolution-select"
                label=""
                layout="horizontal"
                labelContent={
                  <span className="flex items-center text-sm font-medium text-[var(--theme-text-primary)]">
                    <ImageIcon size={14} className="mr-2 text-[var(--theme-text-primary)]" />
                    {t('settingsMediaResolution')}
                    <Tooltip
                      text={
                        isNativeAudio ? t('settingsMediaResolutionLiveTooltip') : t('settingsMediaResolutionTooltip')
                      }
                    >
                      <Info
                        size={14}
                        className="ml-2 text-[var(--theme-text-secondary)] cursor-help"
                        strokeWidth={1.5}
                      />
                    </Tooltip>
                  </span>
                }
                value={mediaResolution}
                onChange={(event) => onUpdateSetting('mediaResolution', event.target.value as MediaResolution)}
              >
                <option value={MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED}>{t('mediaResolutionUnspecified')}</option>
                <option value={MediaResolution.MEDIA_RESOLUTION_LOW}>{t('mediaResolutionLow')}</option>
                {!isNativeAudio && (
                  <option value={MediaResolution.MEDIA_RESOLUTION_MEDIUM}>{t('mediaResolutionMedium')}</option>
                )}
                {!isNativeAudio && (
                  <option value={MediaResolution.MEDIA_RESOLUTION_HIGH}>{t('mediaResolutionHigh')}</option>
                )}
              </Select>
            </div>
          )}

          {!isThirdPartyMode && (
            <div className="pt-1 border-t border-[var(--theme-border-secondary)]/40 space-y-1">
              <ToggleItem
                label={t('settingsRawModeLabel')}
                checked={isRawModeEnabled}
                onChange={(value) => onUpdateSetting('isRawModeEnabled', value)}
                tooltip={t('settingsRawModeTooltip')}
              />
              <ToggleItem
                label={t('settingsHideThinkingInContextLabel')}
                checked={hideThinkingInContext}
                onChange={(value) => {
                  onUpdateSetting('hideThinkingInContext', value);
                  if (value) onUpdateSetting('alwaysKeepThinkingInContext', false);
                }}
                tooltip={t('settingsHideThinkingInContextTooltip')}
              />
              <div data-settings-item="models-always-keep-thinking">
                <ToggleItem
                  label={t('settingsAlwaysKeepThinkingInContextLabel')}
                  checked={alwaysKeepThinkingInContext}
                  onChange={(value) => {
                    onUpdateSetting('alwaysKeepThinkingInContext', value);
                    if (value) onUpdateSetting('hideThinkingInContext', false);
                  }}
                  tooltip={t('settingsAlwaysKeepThinkingInContextTooltip')}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {!isThirdPartyMode && (
        <div className={SETTINGS_SECTION_CARD_CLASS} data-settings-item="models-tts-voice">
          <Select
            id="tts-voice-select"
            label=""
            layout="horizontal"
            labelContent={
              <span className="flex items-center text-sm font-medium text-[var(--theme-text-primary)]">
                <AudioLines size={14} className="mr-2 text-[var(--theme-text-primary)]" />
                {t('settingsTtsVoice')}
              </span>
            }
            value={ttsVoice}
            onChange={(event) => onUpdateSetting('ttsVoice', event.target.value)}
          >
            {AVAILABLE_TTS_VOICES.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name} ({t(voice.styleKey)})
              </option>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
};

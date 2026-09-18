import React from 'react';
import { Image as ImageIcon, Info } from 'lucide-react';
import { SETTINGS_INPUT_CLASS } from '@/constants/formClasses';
import {
  SETTINGS_SECTION_CARD_CLASS,
  SETTINGS_SECTION_LABEL_CLASS,
  SETTINGS_VALUE_BADGE_CLASS,
} from '@/constants/designTokens';
import { type AppSettings, MediaResolution } from '@/types';
import { bansModelTurnPrefill } from '@/utils/model/modelCapabilities';
import { useI18n } from '@/contexts/I18nContext';
import { Tooltip } from '@/components/shared/Tooltip';
import { Select } from '@/components/shared/Select';
import { ToggleItem } from '@/components/shared/ToggleItem';
import { Slider } from '@/components/shared/Slider';
import type { getCachedModelCapabilities } from '@/stores/modelCapabilitiesStore';

interface AdvancedGenerationParamsCardProps {
  modelId: string;
  isThirdPartyMode?: boolean;
  topK: number;
  maxOutputTokens?: number;
  localStopSequences: string;
  setLocalStopSequences: (val: string) => void;
  handleStopSequencesBlur: () => void;
  presencePenalty?: number;
  frequencyPenalty?: number;
  seed?: number;
  mediaResolution?: MediaResolution;
  isRawModeEnabled: boolean;
  hideThinkingInContext: boolean;
  alwaysKeepThinkingInContext: boolean;
  capabilities: ReturnType<typeof getCachedModelCapabilities>;
  isNativeAudio?: boolean;
  onUpdateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export const AdvancedGenerationParamsCard: React.FC<AdvancedGenerationParamsCardProps> = ({
  modelId,
  isThirdPartyMode = false,
  topK,
  maxOutputTokens,
  localStopSequences,
  setLocalStopSequences,
  handleStopSequencesBlur,
  presencePenalty,
  frequencyPenalty,
  seed,
  mediaResolution,
  isRawModeEnabled,
  hideThinkingInContext,
  alwaysKeepThinkingInContext,
  capabilities,
  isNativeAudio,
  onUpdateSetting,
}) => {
  const { t } = useI18n();

  return (
    <div className={`${SETTINGS_SECTION_CARD_CLASS} space-y-5`} data-settings-item="models-advanced">
      <span className={SETTINGS_SECTION_LABEL_CLASS}>{t('settingsAdvancedParamsTitle')}</span>

      <div data-settings-item="models-top-k">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="top-k-slider" className={`${SETTINGS_SECTION_LABEL_CLASS} flex items-center gap-2`}>
            {t('settingsTopK')}
            <Tooltip text={t('settingsTopKTooltip')}>
              <Info size={14} className="text-[var(--theme-text-secondary)] cursor-help" strokeWidth={1.5} />
            </Tooltip>
          </label>
          <span className={SETTINGS_VALUE_BADGE_CLASS}>{topK}</span>
        </div>
        <Slider
          id="top-k-slider"
          min={0}
          max={128}
          step={1}
          value={topK}
          onChange={(val) => onUpdateSetting('topK', Math.round(val))}
          ariaLabel={t('settingsTopK')}
        />
      </div>

      <div data-settings-item="models-max-output-tokens">
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="max-output-tokens-input"
            className={`${SETTINGS_SECTION_LABEL_CLASS} flex items-center gap-2`}
          >
            {t('settingsMaxOutputTokens')}
            <Tooltip text={t('settingsMaxOutputTokensTooltip')}>
              <Info size={14} className="text-[var(--theme-text-secondary)] cursor-help" strokeWidth={1.5} />
            </Tooltip>
          </label>
          <span className={SETTINGS_VALUE_BADGE_CLASS}>
            {maxOutputTokens && maxOutputTokens > 0 ? maxOutputTokens : t('settingsDefaultUnset')}
          </span>
        </div>
        <input
          id="max-output-tokens-input"
          type="number"
          min="1"
          max="1048576"
          step="256"
          value={maxOutputTokens ?? ''}
          onChange={(event) => {
            const val = event.target.value.trim();
            const num = val === '' ? undefined : parseInt(val, 10);
            onUpdateSetting('maxOutputTokens', num && num > 0 ? num : undefined);
          }}
          placeholder={t('settingsMaxOutputTokensPlaceholder')}
          className={`w-full p-2.5 rounded-lg border text-sm font-mono ${SETTINGS_INPUT_CLASS}`}
        />
      </div>

      <div data-settings-item="models-stop-sequences">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="stop-sequences-input" className={`${SETTINGS_SECTION_LABEL_CLASS} flex items-center gap-2`}>
            {t('settingsStopSequences')}
            <Tooltip text={t('settingsStopSequencesTooltip')}>
              <Info size={14} className="text-[var(--theme-text-secondary)] cursor-help" strokeWidth={1.5} />
            </Tooltip>
          </label>
        </div>
        <input
          id="stop-sequences-input"
          type="text"
          value={localStopSequences}
          onChange={(event) => setLocalStopSequences(event.target.value)}
          onBlur={handleStopSequencesBlur}
          placeholder={t('settingsStopSequencesPlaceholder')}
          className={`w-full p-2.5 rounded-lg border text-sm font-mono ${SETTINGS_INPUT_CLASS}`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 pt-1 border-t border-[var(--theme-border-secondary)]/40">
        <div data-settings-item="models-presence-penalty" className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="presence-penalty-slider"
              className={`${SETTINGS_SECTION_LABEL_CLASS} flex items-center gap-2`}
            >
              {t('settingsPresencePenalty')}
              <Tooltip text={t('settingsPresencePenaltyTooltip')}>
                <Info size={14} className="text-[var(--theme-text-secondary)] cursor-help" strokeWidth={1.5} />
              </Tooltip>
            </label>
            <span className={SETTINGS_VALUE_BADGE_CLASS}>
              {presencePenalty !== undefined ? Number(presencePenalty).toFixed(2) : '0.00'}
            </span>
          </div>
          <Slider
            id="presence-penalty-slider"
            min={-2}
            max={2}
            step={0.1}
            value={presencePenalty ?? 0}
            onChange={(val) => {
              onUpdateSetting('presencePenalty', val === 0 ? undefined : val);
            }}
            ariaLabel={t('settingsPresencePenalty')}
          />
        </div>

        <div data-settings-item="models-frequency-penalty" className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="frequency-penalty-slider"
              className={`${SETTINGS_SECTION_LABEL_CLASS} flex items-center gap-2`}
            >
              {t('settingsFrequencyPenalty')}
              <Tooltip text={t('settingsFrequencyPenaltyTooltip')}>
                <Info size={14} className="text-[var(--theme-text-secondary)] cursor-help" strokeWidth={1.5} />
              </Tooltip>
            </label>
            <span className={SETTINGS_VALUE_BADGE_CLASS}>
              {frequencyPenalty !== undefined ? Number(frequencyPenalty).toFixed(2) : '0.00'}
            </span>
          </div>
          <Slider
            id="frequency-penalty-slider"
            min={-2}
            max={2}
            step={0.1}
            value={frequencyPenalty ?? 0}
            onChange={(val) => {
              onUpdateSetting('frequencyPenalty', val === 0 ? undefined : val);
            }}
            ariaLabel={t('settingsFrequencyPenalty')}
          />
        </div>
      </div>

      <div data-settings-item="models-seed" className="pt-1 border-t border-[var(--theme-border-secondary)]/40">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="seed-input" className={`${SETTINGS_SECTION_LABEL_CLASS} flex items-center gap-2`}>
            {t('settingsSeed')}
            <Tooltip text={t('settingsSeedTooltip')}>
              <Info size={14} className="text-[var(--theme-text-secondary)] cursor-help" strokeWidth={1.5} />
            </Tooltip>
          </label>
          <span className={SETTINGS_VALUE_BADGE_CLASS}>{seed !== undefined ? seed : t('settingsDefaultUnset')}</span>
        </div>
        <input
          id="seed-input"
          type="number"
          step="1"
          value={seed ?? ''}
          onChange={(event) => {
            const val = event.target.value.trim();
            const num = val === '' ? undefined : parseInt(val, 10);
            onUpdateSetting('seed', num !== undefined && Number.isFinite(num) ? num : undefined);
          }}
          placeholder={t('settingsSeedPlaceholder')}
          className={`w-full p-2.5 rounded-lg border text-sm font-mono ${SETTINGS_INPUT_CLASS}`}
        />
      </div>

      {!isThirdPartyMode &&
        mediaResolution &&
        !capabilities.isTtsModel &&
        !capabilities.isLiveTranslate &&
        !capabilities.isLiveTranscribe &&
        !capabilities.isTranscribeModel &&
        !capabilities.isImageGenerationModel && (
          <div
            data-settings-item="models-media-resolution"
            className="pt-1 border-t border-[var(--theme-border-secondary)]/40"
          >
            <Select
              id="media-resolution-select"
              label=""
              layout="horizontal"
              labelContent={
                <span className="flex items-center text-sm font-medium text-[var(--theme-text-primary)]">
                  <ImageIcon size={14} className="mr-2 text-[var(--theme-text-primary)]" />
                  {t('settingsMediaResolution')}
                  <Tooltip
                    text={isNativeAudio ? t('settingsMediaResolutionLiveTooltip') : t('settingsMediaResolutionTooltip')}
                  >
                    <Info size={14} className="ml-2 text-[var(--theme-text-secondary)] cursor-help" strokeWidth={1.5} />
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

      {!isThirdPartyMode && capabilities.supportsRawReasoningPrefill && !bansModelTurnPrefill(modelId) && (
        <div className="pt-1 border-t border-[var(--theme-border-secondary)]/40 space-y-1">
          <div data-settings-item="models-raw-mode">
            <ToggleItem
              label={t('settingsRawModeLabel')}
              checked={isRawModeEnabled}
              onChange={(value) => onUpdateSetting('isRawModeEnabled', value)}
              tooltip={t('settingsRawModeTooltip')}
            />
          </div>
        </div>
      )}

      {!isThirdPartyMode &&
        capabilities.supportsThinkingLevel &&
        !capabilities.isTtsModel &&
        !capabilities.isTranscribeModel &&
        !capabilities.isLiveTranscribe &&
        !capabilities.isLiveTranslate &&
        !capabilities.isImageGenerationModel && (
          <div className="pt-1 border-t border-[var(--theme-border-secondary)]/40 space-y-1">
            <div data-settings-item="models-hide-thinking">
              <ToggleItem
                label={t('settingsHideThinkingInContextLabel')}
                checked={hideThinkingInContext}
                onChange={(value) => {
                  onUpdateSetting('hideThinkingInContext', value);
                  if (value) onUpdateSetting('alwaysKeepThinkingInContext', false);
                }}
                tooltip={t('settingsHideThinkingInContextTooltip')}
              />
            </div>
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
  );
};

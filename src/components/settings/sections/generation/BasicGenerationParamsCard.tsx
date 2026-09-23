import React from 'react';
import { Info } from 'lucide-react';
import {
  SETTINGS_SECTION_CARD_CLASS,
  SETTINGS_SECTION_LABEL_CLASS,
  SETTINGS_VALUE_BADGE_CLASS,
} from '@/constants/designTokens';
import { useI18n } from '@/contexts/I18nContext';
import { Tooltip } from '@/components/shared/Tooltip';
import { Slider } from '@/components/shared/Slider';
import type { AppSettings } from '@/types';

interface BasicGenerationParamsCardProps {
  temperature: number;
  onUpdateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export const BasicGenerationParamsCard: React.FC<BasicGenerationParamsCardProps> = ({
  temperature,
  onUpdateSetting,
}) => {
  const { t } = useI18n();

  return (
    <div className={`${SETTINGS_SECTION_CARD_CLASS} space-y-2.5`} data-settings-item="models-temperature">
      <div className="flex items-center justify-between">
        <label htmlFor="temperature-slider" className={`${SETTINGS_SECTION_LABEL_CLASS} flex items-center gap-2`}>
          {t('settingsTemperature')}
          <Tooltip text={t('chatBehaviorTempTooltip')}>
            <Info size={14} className="text-[var(--theme-text-secondary)] cursor-help" strokeWidth={1.5} />
          </Tooltip>
        </label>
        <div className="flex items-center gap-2">
          <span className={SETTINGS_VALUE_BADGE_CLASS}>{Number(temperature).toFixed(2)}</span>
          <span className="text-[11px] font-medium text-[var(--theme-text-secondary)] hidden sm:inline">
            {temperature < 0.4
              ? t('settingsTemperatureStrict')
              : temperature > 1.2
                ? t('settingsTemperatureCreative')
                : t('settingsTemperatureBalanced')}
          </span>
        </div>
      </div>
      <Slider
        id="temperature-slider"
        min={0}
        max={2}
        step={0.05}
        value={temperature}
        onChange={(val) => onUpdateSetting('temperature', val)}
        ariaLabel={t('settingsTemperature')}
      />
      <div className="flex justify-between text-[11px] font-medium text-[var(--theme-text-tertiary)] pt-0.5 select-none">
        <span>{t('settingsTemperatureStrict')}</span>
        <span>{t('settingsTemperatureBalanced')}</span>
        <span>{t('settingsTemperatureCreative')}</span>
      </div>
    </div>
  );
};

import React from 'react';
import { Info, Type } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import type { AppSettings } from '@/types';
import { SETTINGS_SECTION_CARD_CLASS, SETTINGS_SECTION_LABEL_CLASS } from '@/constants/designTokens';
import { Tooltip } from '@/components/shared/Tooltip';

export interface FontFamilyControlProps {
  settings: AppSettings;
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export const FontFamilyControl: React.FC<FontFamilyControlProps> = ({ settings, onUpdate }) => {
  const { t } = useI18n();
  const currentFont = settings.readingFontFamily ?? 'sans';

  return (
    <div className={`${SETTINGS_SECTION_CARD_CLASS} space-y-3`} data-settings-item="interface-reading-font">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className={`${SETTINGS_SECTION_LABEL_CLASS} flex items-center gap-2`}>
            <Type size={14} strokeWidth={1.5} /> {t('settingsReadingFont')}
          </label>
          <Tooltip text={t('settingsReadingFontTooltip')}>
            <Info size={14} className="text-[var(--theme-text-secondary)] cursor-help" strokeWidth={1.5} />
          </Tooltip>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('settingsReadingFont')}>
        <button
          type="button"
          role="radio"
          aria-label={t('settingsReadingFontSans')}
          aria-checked={currentFont === 'sans'}
          onClick={() => onUpdate('readingFontFamily', 'sans')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-sm font-medium transition-all cursor-pointer font-sans ${
            currentFont === 'sans'
              ? 'bg-[var(--theme-bg-tertiary)] border-[var(--theme-border-focus)] text-[var(--theme-text-primary)] shadow-xs ring-1 ring-[var(--theme-border-focus)]'
              : 'border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-secondary)]/60 hover:text-[var(--theme-text-primary)]'
          }`}
        >
          <span className="text-base font-semibold" aria-hidden="true">
            Aa
          </span>
          <span>{t('settingsReadingFontSans')}</span>
        </button>
        <button
          type="button"
          role="radio"
          aria-label={t('settingsReadingFontSerif')}
          aria-checked={currentFont === 'serif'}
          onClick={() => onUpdate('readingFontFamily', 'serif')}
          style={{ fontFamily: 'var(--app-font-serif)' }}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
            currentFont === 'serif'
              ? 'bg-[var(--theme-bg-tertiary)] border-[var(--theme-border-focus)] text-[var(--theme-text-primary)] shadow-xs ring-1 ring-[var(--theme-border-focus)]'
              : 'border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-secondary)]/60 hover:text-[var(--theme-text-primary)]'
          }`}
        >
          <span className="text-base font-semibold italic" aria-hidden="true">
            Aa
          </span>
          <span>{t('settingsReadingFontSerif')}</span>
        </button>
      </div>
    </div>
  );
};

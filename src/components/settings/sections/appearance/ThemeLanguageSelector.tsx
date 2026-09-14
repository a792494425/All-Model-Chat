import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import type { AppSettings } from '@/types';
import { SUPPORTED_LANGUAGES, LANGUAGE_META } from '@/i18n/languageRegistry';
import { Select } from '@/components/shared/Select';
import { SETTINGS_SECTION_CARD_CLASS } from '@/constants/designTokens';

export const ThemeLanguageSelector: React.FC<{
  settings: AppSettings;
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}> = ({ settings, onUpdate }) => {
  const { t } = useI18n();
  const themeOptions = [
    { id: 'system', labelKey: 'settingsThemeSystem', color: 'linear-gradient(135deg, #0c0c0e 50%, #ffffff 50%)' },
    { id: 'onyx', labelKey: 'settingsThemeDark', color: '#0c0c0e' },
    { id: 'graphite', labelKey: 'settingsThemeGray', color: '#1e1e24' },
    { id: 'pearl', labelKey: 'settingsThemeLight', color: '#ffffff' },
    { id: 'sepia', labelKey: 'settingsThemeSepia', color: '#fbf0d9' },
  ] as const;

  return (
    <div className={`${SETTINGS_SECTION_CARD_CLASS} space-y-1`}>
      <div
        className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between py-1"
        data-settings-item="interface-theme"
      >
        <div>
          <span className="text-sm font-medium text-[var(--theme-text-primary)] block">{t('settingsTheme')}</span>
          <div className="flex items-center gap-2 mt-2">
            {themeOptions.map((option) => {
              const isSelected = settings.themeId === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onUpdate('themeId', option.id)}
                  title={t(option.labelKey)}
                  aria-label={t(option.labelKey)}
                  className={`w-6 h-6 rounded-full border border-[var(--theme-border-secondary)] transition-all cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-[var(--theme-border-focus)] ring-offset-2 ring-offset-[var(--theme-bg-primary)] scale-110'
                      : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{ background: option.color }}
                />
              );
            })}
          </div>
        </div>
        <Select
          id="interface-theme-select"
          label={t('settingsTheme')}
          hideLabel
          value={settings.themeId}
          onChange={(e) => onUpdate('themeId', e.target.value as AppSettings['themeId'])}
          wrapperClassName="w-44"
        >
          {themeOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {t(option.labelKey)}
            </option>
          ))}
        </Select>
      </div>

      <div
        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-[var(--theme-border-secondary)]/50 py-3"
        data-settings-item="interface-language"
      >
        <span className="text-sm font-medium text-[var(--theme-text-primary)]">{t('settingsLanguage')}</span>
        <Select
          id="interface-language-select"
          label={t('settingsLanguage')}
          hideLabel
          value={settings.language}
          onChange={(e) => onUpdate('language', e.target.value as AppSettings['language'])}
          wrapperClassName="w-44"
        >
          <option value="system">{t('settingsLanguageSystem')}</option>
          {SUPPORTED_LANGUAGES.map((id) => (
            <option key={id} value={id}>
              {LANGUAGE_META[id].nativeLabel}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
};

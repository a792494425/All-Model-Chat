import React from 'react';
import { Info } from 'lucide-react';
import { SETTINGS_SECTION_CARD_CLASS } from '@/constants/designTokens';
import { useI18n } from '@/contexts/I18nContext';

export const TranscribeInfoCard: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className={`${SETTINGS_SECTION_CARD_CLASS} space-y-3`} data-settings-item="models-transcribe-info">
      <div className="flex items-start gap-3 text-sm text-[var(--theme-text-secondary)]">
        <Info size={18} className="text-[var(--theme-text-accent)] shrink-0 mt-0.5" />
        <p className="leading-relaxed">{t('settingsTranscribeModelInfo')}</p>
      </div>
    </div>
  );
};

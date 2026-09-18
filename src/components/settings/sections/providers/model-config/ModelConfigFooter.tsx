import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import {
  SETTINGS_PRIMARY_ACTION_BUTTON_CLASS,
  SETTINGS_SECONDARY_ACTION_BUTTON_CLASS,
} from '@/constants/buttonClasses';

export interface ModelConfigFooterProps {
  onResetParameters: () => void;
  onClose: () => void;
  onSave: () => void;
}

export const ModelConfigFooter: React.FC<ModelConfigFooterProps> = ({ onResetParameters, onClose, onSave }) => {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-between pt-3 border-t border-[var(--theme-border-secondary)]/40 flex-shrink-0">
      <button
        type="button"
        onClick={onResetParameters}
        className="inline-flex items-center gap-1 text-xs text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors cursor-pointer"
      >
        <RotateCcw size={12} />
        <span>{t('settingsResetToDefaults')}</span>
      </button>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onClose} className={SETTINGS_SECONDARY_ACTION_BUTTON_CLASS}>
          {t('cancel')}
        </button>
        <button type="button" onClick={onSave} className={SETTINGS_PRIMARY_ACTION_BUTTON_CLASS}>
          {t('save')}
        </button>
      </div>
    </div>
  );
};

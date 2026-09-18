import React from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface ModelSyncFooterProps {
  selectedStaleCount: number;
  selectedNewCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

export const ModelSyncFooter: React.FC<ModelSyncFooterProps> = ({
  selectedStaleCount,
  selectedNewCount,
  onClose,
  onConfirm,
}) => {
  const { t } = useI18n();

  return (
    <div className="px-6 py-4 border-t border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)]/40 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="text-xs text-[var(--theme-text-secondary)] flex items-center gap-1.5">
        {selectedStaleCount > 0 && (
          <span className="flex items-center gap-1 text-rose-400">
            <AlertTriangle size={13} />
            {t('thirdPartyWillPruneCount', { count: selectedStaleCount })}
          </span>
        )}
        {selectedStaleCount > 0 && selectedNewCount > 0 && <span>·</span>}
        {selectedNewCount > 0 && (
          <span className="text-emerald-400 font-medium">
            {t('thirdPartyWillAddCount', { count: selectedNewCount })}
          </span>
        )}
        {selectedStaleCount === 0 && selectedNewCount === 0 && <span>{t('thirdPartyNoModelChanges')}</span>}
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-medium rounded-xl border border-[var(--theme-border-primary)] hover:bg-[var(--theme-bg-secondary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors"
        >
          {t('cancel')}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-colors flex items-center gap-1.5"
        >
          <Check size={14} />
          <span>{t('thirdPartyApplyChanges')}</span>
        </button>
      </div>
    </div>
  );
};

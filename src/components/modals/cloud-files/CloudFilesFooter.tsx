import React from 'react';
import { Trash2 } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { interpolate } from '@/i18n/interpolate';

export interface CloudFilesFooterProps {
  selectedCount: number;
  onOpenBatchDeleteModal: () => void;
  onClose: () => void;
  onConfirmInsert: () => void;
}

export const CloudFilesFooter: React.FC<CloudFilesFooterProps> = ({
  selectedCount,
  onOpenBatchDeleteModal,
  onClose,
  onConfirmInsert,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-t border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)]/40 flex-shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-xs text-[var(--theme-text-secondary)]">
          {interpolate(t('cloudFilesSelectedCount'), { count: selectedCount.toString() })}
        </span>
        {selectedCount > 0 && (
          <button
            type="button"
            onClick={onOpenBatchDeleteModal}
            className="inline-flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 font-medium cursor-pointer"
          >
            <Trash2 size={13} />
            <span>{interpolate(t('cloudFilesBatchDelete'), { count: selectedCount.toString() })}</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-xl transition-colors border border-[var(--theme-border-secondary)] cursor-pointer"
        >
          {t('cancel')}
        </button>
        <button
          type="button"
          onClick={onConfirmInsert}
          disabled={selectedCount === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-xs cursor-pointer"
        >
          <span>{interpolate(t('cloudFilesInsertSelected'), { count: selectedCount.toString() })}</span>
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { X, Loader2 } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { ExportOptions } from './ExportOptions';
import { type ExportType } from './useMessageExport';
import { MODAL_CLOSE_BUTTON_CLASS } from '@/constants/buttonClasses';
import { interpolate } from '@/i18n/interpolate';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (type: ExportType) => void;
  exportingType: ExportType | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport, exportingType }) => {
  const { t } = useI18n();

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !exportingType && onClose()}
      noPadding
      ariaLabelledBy="export-message-title"
      contentClassName="w-full max-w-sm overflow-hidden rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)] shadow-premium"
    >
      <div className="flex items-center justify-between border-b border-[var(--theme-border-secondary)]/60 px-3.5 py-2.5">
        <h2 id="export-message-title" className="text-sm font-semibold text-[var(--theme-text-primary)]">
          {t('exportMessageDialogTitle')}
        </h2>
        <button
          onClick={onClose}
          disabled={!!exportingType}
          className={`${MODAL_CLOSE_BUTTON_CLASS} disabled:opacity-50`}
          aria-label={t('exportCloseDialogAria')}
        >
          <X size={16} />
        </button>
      </div>

      {exportingType ? (
        <div className="flex flex-col items-center justify-center px-4 py-8 text-[var(--theme-text-secondary)]">
          <Loader2 size={20} className="mb-3 animate-spin text-[var(--theme-text-tertiary)]" />
          <p className="text-sm font-medium">
            {interpolate(t('exportingTitle'), { type: exportingType.toUpperCase() })}
          </p>
          <p className="mt-1 text-xs text-[var(--theme-text-tertiary)]">{t('exportProcessingMessageContent')}</p>
        </div>
      ) : (
        <ExportOptions onExport={onExport} />
      )}
    </Modal>
  );
};

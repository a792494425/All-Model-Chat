import React from 'react';
import { X, Loader2 } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { ExportOptions } from '@/components/message/buttons/export/ExportOptions';
import { MODAL_CLOSE_BUTTON_CLASS } from '@/constants/buttonClasses';
import { useI18n } from '@/contexts/I18nContext';

interface ExportChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'png' | 'html' | 'txt' | 'json') => void;
  exportStatus: 'idle' | 'exporting';
}

export const ExportChatModal: React.FC<ExportChatModalProps> = ({ isOpen, onClose, onExport, exportStatus }) => {
  const { t } = useI18n();
  const isLoading = exportStatus === 'exporting';

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onClose}
      noPadding
      ariaLabelledBy="export-chat-title"
      contentClassName="w-full max-w-sm overflow-hidden rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)] shadow-premium"
    >
      <div className="flex items-center justify-between border-b border-[var(--theme-border-secondary)]/60 px-3.5 py-2.5">
        <h2 id="export-chat-title" className="text-sm font-semibold text-[var(--theme-text-primary)]">
          {t('exportChatTitle')}
        </h2>
        <button
          onClick={onClose}
          disabled={isLoading}
          className={`${MODAL_CLOSE_BUTTON_CLASS} disabled:opacity-50`}
          aria-label={t('exportCloseDialogAria')}
        >
          <X size={16} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center px-4 py-8 text-[var(--theme-text-secondary)]">
          <Loader2 size={20} className="mb-3 animate-spin text-[var(--theme-text-tertiary)]" />
          <p className="text-sm font-medium">{t('exportConversationLoading')}</p>
          <p className="mt-1 text-xs text-[var(--theme-text-tertiary)]">{t('exportConversationWaitHint')}</p>
        </div>
      ) : (
        <ExportOptions onExport={onExport} variant="chat" />
      )}
    </Modal>
  );
};

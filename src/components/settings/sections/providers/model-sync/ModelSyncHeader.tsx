import React from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface ModelSyncHeaderProps {
  connectionName: string;
  totalRemote: number;
  onClose: () => void;
}

export const ModelSyncHeader: React.FC<ModelSyncHeaderProps> = ({ connectionName, totalRemote, onClose }) => {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)]/40">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
          <RefreshCw size={19} />
        </div>
        <div>
          <h2 id="model-sync-title" className="text-base font-semibold leading-tight">
            {t('thirdPartySyncModelsTitle')}
          </h2>
          <p className="text-xs text-[var(--theme-text-secondary)] mt-0.5">
            {t('thirdPartyProvider')}:{' '}
            <span className="font-medium text-[var(--theme-text-primary)]">{connectionName}</span>
            <span className="mx-2">·</span>
            {t('thirdPartyRemoteFoundModels', { count: totalRemote })}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-1.5 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-secondary)] rounded-lg transition-colors"
        aria-label={t('close')}
      >
        <X size={18} />
      </button>
    </div>
  );
};

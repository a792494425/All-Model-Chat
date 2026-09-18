import React from 'react';
import { Cloud, Loader2, RefreshCw, X } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { interpolate } from '@/i18n/interpolate';
import { formatFileSize } from '@/utils/file/fileSize';
import { MODAL_CLOSE_BUTTON_CLASS } from '@/constants/buttonClasses';

export interface CloudFilesHeaderProps {
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onClose: () => void;
  totalBytesUsed: number;
  quotaPercent: number;
  totalFileCount: number;
}

export const CloudFilesHeader: React.FC<CloudFilesHeaderProps> = ({
  isLoading,
  isRefreshing,
  onRefresh,
  onClose,
  totalBytesUsed,
  quotaPercent,
  totalFileCount,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-3 px-5 py-4 border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)]/40 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Cloud size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--theme-text-primary)] leading-tight flex items-center gap-2">
              <span>{t('cloudFilesModalTitle')}</span>
              {isRefreshing && <Loader2 size={14} className="animate-spin text-blue-500" />}
            </h2>
            <p className="text-xs text-[var(--theme-text-tertiary)]">{t('cloudFilesStorageLimitHint')}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading || isRefreshing}
            className="p-1.5 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title={t('refresh')}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button type="button" onClick={onClose} className={MODAL_CLOSE_BUTTON_CLASS} aria-label={t('close')}>
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="bg-[var(--theme-bg-tertiary)]/40 p-2.5 rounded-xl border border-[var(--theme-border-secondary)]">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--theme-text-secondary)] font-medium">
            {interpolate(t('cloudFilesStorageQuota'), {
              used: formatFileSize(totalBytesUsed) || '0 B',
              total: '20 GB',
              percent: quotaPercent.toFixed(1),
            })}
          </span>
          <span className="text-[11px] text-[var(--theme-text-tertiary)]">
            {interpolate(t('cloudFilesTotalCount'), { count: totalFileCount.toString() })}
          </span>
        </div>
        <div className="w-full h-1.5 bg-[var(--theme-bg-tertiary)] rounded-full overflow-hidden mt-2">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              quotaPercent > 90 ? 'bg-rose-500' : quotaPercent > 75 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.max(1, Math.min(100, quotaPercent))}%` }}
          />
        </div>
      </div>
    </div>
  );
};

import React, { type MouseEvent } from 'react';
import { AlertCircle, CheckCheck, CloudOff, Copy, RefreshCw } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

export interface CloudFilesErrorStateProps {
  fetchError: string;
  isNoKeyWarning: boolean;
  isPermissionOrProxyError: boolean;
  isRefreshing: boolean;
  showErrorDetails: boolean;
  setShowErrorDetails: React.Dispatch<React.SetStateAction<boolean>>;
  onRetry: () => void;
  onCopyId: (text: string, e?: MouseEvent) => void;
  copiedFileName: string | null;
}

export const CloudFilesErrorState: React.FC<CloudFilesErrorStateProps> = ({
  fetchError,
  isNoKeyWarning,
  isPermissionOrProxyError,
  isRefreshing,
  showErrorDetails,
  setShowErrorDetails,
  onRetry,
  onCopyId,
  copiedFileName,
}) => {
  const { t } = useI18n();

  return (
    <div className="h-full flex flex-col items-center justify-center py-12 px-6 text-center max-w-lg mx-auto">
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3.5 ${
          isPermissionOrProxyError || isNoKeyWarning ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
        }`}
      >
        {isPermissionOrProxyError ? <CloudOff size={24} /> : <AlertCircle size={24} />}
      </div>

      <h3 className="text-sm font-semibold text-[var(--theme-text-primary)] mb-2">
        {isNoKeyWarning ? fetchError : isPermissionOrProxyError ? t('cloudFilesPermissionDenied') : fetchError}
      </h3>

      {isPermissionOrProxyError && (
        <p className="text-xs text-[var(--theme-text-secondary)] leading-relaxed mb-4">
          {t('cloudFilesPermissionDeniedHint')}
        </p>
      )}

      {!isNoKeyWarning && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRetry}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-[var(--theme-text-primary)] bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-secondary)] rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{t('cloudFilesRetry')}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowErrorDetails((prev) => !prev)}
            className="text-xs text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] underline transition-colors cursor-pointer"
          >
            {t('cloudFilesDetailsToggle')}
          </button>
        </div>
      )}

      {showErrorDetails && (
        <div className="mt-4 p-3 w-full rounded-xl bg-[var(--theme-bg-tertiary)]/60 border border-[var(--theme-border-secondary)] text-left">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-[var(--theme-text-secondary)] font-mono">
              {t('cloudFilesRawError')}
            </span>
            <button
              type="button"
              onClick={(e) => onCopyId(fetchError, e)}
              title={t('cloudFilesCopyId')}
              className="text-[var(--theme-text-tertiary)] hover:text-blue-500 p-1 cursor-pointer"
            >
              {copiedFileName === fetchError ? (
                <CheckCheck size={12} className="text-emerald-500" />
              ) : (
                <Copy size={12} />
              )}
            </button>
          </div>
          <pre className="text-[11px] font-mono text-[var(--theme-text-secondary)] whitespace-pre-wrap break-all max-h-36 overflow-y-auto">
            {fetchError}
          </pre>
        </div>
      )}
    </div>
  );
};

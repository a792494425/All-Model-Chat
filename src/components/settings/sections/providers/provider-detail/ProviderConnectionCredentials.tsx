import React from 'react';
import { Activity, AlertCircle, ExternalLink, Eye, EyeOff, KeyRound, Loader2, Settings, X } from 'lucide-react';
import type { ThirdPartyConnection } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { SETTINGS_INPUT_CLASS } from '@/constants/formClasses';
import { copyTextToClipboard } from '@/utils/clipboard';
import { toastSuccess } from '@/stores/toastStore';
import {
  formatLatency,
  getLatencyBadgeStyles,
  diagnoseConnectionError,
  type ConnectionHealthProbeResult,
} from '@/utils/third-party/thirdPartyDiagnostics';

export interface ProviderConnectionCredentialsProps {
  connection: ThirdPartyConnection;
  onUpdateConnection: (updates: Partial<ThirdPartyConnection>) => void;
  templateLinks: { docUrl?: string; apiKeyUrl?: string };
  showApiKey: boolean;
  setShowApiKey: (show: boolean) => void;
  healthStatus: string;
  healthResult: ConnectionHealthProbeResult | null;
  setConnectionHealthResult: (connectionId: string, result: ConnectionHealthProbeResult | null) => void;
  onTestConnection: () => void | Promise<void>;
  onOpenEdit: () => void;
  endpointPreview?: React.ReactNode;
}

export const ProviderConnectionCredentials: React.FC<ProviderConnectionCredentialsProps> = ({
  connection,
  onUpdateConnection,
  templateLinks,
  showApiKey,
  setShowApiKey,
  healthStatus,
  healthResult,
  setConnectionHealthResult,
  onTestConnection,
  onOpenEdit,
  endpointPreview,
}) => {
  const { t } = useI18n();

  return (
    <>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-[var(--theme-text-primary)] flex items-center justify-between">
          <span>{t('thirdPartyConnectionNotes')}</span>
        </label>
        <input
          type="text"
          value={connection.notes ?? ''}
          onChange={(e) => onUpdateConnection({ notes: e.target.value.trim() || undefined })}
          placeholder={t('thirdPartyConnectionNotesPlaceholder')}
          className={`w-full px-3 py-1.5 rounded-xl border text-xs transition-all ${SETTINGS_INPUT_CLASS}`}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[var(--theme-text-primary)]">{t('thirdPartyApiKeyLabel')}</span>
          {templateLinks.apiKeyUrl && (
            <a
              href={templateLinks.apiKeyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--theme-text-link)] hover:underline flex items-center gap-1"
            >
              <span>{t('thirdPartyGetApiKey')}</span>
              <ExternalLink size={11} />
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={connection.apiKey ?? ''}
              onChange={(e) => onUpdateConnection({ apiKey: e.target.value })}
              placeholder={connection.authOptional ? t('thirdPartyAuthOptionalPlaceholder') : 'sk-...'}
              className={`w-full pl-3 pr-9 py-2 rounded-xl border text-xs font-mono transition-all ${SETTINGS_INPUT_CLASS}`}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-secondary)]/70 hover:text-[var(--theme-text-primary)] p-0.5 focus:outline-none"
              title={showApiKey ? t('thirdPartyHideKey') : t('thirdPartyShowKey')}
            >
              {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (connection.apiKey) {
                await copyTextToClipboard(connection.apiKey);
                toastSuccess(t('thirdPartyToastKeyCopied'));
              }
            }}
            className="p-2 rounded-xl border border-[var(--theme-border-secondary)]/70 bg-[var(--theme-bg-secondary)]/60 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors flex-shrink-0"
            title={t('thirdPartyCopyKey')}
          >
            <KeyRound size={15} />
          </button>
          <button
            type="button"
            onClick={() => void onTestConnection()}
            disabled={healthStatus === 'testing'}
            className="px-3 py-2 rounded-xl border border-[var(--theme-border-secondary)]/70 bg-[var(--theme-bg-secondary)]/60 hover:bg-[var(--theme-bg-tertiary)] text-xs font-medium text-[var(--theme-text-primary)] transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer disabled:opacity-60 shadow-xs"
          >
            {healthStatus === 'testing' ? (
              <Loader2 size={13} className="animate-spin text-[var(--theme-border-focus)]" />
            ) : (
              <Activity size={13} className="text-[var(--theme-text-secondary)]" />
            )}
            <span>{healthStatus === 'testing' ? t('thirdPartyTestingConnection') : t('thirdPartyTestConnection')}</span>
          </button>
          {healthResult && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono font-medium ${
                getLatencyBadgeStyles(healthResult.grade).badge
              }`}
              title={healthResult.errorMessage ?? undefined}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${getLatencyBadgeStyles(healthResult.grade).dot}`} />
              <span>
                {healthResult.status === 'success' ? formatLatency(healthResult.latencyMs) : t('thirdPartyFailed')}
              </span>
            </span>
          )}
        </div>

        {healthResult && healthResult.status === 'error' && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-xs text-[var(--theme-text-primary)] animate-in fade-in duration-150">
            <AlertCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0 flex-1">
              <div className="font-semibold text-rose-600 dark:text-rose-400 flex items-center justify-between">
                <span>{t('thirdPartyConnectionFailed')}</span>
                <button
                  type="button"
                  onClick={() => setConnectionHealthResult(connection.id, null)}
                  className="text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] cursor-pointer"
                >
                  <X size={13} />
                </button>
              </div>
              {healthResult.errorMessage && (
                <p className="font-mono text-[11px] text-[var(--theme-text-secondary)] break-all opacity-90">
                  {healthResult.errorMessage}
                </p>
              )}
              {(healthResult.diagnosticTip || diagnoseConnectionError(healthResult.errorMessage || '')) && (
                <div className="text-[11px] text-amber-700 dark:text-amber-300/90 font-medium pt-0.5">
                  💡 {t('thirdPartyDiagnosticAdvice')}:{' '}
                  {healthResult.diagnosticTip || diagnoseConnectionError(healthResult.errorMessage || '')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--theme-text-primary)]">{t('thirdPartyApiUrlLabel')}</span>
            {templateLinks.docUrl && (
              <a
                href={templateLinks.docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--theme-text-link)] hover:underline flex items-center gap-1"
              >
                <span>{t('thirdPartyAddEndpointOrDocs')}</span>
                <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={connection.baseUrl ?? ''}
            onChange={(e) => onUpdateConnection({ baseUrl: e.target.value })}
            placeholder="https://..."
            className={`flex-1 p-2 rounded-xl border text-xs font-mono ${SETTINGS_INPUT_CLASS}`}
          />
          <button
            type="button"
            onClick={onOpenEdit}
            className="p-2 rounded-xl border border-[var(--theme-border-secondary)]/70 bg-[var(--theme-bg-secondary)]/60 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors flex-shrink-0"
            title={t('thirdPartyConfigureEndpointAndHeaders')}
          >
            <Settings size={15} />
          </button>
        </div>
        {endpointPreview}
      </div>
    </>
  );
};

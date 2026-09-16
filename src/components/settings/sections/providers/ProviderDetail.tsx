import React, { useState, useRef } from 'react';
import {
  Settings,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Activity,
  ExternalLink,
  Loader2,
  AlertCircle,
  X,
  SlidersHorizontal,
  ArrowUpRight,
} from 'lucide-react';
import type { ModelOption, ThirdPartyConnection } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { useSettingsUiStore } from '@/stores/settingsUiStore';
import { Toggle } from '@/components/shared/Toggle';
import { SETTINGS_INPUT_CLASS } from '@/constants/formClasses';
import { getThirdPartyTemplateLinks } from '@/utils/thirdPartyApiProviders';
import {
  probeThirdPartyConnection,
  formatLatency,
  getLatencyBadgeStyles,
  diagnoseConnectionError,
  type ConnectionHealthProbeResult,
} from '@/utils/thirdPartyDiagnostics';
import {
  probeSingleModel,
  runBatchModelHealthCheck,
  type BatchHealthCheckSummary,
} from '@/utils/model/modelHealthCheck';
import { fetchOpenAICompatibleModels } from '@/services/api/openaiCompatibleApi';
import { fetchOpenAIResponsesModels } from '@/services/api/openaiResponsesApi';
import { fetchAnthropicModels } from '@/services/api/anthropicApi';
import { AUTH_OPTIONAL_API_KEY, parseApiKeys } from '@/utils/apiKeySelection';
import { getErrorMessage } from '@/utils/errorMessage';
import { toastError, toastSuccess, toastWarning } from '@/stores/toastStore';
import { copyTextToClipboard } from '@/utils/clipboard';
import { ProviderAvatar } from './ProviderAvatar';
import { ProviderEndpointPreview } from './ProviderEndpointPreview';
import { ProviderEditDialog } from './ProviderEditDialog';
import { ModelSyncModal } from './ModelSyncModal';
import { ProviderModelListSection } from './models/ProviderModelListSection';
import { useProviderUiStore } from '@/stores/providerUiStore';

const EMPTY_PROBE_RESULTS: Record<string, ConnectionHealthProbeResult> = {};

interface ProviderDetailProps {
  connection: ThirdPartyConnection;
  onUpdateConnection: (updates: Partial<ThirdPartyConnection>) => void;
  onDuplicateConnection?: () => void;
  onDeleteConnection: () => void;
  onCloseModal?: () => void;
}

export const ProviderDetail: React.FC<ProviderDetailProps> = ({
  connection,
  onUpdateConnection,
  onDuplicateConnection,
  onDeleteConnection,
  onCloseModal: _onCloseModal,
}) => {
  const { t } = useI18n();

  // Dialog states
  const [isEditOpen, setIsEditOpen] = useState(false);

  // API Key show/hide
  const [showApiKey, setShowApiKey] = useState(false);

  // Health testing
  const [isTestingHealth, setIsTestingHealth] = useState(false);
  const healthResult = useProviderUiStore((s) => s.healthResultByConnection[connection.id] ?? null);
  const setConnectionHealthResult = useProviderUiStore((s) => s.setConnectionHealthResult);
  const healthStatus = isTestingHealth ? 'testing' : (healthResult?.status ?? 'idle');

  // Sync models
  const [isSyncingModels, setIsSyncingModels] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncRemoteModels, setSyncRemoteModels] = useState<ModelOption[]>([]);

  // Model health check states
  const modelProbeResults = useProviderUiStore(
    (s) => s.modelProbeResultsByConnection[connection.id] ?? EMPTY_PROBE_RESULTS,
  );
  const [isCheckingBatch, setIsCheckingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ completed: number; total: number } | null>(null);
  const [batchSummary, setBatchSummary] = useState<BatchHealthCheckSummary | null>(null);
  const [probingModelIds, setProbingModelIds] = useState<Set<string>>(new Set());
  const batchAbortControllerRef = useRef<AbortController | null>(null);

  const templateLinks = getThirdPartyTemplateLinks(connection.templateId);

  // Batch model health check
  const handleBatchHealthCheck = async (targetModels?: ModelOption[]) => {
    const modelsToProbe = targetModels && targetModels.length > 0 ? targetModels : connection.models;
    if (modelsToProbe.length === 0) {
      toastWarning(t('thirdPartyToastNoModelsToProbe'));
      return;
    }
    const controller = new AbortController();
    batchAbortControllerRef.current = controller;
    setIsCheckingBatch(true);
    setBatchSummary(null);
    setBatchProgress({ completed: 0, total: modelsToProbe.length });

    try {
      const summary = await runBatchModelHealthCheck(connection, modelsToProbe, {
        concurrency: 3,
        signal: controller.signal,
        onProgress: (progress) => {
          setBatchProgress({ completed: progress.completed, total: progress.total });
          useProviderUiStore
            .getState()
            .setModelProbeResult(connection.id, progress.currentModelId, progress.latestResult);
        },
      });

      setBatchSummary(summary);
      if (!controller.signal.aborted) {
        if (summary.errorCount === 0) {
          toastSuccess(
            t('thirdPartyToastProbeAllSuccess', {
              count: summary.successCount,
              latency: summary.avgLatencyMs,
            }),
          );
        } else {
          toastWarning(
            t('thirdPartyToastProbePartialSuccess', {
              successCount: summary.successCount,
              errorCount: summary.errorCount,
              latency: summary.avgLatencyMs,
            }),
          );
        }
      }
    } catch (batchHealthError) {
      toastError(getErrorMessage(batchHealthError));
    } finally {
      setIsCheckingBatch(false);
      setBatchProgress(null);
      batchAbortControllerRef.current = null;
    }
  };

  const handleStopBatchHealthCheck = () => {
    batchAbortControllerRef.current?.abort();
    setIsCheckingBatch(false);
    setBatchProgress(null);
    toastWarning(t('thirdPartyToastProbeAborted'));
  };

  const handleSingleModelProbe = async (modelId: string) => {
    if (probingModelIds.has(modelId)) return;
    setProbingModelIds((prev) => new Set(prev).add(modelId));

    try {
      const res = await probeSingleModel(connection, modelId);
      useProviderUiStore.getState().setModelProbeResult(connection.id, modelId, res);
      if (res.status === 'success') {
        toastSuccess(t('thirdPartyToastSingleProbeSuccess', { modelId, latency: formatLatency(res.latencyMs) }));
      } else {
        toastError(
          t('thirdPartyToastSingleProbeFailed', { modelId, error: res.errorMessage || t('thirdPartyFailed') }),
        );
      }
    } catch (probeError) {
      toastError(getErrorMessage(probeError));
    } finally {
      setProbingModelIds((prev) => {
        const next = new Set(prev);
        next.delete(modelId);
        return next;
      });
    }
  };

  const handleDisableFailedModels = () => {
    const failedIds = new Set(
      Object.entries(modelProbeResults)
        .filter(([, r]) => r.status === 'error')
        .map(([id]) => id),
    );
    if (failedIds.size === 0) return;

    const updated = connection.models.map((m) => (failedIds.has(m.id) ? { ...m, visibleInSelector: false } : m));
    onUpdateConnection({ models: updated });
    toastSuccess(t('thirdPartyToastDisabledFailedModels', { count: failedIds.size }));
    setBatchSummary(null);
  };

  // Handle test API key connection
  const handleTestConnection = async () => {
    setIsTestingHealth(true);
    try {
      const result = await probeThirdPartyConnection(connection, {
        modelId: connection.modelId || connection.models[0]?.id,
      });
      setConnectionHealthResult(connection.id, result);
      if (result.status === 'success') {
        toastSuccess(t('thirdPartyToastConnSuccess', { latency: formatLatency(result.latencyMs) }));
      } else {
        toastError(t('thirdPartyToastConnFailed', { error: result.errorMessage ?? t('thirdPartyFailed') }));
      }
    } catch (connError) {
      setConnectionHealthResult(connection.id, {
        connectionId: connection.id,
        modelId: connection.modelId || connection.models[0]?.id || '',
        status: 'error',
        latencyMs: 0,
        grade: 'error',
        errorMessage: getErrorMessage(connError),
        timestamp: Date.now(),
      });
      toastError(t('thirdPartyToastConnFailed', { error: getErrorMessage(connError) }));
    } finally {
      setIsTestingHealth(false);
    }
  };

  // Remote model fetching
  const handleSyncModels = async () => {
    const activeKey = parseApiKeys(connection.apiKey)[0] || '';
    if (!activeKey && !connection.authOptional) {
      toastWarning(t('thirdPartyToastKeyRequired'));
      return;
    }

    setIsSyncingModels(true);
    try {
      let fetchedModels: ModelOption[] = [];
      const controller = new AbortController();

      if (connection.protocol === 'anthropic') {
        fetchedModels = await fetchAnthropicModels(
          activeKey,
          connection.baseUrl,
          controller.signal,
          connection.id,
          connection.extraHeaders,
        );
      } else if (connection.protocol === 'openai-responses') {
        fetchedModels = await fetchOpenAIResponsesModels(
          activeKey,
          connection.baseUrl,
          controller.signal,
          connection.id,
          connection.extraHeaders,
        );
      } else {
        fetchedModels = await fetchOpenAICompatibleModels(
          activeKey || AUTH_OPTIONAL_API_KEY,
          connection.baseUrl,
          controller.signal,
          connection.id,
          connection.extraHeaders,
        );
      }

      setSyncRemoteModels(fetchedModels);
      setIsSyncModalOpen(true);
    } catch (fetchError) {
      toastError(t('thirdPartyToastFetchModelsFailed', { error: getErrorMessage(fetchError) }));
    } finally {
      setIsSyncingModels(false);
    }
  };

  // Apply reconcile results from ModelSyncModal
  const handleApplySyncModels = (reconciledModels: ModelOption[]) => {
    onUpdateConnection({
      models: reconciledModels,
      modelId: connection.modelId || reconciledModels[0]?.id || '',
    });
    toastSuccess(t('thirdPartyToastSyncSuccess', { count: reconciledModels.length }));
  };

  // Central model update handler from ProviderModelListSection
  const handleUpdateModels = (updatedModels: ModelOption[]) => {
    if (updatedModels.length < connection.models.length) {
      const remainingIds = new Set(updatedModels.map((m) => m.id));
      const nextModelId = remainingIds.has(connection.modelId) ? connection.modelId : (updatedModels[0]?.id ?? '');
      onUpdateConnection({
        models: updatedModels,
        modelId: nextModelId,
      });
    } else if (updatedModels.length > connection.models.length && !connection.modelId) {
      onUpdateConnection({
        models: updatedModels,
        modelId: updatedModels[0]?.id ?? '',
      });
    } else {
      onUpdateConnection({
        models: updatedModels,
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-[var(--theme-bg-primary)] overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-b border-[var(--theme-border-secondary)]/30 flex-shrink-0 bg-[var(--theme-bg-primary)]">
        <div className="flex items-center gap-3 min-w-0">
          <ProviderAvatar name={connection.name} templateId={connection.templateId} size={28} icon={connection.icon} />
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-xl font-bold text-[var(--theme-text-primary)] truncate">{connection.name}</h2>
            {connection.notes && (
              <span className="px-2 py-0.5 text-xs font-normal rounded-lg bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] border border-[var(--theme-border-secondary)]/40 truncate max-w-[120px] shrink-0">
                {connection.notes}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="p-1.5 rounded-lg text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors focus:outline-none cursor-pointer"
            title={t('thirdPartyConfigureProvider')}
          >
            <Settings size={15} />
          </button>
          {onDuplicateConnection && (
            <button
              type="button"
              data-testid="provider-duplicate-button"
              onClick={onDuplicateConnection}
              className="p-1.5 rounded-lg text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors focus:outline-none"
              title={t('thirdPartyDuplicate')}
              aria-label={t('thirdPartyDuplicate')}
            >
              <Copy size={15} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <Toggle
            checked={connection.enabled}
            onChange={(checked) => onUpdateConnection({ enabled: checked })}
            ariaLabel={connection.enabled ? t('enabled') : t('disabled')}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-[var(--theme-border-secondary)]/40 bg-[var(--theme-bg-secondary)]/25 text-xs text-[var(--theme-text-secondary)]">
          <div className="flex items-center gap-2 min-w-0">
            <SlidersHorizontal size={14} className="text-[var(--theme-text-link)] shrink-0" />
            <span className="truncate">{t('thirdPartyGenerationSettingsHint')}</span>
          </div>
          <button
            type="button"
            onClick={() => useSettingsUiStore.getState().setActiveTab('models')}
            className="shrink-0 flex items-center gap-1 font-medium text-[var(--theme-text-link)] hover:underline hover:text-[var(--theme-text-primary)] transition-colors cursor-pointer"
          >
            <span>{t('settingsTabModels')}</span>
            <ArrowUpRight size={13} />
          </button>
        </div>

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
              onClick={handleTestConnection}
              disabled={healthStatus === 'testing'}
              className="px-3 py-2 rounded-xl border border-[var(--theme-border-secondary)]/70 bg-[var(--theme-bg-secondary)]/60 hover:bg-[var(--theme-bg-tertiary)] text-xs font-medium text-[var(--theme-text-primary)] transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer disabled:opacity-60 shadow-xs"
            >
              {healthStatus === 'testing' ? (
                <Loader2 size={13} className="animate-spin text-[var(--theme-border-focus)]" />
              ) : (
                <Activity size={13} className="text-[var(--theme-text-secondary)]" />
              )}
              <span>
                {healthStatus === 'testing' ? t('thirdPartyTestingConnection') : t('thirdPartyTestConnection')}
              </span>
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
              onClick={() => setIsEditOpen(true)}
              className="p-2 rounded-xl border border-[var(--theme-border-secondary)]/70 bg-[var(--theme-bg-secondary)]/60 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors flex-shrink-0"
              title={t('thirdPartyConfigureEndpointAndHeaders')}
            >
              <Settings size={15} />
            </button>
          </div>
          <ProviderEndpointPreview protocol={connection.protocol} baseUrl={connection.baseUrl} />
        </div>

        {batchSummary && batchSummary.errorCount > 0 && (
          <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-300 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="text-amber-500 flex-shrink-0" />
              <span>
                {t('thirdPartyProbeSummaryBanner', {
                  successCount: batchSummary.successCount,
                  errorCount: batchSummary.errorCount,
                  latency: batchSummary.avgLatencyMs,
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleDisableFailedModels}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 font-medium text-amber-800 dark:text-amber-200 transition-colors cursor-pointer"
              >
                {t('thirdPartyDisableFailedModels')}
              </button>
              <button
                type="button"
                onClick={() => setBatchSummary(null)}
                className="p-1 rounded hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 transition-colors cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        <ProviderModelListSection
          providerId={connection.id}
          providerName={connection.name}
          protocol={connection.protocol}
          templateId={connection.templateId}
          models={connection.models}
          onUpdateModels={handleUpdateModels}
          onProbeSingleModel={handleSingleModelProbe}
          onProbeBatchModels={handleBatchHealthCheck}
          isProbingBatch={isCheckingBatch}
          probingModelIds={probingModelIds}
          modelProbeResults={modelProbeResults}
          onStopProbe={handleStopBatchHealthCheck}
          batchProgress={batchProgress}
          onSyncRemoteModels={handleSyncModels}
          isSyncingRemoteModels={isSyncingModels}
        />
      </div>

      <ProviderEditDialog
        isOpen={isEditOpen}
        connection={connection}
        onClose={() => setIsEditOpen(false)}
        onSave={(updates) => onUpdateConnection(updates)}
        onDelete={onDeleteConnection}
      />

      <ModelSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        connectionName={connection.name}
        templateId={connection.templateId}
        remoteModels={syncRemoteModels}
        existingModels={connection.models}
        onApply={handleApplySyncModels}
      />
    </div>
  );
};

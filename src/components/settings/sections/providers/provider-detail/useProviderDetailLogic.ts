import { useState, useRef } from 'react';
import type { ModelOption, ThirdPartyConnection } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { useProviderUiStore } from '@/stores/providerUiStore';
import { getThirdPartyTemplateLinks } from '@/utils/third-party/thirdPartyApiProviders';
import {
  probeThirdPartyConnection,
  formatLatency,
  type ConnectionHealthProbeResult,
} from '@/utils/third-party/thirdPartyDiagnostics';
import {
  probeSingleModel,
  runBatchModelHealthCheck,
  type BatchHealthCheckSummary,
} from '@/utils/model/modelHealthCheck';
import { fetchOpenAICompatibleModels } from '@/services/api/protocols/openai-compatible/openaiCompatibleApi';
import { fetchOpenAIResponsesModels } from '@/services/api/protocols/openai-responses/openaiResponsesApi';
import { fetchAnthropicModels } from '@/services/api/protocols/anthropic/anthropicApi';
import { AUTH_OPTIONAL_API_KEY, parseApiKeys } from '@/utils/api/apiKeySelection';
import { getErrorMessage } from '@/utils/errorMessage';
import { toastError, toastSuccess, toastWarning } from '@/stores/toastStore';

const EMPTY_PROBE_RESULTS: Record<string, ConnectionHealthProbeResult> = {};

export interface UseProviderDetailLogicParams {
  connection: ThirdPartyConnection;
  onUpdateConnection: (updates: Partial<ThirdPartyConnection>) => void;
}

export function useProviderDetailLogic({ connection, onUpdateConnection }: UseProviderDetailLogicParams) {
  const { t } = useI18n();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const [isTestingHealth, setIsTestingHealth] = useState(false);
  const healthResult = useProviderUiStore((state) => state.healthResultByConnection[connection.id] ?? null);
  const setConnectionHealthResult = useProviderUiStore((state) => state.setConnectionHealthResult);
  const healthStatus = isTestingHealth ? 'testing' : (healthResult?.status ?? 'idle');

  const [isSyncingModels, setIsSyncingModels] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncRemoteModels, setSyncRemoteModels] = useState<ModelOption[]>([]);

  const modelProbeResults = useProviderUiStore(
    (state) => state.modelProbeResultsByConnection[connection.id] ?? EMPTY_PROBE_RESULTS,
  );
  const [isCheckingBatch, setIsCheckingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ completed: number; total: number } | null>(null);
  const [batchSummary, setBatchSummary] = useState<BatchHealthCheckSummary | null>(null);
  const [probingModelIds, setProbingModelIds] = useState<Set<string>>(new Set());
  const batchAbortControllerRef = useRef<AbortController | null>(null);

  const templateLinks = getThirdPartyTemplateLinks(connection.templateId);

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
      const probeResult = await probeSingleModel(connection, modelId);
      useProviderUiStore.getState().setModelProbeResult(connection.id, modelId, probeResult);
      if (probeResult.status === 'success') {
        toastSuccess(
          t('thirdPartyToastSingleProbeSuccess', { modelId, latency: formatLatency(probeResult.latencyMs) }),
        );
      } else {
        toastError(
          t('thirdPartyToastSingleProbeFailed', { modelId, error: probeResult.errorMessage || t('thirdPartyFailed') }),
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
        .filter(([, probeResult]) => probeResult.status === 'error')
        .map(([id]) => id),
    );
    if (failedIds.size === 0) return;

    const updated = connection.models.map((model) =>
      failedIds.has(model.id) ? { ...model, visibleInSelector: false } : model,
    );
    onUpdateConnection({ models: updated });
    toastSuccess(t('thirdPartyToastDisabledFailedModels', { count: failedIds.size }));
    setBatchSummary(null);
  };

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

  const handleApplySyncModels = (reconciledModels: ModelOption[]) => {
    onUpdateConnection({
      models: reconciledModels,
      modelId: connection.modelId || reconciledModels[0]?.id || '',
    });
    toastSuccess(t('thirdPartyToastSyncSuccess', { count: reconciledModels.length }));
  };

  const handleUpdateModels = (updatedModels: ModelOption[]) => {
    if (updatedModels.length < connection.models.length) {
      const remainingIds = new Set(updatedModels.map((model) => model.id));
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

  return {
    t,
    isEditOpen,
    setIsEditOpen,
    showApiKey,
    setShowApiKey,
    isTestingHealth,
    healthResult,
    setConnectionHealthResult,
    healthStatus,
    isSyncingModels,
    isSyncModalOpen,
    setIsSyncModalOpen,
    syncRemoteModels,
    modelProbeResults,
    isCheckingBatch,
    batchProgress,
    batchSummary,
    setBatchSummary,
    probingModelIds,
    templateLinks,
    handleBatchHealthCheck,
    handleStopBatchHealthCheck,
    handleSingleModelProbe,
    handleDisableFailedModels,
    handleTestConnection,
    handleSyncModels,
    handleApplySyncModels,
    handleUpdateModels,
  };
}

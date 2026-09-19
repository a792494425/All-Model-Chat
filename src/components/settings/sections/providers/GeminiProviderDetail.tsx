import React, { useState, useMemo, useRef } from 'react';
import { SlidersHorizontal, ArrowUpRight } from 'lucide-react';
import type { AppSettings, ModelOption } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { getDefaultModelOptions } from '@/utils/model/defaultModelOptions';
import { useModelPreferencesStore } from '@/stores/modelPreferencesStore';
import { useProviderUiStore } from '@/stores/providerUiStore';
import { useSettingsUiStore } from '@/stores/settingsUiStore';
import { ProviderAvatar } from './ProviderAvatar';
import { ApiConfigSection } from '@/components/settings/sections/ApiConfigSection';
import { ProviderModelListSection } from './models/ProviderModelListSection';
import { getClient } from '@/services/api/apiClient';
import { parseApiKeys } from '@/utils/api/apiKeySelection';
import {
  formatLatency,
  getLatencyGrade,
  type ConnectionHealthProbeResult,
} from '@/utils/third-party/thirdPartyDiagnostics';
import { getErrorMessage } from '@/utils/errorMessage';
import { toastError, toastSuccess, toastWarning } from '@/stores/toastStore';

const EMPTY_PROBE_RESULTS: Record<string, ConnectionHealthProbeResult> = {};

export interface GeminiProviderDetailProps {
  settings: AppSettings;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  onCloseModal?: () => void;
}

export const GeminiProviderDetail: React.FC<GeminiProviderDetailProps> = ({
  settings,
  onUpdateSettings,
  onCloseModal: _onCloseModal,
}) => {
  const { t } = useI18n();

  // Models from store or default
  const customModels = useModelPreferencesStore((s) => s.customModels);
  const effectiveModels = useMemo(
    () => (customModels && customModels.length > 0 ? customModels : getDefaultModelOptions()),
    [customModels],
  );

  // Model probe results and probing state
  const modelProbeResults = useProviderUiStore((s) => s.modelProbeResultsByConnection['gemini'] ?? EMPTY_PROBE_RESULTS);
  const [probingModelIds, setProbingModelIds] = useState<Set<string>>(new Set());
  const [isCheckingBatch, setIsCheckingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ completed: number; total: number } | null>(null);
  const batchAbortControllerRef = useRef<AbortController | null>(null);

  const handleUpdateModels = (updated: ModelOption[]) => {
    useModelPreferencesStore.getState().setCustomModels(updated);
  };

  const handleSingleModelProbe = async (modelId: string) => {
    if (probingModelIds.has(modelId)) return;
    setProbingModelIds((prev) => new Set(prev).add(modelId));

    const startTime = performance.now();
    try {
      const keyToTest = settings.apiKey || '';
      const firstKey = parseApiKeys(keyToTest)[0];
      if (!firstKey && settings.useCustomApiConfig) {
        throw new Error(t('apiConfigNoKeyProvided') || 'No API key provided');
      }

      const effectiveUrl =
        settings.useCustomApiConfig && settings.useApiProxy && settings.apiProxyUrl ? settings.apiProxyUrl : null;

      const ai = await getClient(firstKey || 'default', effectiveUrl);
      await ai.models.generateContent({
        model: modelId,
        contents: 'Hello',
      });

      const latency = Math.round(performance.now() - startTime);
      const res: ConnectionHealthProbeResult = {
        connectionId: 'gemini',
        modelId,
        status: 'success',
        latencyMs: latency,
        grade: getLatencyGrade(latency, true),
        timestamp: Date.now(),
      };
      useProviderUiStore.getState().setModelProbeResult('gemini', modelId, res);
      toastSuccess(t('thirdPartyToastSingleProbeSuccess', { modelId, latency: formatLatency(latency) }));
    } catch (probeError) {
      const latency = Math.round(performance.now() - startTime);
      const res: ConnectionHealthProbeResult = {
        connectionId: 'gemini',
        modelId,
        status: 'error',
        latencyMs: latency,
        grade: 'error',
        errorMessage: getErrorMessage(probeError),
        timestamp: Date.now(),
      };
      useProviderUiStore.getState().setModelProbeResult('gemini', modelId, res);
      toastError(t('thirdPartyToastSingleProbeFailed', { modelId, error: getErrorMessage(probeError) }));
    } finally {
      setProbingModelIds((prev) => {
        const next = new Set(prev);
        next.delete(modelId);
        return next;
      });
    }
  };

  const handleBatchHealthCheck = async (targetModels: ModelOption[]) => {
    if (targetModels.length === 0) return;
    const controller = new AbortController();
    batchAbortControllerRef.current = controller;
    setIsCheckingBatch(true);
    setBatchProgress({ completed: 0, total: targetModels.length });

    try {
      let completed = 0;
      for (const model of targetModels) {
        if (controller.signal.aborted) break;
        await handleSingleModelProbe(model.id);
        completed++;
        setBatchProgress({ completed, total: targetModels.length });
      }
      if (!controller.signal.aborted) {
        toastSuccess(t('thirdPartyToastBatchProbeComplete') || 'Batch testing completed');
      }
    } catch (batchError) {
      toastError(getErrorMessage(batchError));
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
    toastWarning(t('thirdPartyToastProbeAborted') || 'Testing aborted');
  };

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-[var(--theme-bg-primary)] overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-b border-[var(--theme-border-secondary)]/30 flex-shrink-0 bg-[var(--theme-bg-primary)]">
        <div className="flex items-center gap-3 min-w-0">
          <ProviderAvatar name="Google Gemini" templateId="gemini" size={28} />
          <div>
            <h2 className="text-xl font-bold text-[var(--theme-text-primary)] truncate">Google Gemini</h2>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-[var(--theme-border-secondary)]/40 bg-[var(--theme-bg-secondary)]/25 text-xs text-[var(--theme-text-secondary)]">
          <div className="flex items-center gap-2 min-w-0">
            <SlidersHorizontal size={14} className="text-[var(--theme-text-link)] shrink-0" />
            <span className="truncate">{t('geminiGenerationSettingsHint')}</span>
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

        <div className="rounded-2xl border border-[var(--theme-border-secondary)]/40 bg-[var(--theme-bg-secondary)]/10 p-4">
          <ApiConfigSection
            useCustomApiConfig={settings.useCustomApiConfig}
            setUseCustomApiConfig={(val) => onUpdateSettings({ useCustomApiConfig: val })}
            apiKey={settings.apiKey}
            setApiKey={(val) => onUpdateSettings({ apiKey: val })}
            apiProxyUrl={settings.apiProxyUrl}
            setApiProxyUrl={(val) => onUpdateSettings({ apiProxyUrl: val })}
            useApiProxy={settings.useApiProxy ?? false}
            setUseApiProxy={(val) => onUpdateSettings({ useApiProxy: val })}
            serverManagedApi={settings.serverManagedApi ?? false}
            settings={settings}
            onUpdate={(key, val) => onUpdateSettings({ [key]: val } as any)}
            hideProviderRedirect={true}
          />
        </div>

        <div className="space-y-2">
          <ProviderModelListSection
            providerId="gemini"
            providerName="Gemini"
            models={effectiveModels}
            onUpdateModels={handleUpdateModels}

            onProbeSingleModel={handleSingleModelProbe}
            onProbeBatchModels={handleBatchHealthCheck}
            isProbingBatch={isCheckingBatch}
            probingModelIds={probingModelIds}
            modelProbeResults={modelProbeResults}
            onStopProbe={handleStopBatchHealthCheck}
            batchProgress={batchProgress}
          />
        </div>
      </div>
    </div>
  );
};

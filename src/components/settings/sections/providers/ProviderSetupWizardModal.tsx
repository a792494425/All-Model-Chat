import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Search,
  CheckSquare,
  Square,
  ChevronRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import type { ModelOption, ThirdPartyConnection, ThirdPartyTemplateId } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { SETTINGS_INPUT_CLASS } from '@/constants/formClasses';
import {
  createConnectionFromTemplate,
  createConnectionId,
  getThirdPartyTemplateDefaults,
  getThirdPartyTemplateLinks,
  getProxyProviderHeader,
} from '@/utils/thirdPartyApiProviders';
import { probeThirdPartyConnection, formatLatency } from '@/utils/thirdPartyDiagnostics';
import { fetchOpenAICompatibleModels } from '@/services/api/openaiCompatibleApi';
import { fetchAnthropicModels } from '@/services/api/anthropicApi';
import { fetchOpenAIResponsesModels } from '@/services/api/openaiResponsesApi';
import {
  enrichModelMetadata,
  formatContextWindow,
  getOrInferModelCapabilities,
} from '@/utils/model/knownModelsCatalog';
import { getErrorMessage } from '@/utils/errorMessage';
import { ProviderAvatar } from './ProviderAvatar';

export interface ProviderSetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: ThirdPartyTemplateId | null;
  existingConnections: ThirdPartyConnection[];
  onComplete: (connection: ThirdPartyConnection) => void;
  onSkip?: (connection: ThirdPartyConnection) => void;
}

export const ProviderSetupWizardModal: React.FC<ProviderSetupWizardModalProps> = ({
  isOpen,
  onClose,
  templateId,
  existingConnections,
  onComplete,
  onSkip,
}) => {
  const { t } = useI18n();

  const [step, setStep] = useState<1 | 2>(1);

  // Form states
  const [providerName, setProviderName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Verification & models states
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set());
  const [modelSearch, setModelSearch] = useState('');

  const templateDefaults = useMemo(() => {
    if (!templateId) return null;
    return getThirdPartyTemplateDefaults(templateId);
  }, [templateId]);

  const templateLinks = useMemo(() => {
    if (!templateId) return { websiteUrl: undefined, apiKeyUrl: undefined, docsUrl: undefined };
    return getThirdPartyTemplateLinks(templateId);
  }, [templateId]);

  // Reset states whenever modal opens with a templateId
  useEffect(() => {
    if (isOpen && templateId) {
      const draft = createConnectionFromTemplate(templateId, existingConnections, createConnectionId());
      setStep(1);
      setProviderName(draft.name);
      setApiKey('');
      setBaseUrl(draft.baseUrl || '');
      setShowApiKey(false);
      setIsVerifying(false);
      setVerifyStatus('idle');
      setVerifyError(null);
      setLatencyMs(null);
      setAvailableModels(draft.models);
      setSelectedModelIds(new Set(draft.models.map((m) => m.id)));
      setModelSearch('');
    }
  }, [isOpen, templateId, existingConnections]);

  const isLocalEngine = Boolean(templateDefaults?.authOptional);

  // Run verification and model fetch
  const runVerificationAndFetchModels = async (overrideApiKey?: string, overrideBaseUrl?: string) => {
    if (!templateId || !templateDefaults) return;

    setIsVerifying(true);
    setVerifyStatus('idle');
    setVerifyError(null);

    const effectiveKey = (overrideApiKey ?? apiKey).trim();
    const effectiveUrl = (overrideBaseUrl ?? baseUrl).trim();
    const targetBaseUrl = effectiveUrl || templateDefaults.baseUrl || '';

    const tempConnection: ThirdPartyConnection = {
      id: 'temp-wizard-probe',
      name: providerName.trim() || templateDefaults.name,
      templateId,
      protocol: templateDefaults.protocol,
      apiKey: effectiveKey || null,
      baseUrl: effectiveUrl || templateDefaults.baseUrl,
      extraHeaders: {},
      modelId: templateDefaults.modelId,
      models: templateDefaults.models,
      enabled: true,
      authOptional: templateDefaults.authOptional,
    };

    try {
      // 1. Connectivity test probe
      const probeResult = await probeThirdPartyConnection(tempConnection, {
        modelId: tempConnection.modelId || tempConnection.models[0]?.id,
      });

      if (probeResult.status === 'error') {
        setVerifyStatus('error');
        setVerifyError(probeResult.errorMessage || t('thirdPartyWizardVerifyFailed'));
        setLatencyMs(null);
      } else {
        setVerifyStatus('success');
        setLatencyMs(probeResult.latencyMs);
      }

      // 2. Fetch models from upstream API
      let remoteList: ModelOption[] = [];
      try {
        const fetchFn =
          tempConnection.protocol === 'anthropic'
            ? fetchAnthropicModels
            : tempConnection.protocol === 'openai-responses'
              ? fetchOpenAIResponsesModels
              : fetchOpenAICompatibleModels;

        remoteList = await fetchFn(
          effectiveKey,
          targetBaseUrl,
          new AbortController().signal,
          getProxyProviderHeader(tempConnection.templateId),
        );
      } catch {
        // Model endpoint might not exist on some proxies, ignore model list fetch failure
      }

      if (remoteList && remoteList.length > 0) {
        const enriched = remoteList.map((remote) => enrichModelMetadata(remote));
        setAvailableModels(enriched);
        setSelectedModelIds(new Set(enriched.map((m) => m.id)));
      } else {
        // Fallback to template defaults
        setAvailableModels(templateDefaults.models);
        setSelectedModelIds(new Set(templateDefaults.models.map((m) => m.id)));
      }
    } catch (wizardError) {
      setVerifyStatus('error');
      setVerifyError(getErrorMessage(wizardError));
      // Fallback to defaults
      setAvailableModels(templateDefaults.models);
      setSelectedModelIds(new Set(templateDefaults.models.map((m) => m.id)));
    } finally {
      setIsVerifying(false);
    }
  };

  // Step 1 -> Step 2 transition
  const handleProceedToStep2 = () => {
    setStep(2);
    void runVerificationAndFetchModels();
  };

  // Skip wizard and create with defaults
  const handleSkip = () => {
    if (!templateId) return;
    const baseConn = createConnectionFromTemplate(templateId, existingConnections, createConnectionId());
    const finalConn: ThirdPartyConnection = {
      ...baseConn,
      name: providerName.trim() || baseConn.name,
      baseUrl: baseUrl.trim() || baseConn.baseUrl,
      apiKey: apiKey.trim() || null,
    };
    if (onSkip) {
      onSkip(finalConn);
    } else {
      onComplete(finalConn);
    }
    onClose();
  };

  // Finish and Enable
  const handleFinish = () => {
    if (!templateId || !templateDefaults) return;

    const baseConn = createConnectionFromTemplate(templateId, existingConnections, createConnectionId());

    // Filter and update visibility of models
    const finalizedModels: ModelOption[] = availableModels.map((m) => ({
      ...m,
      visibleInSelector: selectedModelIds.has(m.id),
    }));

    const firstSelected = finalizedModels.find((m) => m.visibleInSelector !== false);

    const configuredConnection: ThirdPartyConnection = {
      ...baseConn,
      name: providerName.trim() || baseConn.name,
      baseUrl: baseUrl.trim() || baseConn.baseUrl,
      apiKey: apiKey.trim() || null,
      models: finalizedModels,
      modelId: firstSelected?.id || templateDefaults.modelId,
      enabled: true,
    };

    onComplete(configuredConnection);
    onClose();
  };

  // Toggle single model selection
  const handleToggleModel = (id: string) => {
    setSelectedModelIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle all models
  const handleToggleAllModels = () => {
    if (selectedModelIds.size === availableModels.length) {
      setSelectedModelIds(new Set());
    } else {
      setSelectedModelIds(new Set(availableModels.map((m) => m.id)));
    }
  };

  const filteredModels = useMemo(() => {
    const q = modelSearch.trim().toLowerCase();
    if (!q) return availableModels;
    return availableModels.filter((m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
  }, [availableModels, modelSearch]);

  if (!isOpen || !templateId || !templateDefaults) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="provider-wizard-title"
    >
      <div className="bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-[var(--theme-border-primary)]/80 flex items-center justify-between gap-3 bg-[var(--theme-bg-secondary)]/30">
          <div className="flex items-center gap-3 min-w-0">
            <ProviderAvatar name={providerName || templateDefaults.name} templateId={templateId} size={30} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3
                  id="provider-wizard-title"
                  className="text-base font-bold text-[var(--theme-text-primary)] truncate"
                >
                  {providerName || templateDefaults.name}
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase bg-[var(--theme-border-focus)]/10 text-[var(--theme-border-focus)] border border-[var(--theme-border-focus)]/20">
                  {t('thirdPartyWizardTitle')}
                </span>
              </div>
              <p className="text-xs text-[var(--theme-text-secondary)] mt-0.5">
                {step === 1 ? t('thirdPartyWizardStep1') : t('thirdPartyWizardStep2')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold select-none">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  step === 1 ? 'bg-[var(--theme-border-focus)] text-white' : 'bg-emerald-500 text-white'
                }`}
              >
                {step > 1 ? '✓' : '1'}
              </span>
              <span className="text-[var(--theme-border-primary)]">/</span>
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  step === 2
                    ? 'bg-[var(--theme-border-focus)] text-white'
                    : 'bg-[var(--theme-bg-secondary)] text-[var(--theme-text-secondary)]'
                }`}
              >
                2
              </span>
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
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {step === 1 ? (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--theme-text-primary)]">
                  {t('thirdPartyProviderName')}
                </label>
                <input
                  type="text"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  placeholder={templateDefaults.name}
                  className={`w-full p-2.5 rounded-xl border text-sm ${SETTINGS_INPUT_CLASS}`}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-[var(--theme-text-primary)]">{t('thirdPartyApiKeyLabel')}</label>
                  {templateLinks.apiKeyUrl && (
                    <a
                      href={templateLinks.apiKeyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[var(--theme-text-link)] hover:underline"
                    >
                      <span>{t('thirdPartyGetApiKey')}</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>

                {isLocalEngine ? (
                  <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs text-blue-600 dark:text-blue-400">
                    {t('thirdPartyWizardLocalNoKey')}
                  </div>
                ) : null}

                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={
                      isLocalEngine ? t('thirdPartyAuthOptionalPlaceholder') : t('thirdPartyApiKeyPlaceholder')
                    }
                    className={`w-full p-2.5 pr-10 rounded-xl border text-sm font-mono ${SETTINGS_INPUT_CLASS}`}
                    autoFocus={!isLocalEngine}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] rounded"
                    tabIndex={-1}
                  >
                    {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--theme-text-primary)]">
                  {t('thirdPartyBaseUrl')}
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={templateDefaults.baseUrl || ''}
                  className={`w-full p-2.5 rounded-xl border text-sm font-mono ${SETTINGS_INPUT_CLASS}`}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {isVerifying ? (
                <div className="flex items-center gap-2.5 p-3 rounded-xl border border-[var(--theme-border-focus)]/30 bg-[var(--theme-border-focus)]/5 text-xs text-[var(--theme-border-focus)] font-medium">
                  <Loader2 size={16} className="animate-spin flex-shrink-0" />
                  <span>{t('thirdPartyWizardVerifying')}</span>
                </div>
              ) : verifyStatus === 'success' ? (
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-300">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                    <span className="font-semibold">{t('thirdPartyWizardVerifySuccess')}</span>
                    {latencyMs !== null && (
                      <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        ⚡ {formatLatency(latencyMs)}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void runVerificationAndFetchModels()}
                    className="flex items-center gap-1 text-[11px] hover:underline text-emerald-600 dark:text-emerald-400 cursor-pointer"
                  >
                    <RotateCw size={11} />
                    <span>{t('thirdPartyWizardRetry')}</span>
                  </button>
                </div>
              ) : verifyStatus === 'error' ? (
                <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-300 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <AlertCircle size={15} className="text-rose-500 flex-shrink-0" />
                      <span>{t('thirdPartyWizardVerifyFailed')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void runVerificationAndFetchModels()}
                      className="flex items-center gap-1 text-[11px] hover:underline text-rose-600 dark:text-rose-400 cursor-pointer"
                    >
                      <RotateCw size={11} />
                      <span>{t('thirdPartyWizardRetry')}</span>
                    </button>
                  </div>
                  {verifyError && <p className="text-[11px] opacity-90 pl-5 font-mono break-all">{verifyError}</p>}
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleAllModels}
                    className="flex items-center gap-1.5 text-xs text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] select-none cursor-pointer"
                  >
                    {selectedModelIds.size === availableModels.length && availableModels.length > 0 ? (
                      <CheckSquare size={14} className="text-[var(--theme-border-focus)]" />
                    ) : (
                      <Square size={14} className="text-[var(--theme-text-secondary)]" />
                    )}
                    <span>
                      {t('thirdPartyWizardSelectedModelsCount', { count: selectedModelIds.size })} /{' '}
                      {availableModels.length}
                    </span>
                  </button>
                </div>

                <div className="relative w-48">
                  <Search
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-secondary)] pointer-events-none"
                  />
                  <input
                    type="text"
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder={t('thirdPartyFilterModelPlaceholder')}
                    className="w-full pl-7 pr-6 py-1 text-xs rounded-lg border border-[var(--theme-border-secondary)]/70 bg-[var(--theme-bg-secondary)]/30 text-[var(--theme-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-border-focus)]"
                  />
                  {modelSearch && (
                    <button
                      type="button"
                      onClick={() => setModelSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              </div>

              <div className="border border-[var(--theme-border-primary)]/60 rounded-xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar divide-y divide-[var(--theme-border-primary)]/30 bg-[var(--theme-bg-secondary)]/10">
                {filteredModels.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--theme-text-secondary)]">
                    {t('thirdPartyNoMatchingModels')}
                  </div>
                ) : (
                  filteredModels.map((model) => {
                    const isSelected = selectedModelIds.has(model.id);
                    const caps = getOrInferModelCapabilities(model);
                    const contextLabel = formatContextWindow(model.contextWindow);

                    return (
                      <div
                        key={model.id}
                        onClick={() => handleToggleModel(model.id)}
                        className={`flex items-center justify-between gap-3 px-3 py-2 text-xs transition-colors cursor-pointer select-none ${
                          isSelected
                            ? 'bg-[var(--theme-border-focus)]/5 hover:bg-[var(--theme-border-focus)]/10'
                            : 'hover:bg-[var(--theme-bg-secondary)]/40 opacity-70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleModel(model.id);
                            }}
                            className="text-[var(--theme-border-focus)] cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare size={14} className="text-[var(--theme-border-focus)]" />
                            ) : (
                              <Square size={14} className="text-[var(--theme-text-secondary)]/50" />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-[var(--theme-text-primary)] truncate">
                                {model.name || model.id}
                              </span>
                              {caps.free && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  Free
                                </span>
                              )}
                              {contextLabel && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-[var(--theme-bg-secondary)] text-[var(--theme-text-secondary)] border border-[var(--theme-border-primary)]/50">
                                  {contextLabel}
                                </span>
                              )}
                              {caps.thinking && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                  Thinking
                                </span>
                              )}
                              {caps.vision && (
                                <span className="px-1 py-0.2 rounded text-[9px] font-medium bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                                  Vision
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[var(--theme-text-secondary)] font-mono truncate mt-0.5">
                              {model.id}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-[var(--theme-border-primary)]/80 bg-[var(--theme-bg-secondary)]/30 flex items-center justify-between gap-3">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={handleSkip}
                className="px-3 py-1.5 text-xs font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors cursor-pointer"
              >
                {t('thirdPartyWizardSkip')}
              </button>

              <button
                type="button"
                onClick={handleProceedToStep2}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[var(--theme-border-focus)] text-white text-xs font-semibold shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
              >
                <span>{t('thirdPartyWizardVerifyAndFetch')}</span>
                <ChevronRight size={14} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>{t('back')}</span>
              </button>

              <button
                type="button"
                onClick={handleFinish}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Sparkles size={13} />
                <span>{t('thirdPartyWizardFinishAndEnable')}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

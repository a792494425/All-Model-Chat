import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  X,
  Search,
  Copy,
  Sparkles,
  ExternalLink,
  Activity,
  Check,
  Loader2,
  Eye,
  EyeOff,
  Server,
  RefreshCw,
  RotateCcw,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type {
  ThirdPartyConnection,
  ThirdPartyTemplateId,
  ThirdPartyApiProtocol,
  ModelOption,
} from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { SETTINGS_INPUT_CLASS } from '@/constants/formClasses';
import {
  SETTINGS_PRIMARY_ACTION_BUTTON_CLASS,
  SETTINGS_SECONDARY_ACTION_BUTTON_CLASS,
} from '@/constants/buttonClasses';
import {
  createConnectionId,
  createConnectionFromTemplate,
  duplicateThirdPartyConnection,
  getThirdPartyTemplateDefaults,
  getThirdPartyTemplateLinks,
  THIRD_PARTY_TEMPLATE_LABELS,
} from '@/utils/thirdPartyApiProviders';
import { probeThirdPartyConnection, formatLatency } from '@/utils/thirdPartyDiagnostics';
import { ProviderAvatar } from './ProviderAvatar';
import { toastSuccess, toastWarning, toastError } from '@/stores/toastStore';
import { fetchOpenAICompatibleModels } from '@/services/api/openaiCompatibleApi';
import { fetchAnthropicModels } from '@/services/api/anthropicApi';
import { fetchOpenAIResponsesModels } from '@/services/api/openaiResponsesApi';
import { AUTH_OPTIONAL_API_KEY, parseApiKeys } from '@/utils/apiKeySelection';
import { getErrorMessage } from '@/utils/errorMessage';

export type ProviderCreateMode = 'preset' | 'duplicate' | 'custom';
export type ProviderPresetCategory = 'all' | 'recommended' | 'domestic' | 'local';

export interface ProviderCreateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  existingConnections: ThirdPartyConnection[];
  onComplete: (connection: ThirdPartyConnection) => void;
  initialMode?: ProviderCreateMode;
  initialDuplicateSourceId?: string;
}

export interface TemplatePresetMeta {
  id: ThirdPartyTemplateId;
  name: string;
  category: 'recommended' | 'domestic' | 'local';
  description?: string;
}

const TEMPLATE_PRESETS: TemplatePresetMeta[] = [
  // Recommended / International
  { id: 'deepseek', name: 'DeepSeek', category: 'recommended', description: '深度求索官方 API (DeepSeek-V3, R1)' },
  { id: 'openai', name: 'OpenAI', category: 'recommended', description: 'GPT-4o, o1, o3-mini, GPT-4.5' },
  { id: 'anthropic', name: 'Anthropic', category: 'recommended', description: 'Claude 3.7 Sonnet, Claude 3.5' },
  { id: 'openrouter', name: 'OpenRouter', category: 'recommended', description: '聚合全球领先 AI 模型与路由' },
  { id: 'groq', name: 'Groq', category: 'recommended', description: 'LPU 极速推理平台' },
  { id: 'together', name: 'Together AI', category: 'recommended', description: '开源模型云端高性能托管' },
  { id: 'nvidia', name: 'NVIDIA NIM', category: 'recommended', description: '英伟达云端微服务推理引擎' },
  { id: 'grok', name: 'xAI (Grok)', category: 'recommended', description: 'Grok 2, Grok 3 官方接口' },
  { id: 'mistral', name: 'Mistral AI', category: 'recommended', description: '欧洲顶尖开源与商业旗舰模型' },
  { id: 'cerebras', name: 'Cerebras', category: 'recommended', description: '晶圆级超高速推理解析' },
  { id: 'fireworks', name: 'Fireworks AI', category: 'recommended', description: '高并发低延迟生产级推理平台' },
  { id: 'opencode', name: 'OpenCode Go', category: 'recommended', description: 'Zen Go 开发者 AI 接口服务' },
  { id: 'huggingface', name: 'Hugging Face', category: 'recommended', description: '开源社区官方推理路由端点' },

  // Domestic
  { id: 'siliconflow', name: 'SiliconFlow (硅基流动)', category: 'domestic', description: '高性价比模型分发平台 (DeepSeek 等全系列)' },
  { id: 'qwen', name: '通义千问 (Qwen)', category: 'domestic', description: '阿里云 DashScope 百炼通用大模型' },
  { id: 'kimi', name: 'Kimi (月之暗面)', category: 'domestic', description: 'Moonshot AI 超长上下文大模型' },
  { id: 'glm', name: '智谱清言 (GLM)', category: 'domestic', description: 'GLM-4, GLM-Zero 智谱大模型平台' },
  { id: 'doubao', name: '火山引擎 (豆包)', category: 'domestic', description: '字节跳动豆包企业级大模型平台' },
  { id: 'hunyuan', name: '腾讯混元 (Hunyuan)', category: 'domestic', description: '腾讯官方混元通用多模态大模型' },
  { id: 'minimax', name: 'MiniMax', category: 'domestic', description: 'ABAB 系列高精与多模态大模型' },

  // Local / Self-hosted
  { id: 'ollama', name: 'Ollama', category: 'local', description: '本地免密大模型运行引擎 (默认端口 11434)' },
  { id: 'lmstudio', name: 'LM Studio', category: 'local', description: '本地桌面推理工作站 (默认端口 1234)' },
];

export const ProviderCreateDrawer: React.FC<ProviderCreateDrawerProps> = ({
  isOpen,
  onClose,
  existingConnections,
  onComplete,
  initialMode = 'preset',
  initialDuplicateSourceId,
}) => {
  const { t } = useI18n();

  const [mode, setMode] = useState<ProviderCreateMode>(initialMode);
  const [selectedTemplateId, setSelectedTemplateId] = useState<ThirdPartyTemplateId>('deepseek');
  const [selectedDuplicateId, setSelectedDuplicateId] = useState<string>(
    initialDuplicateSourceId || existingConnections[0]?.id || '',
  );

  // Filter & Search states
  const [presetSearch, setPresetSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<ProviderPresetCategory>('all');

  // Form states
  const [name, setName] = useState('');
  const [protocol, setProtocol] = useState<ThirdPartyApiProtocol>('openai-compatible');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Diagnostics test
  const [isProbing, setIsProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<{
    status: 'idle' | 'success' | 'error';
    message?: string;
    latency?: number;
  }>({ status: 'idle' });

  // Remote models pulling in modal
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<ModelOption[]>([]);
  const [showModelsPreview, setShowModelsPreview] = useState(false);

  // Current template defaults for comparison (e.g. Base URL reset)
  const currentTemplateDefaults = useMemo(() => {
    if (mode !== 'preset') return null;
    return getThirdPartyTemplateDefaults(selectedTemplateId);
  }, [mode, selectedTemplateId]);

  // Populate form based on mode and selection
  const applyPreset = useCallback((templateId: ThirdPartyTemplateId) => {
    setSelectedTemplateId(templateId);
    const defaults = getThirdPartyTemplateDefaults(templateId);
    setName(defaults.name);
    setProtocol(defaults.protocol);
    setBaseUrl(defaults.baseUrl || '');
    setApiKey('');
    setProbeResult({ status: 'idle' });
    setFetchedModels([]);
    setShowModelsPreview(false);
  }, []);

  const applyDuplicate = useCallback(
    (sourceId: string) => {
      setSelectedDuplicateId(sourceId);
      const source = existingConnections.find((c) => c.id === sourceId);
      if (!source) return;
      const copySuffix = t('thirdPartyCopySuffix', { name: source.name });
      const dup = duplicateThirdPartyConnection(source, existingConnections, copySuffix);
      setName(dup.name);
      setProtocol(dup.protocol);
      setBaseUrl(dup.baseUrl || '');
      setApiKey(dup.apiKey || '');
      setProbeResult({ status: 'idle' });
      setFetchedModels([]);
      setShowModelsPreview(false);
    },
    [existingConnections, t],
  );

  const applyCustom = useCallback(() => {
    setName('Custom Provider');
    setProtocol('openai-compatible');
    setBaseUrl('');
    setApiKey('');
    setProbeResult({ status: 'idle' });
    setFetchedModels([]);
    setShowModelsPreview(false);
  }, []);

  // Initialize or reset on modal open
  useEffect(() => {
    if (!isOpen) return;

    if (initialDuplicateSourceId && existingConnections.some((c) => c.id === initialDuplicateSourceId)) {
      setMode('duplicate');
      applyDuplicate(initialDuplicateSourceId);
    } else if (initialMode === 'duplicate' && existingConnections.length > 0) {
      setMode('duplicate');
      applyDuplicate(existingConnections[0].id);
    } else if (initialMode === 'custom') {
      setMode('custom');
      applyCustom();
    } else {
      setMode('preset');
      applyPreset('deepseek');
    }
    setPresetSearch('');
    setActiveCategory('all');
  }, [isOpen, initialMode, initialDuplicateSourceId, existingConnections, applyDuplicate, applyCustom, applyPreset]);

  const templateLinks = useMemo(() => {
    if (mode !== 'preset') return { websiteUrl: undefined, apiKeyUrl: undefined, docUrl: undefined };
    return getThirdPartyTemplateLinks(selectedTemplateId);
  }, [mode, selectedTemplateId]);

  const filteredPresets = useMemo(() => {
    let list = TEMPLATE_PRESETS;
    if (activeCategory !== 'all') {
      list = list.filter((p) => p.category === activeCategory);
    }
    const q = presetSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        p.id.toLowerCase().includes(q),
    );
  }, [activeCategory, presetSearch]);

  const handleResetDefaultUrl = () => {
    if (currentTemplateDefaults?.baseUrl) {
      setBaseUrl(currentTemplateDefaults.baseUrl);
    }
  };

  const handleProbe = async () => {
    if (!baseUrl.trim()) return;
    setIsProbing(true);
    setProbeResult({ status: 'idle' });

    const draftConn: ThirdPartyConnection = {
      id: 'probe-temp',
      name: name || 'Probe Connection',
      templateId: mode === 'preset' ? selectedTemplateId : 'custom-openai',
      protocol,
      apiKey: apiKey.trim() || null,
      baseUrl: baseUrl.trim(),
      extraHeaders: {},
      modelId: '',
      models: [],
      enabled: true,
    };

    try {
      const res = await probeThirdPartyConnection(draftConn);
      if (res.status === 'success') {
        setProbeResult({ status: 'success', latency: res.latencyMs });
      } else {
        setProbeResult({ status: 'error', message: res.errorMessage || 'Connection failed' });
      }
    } catch (probeError) {
      setProbeResult({
        status: 'error',
        message: probeError instanceof Error ? probeError.message : String(probeError),
      });
    } finally {
      setIsProbing(false);
    }
  };

  const handleFetchModels = async () => {
    if (!baseUrl.trim()) {
      toastWarning(t('thirdPartyToastBaseUrlRequired') || 'Base URL is required');
      return;
    }
    setIsFetchingModels(true);
    try {
      const activeKey = parseApiKeys(apiKey)[0] || '';
      const controller = new AbortController();
      let remoteModels: ModelOption[] = [];

      if (protocol === 'anthropic') {
        remoteModels = await fetchAnthropicModels(activeKey, baseUrl.trim(), controller.signal);
      } else if (protocol === 'openai-responses') {
        remoteModels = await fetchOpenAIResponsesModels(activeKey, baseUrl.trim(), controller.signal);
      } else {
        remoteModels = await fetchOpenAICompatibleModels(
          activeKey || AUTH_OPTIONAL_API_KEY,
          baseUrl.trim(),
          controller.signal,
        );
      }

      setFetchedModels(remoteModels);
      if (remoteModels.length > 0) {
        setShowModelsPreview(true);
        toastSuccess(t('thirdPartyFetchModelsInDrawerSuccess', { count: remoteModels.length }));
      } else {
        toastWarning(t('thirdPartyFetchModelsEmpty') || 'No models found.');
      }
    } catch (fetchModelsError) {
      toastError(t('thirdPartyToastFetchModelsFailed', { error: getErrorMessage(fetchModelsError) }));
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const attachFetchedModels = (targetId: string, initialModels: ModelOption[]) => {
      if (fetchedModels.length === 0) return initialModels;
      return fetchedModels.map((m) => ({
        ...m,
        providerId: targetId,
        connectionName: name.trim(),
      }));
    };

    if (mode === 'duplicate') {
      const source = existingConnections.find((c) => c.id === selectedDuplicateId);
      if (source) {
        const copySuffix = t('thirdPartyCopySuffix', { name: source.name });
        const dup = duplicateThirdPartyConnection(source, existingConnections, copySuffix);
        const finalConn: ThirdPartyConnection = {
          ...dup,
          name: name.trim(),
          baseUrl: baseUrl.trim() || null,
          apiKey: apiKey.trim() || null,
          protocol,
          models: attachFetchedModels(dup.id, dup.models),
          modelId: fetchedModels.length > 0 ? fetchedModels[0].id : dup.modelId,
          enabled: true,
        };
        onComplete(finalConn);
        onClose();
        return;
      }
    }

    if (mode === 'preset') {
      const newId = createConnectionId();
      const templateConn = createConnectionFromTemplate(selectedTemplateId, existingConnections, newId);
      const finalConn: ThirdPartyConnection = {
        ...templateConn,
        name: name.trim(),
        baseUrl: baseUrl.trim() || templateConn.baseUrl,
        apiKey: apiKey.trim() || null,
        protocol,
        models: attachFetchedModels(newId, templateConn.models),
        modelId: fetchedModels.length > 0 ? fetchedModels[0].id : templateConn.modelId,
        enabled: true,
      };
      onComplete(finalConn);
      onClose();
      return;
    }

    // Custom mode
    const newId = createConnectionId();
    const customTemplateId: ThirdPartyTemplateId =
      protocol === 'anthropic' ? 'custom-anthropic' : 'custom-openai';
    const defaults = getThirdPartyTemplateDefaults(customTemplateId);
    const newConn: ThirdPartyConnection = {
      id: newId,
      name: name.trim(),
      templateId: customTemplateId,
      protocol,
      apiKey: apiKey.trim() || null,
      baseUrl: baseUrl.trim() || null,
      extraHeaders: {},
      modelId: fetchedModels.length > 0 ? fetchedModels[0].id : defaults.modelId,
      models: attachFetchedModels(newId, defaults.models),
      enabled: true,
      authOptional: false,
    };
    onComplete(newConn);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/65 animate-in fade-in duration-150 backdrop-blur-xs">
      <div
        className="w-full max-w-4xl lg:max-w-5xl rounded-2xl border border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)] shadow-2xl flex flex-col max-h-[92vh] md:max-h-[86vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="provider-create-drawer-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--theme-border-secondary)]/40 flex-shrink-0 bg-[var(--theme-bg-secondary)]/15">
          <div>
            <h3
              id="provider-create-drawer-title"
              className="text-base font-semibold text-[var(--theme-text-primary)] flex items-center gap-2"
            >
              <Sparkles size={18} className="text-amber-500" />
              <span>{t('thirdPartyAddConnectionTitle')}</span>
            </h3>
            <p className="text-xs text-[var(--theme-text-secondary)] mt-0.5">
              {t('thirdPartyAddConnectionSubtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="p-1.5 rounded-lg text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors cursor-pointer"
          >
            <X size={17} />
          </button>
        </div>

        <div className="px-6 py-2.5 border-b border-[var(--theme-border-secondary)]/30 flex-shrink-0 bg-[var(--theme-bg-secondary)]/30">
          <div className="flex items-center gap-1.5 p-1 bg-[var(--theme-bg-tertiary)]/70 rounded-xl max-w-md">
            <button
              type="button"
              data-testid="tab-preset"
              onClick={() => {
                setMode('preset');
                applyPreset(selectedTemplateId);
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'preset'
                  ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-xs font-semibold'
                  : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
              }`}
            >
              <Sparkles size={13} className="text-amber-500" />
              <span>{t('thirdPartyTabPresets')}</span>
            </button>

            <button
              type="button"
              data-testid="tab-custom"
              onClick={() => {
                setMode('custom');
                applyCustom();
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'custom'
                  ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-xs font-semibold'
                  : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
              }`}
            >
              <Server size={13} className="text-emerald-500" />
              <span>{t('thirdPartyTabCustom')}</span>
            </button>

            {existingConnections.length > 0 && (
              <button
                type="button"
                data-testid="tab-duplicate"
                onClick={() => {
                  setMode('duplicate');
                  applyDuplicate(selectedDuplicateId || existingConnections[0].id);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'duplicate'
                    ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-xs font-semibold'
                    : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
                }`}
              >
                <Copy size={13} className="text-blue-500" />
                <span>{t('thirdPartyTabDuplicate')}</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {mode === 'preset' && (
            <div className="w-full md:w-80 lg:w-88 border-b md:border-b-0 md:border-r border-[var(--theme-border-secondary)]/40 flex flex-col flex-shrink-0 bg-[var(--theme-bg-secondary)]/15 min-h-0">
              <div className="p-3.5 space-y-2.5 border-b border-[var(--theme-border-secondary)]/30 flex-shrink-0">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-secondary)] pointer-events-none"
                  />
                  <input
                    type="text"
                    value={presetSearch}
                    onChange={(e) => setPresetSearch(e.target.value)}
                    placeholder={t('thirdPartyDrawerSearchPlaceholder')}
                    className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border ${SETTINGS_INPUT_CLASS}`}
                  />
                  {presetSearch && (
                    <button
                      type="button"
                      onClick={() => setPresetSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5">
                  {(
                    [
                      { id: 'all', label: t('thirdPartyCategoryAll') },
                      { id: 'recommended', label: t('thirdPartyCategoryRecommended') },
                      { id: 'domestic', label: t('thirdPartyCategoryDomestic') },
                      { id: 'local', label: t('thirdPartyCategoryLocal') },
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`px-2.5 py-1 text-[11px] rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                        activeCategory === cat.id
                          ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] font-semibold shadow-xs border border-[var(--theme-border-secondary)]/60'
                          : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]/60'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 space-y-1.5">
                {filteredPresets.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--theme-text-secondary)]">
                    {t('thirdPartyNoMatchingPresets')}
                  </div>
                ) : (
                  filteredPresets.map((preset) => {
                    const isSelected = selectedTemplateId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset.id)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer select-none group ${
                          isSelected
                            ? 'border-[var(--theme-border-focus)] bg-[var(--theme-bg-tertiary)] shadow-xs ring-1 ring-[var(--theme-border-focus)]/50'
                            : 'border-[var(--theme-border-secondary)]/30 hover:bg-[var(--theme-bg-secondary)]/60 hover:border-[var(--theme-border-secondary)]/60'
                        }`}
                      >
                        <ProviderAvatar name={preset.name} templateId={preset.id} size={30} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-xs font-semibold text-[var(--theme-text-primary)] truncate">
                              {THIRD_PARTY_TEMPLATE_LABELS[preset.id] || preset.name}
                            </span>
                            {preset.category === 'recommended' && (
                              <span className="px-1.5 py-0.2 text-[9px] font-medium rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                                {t('thirdPartyCategoryRecommended')}
                              </span>
                            )}
                            {preset.category === 'domestic' && (
                              <span className="px-1.5 py-0.2 text-[9px] font-medium rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                                {t('thirdPartyCategoryDomestic')}
                              </span>
                            )}
                            {preset.category === 'local' && (
                              <span className="px-1.5 py-0.2 text-[9px] font-medium rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400 shrink-0">
                                {t('thirdPartyCategoryLocal')}
                              </span>
                            )}
                          </div>
                          {preset.description && (
                            <p className="text-[11px] text-[var(--theme-text-secondary)]/80 truncate mt-0.5">
                              {preset.description}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {mode === 'duplicate' && (
            <div className="w-full md:w-80 lg:w-88 border-b md:border-b-0 md:border-r border-[var(--theme-border-secondary)]/40 flex flex-col flex-shrink-0 bg-[var(--theme-bg-secondary)]/15 min-h-0">
              <div className="p-3.5 border-b border-[var(--theme-border-secondary)]/30 flex-shrink-0">
                <span className="text-xs font-semibold text-[var(--theme-text-secondary)] uppercase tracking-wider">
                  {t('thirdPartySelectSourceToDuplicate')}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 space-y-1.5">
                {existingConnections.map((conn) => {
                  const isSelected = selectedDuplicateId === conn.id;
                  return (
                    <button
                      key={conn.id}
                      type="button"
                      onClick={() => applyDuplicate(conn.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'border-[var(--theme-border-focus)] bg-[var(--theme-bg-tertiary)] shadow-xs ring-1 ring-[var(--theme-border-focus)]/50'
                          : 'border-[var(--theme-border-secondary)]/30 hover:bg-[var(--theme-bg-secondary)]/60'
                      }`}
                    >
                      <ProviderAvatar name={conn.name} templateId={conn.templateId} size={30} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-[var(--theme-text-primary)] truncate">
                          {conn.name}
                        </div>
                        <div className="text-[11px] text-[var(--theme-text-secondary)]/80 truncate mt-0.5">
                          {conn.models.length} models • {conn.protocol}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-[var(--theme-border-secondary)]/40 bg-[var(--theme-bg-secondary)]/25">
              <ProviderAvatar
                name={name || 'Custom'}
                templateId={mode === 'preset' ? selectedTemplateId : 'custom-openai'}
                size={38}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold text-[var(--theme-text-secondary)] uppercase tracking-wider">
                    {t('thirdPartySelectedProvider')}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] border border-[var(--theme-border-secondary)]/40">
                    {protocol === 'anthropic'
                      ? 'Anthropic Messages'
                      : protocol === 'openai-responses'
                        ? 'OpenAI Responses'
                        : 'OpenAI Compatible'}
                  </span>
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('thirdPartyConnectionName')}
                  className="w-full text-base font-semibold bg-transparent border-b border-transparent hover:border-[var(--theme-border-secondary)] focus:border-[var(--theme-border-focus)] text-[var(--theme-text-primary)] outline-none transition-colors px-0 py-0.5 mt-0.5"
                />
              </div>
            </div>

            {mode === 'custom' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--theme-text-secondary)]">
                  {t('thirdPartyConnectionProtocol')}
                </label>
                <div className="flex gap-2">
                  {(['openai-compatible', 'anthropic', 'openai-responses'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProtocol(p)}
                      className={`flex-1 py-1.5 px-3 text-xs rounded-xl border transition-all cursor-pointer ${
                        protocol === p
                          ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] border-[var(--theme-border-focus)] font-semibold shadow-xs'
                          : 'bg-[var(--theme-bg-tertiary)]/50 text-[var(--theme-text-secondary)] border-transparent hover:text-[var(--theme-text-primary)]'
                      }`}
                    >
                      {p === 'anthropic'
                        ? 'Anthropic Messages'
                        : p === 'openai-responses'
                          ? 'OpenAI Responses'
                          : 'OpenAI Compatible'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="provider-drawer-apikey" className="font-semibold text-[var(--theme-text-secondary)]">
                  {t('thirdPartyApiKey')}
                </label>
                {templateLinks.apiKeyUrl && (
                  <a
                    href={templateLinks.apiKeyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[var(--theme-text-link)] hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    <span>{t('thirdPartyGetApiKey')}</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
              <div className="relative flex items-center">
                <input
                  id="provider-drawer-apikey"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    currentTemplateDefaults?.authOptional
                      ? t('thirdPartyAuthOptionalHint')
                      : t('thirdPartyApiKeyPlaceholder') || 'sk-...'
                  }
                  className={`w-full px-3.5 pr-10 py-2 text-xs font-mono rounded-xl border ${SETTINGS_INPUT_CLASS}`}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  aria-label={showApiKey ? 'Hide key' : 'Show key'}
                  className="absolute right-2.5 p-1 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors rounded cursor-pointer"
                >
                  {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-[11px] text-[var(--theme-text-secondary)]/75">
                {currentTemplateDefaults?.authOptional
                  ? t('thirdPartyAuthOptionalHint')
                  : t('thirdPartyApiKeyRotationHint')}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="provider-drawer-baseurl" className="font-semibold text-[var(--theme-text-secondary)]">
                  {t('thirdPartyApiBaseUrl')}
                </label>
                {mode === 'preset' && currentTemplateDefaults?.baseUrl && baseUrl !== currentTemplateDefaults.baseUrl && (
                  <button
                    type="button"
                    onClick={handleResetDefaultUrl}
                    className="text-[11px] text-[var(--theme-text-link)] hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <RotateCcw size={10} />
                    <span>{t('thirdPartyResetDefaultUrl')}</span>
                  </button>
                )}
              </div>
              <input
                id="provider-drawer-baseurl"
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.example.com/v1"
                className={`w-full px-3.5 py-2 text-xs font-mono rounded-xl border ${SETTINGS_INPUT_CLASS}`}
              />
              <p className="text-[11px] text-[var(--theme-text-secondary)]/75">
                {t('thirdPartyBaseUrlHint')}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--theme-border-secondary)]/40 bg-[var(--theme-bg-secondary)]/20 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleProbe}
                    disabled={isProbing || !baseUrl.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-accent)] text-[var(--theme-text-primary)] transition-colors disabled:opacity-40 cursor-pointer shadow-xs"
                  >
                    {isProbing ? <Loader2 size={13} className="animate-spin text-blue-500" /> : <Activity size={13} />}
                    <span>{t('thirdPartyTestSpeed')}</span>
                  </button>

                  <button
                    type="button"
                    data-testid="drawer-fetch-models-button"
                    onClick={handleFetchModels}
                    disabled={isFetchingModels || !baseUrl.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-accent)] text-[var(--theme-text-primary)] transition-colors disabled:opacity-40 cursor-pointer shadow-xs"
                  >
                    {isFetchingModels ? (
                      <Loader2 size={13} className="animate-spin text-blue-500" />
                    ) : (
                      <RefreshCw size={13} />
                    )}
                    <span>
                      {isFetchingModels
                        ? t('thirdPartySyncingModels') || 'Fetching...'
                        : t('thirdPartyDrawerFetchModels')}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {probeResult.status === 'success' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <Check size={12} />
                      <span>{t('thirdPartyCheckConnectionSuccess', { latency: formatLatency(probeResult.latency ?? 0) })}</span>
                    </span>
                  )}

                  {probeResult.status === 'error' && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/15 text-rose-600 dark:text-rose-400 truncate max-w-[240px]"
                      title={probeResult.message}
                    >
                      <span>{probeResult.message}</span>
                    </span>
                  )}

                  {fetchedModels.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-600 dark:text-blue-400">
                      <Check size={12} />
                      <span>{t('thirdPartyFetchedModelsCountBadge', { count: fetchedModels.length })}</span>
                    </span>
                  )}
                </div>
              </div>

              {fetchedModels.length > 0 ? (
                <div className="pt-2 border-t border-[var(--theme-border-secondary)]/30 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--theme-text-primary)] flex items-center gap-1.5">
                      <Layers size={13} className="text-blue-500" />
                      <span>{t('thirdPartyFetchedModelsPreviewTitle')} ({fetchedModels.length})</span>
                    </span>
                    {fetchedModels.length > 8 && (
                      <button
                        type="button"
                        onClick={() => setShowModelsPreview(!showModelsPreview)}
                        className="text-[11px] text-[var(--theme-text-link)] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>{showModelsPreview ? '收起' : '展开'}</span>
                        {showModelsPreview ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar p-1">
                    {(showModelsPreview ? fetchedModels : fetchedModels.slice(0, 10)).map((m) => (
                      <span
                        key={m.id}
                        className="px-2 py-0.5 text-[11px] rounded-md font-mono bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] border border-[var(--theme-border-secondary)]/50"
                        title={m.name || m.id}
                      >
                        {m.name || m.id}
                      </span>
                    ))}
                    {!showModelsPreview && fetchedModels.length > 10 && (
                      <span className="px-2 py-0.5 text-[11px] rounded-md text-[var(--theme-text-secondary)]">
                        +{fetchedModels.length - 10} more...
                      </span>
                    )}
                  </div>
                </div>
              ) : mode === 'preset' && currentTemplateDefaults?.models && currentTemplateDefaults.models.length > 0 ? (
                <div className="pt-1 text-[11px] text-[var(--theme-text-secondary)]/70 flex items-center gap-1.5">
                  <span>{t('thirdPartyDefaultModelsHint')}</span>
                  <span className="font-mono text-[var(--theme-text-secondary)]">
                    ({currentTemplateDefaults.models.map((m) => m.name || m.id).join(', ')})
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-t border-[var(--theme-border-secondary)]/40 flex-shrink-0 bg-[var(--theme-bg-secondary)]/25">
          <div className="hidden sm:flex items-center gap-2 text-xs text-[var(--theme-text-secondary)] truncate">
            <ProviderAvatar
              name={name || 'Provider'}
              templateId={mode === 'preset' ? selectedTemplateId : 'custom-openai'}
              size={20}
            />
            <span className="font-medium text-[var(--theme-text-primary)] truncate">{name || 'New Provider'}</span>
            {fetchedModels.length > 0 && (
              <span className="text-[11px] text-emerald-500 font-medium">
                • {fetchedModels.length} models
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className={SETTINGS_SECONDARY_ACTION_BUTTON_CLASS}
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              data-testid="add-provider-confirm-button"
              onClick={handleSave}
              disabled={!name.trim()}
              className={`${SETTINGS_PRIMARY_ACTION_BUTTON_CLASS} disabled:opacity-40 cursor-pointer shadow-xs`}
            >
              {t('thirdPartyAddProviderAction')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

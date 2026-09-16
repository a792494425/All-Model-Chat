import React, { useState, useEffect } from 'react';
import {
  Sliders,
  X,
  RotateCcw,
  Pin,
  Eye,
  Wrench,
  Lightbulb,
  Headphones,
  Image as ImageIcon,
  Globe,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import type { ModelCapabilities, ModelOption, ModelParameters, ThirdPartyApiProtocol } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { SETTINGS_INPUT_CLASS } from '@/constants/formClasses';
import {
  SETTINGS_PRIMARY_ACTION_BUTTON_CLASS,
  SETTINGS_SECONDARY_ACTION_BUTTON_CLASS,
} from '@/constants/buttonClasses';
import { Toggle } from '@/components/shared/Toggle';
import { copyTextToClipboard } from '@/utils/clipboard';
import { toastError, toastSuccess } from '@/stores/toastStore';
import { ProviderAvatar } from './ProviderAvatar';
import { getOrInferModelCapabilities } from '@/utils/model/knownModelsCatalog';

export interface ModelConfigModalProps {
  isOpen: boolean;
  model: ModelOption | null;
  protocol?: ThirdPartyApiProtocol | 'gemini';
  existingModelIds?: string[];
  onClose: () => void;
  onSave: (updates: Partial<ModelOption>) => void;
}

type TabType = 'info' | 'parameters';

const CONTEXT_WINDOW_PRESETS = [
  { label: '32k', value: 32768 },
  { label: '128k', value: 131072 },
  { label: '200k', value: 200000 },
  { label: '1M', value: 1048576 },
];

export const ModelConfigModal: React.FC<ModelConfigModalProps> = ({
  isOpen,
  model,
  protocol,
  existingModelIds = [],
  onClose,
  onSave,
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [copiedId, setCopiedId] = useState(false);

  // Tab 1: Info & Capabilities
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [contextWindow, setContextWindow] = useState<number | undefined>(undefined);
  const [capabilities, setCapabilities] = useState<ModelCapabilities>({});

  // Tab 2: Generation & Reasoning parameters
  const [temperature, setTemperature] = useState<number | undefined>(undefined);
  const [maxOutputTokens, setMaxOutputTokens] = useState<number | undefined>(undefined);
  const [topP, setTopP] = useState<number | undefined>(undefined);
  const [topK, setTopK] = useState<number | undefined>(undefined);
  const [presencePenalty, setPresencePenalty] = useState<number | undefined>(undefined);
  const [frequencyPenalty, setFrequencyPenalty] = useState<number | undefined>(undefined);
  const [stopSequencesStr, setStopSequencesStr] = useState('');
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [reasoningEffort, setReasoningEffort] = useState<'none' | 'low' | 'medium' | 'high' | undefined>(undefined);
  const [thinkingBudget, setThinkingBudget] = useState<number | undefined>(undefined);

  // Sync state from model on open/change
  useEffect(() => {
    if (model) {
      setName(model.name || model.id);
      setId(model.id);
      setIsPinned(Boolean(model.isPinned));
      setContextWindow(model.contextWindow);

      const baseCaps = getOrInferModelCapabilities(model);
      setCapabilities({ ...baseCaps, ...(model.capabilities || {}) });

      const p = model.parameters;
      setTemperature(p?.temperature);
      setMaxOutputTokens(p?.maxOutputTokens);
      setTopP(p?.topP);
      setTopK(p?.topK);
      setPresencePenalty(p?.presencePenalty);
      setFrequencyPenalty(p?.frequencyPenalty);
      setStopSequencesStr(Array.isArray(p?.stopSequences) ? p.stopSequences.join(', ') : '');
      setSeed(p?.seed);
      setReasoningEffort(p?.reasoningEffort);
      setThinkingBudget(p?.thinkingBudget);
    }
  }, [model]);

  if (!isOpen || !model) return null;

  const isOpenAI = protocol === 'openai-compatible' || protocol === 'openai-responses';

  const handleCopyId = async () => {
    await copyTextToClipboard(id);
    setCopiedId(true);
    toastSuccess(t('thirdPartyToastCopied') || 'Copied to clipboard');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleResetParameters = () => {
    setTemperature(undefined);
    setMaxOutputTokens(undefined);
    setTopP(undefined);
    setTopK(undefined);
    setPresencePenalty(undefined);
    setFrequencyPenalty(undefined);
    setStopSequencesStr('');
    setSeed(undefined);
    setReasoningEffort(undefined);
    setThinkingBudget(undefined);
  };

  const toggleCapability = (key: keyof ModelCapabilities) => {
    setCapabilities((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = () => {
    const trimmedId = id.trim();
    if (!trimmedId) {
      toastError(t('settingsModelConfigIdRequired') || 'Model ID is required');
      return;
    }

    if (trimmedId !== model.id && existingModelIds.includes(trimmedId)) {
      toastError(t('settingsModelConfigIdConflict') || 'A model with this ID already exists');
      return;
    }

    const trimmedStops = stopSequencesStr
      .split(/[,，\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const params: ModelParameters = {};
    if (typeof temperature === 'number' && !isNaN(temperature)) params.temperature = temperature;
    if (typeof maxOutputTokens === 'number' && !isNaN(maxOutputTokens)) params.maxOutputTokens = maxOutputTokens;
    if (typeof topP === 'number' && !isNaN(topP)) params.topP = topP;
    if (typeof topK === 'number' && !isNaN(topK)) params.topK = topK;
    if (typeof presencePenalty === 'number' && !isNaN(presencePenalty)) params.presencePenalty = presencePenalty;
    if (typeof frequencyPenalty === 'number' && !isNaN(frequencyPenalty)) params.frequencyPenalty = frequencyPenalty;
    if (trimmedStops.length > 0) params.stopSequences = trimmedStops;
    if (typeof seed === 'number' && !isNaN(seed)) params.seed = seed;
    if (reasoningEffort) params.reasoningEffort = reasoningEffort;
    if (typeof thinkingBudget === 'number' && !isNaN(thinkingBudget) && thinkingBudget > 0) {
      params.thinkingBudget = thinkingBudget;
    }

    const updates: Partial<ModelOption> = {
      id: id.trim() || model.id,
      name: name.trim() || id.trim() || model.id,
      isPinned,
      contextWindow: typeof contextWindow === 'number' && contextWindow > 0 ? contextWindow : undefined,
      capabilities: Object.keys(capabilities).length > 0 ? capabilities : undefined,
      parameters: Object.keys(params).length > 0 ? params : undefined,
    };

    onSave(updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-2xl border border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)] p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-[var(--theme-border-secondary)]/40 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-[var(--theme-border-focus)]" />
            <h3 className="text-base font-semibold text-[var(--theme-text-primary)]">
              {t('settingsModelConfigTitle') || t('settingsModelParameters') || 'Model Configuration'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="text-xs text-[var(--theme-text-secondary)] bg-[var(--theme-bg-secondary)]/60 px-3 py-2 rounded-xl border border-[var(--theme-border-secondary)]/30 flex items-center gap-2.5 flex-shrink-0">
          <ProviderAvatar
            modelId={model.id}
            modelName={model.name}
            name={model.name || model.id}
            size={24}
            className="text-[10px]"
          />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-[var(--theme-text-primary)] truncate">{name || model.name}</div>
            <div className="font-mono text-[11px] opacity-75 truncate">{id || model.id}</div>
          </div>
        </div>

        <div className="flex border-b border-[var(--theme-border-secondary)]/30 text-xs font-medium flex-shrink-0">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'info'}
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-1.5 px-4 py-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'info'
                ? 'border-[var(--theme-border-focus)] text-[var(--theme-border-focus)] font-semibold'
                : 'border-transparent text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
            }`}
          >
            <Pin size={13} />
            <span>{t('settingsModelConfigTabInfo') || 'Info & Capabilities'}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'parameters'}
            onClick={() => setActiveTab('parameters')}
            className={`flex items-center gap-1.5 px-4 py-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'parameters'
                ? 'border-[var(--theme-border-focus)] text-[var(--theme-border-focus)] font-semibold'
                : 'border-transparent text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
            }`}
          >
            <Sliders size={13} />
            <span>{t('settingsModelConfigTabParams') || 'Generation & Reasoning'}</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4">
          {activeTab === 'info' ? (
            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-[var(--theme-text-primary)]">
                  {t('settingsModelConfigName') || 'Display Name'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. GPT-4o, DeepSeek V3..."
                  className={`w-full p-2 rounded-xl border ${SETTINGS_INPUT_CLASS}`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-[var(--theme-text-primary)]">
                  {t('settingsModelConfigId') || 'Model ID'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="e.g. gpt-4o-mini"
                    className={`flex-1 p-2 rounded-xl border font-mono ${SETTINGS_INPUT_CLASS}`}
                  />
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="p-2 rounded-xl border border-[var(--theme-border-secondary)]/60 bg-[var(--theme-bg-secondary)]/40 hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors"
                    title="Copy Model ID"
                  >
                    {copiedId ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--theme-border-secondary)]/40 bg-[var(--theme-bg-secondary)]/30">
                <div className="flex items-center gap-2">
                  <Pin size={15} className="text-[var(--theme-border-focus)]" />
                  <div>
                    <div className="font-medium text-[var(--theme-text-primary)]">
                      {t('settingsModelConfigPin') || 'Pin Model to Top'}
                    </div>
                    <div className="text-[11px] text-[var(--theme-text-secondary)]">
                      {t('settingsModelConfigPinHelp') || 'Show this model at the top of the chat model picker.'}
                    </div>
                  </div>
                </div>
                <Toggle checked={isPinned} onChange={setIsPinned} ariaLabel="Pin model" />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[var(--theme-text-primary)]">
                    {t('settingsModelConfigContextWindow') || 'Context Window Limit (Tokens)'}
                  </label>
                  <span className="text-[11px] font-mono text-[var(--theme-text-secondary)]">
                    {contextWindow ? `${contextWindow.toLocaleString()} tokens` : t('settingsDefault') || 'Default'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1024"
                    max="10000000"
                    step="1024"
                    value={contextWindow ?? ''}
                    placeholder="e.g. 128000"
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                      setContextWindow(val);
                    }}
                    className={`flex-1 p-2 rounded-xl border font-mono ${SETTINGS_INPUT_CLASS}`}
                  />
                  <div className="flex items-center gap-1">
                    {CONTEXT_WINDOW_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setContextWindow(preset.value)}
                        className={`px-2 py-1 rounded-lg border text-[11px] font-mono font-medium transition-colors ${
                          contextWindow === preset.value
                            ? 'bg-[var(--theme-border-focus)] text-white border-transparent'
                            : 'border-[var(--theme-border-secondary)]/50 bg-[var(--theme-bg-secondary)]/40 hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-1 border-t border-[var(--theme-border-secondary)]/30">
                <label className="font-semibold text-[var(--theme-text-primary)]">
                  {t('settingsModelConfigCapabilities') || 'Capabilities Override'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 select-none">
                  {[
                    { key: 'vision', label: t('thirdPartyCapabilityVision') || 'Vision', icon: Eye },
                    { key: 'tools', label: t('thirdPartyCapabilityTools') || 'Tools (MCP)', icon: Wrench },
                    { key: 'thinking', label: t('thirdPartyCapabilityThinking') || 'Thinking', icon: Lightbulb },
                    { key: 'audio', label: t('thirdPartyCapabilityAudio') || 'Audio', icon: Headphones },
                    { key: 'image', label: t('thirdPartyCapabilityImage') || 'Image Gen', icon: ImageIcon },
                    { key: 'webSearch', label: t('thirdPartyCapabilityWebSearch') || 'Web Search', icon: Globe },
                  ].map(({ key, label, icon: Icon }) => {
                    const isChecked = Boolean(capabilities[key as keyof ModelCapabilities]);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleCapability(key as keyof ModelCapabilities)}
                        className={`flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer text-left ${
                          isChecked
                            ? 'border-[var(--theme-border-focus)] bg-[var(--theme-border-focus)]/10 text-[var(--theme-text-primary)]'
                            : 'border-[var(--theme-border-secondary)]/40 bg-[var(--theme-bg-secondary)]/20 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
                        }`}
                      >
                        <Icon size={14} className={isChecked ? 'text-[var(--theme-border-focus)]' : 'opacity-60'} />
                        <span className="font-medium text-xs">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-[var(--theme-text-primary)]">{t('settingsTemperature')}</label>
                  <span className="font-mono text-[var(--theme-text-secondary)]">
                    {temperature !== undefined ? temperature.toFixed(2) : t('settingsDefault')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={temperature ?? 1}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="flex-1 accent-[var(--theme-border-focus)] cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="2"
                    step="0.05"
                    placeholder={t('settingsDefault')}
                    value={temperature ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                      setTemperature(val);
                    }}
                    className={`w-20 p-1.5 font-mono rounded border ${SETTINGS_INPUT_CLASS}`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-[var(--theme-text-primary)]">{t('settingsTopP')}</label>
                  <span className="font-mono text-[var(--theme-text-secondary)]">
                    {topP !== undefined ? topP.toFixed(2) : t('settingsDefault')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={topP ?? 0.95}
                    onChange={(e) => setTopP(parseFloat(e.target.value))}
                    className="flex-1 accent-[var(--theme-border-focus)] cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    placeholder={t('settingsDefault')}
                    value={topP ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                      setTopP(val);
                    }}
                    className={`w-20 p-1.5 font-mono rounded border ${SETTINGS_INPUT_CLASS}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-medium text-[var(--theme-text-primary)]">
                      {t('settingsMaxOutputTokens')}
                    </label>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="131072"
                    step="256"
                    placeholder={t('settingsMaxOutputTokensPlaceholder')}
                    value={maxOutputTokens ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                      setMaxOutputTokens(val);
                    }}
                    className={`w-full p-2 font-mono rounded-xl border ${SETTINGS_INPUT_CLASS}`}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-medium text-[var(--theme-text-primary)]">{t('settingsTopK')}</label>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    placeholder={t('settingsDefault')}
                    value={topK ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                      setTopK(val);
                    }}
                    className={`w-full p-2 font-mono rounded-xl border ${SETTINGS_INPUT_CLASS}`}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl border border-[var(--theme-border-secondary)]/40 bg-[var(--theme-bg-secondary)]/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-[var(--theme-text-primary)]">
                    <Sparkles size={14} className="text-amber-500" />
                    <span>
                      {isOpenAI
                        ? t('settingsModelConfigReasoningEffort') || 'Reasoning Effort'
                        : t('settingsModelConfigThinkingBudget') || 'Thinking Budget Tokens'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--theme-text-secondary)]">
                    {isOpenAI
                      ? (reasoningEffort ?? t('settingsModelConfigEffortDefault') ?? 'Default')
                      : thinkingBudget
                        ? `${thinkingBudget} tokens`
                        : t('settingsDefault')}
                  </span>
                </div>

                {isOpenAI ? (
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: undefined, label: t('settingsModelConfigEffortDefault') || 'Default' },
                      { id: 'low' as const, label: t('settingsModelConfigEffortLow') || 'Low' },
                      { id: 'medium' as const, label: t('settingsModelConfigEffortMedium') || 'Medium' },
                      { id: 'high' as const, label: t('settingsModelConfigEffortHigh') || 'High' },
                    ].map((item) => {
                      const isSelected = reasoningEffort === item.id;
                      return (
                        <button
                          key={String(item.id)}
                          type="button"
                          onClick={() => setReasoningEffort(item.id)}
                          className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer text-center ${
                            isSelected
                              ? 'bg-[var(--theme-border-focus)] text-white border-transparent'
                              : 'border-[var(--theme-border-secondary)]/50 bg-[var(--theme-bg-secondary)]/40 hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)]'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="65536"
                      step="1024"
                      value={thinkingBudget ?? 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setThinkingBudget(val > 0 ? val : undefined);
                      }}
                      className="flex-1 accent-amber-500 cursor-pointer"
                    />
                    <input
                      type="number"
                      min="0"
                      max="65536"
                      step="1024"
                      placeholder="0 (Off/Default)"
                      value={thinkingBudget ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                        setThinkingBudget(val);
                      }}
                      className={`w-28 p-1.5 font-mono rounded border ${SETTINGS_INPUT_CLASS}`}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-medium text-[var(--theme-text-primary)]">
                      {t('settingsPresencePenalty')}
                    </label>
                    <span className="font-mono text-[var(--theme-text-secondary)]">
                      {presencePenalty !== undefined ? presencePenalty.toFixed(2) : t('settingsDefault')}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-2"
                    max="2"
                    step="0.1"
                    value={presencePenalty ?? 0}
                    onChange={(e) => setPresencePenalty(parseFloat(e.target.value))}
                    className="w-full accent-[var(--theme-border-focus)] cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-medium text-[var(--theme-text-primary)]">
                      {t('settingsFrequencyPenalty')}
                    </label>
                    <span className="font-mono text-[var(--theme-text-secondary)]">
                      {frequencyPenalty !== undefined ? frequencyPenalty.toFixed(2) : t('settingsDefault')}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-2"
                    max="2"
                    step="0.1"
                    value={frequencyPenalty ?? 0}
                    onChange={(e) => setFrequencyPenalty(parseFloat(e.target.value))}
                    className="w-full accent-[var(--theme-border-focus)] cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-medium text-[var(--theme-text-primary)]">{t('settingsStopSequences')}</label>
                  <input
                    type="text"
                    value={stopSequencesStr}
                    onChange={(e) => setStopSequencesStr(e.target.value)}
                    placeholder={t('settingsStopSequencesPlaceholder')}
                    className={`w-full p-2 font-mono rounded-xl border ${SETTINGS_INPUT_CLASS}`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-[var(--theme-text-primary)]">{t('settingsSeed')}</label>
                  <input
                    type="number"
                    value={seed ?? ''}
                    placeholder="e.g. 42"
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                      setSeed(val);
                    }}
                    className={`w-full p-2 font-mono rounded-xl border ${SETTINGS_INPUT_CLASS}`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[var(--theme-border-secondary)]/40 flex-shrink-0">
          <button
            type="button"
            onClick={handleResetParameters}
            className="inline-flex items-center gap-1 text-xs text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>{t('settingsResetToDefaults')}</span>
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className={SETTINGS_SECONDARY_ACTION_BUTTON_CLASS}>
              {t('cancel')}
            </button>
            <button type="button" onClick={handleSave} className={SETTINGS_PRIMARY_ACTION_BUTTON_CLASS}>
              {t('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

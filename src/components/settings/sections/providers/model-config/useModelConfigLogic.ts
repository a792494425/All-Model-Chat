import { useState, useEffect } from 'react';
import type { ModelCapabilities, ModelOption, ModelParameters, ThirdPartyApiProtocol } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { copyTextToClipboard } from '@/utils/clipboard';
import { toastError, toastSuccess } from '@/stores/toastStore';
import { getOrInferModelCapabilities } from '@/utils/model/knownModelsCatalog';

export type TabType = 'info' | 'parameters';

export interface UseModelConfigLogicParams {
  model: ModelOption | null;
  protocol?: ThirdPartyApiProtocol | 'gemini';
  existingModelIds?: string[];
  onClose: () => void;
  onSave: (updates: Partial<ModelOption>) => void;
}

export function useModelConfigLogic({
  model,
  protocol,
  existingModelIds = [],
  onClose,
  onSave,
}: UseModelConfigLogicParams) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [copiedId, setCopiedId] = useState(false);

  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [contextWindow, setContextWindow] = useState<number | undefined>(undefined);
  const [capabilities, setCapabilities] = useState<ModelCapabilities>({});

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
    if (!model) return;
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

  return {
    t,
    activeTab,
    setActiveTab,
    copiedId,
    name,
    setName,
    id,
    setId,
    isPinned,
    setIsPinned,
    contextWindow,
    setContextWindow,
    capabilities,
    temperature,
    setTemperature,
    maxOutputTokens,
    setMaxOutputTokens,
    topP,
    setTopP,
    topK,
    setTopK,
    presencePenalty,
    setPresencePenalty,
    frequencyPenalty,
    setFrequencyPenalty,
    stopSequencesStr,
    setStopSequencesStr,
    seed,
    setSeed,
    reasoningEffort,
    setReasoningEffort,
    thinkingBudget,
    setThinkingBudget,
    isOpenAI,
    handleCopyId,
    handleResetParameters,
    toggleCapability,
    handleSave,
  };
}

import { useState, useMemo, useCallback } from 'react';
import type { ModelOption } from '@/types';
import { getOrInferModelCapabilities } from '@/utils/model/knownModelsCatalog';
import { useProviderUiStore } from '@/stores/providerUiStore';
import type { ModelCapabilityTab } from './ProviderModelToolbar';

const EMPTY_GROUPS_COLLAPSED: Record<string, boolean> = {};

interface UseProviderModelFilterProps {
  providerId: string;
  providerName: string;
  models: ModelOption[];
}

export const useProviderModelFilter = ({ providerId, providerName, models }: UseProviderModelFilterProps) => {
  const modelSearch = useProviderUiStore((state) => state.modelSearchByConnection[providerId] ?? '');
  const setModelSearch = useCallback(
    (search: string) => useProviderUiStore.getState().setModelSearch(providerId, search),
    [providerId],
  );

  const isModelSearchOpenStored = useProviderUiStore(
    (state) => state.isModelSearchOpenByConnection[providerId] ?? false,
  );
  const setIsModelSearchOpen = useCallback(
    (isOpen: boolean) => useProviderUiStore.getState().setIsModelSearchOpen(providerId, isOpen),
    [providerId],
  );
  const isModelSearchOpen = isModelSearchOpenStored || Boolean(modelSearch);

  const [activeCapabilityTab, setActiveCapabilityTab] = useState<ModelCapabilityTab>('all');

  const groupsCollapsed = useProviderUiStore(
    (state) => state.groupsCollapsedByConnection[providerId] ?? EMPTY_GROUPS_COLLAPSED,
  );

  const capabilityCounts = useMemo(() => {
    const counts: Record<ModelCapabilityTab, number> = {
      all: models.length,
      text: 0,
      vision: 0,
      thinking: 0,
      image: 0,
      embedding: 0,
      audio: 0,
      free: 0,
    };
    models.forEach((model) => {
      const caps = { ...getOrInferModelCapabilities(model), ...(model.capabilities || {}) };
      if (!caps.image && !caps.embedding && !caps.audio) counts.text++;
      if (caps.vision) counts.vision++;
      if (caps.thinking || model.enableThinking) counts.thinking++;
      if (caps.image) counts.image++;
      if (caps.embedding) counts.embedding++;
      if (caps.audio) counts.audio++;
      if (caps.free) counts.free++;
    });
    return counts;
  }, [models]);

  const filteredModels = useMemo(() => {
    const query = modelSearch.trim().toLowerCase();
    return models.filter((model) => {
      if (activeCapabilityTab !== 'all') {
        const caps = { ...getOrInferModelCapabilities(model), ...(model.capabilities || {}) };
        if (activeCapabilityTab === 'text' && (caps.image || caps.embedding || caps.audio)) return false;
        if (activeCapabilityTab === 'vision' && !caps.vision) return false;
        if (activeCapabilityTab === 'thinking' && !caps.thinking && !model.enableThinking) return false;
        if (activeCapabilityTab === 'image' && !caps.image) return false;
        if (activeCapabilityTab === 'embedding' && !caps.embedding) return false;
        if (activeCapabilityTab === 'audio' && !caps.audio) return false;
        if (activeCapabilityTab === 'free' && !caps.free) return false;
      }
      if (!query) return true;
      return model.id.toLowerCase().includes(query) || model.name.toLowerCase().includes(query);
    });
  }, [models, activeCapabilityTab, modelSearch]);

  const groupedModels = useMemo(() => {
    const groups: Record<string, ModelOption[]> = {};
    filteredModels.forEach((model) => {
      let groupKey = providerName.toLowerCase();
      if (model.id.includes('/')) {
        groupKey = model.id.split('/')[0];
      } else if (model.id.includes(':')) {
        groupKey = model.id.split(':')[0];
      } else if (model.id.startsWith('gpt-')) {
        groupKey = 'openai';
      } else if (model.id.startsWith('claude-')) {
        groupKey = 'anthropic';
      } else if (model.id.startsWith('deepseek-')) {
        groupKey = 'deepseek';
      } else if (model.id.startsWith('qwen')) {
        groupKey = 'qwen';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(model);
    });

    return groups;
  }, [providerName, filteredModels]);

  const toggleGroupCollapse = useCallback(
    (key: string) => {
      useProviderUiStore.getState().toggleGroupCollapse(providerId, key);
    },
    [providerId],
  );

  const toggleAllGroups = useCallback(() => {
    const groupKeys = Object.keys(groupedModels);
    const hasAnyOpen = groupKeys.some((key) => !groupsCollapsed[key]);
    const nextState: Record<string, boolean> = {};
    groupKeys.forEach((key) => {
      nextState[key] = hasAnyOpen;
    });
    useProviderUiStore.getState().setAllGroupsCollapsed(providerId, nextState);
  }, [groupedModels, groupsCollapsed, providerId]);

  return {
    modelSearch,
    setModelSearch,
    isModelSearchOpen,
    setIsModelSearchOpen,
    activeCapabilityTab,
    setActiveCapabilityTab,
    capabilityCounts,
    filteredModels,
    groupedModels,
    groupsCollapsed,
    toggleGroupCollapse,
    toggleAllGroups,
  };
};

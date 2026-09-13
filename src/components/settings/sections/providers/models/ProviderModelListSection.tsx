import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import type { ModelOption, ThirdPartyApiProtocol, ThirdPartyTemplateId } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { SETTINGS_INPUT_CLASS } from '@/constants/formClasses';
import { toastSuccess, toastWarning } from '@/stores/toastStore';
import { enrichModelMetadata, getOrInferModelCapabilities } from '@/utils/model/knownModelsCatalog';
import type { ConnectionHealthProbeResult } from '@/utils/thirdPartyDiagnostics';
import { useProviderUiStore } from '@/stores/providerUiStore';
import { ProviderModelToolbar, type ModelCapabilityTab } from './ProviderModelToolbar';
import { ProviderBatchActionBar } from './ProviderBatchActionBar';
import { ProviderModelRow } from './ProviderModelRow';
import { ModelConfigModal } from '@/components/settings/sections/providers/ModelConfigModal';

const EMPTY_GROUPS_COLLAPSED: Record<string, boolean> = {};
const EMPTY_PROBE_RESULTS: Record<string, ConnectionHealthProbeResult> = {};

export interface ProviderModelListSectionProps {
  providerId: string;
  providerName: string;
  protocol?: ThirdPartyApiProtocol;
  templateId?: ThirdPartyTemplateId;
  models: ModelOption[];
  onUpdateModels: (updated: ModelOption[]) => void;
  onProbeSingleModel: (modelId: string) => Promise<void>;
  onProbeBatchModels: (models: ModelOption[]) => Promise<void>;
  isProbingBatch?: boolean;
  probingModelIds?: Set<string>;
  modelProbeResults?: Record<string, ConnectionHealthProbeResult>;
  onStopProbe?: () => void;
  batchProgress?: { completed: number; total: number } | null;
  onSyncRemoteModels?: () => void;
  isSyncingRemoteModels?: boolean;
}

export const ProviderModelListSection: React.FC<ProviderModelListSectionProps> = ({
  providerId,
  providerName,
  protocol = providerId === 'gemini' ? undefined : 'openai-compatible',

  templateId,
  models,
  onUpdateModels,
  onProbeSingleModel,
  onProbeBatchModels,
  isProbingBatch = false,
  probingModelIds = new Set(),
  modelProbeResults = EMPTY_PROBE_RESULTS,
  onStopProbe = () => {},
  batchProgress = null,
  onSyncRemoteModels,
  isSyncingRemoteModels = false,
}) => {
  const { t } = useI18n();

  // Dialog states
  const [configModalModel, setConfigModalModel] = useState<ModelOption | null>(null);

  // Search & filter states in store
  const modelSearch = useProviderUiStore((s) => s.modelSearchByConnection[providerId] ?? '');
  const setModelSearch = (search: string) => useProviderUiStore.getState().setModelSearch(providerId, search);
  const isModelSearchOpenStored = useProviderUiStore((s) => s.isModelSearchOpenByConnection[providerId] ?? false);
  const setIsModelSearchOpen = (isOpen: boolean) =>
    useProviderUiStore.getState().setIsModelSearchOpen(providerId, isOpen);
  const isModelSearchOpen = isModelSearchOpenStored || Boolean(modelSearch);

  const [activeCapabilityTab, setActiveCapabilityTab] = useState<ModelCapabilityTab>('all');

  // Groups collapsed state in store
  const groupsCollapsed = useProviderUiStore(
    (s) => s.groupsCollapsedByConnection[providerId] ?? EMPTY_GROUPS_COLLAPSED,
  );

  // Batch mode state in store
  const isBatchMode = useProviderUiStore((s) => s.isBatchModeByConnection[providerId] ?? false);
  const setIsBatchMode = (isBatch: boolean) => useProviderUiStore.getState().setIsBatchMode(providerId, isBatch);
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set());

  // Add custom model inline
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [newModelId, setNewModelId] = useState('');
  const [newModelName, setNewModelName] = useState('');

  // Keep selectedModelIds cleaned up when models change
  useEffect(() => {
    setSelectedModelIds((prev) => {
      if (prev.size === 0) return prev;
      const validIds = new Set(models.map((m) => m.id));
      const next = new Set<string>();
      for (const id of prev) {
        if (validIds.has(id)) next.add(id);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [models]);

  // Capability counts
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
    models.forEach((m) => {
      const caps = { ...getOrInferModelCapabilities(m), ...(m.capabilities || {}) };
      if (!caps.image && !caps.embedding && !caps.audio) counts.text++;
      if (caps.vision) counts.vision++;
      if (caps.thinking || m.enableThinking) counts.thinking++;
      if (caps.image) counts.image++;
      if (caps.embedding) counts.embedding++;
      if (caps.audio) counts.audio++;
      if (caps.free) counts.free++;
    });
    return counts;
  }, [models]);

  // Filtered models
  const filteredModels = useMemo(() => {
    const q = modelSearch.trim().toLowerCase();
    return models.filter((m) => {
      if (activeCapabilityTab !== 'all') {
        const caps = { ...getOrInferModelCapabilities(m), ...(m.capabilities || {}) };
        if (activeCapabilityTab === 'text' && (caps.image || caps.embedding || caps.audio)) return false;
        if (activeCapabilityTab === 'vision' && !caps.vision) return false;
        if (activeCapabilityTab === 'thinking' && !caps.thinking && !m.enableThinking) return false;
        if (activeCapabilityTab === 'image' && !caps.image) return false;
        if (activeCapabilityTab === 'embedding' && !caps.embedding) return false;
        if (activeCapabilityTab === 'audio' && !caps.audio) return false;
        if (activeCapabilityTab === 'free' && !caps.free) return false;
      }
      if (!q) return true;
      return m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
    });
  }, [models, activeCapabilityTab, modelSearch]);

  // Grouped models
  const groupedModels = useMemo(() => {
    const groups: Record<string, ModelOption[]> = {};
    filteredModels.forEach((m) => {
      let groupKey = providerName.toLowerCase();
      if (m.id.includes('/')) {
        groupKey = m.id.split('/')[0];
      } else if (m.id.includes(':')) {
        groupKey = m.id.split(':')[0];
      } else if (m.id.startsWith('gpt-')) {
        groupKey = 'openai';
      } else if (m.id.startsWith('claude-')) {
        groupKey = 'anthropic';
      } else if (m.id.startsWith('deepseek-')) {
        groupKey = 'deepseek';
      } else if (m.id.startsWith('qwen')) {
        groupKey = 'qwen';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(m);
    });

    return groups;
  }, [providerName, filteredModels]);

  const toggleGroupCollapse = (key: string) => {
    useProviderUiStore.getState().toggleGroupCollapse(providerId, key);
  };

  const toggleAllGroups = () => {
    const groupKeys = Object.keys(groupedModels);
    const hasAnyOpen = groupKeys.some((k) => !groupsCollapsed[k]);
    const nextState: Record<string, boolean> = {};
    groupKeys.forEach((k) => {
      nextState[k] = hasAnyOpen;
    });
    useProviderUiStore.getState().setAllGroupsCollapsed(providerId, nextState);
  };

  // Single model mutations
  const updateSingleModel = (modelId: string, updates: Partial<ModelOption>) => {
    const updated = models.map((m) => (m.id === modelId ? { ...m, ...updates } : m));
    onUpdateModels(updated);
  };

  const deleteSingleModel = (modelId: string) => {
    const updated = models.filter((m) => m.id !== modelId);
    onUpdateModels(updated);
    toastSuccess(t('thirdPartyToastDeleted') || 'Model deleted');
  };

  // Batch actions
  const isAllVisibleSelected = filteredModels.length > 0 && filteredModels.every((m) => selectedModelIds.has(m.id));
  const isPartialSelected = !isAllVisibleSelected && filteredModels.some((m) => selectedModelIds.has(m.id));

  const handleToggleSelectAll = () => {
    if (isAllVisibleSelected) {
      setSelectedModelIds((prev) => {
        const next = new Set(prev);
        filteredModels.forEach((m) => next.delete(m.id));
        return next;
      });
    } else {
      setSelectedModelIds((prev) => {
        const next = new Set(prev);
        filteredModels.forEach((m) => next.add(m.id));
        return next;
      });
    }
  };

  const handleInvertSelection = () => {
    setSelectedModelIds((prev) => {
      const next = new Set(prev);
      for (const m of filteredModels) {
        if (next.has(m.id)) {
          next.delete(m.id);
        } else {
          next.add(m.id);
        }
      }
      return next;
    });
  };

  const handleBatchSetVisible = (visible: boolean) => {
    if (selectedModelIds.size === 0) return;
    const updated = models.map((m) => (selectedModelIds.has(m.id) ? { ...m, visibleInSelector: visible } : m));
    onUpdateModels(updated);
    toastSuccess(
      visible
        ? t('thirdPartyToastBatchShow', { count: selectedModelIds.size }) || `Showed ${selectedModelIds.size} models`
        : t('thirdPartyToastBatchHide', { count: selectedModelIds.size }) || `Hidden ${selectedModelIds.size} models`,
    );
  };

  const handleBatchDelete = () => {
    if (selectedModelIds.size === 0) return;
    const count = selectedModelIds.size;
    const remaining = models.filter((m) => !selectedModelIds.has(m.id));
    onUpdateModels(remaining);
    setSelectedModelIds(new Set());
    setIsBatchMode(false);
    toastSuccess(t('thirdPartyToastBatchDeleted', { count }) || `Deleted ${count} models`);
  };

  const handleBatchProbeSelected = () => {
    const targetModels = models.filter((m) => selectedModelIds.has(m.id));
    if (targetModels.length === 0) return;
    onProbeBatchModels(targetModels);
  };

  // Add custom model confirm
  const handleConfirmAddModel = () => {
    const trimmedId = newModelId.trim();
    if (!trimmedId) return;

    const trimmedName = newModelName.trim() || trimmedId;
    const existing = models.find((m) => m.id === trimmedId);
    if (existing) {
      toastWarning(t('thirdPartyToastModelIdExists') || 'Model ID already exists');
      return;
    }

    const newOption = enrichModelMetadata({
      id: trimmedId,
      name: trimmedName,
    });

    onUpdateModels([...models, newOption]);
    setNewModelId('');
    setNewModelName('');
    setIsAddingModel(false);
    toastSuccess(t('thirdPartyToastModelAdded', { name: trimmedName }) || `Model ${trimmedName} added`);
  };

  return (
    <div className="space-y-3 pt-2" data-settings-item="providers-models">
      <ProviderModelToolbar
        modelsCount={models.length}
        activeCapabilityTab={activeCapabilityTab}
        onSelectCapabilityTab={setActiveCapabilityTab}
        capabilityCounts={capabilityCounts}
        onToggleCollapseAll={toggleAllGroups}
        isSearchOpen={isModelSearchOpen}
        onToggleSearchOpen={() => setIsModelSearchOpen(!isModelSearchOpen)}
        searchQuery={modelSearch}
        onSearchChange={setModelSearch}
        isBatchMode={isBatchMode}
        onToggleBatchMode={() => {
          const next = !isBatchMode;
          setIsBatchMode(next);
          if (!next) setSelectedModelIds(new Set());
        }}
        hasSelectedBatch={selectedModelIds.size > 0}
        isCheckingBatch={isProbingBatch}
        batchProgress={batchProgress}
        onProbeAll={() => onProbeBatchModels(models)}
        onStopProbe={onStopProbe}
        onSyncModels={onSyncRemoteModels}
        isSyncingModels={isSyncingRemoteModels}
        onOpenAddModel={() => setIsAddingModel(true)}
      />

      {(isBatchMode || selectedModelIds.size > 0) && (
        <ProviderBatchActionBar
          selectedCount={selectedModelIds.size}
          totalFilteredCount={filteredModels.length}
          isAllSelected={isAllVisibleSelected}
          isPartialSelected={isPartialSelected}
          onToggleSelectAll={handleToggleSelectAll}
          onInvertSelection={handleInvertSelection}
          onBatchSetVisible={handleBatchSetVisible}
          onBatchProbeSelected={handleBatchProbeSelected}
          onBatchDelete={handleBatchDelete}
          onExitBatchMode={() => {
            setSelectedModelIds(new Set());
            setIsBatchMode(false);
          }}
          isCheckingBatch={isProbingBatch}
        />
      )}

      {isAddingModel && (
        <div className="p-3 rounded-xl border border-[var(--theme-border-focus)]/50 bg-[var(--theme-bg-secondary)]/30 space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--theme-text-primary)]">
            <span>{t('thirdPartyAddCustomModel') || 'Add Custom Model'}</span>
            <button
              type="button"
              onClick={() => setIsAddingModel(false)}
              className="text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
            >
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={newModelId}
              onChange={(e) => setNewModelId(e.target.value)}
              placeholder={t('thirdPartyCustomModelIdPlaceholder') || 'Model ID (e.g. gpt-4o)'}
              className={`p-2 rounded-lg border text-xs font-mono ${SETTINGS_INPUT_CLASS}`}
              autoFocus
            />
            <input
              type="text"
              value={newModelName}
              onChange={(e) => setNewModelName(e.target.value)}
              placeholder={t('thirdPartyCustomModelNamePlaceholder') || 'Display Name (optional)'}
              className={`p-2 rounded-lg border text-xs ${SETTINGS_INPUT_CLASS}`}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingModel(false)}
              className="px-2.5 py-1 text-xs rounded-lg text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
            >
              {t('cancel') || 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleConfirmAddModel}
              disabled={!newModelId.trim()}
              className="px-3 py-1 text-xs rounded-lg bg-[var(--theme-border-focus)] text-white disabled:opacity-50 cursor-pointer"
            >
              {t('add') || 'Add'}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--theme-border-secondary)]/40 bg-[var(--theme-bg-secondary)]/10 p-2 space-y-3">
        {Object.keys(groupedModels).length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--theme-text-secondary)]">
            {models.length === 0
              ? t('thirdPartyNoModelsPrompt') || 'No models configured yet.'
              : t('thirdPartyNoMatchingFilteredModels') || 'No matching models found.'}
          </div>
        ) : (
          (Object.entries(groupedModels) as Array<[string, ModelOption[]]>).map(([groupKey, groupModels]) => {
            const isCollapsed = groupsCollapsed[groupKey] ?? false;

            return (
              <div key={groupKey} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleGroupCollapse(groupKey)}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] cursor-pointer select-none transition-colors"
                >
                  {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                  <span className="font-mono uppercase tracking-wider">{groupKey}</span>
                  <span className="text-[10px] text-[var(--theme-text-secondary)]/60">({groupModels.length})</span>
                </button>
                {!isCollapsed && (
                  <div className="space-y-1 pl-1">
                    {groupModels.map((model) => (
                      <ProviderModelRow
                        key={model.id}
                        model={model}
                        protocol={protocol}
                        templateId={templateId}
                        isSelected={selectedModelIds.has(model.id)}
                        isBatchMode={isBatchMode}
                        onToggleSelect={(id) => {
                          setSelectedModelIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(id)) next.delete(id);
                            else next.add(id);
                            return next;
                          });
                        }}
                        onToggleVisible={(id, visible) => updateSingleModel(id, { visibleInSelector: visible })}
                        onToggleThinking={(id, thinking) => updateSingleModel(id, { enableThinking: thinking })}
                        onToggleTools={(id, tools) => updateSingleModel(id, { enableTools: tools })}
                        onProbeSingle={onProbeSingleModel}
                        isProbing={probingModelIds.has(model.id)}
                        probeResult={modelProbeResults[model.id]}
                        onOpenConfig={(m) => setConfigModalModel(m)}
                        onDelete={deleteSingleModel}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <ModelConfigModal
        isOpen={Boolean(configModalModel)}
        model={configModalModel}
        protocol={protocol}
        existingModelIds={models.map((m) => m.id)}
        onClose={() => setConfigModalModel(null)}
        onSave={(updates) => {
          if (configModalModel) {
            updateSingleModel(configModalModel.id, updates);
          }
        }}
      />

    </div>
  );
};

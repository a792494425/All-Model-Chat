import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ModelOption, ThirdPartyApiProtocol, ThirdPartyTemplateId } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { interpolate } from '@/i18n/interpolate';
import { ConfirmationModal } from '@/components/modals/ConfirmationModal';
import { toastSuccess, toastWarning } from '@/stores/toastStore';
import { enrichModelMetadata } from '@/utils/model/knownModelsCatalog';
import type { ConnectionHealthProbeResult } from '@/utils/third-party/thirdPartyDiagnostics';
import { ProviderModelToolbar } from './ProviderModelToolbar';
import { ProviderBatchActionBar } from './ProviderBatchActionBar';
import { ProviderModelRow } from './ProviderModelRow';
import { ProviderAddModelForm } from './ProviderAddModelForm';
import { ProviderNoModelsCard } from './ProviderNoModelsCard';
import { ModelConfigModal } from '@/components/settings/sections/providers/ModelConfigModal';
import { useProviderModelFilter } from './useProviderModelFilter';
import { useProviderBatchActions } from './useProviderBatchActions';

const EMPTY_PROBE_RESULTS: Record<string, ConnectionHealthProbeResult> = {};

export interface ProviderModelListSectionProps {
  providerId: string;
  providerName: string;
  protocol?: ThirdPartyApiProtocol | 'gemini';
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
  onResetDefaultModels?: () => void;
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
  onResetDefaultModels,
}) => {
  const { t } = useI18n();

  const [configModalModel, setConfigModalModel] = useState<ModelOption | null>(null);
  const [isAddingModel, setIsAddingModel] = useState(false);

  const {
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
  } = useProviderModelFilter({
    providerId,
    providerName,
    models,
  });

  const {
    isBatchMode,
    setIsBatchMode,
    selectedModelIds,
    setSelectedModelIds,
    isAllVisibleSelected,
    isPartialSelected,
    handleToggleSelectAll,
    handleInvertSelection,
    handleBatchSetVisible,
    handleBatchDelete,
    handleBatchProbeSelected,
    handleToggleSelectModel,
    handleExitBatchMode,
  } = useProviderBatchActions({
    providerId,
    models,
    filteredModels,
    onUpdateModels,
    onProbeBatchModels,
  });

  const [modelPendingDelete, setModelPendingDelete] = useState<ModelOption | null>(null);
  const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = useState(false);

  const updateSingleModel = useCallback(
    (modelId: string, updates: Partial<ModelOption>) => {
      const updated = models.map((model) => (model.id === modelId ? { ...model, ...updates } : model));
      onUpdateModels(updated);
    },
    [models, onUpdateModels],
  );

  const deleteSingleModel = useCallback(
    (modelId: string) => {
      const updated = models.filter((model) => model.id !== modelId);
      onUpdateModels(updated);
      toastSuccess(t('thirdPartyToastDeleted') || 'Model deleted');
    },
    [models, onUpdateModels, t],
  );

  const handleRequestDeleteModel = useCallback(
    (modelId: string) => {
      const target = models.find((m) => m.id === modelId);
      if (target) {
        setModelPendingDelete(target);
      }
    },
    [models],
  );

  const handleConfirmDeleteSingle = useCallback(() => {
    if (!modelPendingDelete) return;
    deleteSingleModel(modelPendingDelete.id);
    setModelPendingDelete(null);
  }, [deleteSingleModel, modelPendingDelete]);

  const handleConfirmAddModel = useCallback(
    (trimmedId: string, trimmedName: string) => {
      const existing = models.find((model) => model.id === trimmedId);
      if (existing) {
        toastWarning(t('thirdPartyToastModelIdExists') || 'Model ID already exists');
        return;
      }

      const displayName = trimmedName || trimmedId;
      const newOption = enrichModelMetadata({
        id: trimmedId,
        name: displayName,
      });

      onUpdateModels([...models, newOption]);
      setIsAddingModel(false);
      toastSuccess(t('thirdPartyToastModelAdded', { name: displayName }) || `Model ${displayName} added`);
    },
    [models, onUpdateModels, t],
  );

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
        onResetDefaultModels={onResetDefaultModels}
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
          onBatchDelete={() => setIsBatchDeleteConfirmOpen(true)}
          onExitBatchMode={handleExitBatchMode}
          isCheckingBatch={isProbingBatch}
        />
      )}

      <ProviderAddModelForm
        isOpen={isAddingModel}
        onClose={() => setIsAddingModel(false)}
        onAddModel={handleConfirmAddModel}
      />

      <div className="rounded-2xl border border-[var(--theme-border-secondary)]/40 bg-[var(--theme-bg-secondary)]/10 p-2 space-y-3">
        {Object.keys(groupedModels).length === 0 ? (
          <ProviderNoModelsCard
            totalModelsCount={models.length}
            onSyncRemoteModels={onSyncRemoteModels}
            isSyncingRemoteModels={isSyncingRemoteModels}
            isProbingBatch={isProbingBatch}
            onOpenAddModel={() => setIsAddingModel(true)}
          />
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
                        onToggleSelect={handleToggleSelectModel}
                        onToggleVisible={(id, visible) => updateSingleModel(id, { visibleInSelector: visible })}
                        onToggleThinking={(id, thinking) => updateSingleModel(id, { enableThinking: thinking })}
                        onToggleTools={(id, tools) => updateSingleModel(id, { enableTools: tools })}
                        onTogglePin={(id, pinned) => updateSingleModel(id, { isPinned: pinned })}
                        onProbeSingle={onProbeSingleModel}
                        isProbing={probingModelIds.has(model.id)}
                        probeResult={modelProbeResults[model.id]}
                        onOpenConfig={(chosenModel) => setConfigModalModel(chosenModel)}
                        onDelete={handleRequestDeleteModel}
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
        existingModelIds={models.map((model) => model.id)}
        onClose={() => setConfigModalModel(null)}
        onSave={(updates) => {
          if (configModalModel) {
            updateSingleModel(configModalModel.id, updates);
          }
        }}
      />

      <ConfirmationModal
        isOpen={Boolean(modelPendingDelete)}
        onClose={() => setModelPendingDelete(null)}
        onConfirm={handleConfirmDeleteSingle}
        title={t('thirdPartyDeleteModelConfirmTitle') || '删除模型'}
        message={interpolate(t('thirdPartyDeleteModelConfirmMessage'), {
          name: modelPendingDelete?.name || modelPendingDelete?.id || '',
        })}
        confirmLabel={t('delete') || '删除'}
        cancelLabel={t('cancel') || '取消'}
        isDanger={true}
      />

      <ConfirmationModal
        isOpen={isBatchDeleteConfirmOpen}
        onClose={() => setIsBatchDeleteConfirmOpen(false)}
        onConfirm={() => {
          handleBatchDelete();
          setIsBatchDeleteConfirmOpen(false);
        }}
        title={t('thirdPartyBatchDeleteModelConfirmTitle') || '批量删除模型'}
        message={interpolate(t('thirdPartyBatchDeleteModelConfirmMessage'), {
          count: selectedModelIds.size.toString(),
        })}
        confirmLabel={t('delete') || '删除'}
        cancelLabel={t('cancel') || '取消'}
        isDanger={true}
      />
    </div>
  );
};

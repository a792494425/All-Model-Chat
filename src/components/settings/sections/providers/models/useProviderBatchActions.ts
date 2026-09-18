import { useState, useEffect, useCallback } from 'react';
import type { ModelOption } from '@/types';
import { useProviderUiStore } from '@/stores/providerUiStore';
import { toastSuccess } from '@/stores/toastStore';
import { useI18n } from '@/contexts/I18nContext';

interface UseProviderBatchActionsProps {
  providerId: string;
  models: ModelOption[];
  filteredModels: ModelOption[];
  onUpdateModels: (updated: ModelOption[]) => void;
  onProbeBatchModels: (models: ModelOption[]) => Promise<void>;
}

export const useProviderBatchActions = ({
  providerId,
  models,
  filteredModels,
  onUpdateModels,
  onProbeBatchModels,
}: UseProviderBatchActionsProps) => {
  const { t } = useI18n();

  const isBatchMode = useProviderUiStore((state) => state.isBatchModeByConnection[providerId] ?? false);
  const setIsBatchMode = useCallback(
    (isBatch: boolean) => useProviderUiStore.getState().setIsBatchMode(providerId, isBatch),
    [providerId],
  );

  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set());

  // Keep selectedModelIds cleaned up when models change
  useEffect(() => {
    setSelectedModelIds((prev) => {
      if (prev.size === 0) return prev;
      const validIds = new Set(models.map((model) => model.id));
      const next = new Set<string>();
      for (const id of prev) {
        if (validIds.has(id)) next.add(id);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [models]);

  const isAllVisibleSelected =
    filteredModels.length > 0 && filteredModels.every((model) => selectedModelIds.has(model.id));
  const isPartialSelected = !isAllVisibleSelected && filteredModels.some((model) => selectedModelIds.has(model.id));

  const handleToggleSelectAll = useCallback(() => {
    if (isAllVisibleSelected) {
      setSelectedModelIds((prev) => {
        const next = new Set(prev);
        filteredModels.forEach((model) => next.delete(model.id));
        return next;
      });
    } else {
      setSelectedModelIds((prev) => {
        const next = new Set(prev);
        filteredModels.forEach((model) => next.add(model.id));
        return next;
      });
    }
  }, [filteredModels, isAllVisibleSelected]);

  const handleInvertSelection = useCallback(() => {
    setSelectedModelIds((prev) => {
      const next = new Set(prev);
      for (const model of filteredModels) {
        if (next.has(model.id)) {
          next.delete(model.id);
        } else {
          next.add(model.id);
        }
      }
      return next;
    });
  }, [filteredModels]);

  const handleBatchSetVisible = useCallback(
    (visible: boolean) => {
      if (selectedModelIds.size === 0) return;
      const updated = models.map((model) =>
        selectedModelIds.has(model.id) ? { ...model, visibleInSelector: visible } : model,
      );
      onUpdateModels(updated);
      toastSuccess(
        visible
          ? t('thirdPartyToastBatchShow', { count: selectedModelIds.size }) || `Showed ${selectedModelIds.size} models`
          : t('thirdPartyToastBatchHide', { count: selectedModelIds.size }) || `Hidden ${selectedModelIds.size} models`,
      );
    },
    [models, onUpdateModels, selectedModelIds, t],
  );

  const handleBatchDelete = useCallback(() => {
    if (selectedModelIds.size === 0) return;
    const count = selectedModelIds.size;
    const remaining = models.filter((model) => !selectedModelIds.has(model.id));
    onUpdateModels(remaining);
    setSelectedModelIds(new Set());
    setIsBatchMode(false);
    toastSuccess(t('thirdPartyToastBatchDeleted', { count }) || `Deleted ${count} models`);
  }, [models, onUpdateModels, selectedModelIds, setIsBatchMode, t]);

  const handleBatchProbeSelected = useCallback(() => {
    const targetModels = models.filter((model) => selectedModelIds.has(model.id));
    if (targetModels.length === 0) return;
    onProbeBatchModels(targetModels);
  }, [models, onProbeBatchModels, selectedModelIds]);

  const handleToggleSelectModel = useCallback((modelId: string) => {
    setSelectedModelIds((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) next.delete(modelId);
      else next.add(modelId);
      return next;
    });
  }, []);

  const handleExitBatchMode = useCallback(() => {
    setSelectedModelIds(new Set());
    setIsBatchMode(false);
  }, [setIsBatchMode]);

  return {
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
  };
};

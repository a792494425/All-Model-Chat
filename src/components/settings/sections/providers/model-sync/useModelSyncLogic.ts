import { useState, useMemo, useEffect, useCallback } from 'react';
import type { ModelOption } from '@/types';
import { reconcileModels, applyModelReconcile } from '@/utils/model/modelReconcile';
import type { FilterTab, ModelSyncDisplayItem } from './types';

interface UseModelSyncLogicOptions {
  remoteModels: ModelOption[];
  existingModels: ModelOption[];
  onApply: (reconciledModels: ModelOption[]) => void;
  onClose: () => void;
}

export const useModelSyncLogic = ({ remoteModels, existingModels, onApply, onClose }: UseModelSyncLogicOptions) => {
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Reconcile remote with existing
  const reconcileResult = useMemo(() => reconcileModels(remoteModels, existingModels), [remoteModels, existingModels]);

  const { newModels, existingModels: mergedExisting, staleModels, stats } = reconcileResult;

  // By default, select all new models for addition
  const [selectedNewIds, setSelectedNewIds] = useState<Set<string>>(() => {
    return new Set(newModels.map((model) => model.id));
  });

  // By default, keep stale models unchecked unless user explicitly wants to purge them
  const [selectedStaleRemoveIds, setSelectedStaleRemoveIds] = useState<Set<string>>(new Set());

  // Reset selection states when remote models change
  useEffect(() => {
    setSelectedNewIds(new Set(newModels.map((model) => model.id)));
    setSelectedStaleRemoveIds(new Set());
  }, [newModels]);

  // Toggle single new model
  const toggleNewModel = useCallback((id: string) => {
    setSelectedNewIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Toggle single stale model for removal
  const toggleStaleModel = useCallback((id: string) => {
    setSelectedStaleRemoveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Toggle all new models
  const toggleAllNew = useCallback(() => {
    setSelectedNewIds((prev) => {
      if (prev.size === newModels.length) {
        return new Set();
      }
      return new Set(newModels.map((model) => model.id));
    });
  }, [newModels]);

  // Select all stale models for removal
  const selectAllStaleForRemoval = useCallback(() => {
    setSelectedStaleRemoveIds((prev) => {
      if (prev.size === staleModels.length) {
        return new Set();
      }
      return new Set(staleModels.map((model) => model.id));
    });
  }, [staleModels]);

  // Handle final submission
  const handleConfirm = useCallback(() => {
    const selectedNewModels = newModels.filter((model) => selectedNewIds.has(model.id));
    const remoteMetadataMap = new Map(remoteModels.map((model) => [model.id, model]));

    const finalized = applyModelReconcile({
      existingModels,
      selectedNewModels,
      removeStaleModelIds: selectedStaleRemoveIds,
      updateMetadataFromRemote: remoteMetadataMap,
    });

    onApply(finalized);
    onClose();
  }, [newModels, selectedNewIds, remoteModels, existingModels, selectedStaleRemoveIds, onApply, onClose]);

  // Filter display list
  const displayItems = useMemo(() => {
    const items: ModelSyncDisplayItem[] = [];

    if (filterTab === 'all' || filterTab === 'new') {
      newModels.forEach((model) => items.push({ model, status: 'new' }));
    }
    if (filterTab === 'all' || filterTab === 'existing') {
      mergedExisting.forEach((model) => items.push({ model, status: 'existing' }));
    }
    if (filterTab === 'all' || filterTab === 'stale') {
      staleModels.forEach((model) => items.push({ model, status: 'stale' }));
    }

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      return items.filter(
        ({ model }) =>
          model.id.toLowerCase().includes(query) ||
          model.name.toLowerCase().includes(query) ||
          (model.ownedBy && model.ownedBy.toLowerCase().includes(query)),
      );
    }

    return items;
  }, [filterTab, newModels, mergedExisting, staleModels, searchQuery]);

  return {
    filterTab,
    setFilterTab,
    searchQuery,
    setSearchQuery,
    stats,
    newModels,
    staleModels,
    selectedNewIds,
    selectedStaleRemoveIds,
    displayItems,
    toggleNewModel,
    toggleStaleModel,
    toggleAllNew,
    selectAllStaleForRemoval,
    handleConfirm,
  };
};

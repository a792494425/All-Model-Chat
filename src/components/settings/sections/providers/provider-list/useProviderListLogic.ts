import { useMemo, useCallback } from 'react';
import { KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { ThirdPartyConnection } from '@/types';
import { useProviderUiStore } from '@/stores/providerUiStore';
import { TEMPLATE_PRESETS } from '@/utils/third-party/thirdPartyApiProviders';

interface UseProviderListLogicOptions {
  connections: ThirdPartyConnection[];
  onReorder: (orderedIds: string[]) => void;
}

export const useProviderListLogic = ({ connections, onReorder }: UseProviderListLogicOptions) => {
  const search = useProviderUiStore((state) => state.listSearchQuery);
  const setSearch = useProviderUiStore((state) => state.setListSearchQuery);
  const filterMode = useProviderUiStore((state) => state.listFilterMode);
  const setFilterMode = useProviderUiStore((state) => state.setListFilterMode);
  const healthResults = useProviderUiStore((state) => state.healthResultByConnection);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const configuredTemplateIds = useMemo(() => new Set(connections.map((conn) => conn.templateId)), [connections]);

  const unconfiguredPresets = useMemo(() => {
    return TEMPLATE_PRESETS.filter((preset) => !configuredTemplateIds.has(preset.id));
  }, [configuredTemplateIds]);

  const enabledCount = useMemo(() => {
    return connections.filter((conn) => conn.enabled).length;
  }, [connections]);

  const allCount = useMemo(() => {
    return connections.length + unconfiguredPresets.length;
  }, [connections.length, unconfiguredPresets.length]);

  const disabledCount = useMemo(() => {
    return Math.max(0, allCount - enabledCount);
  }, [allCount, enabledCount]);

  const filteredConnections = useMemo(() => {
    return connections
      .filter((conn) => {
        if (filterMode === 'enabled') return conn.enabled;
        if (filterMode === 'disabled') return !conn.enabled;
        return true;
      })
      .filter((conn) => {
        if (!search.trim()) return true;
        const query = search.trim().toLowerCase();
        return (
          conn.name.toLowerCase().includes(query) ||
          (conn.notes && conn.notes.toLowerCase().includes(query)) ||
          conn.templateId.toLowerCase().includes(query) ||
          conn.models.some(
            (model) =>
              model.id.toLowerCase().includes(query) || (model.name && model.name.toLowerCase().includes(query)),
          )
        );
      });
  }, [connections, filterMode, search]);

  const filteredPresets = useMemo(() => {
    if (filterMode === 'enabled') return [];
    return unconfiguredPresets.filter((preset) => {
      if (!search.trim()) return true;
      const query = search.trim().toLowerCase();
      return (
        preset.name.toLowerCase().includes(query) ||
        preset.id.toLowerCase().includes(query) ||
        (preset.description && preset.description.toLowerCase().includes(query))
      );
    });
  }, [filterMode, unconfiguredPresets, search]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = connections.findIndex((conn) => conn.id === active.id);
        const newIndex = connections.findIndex((conn) => conn.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          const next = [...connections];
          const [moved] = next.splice(oldIndex, 1);
          next.splice(newIndex, 0, moved);
          onReorder(next.map((conn) => conn.id));
        }
      }
    },
    [connections, onReorder],
  );

  return {
    search,
    setSearch,
    filterMode,
    setFilterMode,
    healthResults,
    sensors,
    enabledCount,
    allCount,
    disabledCount,
    filteredConnections,
    filteredPresets,
    handleDragEnd,
  };
};

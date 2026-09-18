import { useMemo, useCallback } from 'react';
import { KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { ThirdPartyConnection } from '@/types';
import { useProviderUiStore } from '@/stores/providerUiStore';
import { TEMPLATE_PRESETS } from '@/utils/thirdPartyApiProviders';

interface UseProviderListLogicOptions {
  connections: ThirdPartyConnection[];
  geminiStatus?: {
    isConfigured: boolean;
    useProxy: boolean;
  };
  onReorder: (orderedIds: string[]) => void;
  officialProvidersText: string;
}

export const useProviderListLogic = ({
  connections,
  geminiStatus,
  onReorder,
  officialProvidersText,
}: UseProviderListLogicOptions) => {
  const search = useProviderUiStore((s) => s.listSearchQuery);
  const setSearch = useProviderUiStore((s) => s.setListSearchQuery);
  const filterMode = useProviderUiStore((s) => s.listFilterMode);
  const setFilterMode = useProviderUiStore((s) => s.setListFilterMode);
  const healthResults = useProviderUiStore((s) => s.healthResultByConnection);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const configuredTemplateIds = useMemo(() => new Set(connections.map((c) => c.templateId)), [connections]);

  const unconfiguredPresets = useMemo(() => {
    return TEMPLATE_PRESETS.filter((p) => !configuredTemplateIds.has(p.id));
  }, [configuredTemplateIds]);

  const enabledCount = useMemo(() => {
    return connections.filter((c) => c.enabled).length + (geminiStatus?.isConfigured ? 1 : 0);
  }, [connections, geminiStatus?.isConfigured]);

  const allCount = useMemo(() => {
    return connections.length + 1 + unconfiguredPresets.length;
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
        const q = search.trim().toLowerCase();
        return (
          conn.name.toLowerCase().includes(q) ||
          (conn.notes && conn.notes.toLowerCase().includes(q)) ||
          conn.templateId.toLowerCase().includes(q) ||
          conn.models.some((m) => m.id.toLowerCase().includes(q) || (m.name && m.name.toLowerCase().includes(q)))
        );
      });
  }, [connections, filterMode, search]);

  const filteredPresets = useMemo(() => {
    if (filterMode === 'enabled') return [];
    return unconfiguredPresets.filter((p) => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    });
  }, [filterMode, unconfiguredPresets, search]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = connections.findIndex((c) => c.id === active.id);
        const newIndex = connections.findIndex((c) => c.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          const next = [...connections];
          const [moved] = next.splice(oldIndex, 1);
          next.splice(newIndex, 0, moved);
          onReorder(next.map((c) => c.id));
        }
      }
    },
    [connections, onReorder],
  );

  const isGeminiMatch = useMemo(() => {
    if (filterMode === 'enabled' && !geminiStatus?.isConfigured) return false;
    if (filterMode === 'disabled' && geminiStatus?.isConfigured) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      'google gemini official builtin 官方 内置'.toLowerCase().includes(q) ||
      officialProvidersText.toLowerCase().includes(q)
    );
  }, [filterMode, geminiStatus?.isConfigured, search, officialProvidersText]);

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
    isGeminiMatch,
  };
};

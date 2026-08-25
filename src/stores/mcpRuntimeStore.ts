import { create } from 'zustand';
import type { McpServerConfig } from '../../shared/mcpServerConfig';

interface McpRuntimeSelection {
  masterEnabled: boolean;
  /** null = every enabled server; otherwise exactly these ids. */
  selectedServerIds: string[] | null;
}

interface McpRuntimeActions {
  toggleMaster: () => void;
  toggleServer: (id: string, allIds: string[]) => void;
}

export const useMcpRuntimeStore = create<McpRuntimeSelection & McpRuntimeActions>((set) => ({
  masterEnabled: true,
  selectedServerIds: null,
  toggleMaster: () =>
    set((state) => ({
      masterEnabled: !state.masterEnabled,
      selectedServerIds: state.masterEnabled ? state.selectedServerIds : state.selectedServerIds,
    })),
  toggleServer: (id, allIds) =>
    set((state) => {
      const base = state.selectedServerIds ?? [...allIds];
      const next = base.includes(id) ? base.filter((entry) => entry !== id) : [...base, id];
      // Back to "everything" semantics when nothing is excluded.
      return {
        selectedServerIds:
          next.length === 0 || next.length === allIds.length ? (next.length === 0 ? [] : null) : next,
      };
    }),
}));

export const selectServersForTurn = (
  servers: McpServerConfig[],
  selection: Pick<McpRuntimeSelection, 'masterEnabled' | 'selectedServerIds'>,
): McpServerConfig[] => {
  if (!selection.masterEnabled) return [];
  const enabled = servers.filter((server) => server.enabled);
  if (selection.selectedServerIds === null) return enabled;
  const picked = new Set(selection.selectedServerIds);
  return enabled.filter((server) => picked.has(server.id));
};

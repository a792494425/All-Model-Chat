import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { getErrorMessage } from '@/utils/errorMessage';
import type { AppSettings, McpServerConfig } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { fetchMcpServerCapabilities } from '@/services/api/mcpApi';
import { McpImportError, dedupeServersById, parseImportJson } from '@/features/mcp/importMcpServers';
import { useMcpStatusStore } from '@/stores/mcp/mcpStatusStore';
import { deriveStatus } from '@/features/mcp/mcpStatus';
import { getVirtualMcpServers, type VirtualMcpServer } from '@/features/mcp/virtualMcpRegistry';
import { useVirtualMcpStore } from '@/stores/mcp/virtualMcpStore';
import { createMcpServer, type CapabilityTestState, type ServerFilter } from './mcpSectionShared';

interface UseMcpSectionLogicProps {
  settings: AppSettings;
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const matchesFilter = (filter: ServerFilter, server: McpServerConfig): boolean => {
  if (filter === 'enabled' && !server.enabled) return false;
  if (filter === 'disabled' && server.enabled) return false;
  if (filter === 'http' && server.transport !== 'http') return false;
  if (filter === 'sse' && server.transport !== 'sse') return false;
  if (filter === 'stdio' && server.transport !== 'stdio') return false;
  return true;
};

const matchKeywords = (searchQuery: string, server: McpServerConfig) => {
  if (!searchQuery.trim()) return true;
  const serverExtra = server as McpServerConfig & { description?: unknown; provider?: unknown; tags?: unknown };
  const extra = [serverExtra.description, serverExtra.provider, serverExtra.tags]
    .flat()
    .filter((value): value is string => typeof value === 'string')
    .join(' ');
  const haystack =
    `${server.name} ${server.id} ${server.transport} ${server.url ?? ''} ${server.command ?? ''} ${extra}`.toLowerCase();
  return searchQuery
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
};

export const useMcpSectionLogic = ({ settings, onUpdate }: UseMcpSectionLogicProps) => {
  const { t } = useI18n();
  const setStatus = useMcpStatusStore((state) => state.setStatus);
  const servers = useMemo(() => settings.mcpServers ?? [], [settings.mcpServers]);

  const [filter, setFilter] = useState<ServerFilter>('all');
  const [search, setSearch] = useState('');
  const [schemaToolNames, setSchemaToolNames] = useState<Set<string>>(new Set());
  const [pendingTrustTarget, setPendingTrustTarget] = useState<{
    server: McpServerConfig;
    index: number;
    cardKey: string;
  } | null>(null);
  const [showMarketplaces, setShowMarketplaces] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(() => new Set());

  const toggleCardExpanded = useCallback((key: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const expandCard = useCallback((key: string) => {
    setExpandedCards((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }, []);

  const deferredSearch = useDeferredValue(search);
  const [sortOrder, setSortOrder] = useState<string[]>(() => servers.map((server) => server.id));
  const serverIdsKey = servers.map((server) => server.id).join(',');

  useEffect(() => {
    setSortOrder((prev) => {
      const ids = servers.map((server) => server.id);
      const next = ids.filter((id) => !prev.includes(id)).concat(prev.filter((id) => ids.includes(id)));
      return ids.length === prev.length && ids.every((id, index) => id === prev[index]) ? prev : next;
    });
  }, [serverIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps -- realign only when the server id set changes

  const filtered = servers.filter((server) => matchesFilter(filter, server) && matchKeywords(deferredSearch, server));
  const filteredAndSorted = [...filtered].sort((a, b) => sortOrder.indexOf(a.id) - sortOrder.indexOf(b.id));

  const disabledVirtualServerIds = useVirtualMcpStore((state) => state.disabledServerIds);
  const setVirtualServerEnabled = useVirtualMcpStore((state) => state.setServerEnabled);
  const virtualServers = getVirtualMcpServers();

  const isVirtualServerEnabled = useCallback(
    (id: string) => !disabledVirtualServerIds.includes(id),
    [disabledVirtualServerIds],
  );

  const filterVirtualServer = useCallback(
    (virtualServer: VirtualMcpServer): boolean => {
      const isEnabled = isVirtualServerEnabled(virtualServer.id);
      if (filter === 'enabled' && !isEnabled) return false;
      if (filter === 'disabled' && isEnabled) return false;
      if (filter === 'http' || filter === 'sse') return false;
      if (!deferredSearch.trim()) return true;
      const haystack = `${virtualServer.name} ${virtualServer.id} ${virtualServer.description}`.toLowerCase();
      return deferredSearch
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .every((token) => haystack.includes(token));
    },
    [deferredSearch, filter, isVirtualServerEnabled],
  );

  const filteredVirtualServers = virtualServers.filter(filterVirtualServer);
  const [capabilityStates, setCapabilityStates] = useState<Record<string, CapabilityTestState>>({});
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({});
  const [toolQueries, setToolQueries] = useState<Record<string, string>>({});
  const deferredToolQueries = useDeferredValue(toolQueries);

  const nextCardKeyIdRef = useRef(0);
  const createCardKey = useCallback(() => `mcp-card-${++nextCardKeyIdRef.current}`, []);
  const [cardKeys, setCardKeys] = useState<string[]>(() => servers.map(createCardKey));

  useEffect(() => {
    setCardKeys((prev) => {
      if (prev.length === servers.length) {
        return prev;
      }
      if (servers.length > prev.length) {
        return [...prev, ...Array.from({ length: servers.length - prev.length }, createCardKey)];
      }
      return prev.slice(0, servers.length);
    });
  }, [servers.length, createCardKey]);

  const moveServer = useCallback(
    (id: string, direction: -1 | 1) => {
      const currentIndex = sortOrder.indexOf(id);
      const next = [...sortOrder];
      const targetIndex = currentIndex + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return;
      [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
      setSortOrder(next);
      const reordered = next.map((newId) => servers.find((server) => server.id === newId)!).filter(Boolean);
      setCardKeys((prev) => {
        const keyMap = new Map<McpServerConfig, string>();
        servers.forEach((server, index) => {
          if (prev[index]) keyMap.set(server, prev[index]);
        });
        return reordered.map((server) => keyMap.get(server) ?? createCardKey());
      });
      onUpdate('mcpServers', reordered);
    },
    [sortOrder, servers, createCardKey, onUpdate],
  );

  const updateServers = useCallback(
    (nextServers: McpServerConfig[]) => {
      onUpdate('mcpServers', nextServers);
    },
    [onUpdate],
  );

  const updateServer = useCallback(
    (serverIndex: number, updates: Partial<McpServerConfig>) => {
      updateServers(servers.map((server, index) => (index === serverIndex ? { ...server, ...updates } : server)));
    },
    [servers, updateServers],
  );

  const removeServer = useCallback(
    (serverIndex: number) => {
      const removedCardKey = cardKeys[serverIndex];
      updateServers(servers.filter((_, index) => index !== serverIndex));
      setCardKeys((keys) => keys.filter((_, index) => index !== serverIndex));
      if (removedCardKey !== undefined) {
        setExpandedCards((prev) => {
          if (!prev.has(removedCardKey)) {
            return prev;
          }
          const next = new Set(prev);
          next.delete(removedCardKey);
          return next;
        });
        setCapabilityStates((prev) => {
          if (!(removedCardKey in prev)) {
            return prev;
          }
          const next = { ...prev };
          delete next[removedCardKey];
          return next;
        });
      }
    },
    [cardKeys, servers, updateServers],
  );

  const addServer = useCallback(() => {
    const key = createCardKey();
    updateServers([...servers, createMcpServer(t('settingsMcpNewServer'))]);
    setCardKeys((keys) => [...keys, key]);
    expandCard(key);
  }, [createCardKey, expandCard, servers, t, updateServers]);

  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const importErrorFromCode = useCallback(
    (error: unknown): string => {
      const code = error instanceof McpImportError ? error.code : null;
      if (code === 'empty') return t('settingsMcpImportEmptyJson');
      if (code === 'notObject') return t('settingsMcpImportNotObject');
      return t('settingsMcpImportUnrecognized');
    },
    [t],
  );

  const parseJsonToServers = useCallback(
    (text: string): McpServerConfig[] => {
      try {
        return parseImportJson(text);
      } catch (error) {
        if (error instanceof McpImportError) throw new Error(importErrorFromCode(error), { cause: error });
        throw error;
      }
    },
    [importErrorFromCode],
  );

  const handleImportJson = useCallback(() => {
    try {
      const imported = parseJsonToServers(importJson);
      if (imported.length === 0) throw new Error(t('settingsMcpImportNoneParsed'));
      const deduped = dedupeServersById(
        imported,
        servers.map((server) => server.id),
      );
      const newKeys = deduped.map(() => createCardKey());
      updateServers([...servers, ...deduped]);
      setCardKeys((keys) => [...keys, ...newKeys]);
      if (newKeys[0] !== undefined) {
        expandCard(newKeys[0]);
      }
      setImportJson('');
      setImportError(null);
      setShowImport(false);
    } catch (caughtError) {
      setImportError(getErrorMessage(caughtError));
    }
  }, [createCardKey, expandCard, importJson, parseJsonToServers, servers, t, updateServers]);

  const testServerCapabilities = useCallback(
    async (server: McpServerConfig, cardKey: string) => {
      setCapabilityStates((prev) => ({ ...prev, [cardKey]: { status: 'loading' } }));

      try {
        const capabilities = await fetchMcpServerCapabilities({ ...server, enabled: true });
        const derived = deriveStatus(capabilities, null, true);
        setStatus(server.id, { state: derived.state, lastError: undefined, version: derived.version });
        setCapabilityStates((prev) => ({ ...prev, [cardKey]: { status: 'success', capabilities } }));
      } catch (error) {
        const message = getErrorMessage(error);
        const derived = deriveStatus(null, message, server.enabled);
        setStatus(server.id, { state: derived.state, lastError: derived.lastError });
        setCapabilityStates((prev) => ({
          ...prev,
          [cardKey]: {
            status: 'error',
            error: message,
          },
        }));
      }
    },
    [setStatus],
  );

  const enableServerWithProbe = useCallback(
    (serverIndex: number, cardKey: string) => {
      const target = servers[serverIndex];
      if (!target) return;
      const next = { ...target, enabled: true, ...(target.isTrusted === undefined ? { isTrusted: true } : {}) };
      updateServers(servers.map((server, index) => (index === serverIndex ? next : server)));
      void testServerCapabilities(next as McpServerConfig, cardKey);
    },
    [servers, testServerCapabilities, updateServers],
  );

  const handleToggleServerEnabled = useCallback(
    (server: McpServerConfig, index: number, cardKey: string, enabled: boolean) => {
      if (enabled && server.isTrusted === false) {
        setPendingTrustTarget({ server, index, cardKey });
        return;
      }
      if (enabled) {
        enableServerWithProbe(index, cardKey);
        return;
      }
      updateServer(index, { enabled });
    },
    [enableServerWithProbe, updateServer],
  );

  const handleConfirmTrust = useCallback(() => {
    if (!pendingTrustTarget) return;
    const { index, cardKey } = pendingTrustTarget;
    setPendingTrustTarget(null);
    const target = servers[index];
    if (!target) return;
    const next = { ...target, enabled: true, isTrusted: true };
    updateServer(index, next);
    void testServerCapabilities(next as McpServerConfig, cardKey);
  }, [pendingTrustTarget, servers, testServerCapabilities, updateServer]);

  const handleCancelTrust = useCallback(() => {
    setPendingTrustTarget(null);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilter('all');
    setSearch('');
  }, []);

  const handleTabChange = useCallback((cardKey: string, tab: string) => {
    setActiveTabs((prev) => ({ ...prev, [cardKey]: tab }));
  }, []);

  const handleToolQueryChange = useCallback((cardKey: string, query: string) => {
    setToolQueries((prev) => ({ ...prev, [cardKey]: query }));
  }, []);

  const handleToggleSchemaTool = useCallback((toolName: string) => {
    setSchemaToolNames((prev) => {
      const next = new Set(prev);
      if (next.has(toolName)) {
        next.delete(toolName);
      } else {
        next.add(toolName);
      }
      return next;
    });
  }, []);

  return {
    t,
    servers,
    filter,
    setFilter,
    search,
    setSearch,
    filteredAndSorted,
    sortOrder,
    cardKeys,
    expandedCards,
    toggleCardExpanded,
    capabilityStates,
    activeTabs,
    toolQueries,
    deferredToolQueries,
    schemaToolNames,
    pendingTrustTarget,
    showMarketplaces,
    setShowMarketplaces,
    showImport,
    setShowImport,
    importJson,
    setImportJson,
    importError,
    setImportError,
    handleImportJson,
    filteredVirtualServers,
    isVirtualServerEnabled,
    setVirtualServerEnabled,
    addServer,
    removeServer,
    updateServer,
    moveServer,
    testServerCapabilities,
    handleToggleServerEnabled,
    handleConfirmTrust,
    handleCancelTrust,
    handleClearFilters,
    handleTabChange,
    handleToolQueryChange,
    handleToggleSchemaTool,
  };
};

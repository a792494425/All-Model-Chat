import React, { useCallback, useDeferredValue, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '@/utils/errorMessage';
import { Check, ChevronDown, ChevronRight, ChevronUp, Copy, ExternalLink, Plus, RefreshCw, SearchX, Server, ShieldAlert, ShieldCheck, Store, Trash2 } from 'lucide-react';
import type { AppSettings, McpServerAuthType, McpServerConfig, McpServerTransport } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { Toggle } from '@/components/shared/Toggle';
import { Select } from '@/components/shared/Select';
import { SETTINGS_OUTLINE_BUTTON_CLASS, SMALL_ICON_DANGER_BUTTON_CLASS } from '@/constants/buttonClasses';
import { SETTINGS_SECTION_CARD_CLASS, SETTINGS_SECTION_LABEL_CLASS } from '@/constants/designTokens';
import { SETTINGS_INPUT_CLASS } from '@/constants/formClasses';
import { fetchMcpServerCapabilities, type McpServerCapabilities } from '@/services/api/mcpApi';
import { McpImportError, dedupeServersById, parseImportJson } from '@/features/mcp/importMcpServers';
import { interpolate } from '@/i18n/interpolate';
import { useMcpStatusStore } from '@/stores/mcpStatusStore';
import { deriveStatus } from '@/features/mcp/mcpStatus';
import { McpLogsTab } from './McpLogsTab';
import { McpPromptsTab } from './McpPromptsTab';
import { McpResourcesTab } from './McpResourcesTab';
import { McpToolSchemaView } from './mcp/McpToolSchemaView';

interface McpSectionProps {
  settings: AppSettings;
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const inputBaseClasses =
  'w-full rounded-lg border p-2.5 text-sm transition-all duration-200 focus:ring-2 focus:ring-offset-0';

/** Small uppercase heading that partitions the expanded server form into scannable groups. */
const SettingsGroupLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)]">
    {children}
  </div>
);

/** Curated external registries (pure links, mirroring Cherry Studio's market grid). */
const MCP_MARKETPLACES = [
  { name: 'mcp.so', url: 'https://mcp.so/' },
  { name: 'smithery.ai', url: 'https://smithery.ai/' },
  { name: 'glama.ai', url: 'https://glama.ai/mcp/servers' },
  { name: 'PulseMCP', url: 'https://pulsemcp.com/' },
  { name: 'ModelScope', url: 'https://www.modelscope.cn/mcp' },
  { name: 'Higress', url: 'https://mcp.higress.ai/' },
  { name: 'MCP World', url: 'https://www.mcpworld.com' },
  { name: 'Official Registry', url: 'https://github.com/modelcontextprotocol/servers' },
];

type CapabilityTestState =
  | { status: 'loading' }
  | { status: 'success'; capabilities: McpServerCapabilities }
  | { status: 'error'; error: string };

const createMcpServer = (name: string): McpServerConfig => ({
  id: `mcp-${Date.now()}`,
  name,
  enabled: false,
  transport: 'stdio',
  command: '',
  args: [],
  env: {},
});

const formatLines = (items: string[] | undefined): string => (items ?? []).join('\n');

const parseLines = (value: string): string[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const formatRecord = (record: Record<string, string> | undefined): string =>
  Object.entries(record ?? {})
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

const parseRecord = (value: string): Record<string, string> => {
  const entries = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line): Array<[string, string]> => {
      const separatorIndex = line.indexOf('=');
      if (separatorIndex <= 0) {
        return [];
      }

      const key = line.slice(0, separatorIndex).trim();
      const recordValue = line.slice(separatorIndex + 1).trim();
      return key ? [[key, recordValue]] : [];
    });

  return Object.fromEntries(entries);
};

export const McpSection: React.FC<McpSectionProps> = ({ settings, onUpdate }) => {
  const { t } = useI18n();
  const states = useMcpStatusStore((s) => s.states);
  const setStatus = useMcpStatusStore((s) => s.setStatus);
  const servers = settings.mcpServers ?? [];
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled' | 'http' | 'sse' | 'stdio'>('all');
  const [search, setSearch] = useState('');
  const [schemaToolNames, setSchemaToolNames] = useState<Set<string>>(new Set());
  const [pendingTrustIndex, setPendingTrustIndex] = useState<number | null>(null);
  const [showMarketplaces, setShowMarketplaces] = useState(false);
  // Server cards collapse to a one-line summary by default; editing and the
  // capability tabs live behind the expand chevron to keep the list scannable.
  const [expandedCards, setExpandedCards] = useState<Set<string>>(() => new Set());
  const [copiedCardKey, setCopiedCardKey] = useState<string | null>(null);
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
  const [sortOrder, setSortOrder] = useState<string[]>(() => servers.map((s) => s.id));
  const serverIdsKey = servers.map((s) => s.id).join(',');
  useEffect(() => {
    setSortOrder((prev) => {
      const ids = servers.map((s) => s.id);
      const next = ids.filter((id) => !prev.includes(id)).concat(prev.filter((id) => ids.includes(id)));
      return ids.length === prev.length && ids.every((id, i) => id === prev[i]) ? prev : next;
    });
  }, [serverIdsKey]);
  const matchKeywords = (q: string, s: McpServerConfig) => {
    if (!q.trim()) return true;
    const sExtra = s as McpServerConfig & { description?: unknown; provider?: unknown; tags?: unknown };
    const extra = [sExtra.description, sExtra.provider, sExtra.tags]
      .flat()
      .filter((v): v is string => typeof v === 'string')
      .join(' ');
    const hay = `${s.name} ${s.id} ${s.transport} ${s.url ?? ''} ${s.command ?? ''} ${extra}`.toLowerCase();
    return q
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .every((tok) => hay.includes(tok));
  };
  const filtered = servers.filter((s) => {
    if (filter === 'enabled' && !s.enabled) return false;
    if (filter === 'disabled' && s.enabled) return false;
    if (filter === 'http' && s.transport !== 'http') return false;
    if (filter === 'sse' && s.transport !== 'sse') return false;
    if (filter === 'stdio' && s.transport !== 'stdio') return false;
    return matchKeywords(deferredSearch, s);
  });
  const filteredAndSorted = [...filtered].sort((a, b) => sortOrder.indexOf(a.id) - sortOrder.indexOf(b.id));
  const moveServer = (id: string, dir: -1 | 1) => {
    const idx = sortOrder.indexOf(id);
    const next = [...sortOrder];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setSortOrder(next);
    const reordered = next.map((nid) => servers.find((s) => s.id === nid)!).filter(Boolean);
    onUpdate('mcpServers', reordered);
  };
  const [capabilityStates, setCapabilityStates] = useState<Record<string, CapabilityTestState>>({});
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({});
  const [toolQueries, setToolQueries] = useState<Record<string, string>>({});
  const deferredToolQueries = useDeferredValue(toolQueries);

  // Card identities must stay stable across edits: the server id is
  // user-editable on every keystroke and indexes shift when a server is
  // removed, so neither can back React keys or capability test state.
  const nextCardKeyIdRef = useRef(0);
  const createCardKey = useCallback(() => `mcp-card-${++nextCardKeyIdRef.current}`, []);
  const [cardKeys, setCardKeys] = useState<string[]>(() => servers.map(createCardKey));

  useEffect(() => {
    setCardKeys((prev) => {
      if (prev.length === servers.length) {
        return prev;
      }
      // Servers were replaced externally (import/reset): realign by position.
      if (servers.length > prev.length) {
        return [...prev, ...Array.from({ length: servers.length - prev.length }, createCardKey)];
      }
      return prev.slice(0, servers.length);
    });
  }, [servers.length, createCardKey]);

  const updateServers = (nextServers: McpServerConfig[]) => {
    onUpdate('mcpServers', nextServers);
  };

  const updateServer = (serverIndex: number, updates: Partial<McpServerConfig>) => {
    updateServers(servers.map((server, index) => (index === serverIndex ? { ...server, ...updates } : server)));
  };

  const removeServer = (serverIndex: number) => {
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
  };

  const addServer = () => {
    const key = createCardKey();
    updateServers([...servers, createMcpServer(t('settingsMcpNewServer'))]);
    setCardKeys((keys) => [...keys, key]);
    // New servers expand immediately so the user lands in the edit form.
    expandCard(key);
  };

  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const importErrorFromCode = (error: unknown): string => {
    const code = error instanceof McpImportError ? error.code : null;
    if (code === 'empty') return t('settingsMcpImportEmptyJson');
    if (code === 'notObject') return t('settingsMcpImportNotObject');
    return t('settingsMcpImportUnrecognized');
  };

  const parseJsonToServers = (text: string): McpServerConfig[] => {
    try {
      return parseImportJson(text);
    } catch (error) {
      if (error instanceof McpImportError) throw new Error(importErrorFromCode(error));
      throw error;
    }
  };

  const handleImportJson = () => {
    try {
      const imported = parseJsonToServers(importJson);
      if (imported.length === 0) throw new Error(t('settingsMcpImportNoneParsed'));
      const deduped = dedupeServersById(
        imported,
        servers.map((s) => s.id),
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
      // Imported servers arrive disabled by default; the trust dialog fires
      // when the user enables them, which then auto-probes capabilities.
    } catch (importError) {
      setImportError(getErrorMessage(importError));
    }
  };

  const handleImportBrowserBridge = () => {
    const preset: McpServerConfig = {
      id: 'browser-control-bridge',
      name: 'Browser Control Bridge',
      enabled: true,
      transport: 'http',
      url: 'http://host.docker.internal:38976/mcp',
      headers: {},
      auth: { type: 'none' },
    };
    if (servers.some((s) => s.id === preset.id || s.url === preset.url)) {
      setImportError(t('settingsMcpImportDuplicate'));
      return;
    }
    updateServers([...servers, preset]);
    const key = createCardKey();
    setCardKeys((keys) => [...keys, key]);
    expandCard(key);
    setImportError(null);
  };

  const handleTransportChange = (serverIndex: number, server: McpServerConfig, transport: McpServerTransport) => {
    if (transport === 'stdio') {
      updateServer(serverIndex, {
        transport,
        command: server.command ?? '',
        args: server.args ?? [],
        env: server.env ?? {},
      });
      return;
    }

    // http | sse share URL/auth fields
    updateServer(serverIndex, {
      transport,
      url: server.url ?? '',
      headers: server.headers ?? {},
      auth: server.auth ?? { type: 'none' },
    });
  };

  const handleAuthTypeChange = (serverIndex: number, authType: McpServerAuthType) => {
    updateServer(serverIndex, {
      auth: authType === 'bearer' ? { type: 'bearer' } : { type: authType },
    });
  };

  const testServerCapabilities = async (server: McpServerConfig, cardKey: string) => {
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
  };

  return (
    <div className="space-y-4" data-settings-item="mcp-root">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1">
          <h3 className="text-base font-semibold text-[var(--theme-text-primary)]">{t('settingsMcpTitle')}</h3>
          <p className="text-sm leading-relaxed text-[var(--theme-text-secondary)]">{t('settingsMcpDescription')}</p>
        </div>
        <button
          type="button"
          onClick={addServer}
          className={`${SETTINGS_OUTLINE_BUTTON_CLASS} shrink-0 whitespace-nowrap`}
        >
          <Plus size={14} strokeWidth={1.7} />
          {t('settingsMcpAddServer')}
        </button>
      </div>

      <div className={`${SETTINGS_SECTION_CARD_CLASS} space-y-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleImportBrowserBridge}
            className={`${SETTINGS_OUTLINE_BUTTON_CLASS} bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] hover:opacity-90`}
          >
            {t('settingsMcpImportBrowserBridge')}
          </button>
          <button
            type="button"
            onClick={() => setShowImport((v) => !v)}
            aria-expanded={showImport}
            title={t('settingsMcpImportHint')}
            className={`${SETTINGS_OUTLINE_BUTTON_CLASS} ${showImport ? 'bg-[var(--theme-bg-tertiary)]' : ''}`}
          >
            {t('settingsMcpImportJson')}
            {showImport ? (
              <ChevronUp size={14} strokeWidth={1.7} className="text-[var(--theme-text-tertiary)]" aria-hidden />
            ) : (
              <ChevronDown size={14} strokeWidth={1.7} className="text-[var(--theme-text-tertiary)]" aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowMarketplaces((v) => !v)}
            className={SETTINGS_OUTLINE_BUTTON_CLASS}
            aria-expanded={showMarketplaces}
          >
            <Store size={13} strokeWidth={1.7} />
            {t('settingsMcpMarketplaces')}
          </button>
        </div>
        {showImport && (
          <div className="space-y-2">
            <textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder={`{\n  "mcpServers": {\n    "browser-control-bridge": { "url": "http://host.docker.internal:38976/mcp" }\n  }\n}`}
              className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS} min-h-[140px] resize-y font-mono text-xs`}
              spellCheck={false}
            />
            {importError && (
              <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-600">{importError}</div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={handleImportJson} className={SETTINGS_OUTLINE_BUTTON_CLASS}>
                {t('settingsMcpImportConfirm')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowImport(false);
                  setImportError(null);
                }}
                className={`${SETTINGS_OUTLINE_BUTTON_CLASS} opacity-60`}
              >
                {t('settingsMcpImportCancel')}
              </button>
            </div>
          </div>
        )}
        {showMarketplaces && (
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3" data-testid="mcp-marketplace-grid">
            {MCP_MARKETPLACES.map((market) => (
              <a
                key={market.url}
                href={market.url}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--theme-border-secondary)] px-2.5 py-1.5 text-xs hover:bg-[var(--theme-bg-tertiary)]"
              >
                <span className="truncate">{market.name}</span>
                <ExternalLink size={12} strokeWidth={1.7} className="shrink-0 text-[var(--theme-text-tertiary)]" />
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Select
          id="mcp-filter-select"
          label={t('settingsMcpFilterAria')}
          hideLabel
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          wrapperClassName="w-36 shrink-0 sm:w-40"
        >
          <option value="all">{t('settingsMcpFilterAll')}</option>
          <option value="enabled">{t('settingsMcpFilterEnabled')}</option>
          <option value="disabled">{t('settingsMcpFilterDisabled')}</option>
          <option value="http">{t('settingsMcpFilterHttp')}</option>
          <option value="sse">{t('settingsMcpFilterSse')}</option>
          <option value="stdio">{t('settingsMcpFilterStdio')}</option>
        </Select>
        <input
          placeholder={t('settingsMcpSearchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS}`}
        />
      </div>

      {servers.length === 0 ? (
        <div
          className={`${SETTINGS_SECTION_CARD_CLASS} flex flex-col items-center justify-center gap-2 border-dashed py-10 text-center text-sm text-[var(--theme-text-secondary)]`}
        >
          <Server size={28} strokeWidth={1.5} className="opacity-40" aria-hidden />
          <span>{t('settingsMcpEmpty')}</span>
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <div
          className={`${SETTINGS_SECTION_CARD_CLASS} flex flex-col items-center justify-center gap-2 border-dashed py-10 text-center text-sm text-[var(--theme-text-secondary)]`}
        >
          <SearchX size={28} strokeWidth={1.5} className="opacity-40" aria-hidden />
          <span>{t('settingsMcpEmptyFiltered')}</span>
          <button
            type="button"
            onClick={() => {
              setFilter('all');
              setSearch('');
            }}
            className={`${SETTINGS_OUTLINE_BUTTON_CLASS} mt-1`}
          >
            {t('settingsMcpClearFilters')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSorted.map((server) => {
            const origIndex = servers.indexOf(server);
            const fallbackIndex = origIndex !== -1 ? origIndex : 0;
            const stateKey =
              origIndex !== -1
                ? (cardKeys[origIndex] ?? `mcp-card-fallback-${origIndex}`)
                : `mcp-card-fallback-${server.id}`;
            const index = origIndex !== -1 ? origIndex : fallbackIndex;
            const capabilityState = capabilityStates[stateKey];
            const capabilities = capabilityState?.status === 'success' ? capabilityState.capabilities : undefined;
            const capabilityErrors = capabilities?.errors ?? [];
            const resourceCount = (capabilities?.resources.length ?? 0) + (capabilities?.resourceTemplates.length ?? 0);
            const storeStatus = states[server.id];
            const status = (storeStatus ?? {
              state: server.enabled ? 'connecting' : 'disabled',
              lastError: undefined,
              lastCheckedAt: 0,
            }) as typeof storeStatus & {
              state: 'connected' | 'connecting' | 'error' | 'disabled';
              lastError?: string;
              version?: string;
            };
            const dotClass =
              status.state === 'connected'
                ? 'bg-emerald-500'
                : status.state === 'error'
                  ? 'bg-red-500'
                  : status.state === 'connecting'
                    ? 'bg-amber-500'
                    : 'bg-zinc-400';
            const pillClass =
              status.state === 'connected'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : status.state === 'error'
                  ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                  : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)]';
            const pillLabel =
              status.state === 'connected'
                ? t('settingsMcpStatusConnected')
                : status.state === 'error'
                  ? t('settingsMcpStatusError')
                  : status.state === 'connecting'
                    ? t('settingsMcpStatusConnecting')
                    : t('settingsMcpStatusDisabled');
            const typeLabel = server.transport === 'stdio' ? 'STDIO' : server.transport === 'sse' ? 'SSE' : 'HTTP';
            const typeBadgeClass =
              server.transport === 'stdio'
                ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)]'
                : server.transport === 'sse'
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                  : 'bg-sky-500/10 text-sky-700 dark:text-sky-400';
            const isExpanded = expandedCards.has(stateKey);
            const summaryText =
              server.transport === 'stdio'
                ? [server.command ?? '', ...(server.args ?? [])].filter(Boolean).join(' ')
                : (server.url ?? '');

            return (
              <section
                key={stateKey}
                className={SETTINGS_SECTION_CARD_CLASS}
                data-settings-item={`mcp-server-${index}`}
              >
                <div
                  data-mcp-server-card-header
                  className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <button
                    type="button"
                    data-testid={`mcp-card-expand-${index}`}
                    aria-expanded={isExpanded}
                    title={t('settingsMcpToggleExpand')}
                    onClick={() => toggleCardExpanded(stateKey)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-text-link)]"
                  >
                    {isExpanded ? (
                      <ChevronDown
                        size={15}
                        strokeWidth={1.7}
                        className="shrink-0 text-[var(--theme-text-tertiary)]"
                        aria-hidden
                      />
                    ) : (
                      <ChevronRight
                        size={15}
                        strokeWidth={1.7}
                        className="shrink-0 text-[var(--theme-text-tertiary)]"
                        aria-hidden
                      />
                    )}
                    <span
                      data-testid={`mcp-status-dot-${server.id}`}
                      data-state={status.state}
                      className={`inline-block h-2 w-2 shrink-0 rounded-full ${dotClass}`}
                      title={[pillLabel, status.lastError].filter(Boolean).join(' — ')}
                    />
                    <span className="min-w-0 truncate text-sm font-medium text-[var(--theme-text-primary)]">
                      {server.name || interpolate(t('settingsMcpUnnamedServer'), { index: index + 1 })}
                    </span>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${typeBadgeClass}`}>
                      {typeLabel}
                    </span>
                    {status.state !== 'disabled' && (
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-medium ${pillClass}`}>
                        {pillLabel}
                      </span>
                    )}
                    {status.version ? (
                      <span className="shrink-0 text-[11px] text-[var(--theme-text-tertiary)]">v{status.version}</span>
                    ) : null}
                  </button>
                  <div
                    data-mcp-server-card-actions
                    data-testid={`mcp-card-actions-${index}`}
                    className="flex shrink-0 items-center gap-2 self-start sm:self-auto"
                  >
                    <Toggle
                      checked={server.enabled}
                      onChange={(enabled) => {
                        if (enabled && server.isTrusted === false) {
                          setPendingTrustIndex(index);
                          return;
                        }
                        if (enabled) {
                          const next = { ...server, enabled: true, ...(server.isTrusted === undefined ? { isTrusted: true } : {}) };
                          updateServer(index, next);
                          void testServerCapabilities(next as McpServerConfig, stateKey);
                          return;
                        }
                        updateServer(index, { enabled });
                      }}
                      ariaLabel={server.name || interpolate(t('settingsMcpUnnamedServer'), { index: index + 1 })}
                    />
                    <button
                      type="button"
                      onClick={() => removeServer(index)}
                      className={SMALL_ICON_DANGER_BUTTON_CLASS}
                      aria-label={t('settingsMcpRemoveServer')}
                    >
                      <Trash2 size={15} strokeWidth={1.7} />
                    </button>
                  </div>
                </div>

                {!isExpanded && (
                  <div className="mt-1.5 flex min-w-0 items-center gap-2 pl-6 text-xs text-[var(--theme-text-tertiary)]">
                    <span className="min-w-0 truncate font-mono">{summaryText}</span>
                    {status.state === 'error' && status.lastError ? (
                      <span className="ml-auto min-w-0 truncate text-[var(--theme-text-danger)]">
                        {status.lastError}
                      </span>
                    ) : null}
                  </div>
                )}

                {isExpanded && (
                  <div
                    className="mt-4 space-y-5"
                    data-mcp-server-card-detail
                    data-testid={`mcp-card-detail-${index}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        aria-label={`${t('settingsMcpMoveUp')} - ${server.name || interpolate(t('settingsMcpUnnamedServer'), { index: index + 1 })}`}
                        onClick={() => moveServer(server.id, -1)}
                        className={SETTINGS_OUTLINE_BUTTON_CLASS}
                      >
                        {t('settingsMcpMoveUp')}
                      </button>
                      <button
                        type="button"
                        aria-label={`${t('settingsMcpMoveDown')} - ${server.name || interpolate(t('settingsMcpUnnamedServer'), { index: index + 1 })}`}
                        onClick={() => moveServer(server.id, 1)}
                        className={SETTINGS_OUTLINE_BUTTON_CLASS}
                      >
                        {t('settingsMcpMoveDown')}
                      </button>
                      <button
                        type="button"
                        onClick={() => testServerCapabilities(server, stateKey)}
                        disabled={capabilityState?.status === 'loading'}
                        className={`${SETTINGS_OUTLINE_BUTTON_CLASS} shrink-0 whitespace-nowrap`}
                      >
                        <RefreshCw
                          size={13}
                          strokeWidth={1.7}
                          className={capabilityState?.status === 'loading' ? 'animate-spin' : undefined}
                        />
                        {capabilityState?.status === 'loading' ? t('settingsMcpTesting') : t('settingsMcpTestServer')}
                      </button>
                    </div>

                    <div className="space-y-3">
                      <SettingsGroupLabel>{t('settingsMcpGroupConnection')}</SettingsGroupLabel>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2">
                          <span className={SETTINGS_SECTION_LABEL_CLASS}>{t('settingsMcpServerName')}</span>
                          <input
                            value={server.name}
                            onChange={(event) => updateServer(index, { name: event.target.value })}
                            className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS}`}
                          />
                        </label>

                        <div className="space-y-2" data-settings-item={index === 0 ? 'mcp-transport' : undefined}>
                          <span className={SETTINGS_SECTION_LABEL_CLASS}>{t('settingsMcpTransport')}</span>
                          <Select
                            label={t('settingsMcpTransport')}
                            hideLabel
                            value={server.transport}
                            onChange={(event) =>
                              handleTransportChange(index, server, event.target.value as McpServerTransport)
                            }
                          >
                            <option value="stdio">{t('settingsMcpTransportStdio')}</option>
                            <option value="http">{t('settingsMcpTransportHttp')}</option>
                            <option value="sse">{t('settingsMcpTransportSse')}</option>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        {server.transport === 'stdio' ? (
                          <label className="space-y-2">
                            <span className={SETTINGS_SECTION_LABEL_CLASS}>{t('settingsMcpCommand')}</span>
                            <input
                              value={server.command ?? ''}
                              onChange={(event) => updateServer(index, { command: event.target.value })}
                              className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS} font-mono`}
                              placeholder="npx"
                            />
                          </label>
                        ) : (
                          <label className="space-y-2 sm:col-span-2">
                            <span className={SETTINGS_SECTION_LABEL_CLASS}>{t('settingsMcpUrl')}</span>
                            <input
                              value={server.url ?? ''}
                              onChange={(event) => updateServer(index, { url: event.target.value })}
                              className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS} font-mono`}
                              placeholder={server.transport === 'sse' ? 'https://example.com/sse' : 'https://example.com/mcp'}
                            />
                          </label>
                        )}
                      </div>

                      {server.transport === 'stdio' && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="space-y-2">
                            <span className={SETTINGS_SECTION_LABEL_CLASS}>{t('settingsMcpArgs')}</span>
                            <textarea
                              value={formatLines(server.args)}
                              onChange={(event) => updateServer(index, { args: parseLines(event.target.value) })}
                              className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS} min-h-[96px] resize-y font-mono`}
                              placeholder="-y&#10;@modelcontextprotocol/server-filesystem&#10;/Users/me"
                              spellCheck={false}
                            />
                          </label>
                          <label className="space-y-2">
                            <span className={SETTINGS_SECTION_LABEL_CLASS}>{t('settingsMcpEnv')}</span>
                            <textarea
                              value={formatRecord(server.env)}
                              onChange={(event) => updateServer(index, { env: parseRecord(event.target.value) })}
                              className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS} min-h-[96px] resize-y font-mono`}
                              placeholder="TOKEN=value"
                              spellCheck={false}
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    {server.transport !== 'stdio' && (
                      <div className="space-y-3">
                        <SettingsGroupLabel>{t('settingsMcpGroupAuth')}</SettingsGroupLabel>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <span className={SETTINGS_SECTION_LABEL_CLASS}>{t('settingsMcpAuth')}</span>
                            <Select
                              label={t('settingsMcpAuth')}
                              hideLabel
                              value={server.auth?.type ?? 'none'}
                              onChange={(event) => handleAuthTypeChange(index, event.target.value as McpServerAuthType)}
                            >
                              <option value="none">{t('settingsMcpAuthNone')}</option>
                              <option value="bearer">{t('settingsMcpAuthBearer')}</option>
                              <option value="customHeaders">{t('settingsMcpAuthCustomHeaders')}</option>
                            </Select>
                          </div>
                          {server.auth?.type === 'bearer' && (
                            <label className="space-y-2">
                              <span className={SETTINGS_SECTION_LABEL_CLASS}>{t('settingsMcpBearerToken')}</span>
                              <input
                                type="password"
                                value={server.auth.token ?? ''}
                                onChange={(event) =>
                                  updateServer(index, { auth: { type: 'bearer', token: event.target.value } })
                                }
                                className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS} font-mono`}
                                placeholder="mcp_token"
                              />
                            </label>
                          )}
                        </div>
                        <label className="block space-y-2">
                          <span className={SETTINGS_SECTION_LABEL_CLASS}>{t('settingsMcpHeaders')}</span>
                          <textarea
                            value={formatRecord(server.headers)}
                            onChange={(event) => updateServer(index, { headers: parseRecord(event.target.value) })}
                            className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS} min-h-[96px] resize-y font-mono`}
                            placeholder="X-Workspace=docs"
                            spellCheck={false}
                          />
                        </label>
                      </div>
                    )}

                    <div className="space-y-3">
                      <SettingsGroupLabel>{t('settingsMcpGroupAdvanced')}</SettingsGroupLabel>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <span className={SETTINGS_SECTION_LABEL_CLASS}>{t('settingsMcpServerId')}</span>
                          <div className="flex items-center gap-2">
                            <input
                              readOnly
                              value={server.id}
                              aria-label={t('settingsMcpServerId')}
                              className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS} flex-1 font-mono opacity-70`}
                            />
                            <button
                              type="button"
                              data-testid={`mcp-copy-id-${index}`}
                              aria-label={t('settingsMcpCopyId')}
                              title={copiedCardKey === stateKey ? t('settingsMcpIdCopied') : t('settingsMcpCopyId')}
                              onClick={() => {
                                void navigator.clipboard?.writeText(server.id);
                                setCopiedCardKey(stateKey);
                              }}
                              className={SETTINGS_OUTLINE_BUTTON_CLASS}
                            >
                              {copiedCardKey === stateKey ? (
                                <Check size={14} strokeWidth={1.7} />
                              ) : (
                                <Copy size={14} strokeWidth={1.7} />
                              )}
                            </button>
                          </div>
                        </div>
                        <label className="space-y-2">
                          <span className={SETTINGS_SECTION_LABEL_CLASS}>{t('settingsMcpTimeoutLabel')}</span>
                          <input
                            type="number"
                            min={1}
                            max={3600}
                            value={server.timeout ?? ''}
                            onChange={(event) => {
                              const raw = event.target.value === '' ? undefined : Number(event.target.value);
                              updateServer(index, { timeout: raw });
                            }}
                            placeholder="60"
                            className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS}`}
                          />
                        </label>
                      </div>
                      <label className="flex items-center gap-2 pt-1">
                        <Toggle
                          checked={server.longRunning === true}
                          onChange={(v) => updateServer(index, { longRunning: v || undefined })}
                          ariaLabel={t('settingsMcpLongRunning')}
                        />
                        <span className={SETTINGS_SECTION_LABEL_CLASS}>{t('settingsMcpLongRunning')}</span>
                      </label>
                    </div>

                {capabilities && (
                  <div className="rounded-md border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] p-3 text-xs text-[var(--theme-text-secondary)]">
                    <div className="flex flex-wrap gap-3 font-medium">
                      <span>
                        {t('settingsMcpCapabilityTools')} {capabilities.tools.length}
                      </span>
                      <span>
                        {t('settingsMcpCapabilityResources')} {resourceCount}
                      </span>
                      <span>
                        {t('settingsMcpCapabilityPrompts')} {capabilities.prompts.length}
                      </span>
                    </div>
                    {capabilityErrors.length > 0 && (
                      <div className="mt-2 space-y-1 text-[var(--theme-text-danger)]">
                        {capabilityErrors.map((error) => (
                          <div key={`${error.serverId}-${error.error}`}>{error.error}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {capabilityState?.status === 'success' && capabilities && (
                  <>
                    <div className="flex gap-1 border-b border-[var(--theme-border-secondary)]">
                      <button
                        role="tab"
                        aria-selected={(activeTabs[stateKey] ?? 'tools') === 'tools'}
                        onClick={() => setActiveTabs((prev) => ({ ...prev, [stateKey]: 'tools' }))}
                        className={`px-3 py-1.5 text-xs font-medium ${(activeTabs[stateKey] ?? 'tools') === 'tools' ? 'border-b-2 border-[var(--theme-text-accent)] text-[var(--theme-text-primary)]' : 'text-[var(--theme-text-secondary)]'}`}
                      >
                        {t('settingsMcpTabTools')}
                      </button>
                      <button
                        role="tab"
                        aria-selected={activeTabs[stateKey] === 'prompts'}
                        onClick={() => setActiveTabs((prev) => ({ ...prev, [stateKey]: 'prompts' }))}
                        className={`px-3 py-1.5 text-xs font-medium ${activeTabs[stateKey] === 'prompts' ? 'border-b-2 border-[var(--theme-text-accent)] text-[var(--theme-text-primary)]' : 'text-[var(--theme-text-secondary)]'}`}
                      >
                        {t('settingsMcpTabPrompts')}
                      </button>
                      <button
                        role="tab"
                        aria-selected={activeTabs[stateKey] === 'resources'}
                        onClick={() => setActiveTabs((prev) => ({ ...prev, [stateKey]: 'resources' }))}
                        className={`px-3 py-1.5 text-xs font-medium ${activeTabs[stateKey] === 'resources' ? 'border-b-2 border-[var(--theme-text-accent)] text-[var(--theme-text-primary)]' : 'text-[var(--theme-text-secondary)]'}`}
                      >
                        {t('settingsMcpTabResources')}
                      </button>
                      <button
                        role="tab"
                        aria-selected={activeTabs[stateKey] === 'logs'}
                        onClick={() => setActiveTabs((prev) => ({ ...prev, [stateKey]: 'logs' }))}
                        className={`px-3 py-1.5 text-xs font-medium ${activeTabs[stateKey] === 'logs' ? 'border-b-2 border-[var(--theme-text-accent)] text-[var(--theme-text-primary)]' : 'text-[var(--theme-text-secondary)]'}`}
                      >
                        {t('settingsMcpTabLogs')}
                      </button>
                    </div>
                    {(activeTabs[stateKey] ?? 'tools') === 'tools' &&
                      (() => {
                        const toolQuery = toolQueries[stateKey] ?? '';
                        const deferredToolQuery = deferredToolQueries[stateKey] ?? '';
                        const filteredTools = capabilities.tools.filter((tool) => {
                          if (!deferredToolQuery.trim()) return true;
                          const hay = `${tool.name} ${tool.description ?? ''}`.toLowerCase();
                          return hay.includes(deferredToolQuery.toLowerCase());
                        });
                        return (
                          <div className="space-y-2">
                            <input
                              placeholder={t('settingsMcpToolSearchPlaceholder')}
                              value={toolQuery}
                              onChange={(e) => setToolQueries((prev) => ({ ...prev, [stateKey]: e.target.value }))}
                              className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS}`}
                            />
                            <div className="overflow-hidden rounded-lg border border-[var(--theme-border-secondary)]">
                              {filteredTools.length === 0 ? (
                                <div className="px-3 py-6 text-center text-xs text-[var(--theme-text-secondary)]">
                                  {capabilities.tools.length === 0
                                    ? t('settingsMcpEmptyTools')
                                    : t('settingsMcpEmptyFiltered')}
                                </div>
                              ) : (
                                filteredTools.map((tool) => {
                                  const disabled = new Set(server.disabledTools ?? []);
                                  const autoDisabled = new Set(server.disabledAutoApproveTools ?? []);
                                  const isEnabled = !disabled.has(tool.name);
                                  const isAutoApproved = !autoDisabled.has(tool.name);
                                  const toggleTool = (toolName: string, enabled: boolean) => {
                                    const next = enabled
                                      ? (server.disabledTools ?? []).filter((n) => n !== toolName)
                                      : [...(server.disabledTools ?? []), toolName];
                                    updateServer(index, { disabledTools: next.length ? next : undefined });
                                  };
                                  const toggleAutoApprove = (toolName: string, autoApprove: boolean) => {
                                    const next = autoApprove
                                      ? (server.disabledAutoApproveTools ?? []).filter((n) => n !== toolName)
                                      : [...(server.disabledAutoApproveTools ?? []), toolName];
                                    updateServer(index, {
                                      disabledAutoApproveTools: next.length ? next : undefined,
                                    });
                                  };
                                  return (
                                    <div
                                      key={tool.name}
                                      className="border-t border-[var(--theme-border-secondary)] px-3 py-2 first:border-t-0"
                                    >
                                      <div className="grid grid-cols-[1fr_80px_80px] items-center gap-2">
                                        <div className="min-w-0">
                                          <button
                                            type="button"
                                            data-testid={`mcp-tool-schema-toggle-${tool.name}`}
                                            onClick={() =>
                                              setSchemaToolNames((prev) => {
                                                const next = new Set(prev);
                                                if (next.has(tool.name)) {
                                                  next.delete(tool.name);
                                                } else {
                                                  next.add(tool.name);
                                                }
                                                return next;
                                              })
                                            }
                                            className="w-full truncate text-left text-sm text-[var(--theme-text-primary)] hover:text-[var(--theme-text-link)]"
                                            title={t('settingsMcpToggleSchema')}
                                          >
                                            {tool.name}
                                          </button>
                                          <div className="truncate text-xs text-[var(--theme-text-secondary)]">
                                            {tool.description}
                                          </div>
                                        </div>
                                        <Toggle
                                          checked={isEnabled}
                                          onChange={(v) => toggleTool(tool.name, v)}
                                          ariaLabel={`${isEnabled ? 'Disable' : 'Enable'} ${tool.name}`}
                                        />
                                        <button
                                          type="button"
                                          aria-label={`Auto-approve ${tool.name}`}
                                          aria-pressed={isAutoApproved}
                                          disabled={!isEnabled}
                                          onClick={() => toggleAutoApprove(tool.name, !isAutoApproved)}
                                          title={
                                            isAutoApproved
                                              ? t('settingsMcpAutoApproveEnabled')
                                              : t('settingsMcpAutoApproveDisabled')
                                          }
                                          className={`flex items-center justify-center rounded-md p-1.5 transition-colors ${!isEnabled ? 'opacity-40' : isAutoApproved ? 'text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400' : 'text-[var(--theme-text-tertiary)] hover:bg-[var(--theme-bg-tertiary)]'}`}
                                        >
                                          <ShieldCheck size={16} strokeWidth={1.7} />
                                        </button>
                                      </div>
                                      {schemaToolNames.has(tool.name) && tool.inputSchema && (
                                        <McpToolSchemaView inputSchema={tool.inputSchema} />
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    {activeTabs[stateKey] === 'prompts' && (
                      <McpPromptsTab server={server} prompts={capabilities.prompts ?? []} t={t} />
                    )}
                    {activeTabs[stateKey] === 'resources' && (
                      <McpResourcesTab
                        server={server}
                        resources={capabilities.resources ?? []}
                        templates={capabilities.resourceTemplates ?? []}
                        t={t}
                      />
                    )}
                    {activeTabs[stateKey] === 'logs' && <McpLogsTab server={server} t={t} />}
                  </>
                )}
                {capabilityState?.status === 'error' && (
                  <div className="rounded-md border border-[var(--theme-text-danger)]/30 bg-[var(--theme-bg-danger)]/10 p-3 text-xs text-[var(--theme-text-danger)]">
                    {capabilityState.error}
                  </div>
                )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
      {pendingTrustIndex !== null && servers[pendingTrustIndex] && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" data-testid="mcp-trust-backdrop">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('settingsMcpTrustTitle')}
            className="w-full max-w-md rounded-xl border bg-[var(--theme-bg-primary)] shadow-xl"
          >
            <div className="flex items-start gap-3 px-4 pt-4">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">{t('settingsMcpTrustTitle')}</h2>
                <p className="mt-1 text-xs text-[var(--theme-text-secondary)]">{t('settingsMcpTrustBody')}</p>
              </div>
            </div>
            {(() => {
              const trustServer = servers[pendingTrustIndex];
              return (
                <pre className="mx-4 mt-3 max-h-[220px] overflow-auto whitespace-pre-wrap rounded-lg border bg-[var(--theme-bg-secondary)] p-2 text-xs">
                  {JSON.stringify(
                    {
                      id: trustServer.id,
                      transport: trustServer.transport,
                      ...(trustServer.command ? { command: trustServer.command } : {}),
                      ...(trustServer.args?.length ? { args: trustServer.args } : {}),
                      ...(trustServer.url ? { url: trustServer.url } : {}),
                      ...(Object.keys(trustServer.env ?? {}).length
                        ? { envKeys: Object.keys(trustServer.env ?? {}) }
                        : {}),
                      ...(Object.keys(trustServer.headers ?? {}).length
                        ? { headerKeys: Object.keys(trustServer.headers ?? {}) }
                        : {}),
                    },
                    null,
                    2,
                  )}
                </pre>
              );
            })()}
            <div className="flex items-center justify-end gap-2 px-4 py-3">
              <button
                type="button"
                data-testid="mcp-trust-cancel"
                onClick={() => setPendingTrustIndex(null)}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-[var(--theme-bg-tertiary)]"
              >
                {t('settingsMcpCancel')}
              </button>
              <button
                type="button"
                data-testid="mcp-trust-confirm"
                onClick={() => {
                  const index = pendingTrustIndex;
                  setPendingTrustIndex(null);
                  if (index === null) return;
                  const next = { ...servers[index], enabled: true, isTrusted: true };
                  updateServer(index, next);
                  void testServerCapabilities(next as McpServerConfig, cardKeys[index]);
                }}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
              >
                {t('settingsMcpTrustAction')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

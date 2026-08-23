import React, { useCallback, useDeferredValue, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '@/utils/errorMessage';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { AppSettings, McpServerAuthType, McpServerConfig, McpServerTransport } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { Toggle } from '@/components/shared/Toggle';
import { SETTINGS_OUTLINE_BUTTON_CLASS, SMALL_ICON_DANGER_BUTTON_CLASS } from '@/constants/buttonClasses';
import { SETTINGS_SECTION_CARD_CLASS, SETTINGS_SECTION_LABEL_CLASS } from '@/constants/designTokens';
import { SETTINGS_INPUT_CLASS } from '@/constants/formClasses';
import { fetchMcpServerCapabilities, type McpServerCapabilities } from '@/services/api/mcpApi';
import { interpolate } from '@/i18n/interpolate';
import { useMcpStatusStore } from '@/stores/mcpStatusStore';
import { deriveStatus } from '@/features/mcp/mcpStatus';
import { McpLogsTab } from './McpLogsTab';
import { McpPromptsTab } from './McpPromptsTab';
import { McpResourcesTab } from './McpResourcesTab';

interface McpSectionProps {
  settings: AppSettings;
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const inputBaseClasses =
  'w-full rounded-lg border p-2.5 text-sm transition-all duration-200 focus:ring-2 focus:ring-offset-0';

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
  const deferredSearch = useDeferredValue(search);
  const [sortOrder, setSortOrder] = useState<string[]>(() => servers.map((s) => s.id));
  useEffect(() => {
    setSortOrder((prev) => {
      const ids = servers.map((s) => s.id);
      const next = ids.filter((id) => !prev.includes(id)).concat(prev.filter((id) => ids.includes(id)));
      return ids.length === prev.length && ids.every((id, i) => id === prev[i]) ? prev : next;
    });
  }, [servers.map((s) => s.id).join(',')]);
  const matchKeywords = (q: string, s: McpServerConfig) => {
    if (!q.trim()) return true;
    const hay = `${s.name} ${s.id} ${s.transport} ${s.url ?? ''} ${s.command ?? ''}`.toLowerCase();
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
    updateServers([...servers, createMcpServer(t('settingsMcpNewServer'))]);
    setCardKeys((keys) => [...keys, createCardKey()]);
  };

  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const normalizeImportedServer = (raw: Record<string, unknown>, fallbackName?: string): McpServerConfig | null => {
    const url = typeof raw.url === 'string' ? raw.url.trim() : typeof raw.baseUrl === 'string' ? raw.baseUrl.trim() : '';
    const command = typeof raw.command === 'string' ? raw.command.trim() : '';
    if (!url && !command) return null;
    const isStdio = !!command || raw.transport === 'stdio' || raw.type === 'stdio';
    const transport: McpServerTransport = isStdio ? 'stdio' : raw.transport === 'sse' || raw.type === 'sse' ? 'sse' : 'http';
    const idRaw = typeof raw.id === 'string' ? raw.id.trim() : typeof raw.name === 'string' ? raw.name.trim() : '';
    const id = idRaw || `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const name = (typeof raw.name === 'string' && raw.name.trim()) || fallbackName || id;
    if (transport === 'stdio') {
      return {
        id,
        name,
        enabled: raw.enabled !== false,
        transport,
        command: command || (typeof raw.command === 'string' ? raw.command : 'npx'),
        args: Array.isArray(raw.args) ? (raw.args.filter((x) => typeof x === 'string') as string[]) : [],
        env: raw.env && typeof raw.env === 'object' ? (raw.env as Record<string, string>) : {},
      };
    }
    return {
      id,
      name,
      enabled: raw.enabled !== false,
      transport,
      url: url || (typeof raw.url === 'string' ? raw.url : ''),
      headers: raw.headers && typeof raw.headers === 'object' ? (raw.headers as Record<string, string>) : {},
      auth: raw.auth && typeof (raw.auth as Record<string, unknown>).type === 'string' ? (raw.auth as McpServerConfig['auth']) : { type: 'none' },
    };
  };

  const parseImportJson = (text: string): McpServerConfig[] => {
    const stripped = text
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map((line) => line.replace(/^\s*\/\/.*$/, ''))
      .join('\n')
      .trim();
    if (!stripped) throw new Error('请先粘贴 JSON');
    const parsed = JSON.parse(stripped) as unknown;
    if (!parsed || typeof parsed !== 'object') throw new Error('JSON 顶层必须是对象');
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(parsed)) return (parsed as Record<string, unknown>[]).map((r) => normalizeImportedServer(r)).filter(Boolean) as McpServerConfig[];
    if (Array.isArray(obj.servers)) return (obj.servers as Record<string, unknown>[]).map((r) => normalizeImportedServer(r)).filter(Boolean) as McpServerConfig[];
    if (Array.isArray(obj.mcpServers)) return (obj.mcpServers as Record<string, unknown>[]).map((r) => normalizeImportedServer(r)).filter(Boolean) as McpServerConfig[];
    if (obj.mcpServers && typeof obj.mcpServers === 'object' && !Array.isArray(obj.mcpServers)) {
      return Object.entries(obj.mcpServers as Record<string, unknown>).map(([key, val]) =>
        normalizeImportedServer((val as Record<string, unknown>) ?? {}, key),
      ).filter(Boolean) as McpServerConfig[];
    }
    if (obj.url || obj.command || obj.transport || obj.type) {
      const one = normalizeImportedServer(obj);
      return one ? [one] : [];
    }
    throw new Error('无法识别的 JSON 格式，支持 {mcpServers:{name:{url}}} / {mcpServers:[...]} / {servers:[...]} / 单个 {url}');
  };

  const handleImportJson = () => {
    try {
      const imported = parseImportJson(importJson);
      if (imported.length === 0) throw new Error('未解析到任何服务器');
      const existingIds = new Set(servers.map((s) => s.id));
      const deduped = imported.map((s) => {
        let nextId = s.id;
        let n = 2;
        while (existingIds.has(nextId)) {
          nextId = `${s.id}__${n}`;
          n += 1;
        }
        existingIds.add(nextId);
        return nextId === s.id ? s : { ...s, id: nextId };
      });
      updateServers([...servers, ...deduped]);
      setCardKeys((keys) => [...keys, ...deduped.map(() => createCardKey())]);
      setImportJson('');
      setImportError(null);
      setShowImport(false);
    } catch (e) {
      setImportError(getErrorMessage(e));
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
      setImportError('已存在相同 id 或 URL 的服务器');
      return;
    }
    updateServers([...servers, preset]);
    setCardKeys((keys) => [...keys, createCardKey()]);
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
          <button type="button" onClick={handleImportBrowserBridge} className={`${SETTINGS_OUTLINE_BUTTON_CLASS} bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] hover:opacity-90`}>
            一键导入 Browser Bridge
          </button>
          <button
            type="button"
            onClick={() => setShowImport((v) => !v)}
            className={`${SETTINGS_OUTLINE_BUTTON_CLASS} ${showImport ? 'bg-[var(--theme-bg-tertiary)]' : ''}`}
          >
            从 JSON 导入 {showImport ? '▴' : '▾'}
          </button>
          <span className="text-xs text-[var(--theme-text-tertiary)]">支持 Cherry/Claude 的 mcpServers 格式，粘贴即导入</span>
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
            {importError && <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-600">{importError}</div>}
            <div className="flex gap-2">
              <button type="button" onClick={handleImportJson} className={SETTINGS_OUTLINE_BUTTON_CLASS}>
                导入
              </button>
              <button type="button" onClick={() => { setShowImport(false); setImportError(null); }} className={`${SETTINGS_OUTLINE_BUTTON_CLASS} opacity-60`}>
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <select
          aria-label="MCP filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS} w-auto`}
        >
          <option value="all">{t('settingsMcpFilterAll')}</option>
          <option value="enabled">{t('settingsMcpFilterEnabled')}</option>
          <option value="disabled">{t('settingsMcpFilterDisabled')}</option>
          <option value="http">{t('settingsMcpFilterHttp')}</option>
          <option value="sse">{t('settingsMcpFilterSse')}</option>
          <option value="stdio">{t('settingsMcpFilterStdio')}</option>
        </select>
        <input
          placeholder={t('settingsMcpSearchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS}`}
        />
      </div>

      {servers.length === 0 ? (
        <div className={`${SETTINGS_SECTION_CARD_CLASS} border-dashed text-sm text-[var(--theme-text-secondary)]`}>
          {t('settingsMcpEmpty')}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSorted.map((server) => {
            const origIndex = servers.indexOf(server);
            const fallbackIndex = origIndex !== -1 ? origIndex : 0;
            const stateKey = origIndex !== -1 ? (cardKeys[origIndex] ?? `mcp-card-fallback-${origIndex}`) : `mcp-card-fallback-${server.id}`;
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
            }) as typeof storeStatus & { state: 'connected' | 'connecting' | 'error' | 'disabled'; lastError?: string; version?: string };
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
                ? 'bg-emerald-500/10 text-emerald-700'
                : status.state === 'error'
                  ? 'bg-red-500/10 text-red-700'
                  : 'bg-zinc-100 text-zinc-600';
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
                ? 'bg-zinc-100 text-zinc-700'
                : server.transport === 'sse'
                  ? 'bg-amber-500/10 text-amber-700'
                  : 'bg-sky-500/10 text-sky-700';

            return (
              <section
                key={stateKey}
                className={SETTINGS_SECTION_CARD_CLASS}
                data-settings-item={`mcp-server-${index}`}
              >
                <div
                  data-mcp-server-card-header
                  className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      data-testid={`mcp-status-dot-${server.id}`}
                      data-state={status.state}
                      className={`inline-block h-2 w-2 rounded-full ${dotClass}`}
                      title={status.lastError ?? ''}
                    />
                    <span className="min-w-0 truncate text-sm font-medium text-[var(--theme-text-primary)]">
                      {server.name || interpolate(t('settingsMcpUnnamedServer'), { index: index + 1 })}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${typeBadgeClass}`}>{typeLabel}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium ${pillClass}`}>{pillLabel}</span>
                    {status.version ? (
                      <span className="text-[11px] text-[var(--theme-text-tertiary)]">v{status.version}</span>
                    ) : null}
                  </div>
                  <div
                    data-mcp-server-card-actions
                    className="flex shrink-0 items-center gap-2 self-start sm:self-auto"
                  >
                    <Toggle
                      checked={server.enabled}
                      onChange={(enabled) => updateServer(index, { enabled })}
                      ariaLabel={server.name || interpolate(t('settingsMcpUnnamedServer'), { index: index + 1 })}
                    />
                    <button
                      type="button"
                      aria-label={`Move ${server.id} up`}
                      onClick={() => moveServer(server.id, -1)}
                      className={SETTINGS_OUTLINE_BUTTON_CLASS}
                    >
                      {t('settingsMcpMoveUp')}
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${server.id} down`}
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className={SETTINGS_SECTION_LABEL_CLASS}>{t('settingsMcpServerName')}</span>
                    <input
                      value={server.name}
                      onChange={(event) => updateServer(index, { name: event.target.value })}
                      className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS}`}
                    />
                  </label>

                  <label className="space-y-2">
                    <span className={SETTINGS_SECTION_LABEL_CLASS}>{t('settingsMcpServerId')}</span>
                    <input
                      value={server.id}
                      onChange={(event) => updateServer(index, { id: event.target.value.trim() })}
                      className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS} font-mono`}
                    />
                  </label>

                  <label className="space-y-2" data-settings-item={index === 0 ? 'mcp-transport' : undefined}>
                    <span className={SETTINGS_SECTION_LABEL_CLASS}>{t('settingsMcpTransport')}</span>
                    <select
                      value={server.transport}
                      onChange={(event) =>
                        handleTransportChange(index, server, event.target.value as McpServerTransport)
                      }
                      className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS}`}
                    >
                      <option value="stdio">{t('settingsMcpTransportStdio')}</option>
                      <option value="http">{t('settingsMcpTransportHttp')}</option>
                      <option value="sse">{t('settingsMcpTransportSse')}</option>
                    </select>
                  </label>

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
                    <label className="space-y-2">
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

                {server.transport === 'stdio' ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                ) : (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2">
                        <span className={SETTINGS_SECTION_LABEL_CLASS}>{t('settingsMcpAuth')}</span>
                        <select
                          value={server.auth?.type ?? 'none'}
                          onChange={(event) => handleAuthTypeChange(index, event.target.value as McpServerAuthType)}
                          className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS}`}
                        >
                          <option value="none">{t('settingsMcpAuthNone')}</option>
                          <option value="bearer">{t('settingsMcpAuthBearer')}</option>
                          <option value="customHeaders">{t('settingsMcpAuthCustomHeaders')}</option>
                        </select>
                      </label>
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

                {capabilities && (
                  <div className="mt-4 rounded-md border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] p-3 text-xs text-[var(--theme-text-secondary)]">
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
                {capabilityState?.status === 'success' && capabilities && (() => {
                  const disabled = new Set(server.disabledTools ?? []);
                  const toggleTool = (toolName: string, enabled: boolean) => {
                    const next = enabled
                      ? (server.disabledTools ?? []).filter((n) => n !== toolName)
                      : [...(server.disabledTools ?? []), toolName];
                    updateServer(index, { disabledTools: next.length ? next : undefined });
                  };
                  return (
                    <div className="mt-3 overflow-hidden rounded-lg border border-[var(--theme-border-secondary)]">
                      <details open>
                        <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium select-none">
                          {t('settingsMcpCapabilityTools')} ({capabilities.tools.length})
                        </summary>
                        {capabilities.tools.map((tool) => (
                          <div
                            key={tool.name}
                            className="flex items-center justify-between border-t border-[var(--theme-border-secondary)] px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm text-[var(--theme-text-primary)]">{tool.name}</div>
                              <div className="truncate text-xs text-[var(--theme-text-secondary)]">{tool.description}</div>
                            </div>
                            <Toggle
                              checked={!disabled.has(tool.name)}
                              onChange={(v) => toggleTool(tool.name, v)}
                              ariaLabel={`${disabled.has(tool.name) ? 'Enable' : 'Disable'} ${tool.name}`}
                            />
                          </div>
                        ))}
                      </details>
                    </div>
                  );
                })()}
                {capabilityState?.status === 'success' && capabilities && (
                  <>
                    <div className="mt-3 flex gap-1 border-b border-[var(--theme-border-secondary)]">
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
                      <button
                        role="tab"
                        aria-selected={activeTabs[stateKey] === 'settings'}
                        onClick={() => setActiveTabs((prev) => ({ ...prev, [stateKey]: 'settings' }))}
                        className={`px-3 py-1.5 text-xs font-medium ${activeTabs[stateKey] === 'settings' ? 'border-b-2 border-[var(--theme-text-accent)] text-[var(--theme-text-primary)]' : 'text-[var(--theme-text-secondary)]'}`}
                      >
                        {t('settingsMcpTabSettings')}
                      </button>
                    </div>
                    {activeTabs[stateKey] === 'prompts' && (
                      <McpPromptsTab prompts={capabilities.prompts ?? []} t={t} />
                    )}
                    {activeTabs[stateKey] === 'resources' && (
                      <McpResourcesTab
                        resources={capabilities.resources ?? []}
                        templates={capabilities.resourceTemplates ?? []}
                        t={t}
                      />
                    )}
                    {activeTabs[stateKey] === 'logs' && <McpLogsTab server={server} t={t} />}
                  </>
                )}
                {capabilityState?.status === 'error' && (
                  <div className="mt-4 rounded-md border border-[var(--theme-text-danger)]/30 bg-[var(--theme-bg-danger)]/10 p-3 text-xs text-[var(--theme-text-danger)]">
                    {capabilityState.error}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

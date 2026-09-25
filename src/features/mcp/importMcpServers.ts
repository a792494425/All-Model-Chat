import type { McpServerConfig, McpServerTransport } from '../../../shared/mcpServerConfig';

export type ImportErrorCode = 'empty' | 'notObject' | 'unrecognized';

export class McpImportError extends Error {
  code: ImportErrorCode;

  constructor(code: ImportErrorCode) {
    super(code);
    this.code = code;
  }
}

export const normalizeImportedServer = (
  raw: Record<string, unknown>,
  fallbackName?: string,
): McpServerConfig | null => {
  const url = typeof raw.url === 'string' ? raw.url.trim() : typeof raw.baseUrl === 'string' ? raw.baseUrl.trim() : '';
  const command = typeof raw.command === 'string' ? raw.command.trim() : '';
  if (!url && !command) return null;
  const isStdio = !!command || raw.transport === 'stdio' || raw.type === 'stdio';
  const transport: McpServerTransport = isStdio
    ? 'stdio'
    : raw.transport === 'sse' || raw.type === 'sse'
      ? 'sse'
      : 'http';
  const idRaw = typeof raw.id === 'string' ? raw.id.trim() : typeof raw.name === 'string' ? raw.name.trim() : '';
  const serverId = idRaw || `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const name = (typeof raw.name === 'string' && raw.name.trim()) || fallbackName || serverId;
  if (transport === 'stdio') {
    return {
      id: serverId,
      name,
      enabled: false,
      transport,
      command: command || (typeof raw.command === 'string' ? raw.command : 'npx'),
      args: Array.isArray(raw.args) ? (raw.args.filter((item) => typeof item === 'string') as string[]) : [],
      env: raw.env && typeof raw.env === 'object' ? { ...(raw.env as Record<string, string>) } : {},
    };
  }
  return {
    id: serverId,
    name,
    enabled: false,
    transport,
    url: url || (typeof raw.url === 'string' ? raw.url : ''),
    headers: raw.headers && typeof raw.headers === 'object' ? { ...(raw.headers as Record<string, string>) } : {},
    auth:
      raw.auth && typeof (raw.auth as Record<string, unknown>).type === 'string'
        ? (raw.auth as McpServerConfig['auth'])
        : { type: 'none' },
    isTrusted: false,
  };
};

const serversFromParsed = (parsed: unknown): McpServerConfig[] => {
  if (!parsed || typeof parsed !== 'object') throw new McpImportError('notObject');
  if (Array.isArray(parsed)) {
    return (parsed as Record<string, unknown>[])
      .map((rawRecord) => normalizeImportedServer(rawRecord))
      .filter(Boolean) as McpServerConfig[];
  }
  const rawConfig = parsed as Record<string, unknown>;
  for (const key of ['servers', 'mcpServers'] as const) {
    if (Array.isArray(rawConfig[key])) {
      return (rawConfig[key] as Record<string, unknown>[])
        .map((rawRecord) => normalizeImportedServer(rawRecord))
        .filter(Boolean) as McpServerConfig[];
    }
  }
  if (rawConfig.mcpServers && typeof rawConfig.mcpServers === 'object' && !Array.isArray(rawConfig.mcpServers)) {
    return Object.entries(rawConfig.mcpServers as Record<string, unknown>)
      .map(([serverKey, rawServerConfig]) =>
        normalizeImportedServer((rawServerConfig as Record<string, unknown>) ?? {}, serverKey),
      )
      .filter(Boolean) as McpServerConfig[];
  }
  if (rawConfig.url || rawConfig.command || rawConfig.transport || rawConfig.type) {
    const singleServer = normalizeImportedServer(rawConfig);
    return singleServer ? [singleServer] : [];
  }
  throw new McpImportError('unrecognized');
};

export const parseImportJson = (text: string): McpServerConfig[] => {
  const stripped = text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\/\/.*$/, ''))
    .join('\n')
    .trim();
  if (!stripped) throw new McpImportError('empty');
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    throw new McpImportError('unrecognized');
  }
  return serversFromParsed(parsed);
};

/**
 * Decodes a share payload (?mcp=<base64url json>). Share-installed servers are
 * always disabled + untrusted so the user must consciously trust them.
 */
export const parseMcpShareParam = (value: string): McpServerConfig[] => {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const decoded = atob(padded);
    const parsed: unknown = JSON.parse(decoded);
    return serversFromParsed(parsed).map((server) => ({ ...server, enabled: false, isTrusted: false }));
  } catch {
    return [];
  }
};

export const dedupeServersById = (
  imported: McpServerConfig[],
  existingIds: Iterable<string>,
): Array<McpServerConfig & { __isNew?: boolean }> => {
  const existingIdSet = new Set(existingIds);
  return imported.map((server) => {
    let nextId = server.id;
    let duplicateCounter = 2;
    while (existingIdSet.has(nextId)) {
      nextId = `${server.id}__${duplicateCounter}`;
      duplicateCounter += 1;
    }
    existingIdSet.add(nextId);
    return nextId === server.id ? server : { ...server, id: nextId };
  });
};

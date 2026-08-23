import { isRecord } from './predicates.js';

export type McpServerTransport = 'stdio' | 'http' | 'sse';
export type McpServerAuthType = 'none' | 'bearer' | 'customHeaders';

export interface McpServerAuthConfig {
  type: McpServerAuthType;
  token?: string;
}

export interface McpServerConfig {
  id: string;
  name: string;
  enabled: boolean;
  transport: McpServerTransport;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  auth?: McpServerAuthConfig;
  disabledTools?: string[];
}

export const sanitizeStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const strings = value.filter((item): item is string => typeof item === 'string');
  return strings.length > 0 ? strings : undefined;
};

export const sanitizeStringRecord = (value: unknown): Record<string, string> | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const entries = Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string');
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

export const sanitizeMcpAuth = (value: unknown): McpServerAuthConfig | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  if (value.type === 'none' || value.type === 'customHeaders') {
    return { type: value.type };
  }

  if (value.type === 'bearer') {
    const token = typeof value.token === 'string' ? value.token.trim() : '';
    return {
      type: 'bearer',
      ...(token ? { token } : {}),
    };
  }

  return undefined;
};

export const isValidMcpHttpUrl = (value: string): boolean => {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
};

export const sanitizeMcpServerConfig = (value: unknown): McpServerConfig | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = typeof value.id === 'string' ? value.id.trim() : '';
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const transport = value.transport;
  if (!id || !name || (transport !== 'stdio' && transport !== 'http' && transport !== 'sse')) {
    return undefined;
  }

  const server: McpServerConfig = {
    id,
    name,
    enabled: value.enabled === true,
    transport,
  };

  if (transport === 'stdio') {
    const command = typeof value.command === 'string' ? value.command.trim() : '';
    server.command = command;
    const args = sanitizeStringArray(value.args);
    const env = sanitizeStringRecord(value.env);
    if (args) server.args = args;
    if (env) server.env = env;
  }

  if (transport === 'http' || transport === 'sse') {
    server.url = typeof value.url === 'string' ? value.url.trim() : '';
    const headers = sanitizeStringRecord(value.headers);
    const auth = sanitizeMcpAuth(value.auth);
    if (headers) server.headers = headers;
    if (auth) server.auth = auth;
  }

  const disabledTools = sanitizeStringArray((value as Record<string, unknown>).disabledTools);
  if (disabledTools) (server as McpServerConfig).disabledTools = disabledTools;

  return server;
};

export const sanitizeMcpServers = (value: unknown): McpServerConfig[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item): McpServerConfig[] => {
    const server = sanitizeMcpServerConfig(item);
    return server ? [server] : [];
  });
};

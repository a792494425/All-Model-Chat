import type { IncomingMessage, ServerResponse } from 'node:http';
import { sendJson } from './cors.js';
import type { McpClientBridge, McpServerConfig, McpTool } from './mcpTypes.js';
import { isPrivateNetworkHostname } from '../../shared/privateNetwork.js';
import {
  isValidMcpHttpUrl,
  sanitizeMcpAuth,
  sanitizeStringArray,
  sanitizeStringRecord,
} from '../../shared/mcpServerConfig.js';
import { isRecord } from '../../shared/predicates.js';

const MCP_TOOLS_PATH = '/api/mcp/tools';
const MCP_CALL_PATH = '/api/mcp/call';
const MCP_RESOURCES_PATH = '/api/mcp/resources';
const MCP_RESOURCE_PATH = '/api/mcp/resource';
const MCP_PROMPTS_PATH = '/api/mcp/prompts';
const MCP_PROMPT_PATH = '/api/mcp/prompt';
const MCP_LOGS_PATH = '/api/mcp/logs';

const MAX_MCP_REQUEST_BYTES = 1024 * 1024;

interface McpRouteOptions {
  enableStdio: boolean;
  enablePrivateHttp: boolean;
}

type McpServerParseResult =
  | {
      ok: true;
      server: McpServerConfig;
    }
  | {
      ok: false;
      error?: {
        serverId: string;
        serverName: string;
        error: string;
      };
    };

const readRequestBody = async (request: IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;
    if (totalBytes > MAX_MCP_REQUEST_BYTES) {
      const error = new Error('MCP request body is too large.');
      error.name = 'HttpError';
      throw error;
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString('utf8');
};

const readJsonBody = async (request: IncomingMessage): Promise<unknown> => {
  const rawBody = await readRequestBody(request);
  if (!rawBody.trim()) {
    return {};
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new SyntaxError('MCP request body must be valid JSON.');
  }
};

const isPrivateMcpHttpUrl = (value: string): boolean => {
  try {
    return isPrivateNetworkHostname(new URL(value).hostname);
  } catch {
    return false;
  }
};

const parseMcpServer = (value: unknown, options: McpRouteOptions): McpServerParseResult => {
  if (!isRecord(value)) {
    return { ok: false };
  }

  const id = typeof value.id === 'string' ? value.id.trim() : '';
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const enabled = value.enabled === true;
  const transport = value.transport;
  if (!id || !name || (transport !== 'stdio' && transport !== 'http' && transport !== 'sse')) {
    // Attribute the failure to the (partial) server so the UI can show why a
    // configured server produced no tools instead of silently dropping it.
    return {
      ok: false,
      error: {
        serverId: id || '(missing id)',
        serverName: name || '(missing name)',
        error: !id
          ? 'MCP server configuration is missing a server ID.'
          : !name
            ? 'MCP server configuration is missing a name.'
            : 'MCP server transport must be stdio, http, or sse.',
      },
    };
  }

  const server: McpServerConfig = {
    id,
    name,
    enabled,
    transport,
  };

  if (!enabled) {
    return { ok: true, server };
  }

  if (transport === 'stdio') {
    const command = typeof value.command === 'string' ? value.command.trim() : '';
    if (!command) {
      return {
        ok: false,
        error: {
          serverId: id,
          serverName: name,
          error: 'MCP stdio server requires a command.',
        },
      };
    }

    server.command = command;
    const args = sanitizeStringArray(value.args);
    const env = sanitizeStringRecord(value.env);
    if (args) server.args = args;
    if (env) server.env = env;
    return { ok: true, server };
  }

  // http | sse
  const url = typeof value.url === 'string' ? value.url.trim() : '';
  if (!url) {
    return {
      ok: false,
      error: {
        serverId: id,
        serverName: name,
        error: 'MCP http/sse server requires a URL.',
      },
    };
  }

  if (!isValidMcpHttpUrl(url)) {
    return {
      ok: false,
      error: {
        serverId: id,
        serverName: name,
        error: 'MCP HTTP server URL must use http:// or https://.',
      },
    };
  }

  if (!options.enablePrivateHttp && isPrivateMcpHttpUrl(url)) {
    return {
      ok: false,
      error: {
        serverId: id,
        serverName: name,
        error: 'Private MCP HTTP server URLs are disabled on this API server.',
      },
    };
  }

  server.url = url;
  const headers = sanitizeStringRecord(value.headers);
  const auth = sanitizeMcpAuth(value.auth);
  if (headers) server.headers = headers;
  if (auth) server.auth = auth;
  return { ok: true, server };
};

const getErrorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const handleListTools = async (
  request: IncomingMessage,
  response: ServerResponse,
  allowedOrigins: string[],
  mcpClient: McpClientBridge,
  options: McpRouteOptions,
): Promise<void> => {
  const body = await readJsonBody(request);
  const rawServers = isRecord(body) && Array.isArray(body.servers) ? body.servers : null;
  if (!rawServers) {
    sendJson(request, response, 400, { error: 'MCP servers must be provided.' }, allowedOrigins);
    return;
  }

  const parsedServers = rawServers.map((server) => parseMcpServer(server, options));
  const enabledServers = parsedServers
    .filter((result): result is { ok: true; server: McpServerConfig } => result.ok && result.server.enabled)
    .map((result) => result.server);
  const servers: Array<{ serverId: string; serverName: string; tools: McpTool[] }> = [];
  const errors: Array<{ serverId: string; serverName: string; error: string }> = parsedServers.flatMap((result) =>
    !result.ok && result.error ? [result.error] : [],
  );

  // List concurrently: one slow or hung server must not delay the others.
  const results = await Promise.all(
    enabledServers.map(async (server) => {
      if (server.transport === 'stdio' && !options.enableStdio) {
        return {
          error: {
            serverId: server.id,
            serverName: server.name,
            error: 'MCP stdio transport is disabled on this API server.',
          },
        };
      }

      try {
        return {
          server: {
            serverId: server.id,
            serverName: server.name,
            tools: await mcpClient.listTools(server),
          },
        };
      } catch (error) {
        return {
          error: {
            serverId: server.id,
            serverName: server.name,
            error: getErrorMessage(error),
          },
        };
      }
    }),
  );
  for (const result of results) {
    if (result.server) servers.push(result.server);
    else errors.push(result.error);
  }

  sendJson(request, response, 200, { servers, errors }, allowedOrigins);
};

const handleCallTool = async (
  request: IncomingMessage,
  response: ServerResponse,
  allowedOrigins: string[],
  mcpClient: McpClientBridge,
  options: McpRouteOptions,
): Promise<void> => {
  const body = await readJsonBody(request);
  if (!isRecord(body)) {
    sendJson(request, response, 400, { error: 'MCP request body must be an object.' }, allowedOrigins);
    return;
  }

  const parsedServer = parseMcpServer(body.server, options);
  const toolName = typeof body.toolName === 'string' ? body.toolName.trim() : '';
  const args = isRecord(body.args) ? body.args : {};
  if (!parsedServer.ok) {
    sendJson(
      request,
      response,
      400,
      { error: parsedServer.error?.error ?? 'MCP server and tool name are required.' },
      allowedOrigins,
    );
    return;
  }

  const { server } = parsedServer;
  if (!server.enabled) {
    sendJson(request, response, 400, { error: 'MCP server is disabled.' }, allowedOrigins);
    return;
  }

  if (!toolName) {
    sendJson(request, response, 400, { error: 'MCP tool name is required.' }, allowedOrigins);
    return;
  }

  if (server.transport === 'stdio' && !options.enableStdio) {
    sendJson(request, response, 403, { error: 'MCP stdio transport is disabled on this API server.' }, allowedOrigins);
    return;
  }

  try {
    const result = await mcpClient.callTool(server, toolName, args);
    sendJson(request, response, 200, { result: result as Record<string, unknown> }, allowedOrigins);
  } catch (error) {
    sendJson(request, response, 502, { error: getErrorMessage(error) }, allowedOrigins);
  }
};

const parseServersFromListBody = async (
  request: IncomingMessage,
  response: ServerResponse,
  allowedOrigins: string[],
  options: McpRouteOptions,
): Promise<
  | {
      ok: true;
      enabledServers: McpServerConfig[];
      errors: Array<{ serverId: string; serverName: string; error: string }>;
    }
  | { ok: false }
> => {
  const body = await readJsonBody(request);
  const rawServers = isRecord(body) && Array.isArray(body.servers) ? body.servers : null;
  if (!rawServers) {
    sendJson(request, response, 400, { error: 'MCP servers must be provided.' }, allowedOrigins);
    return { ok: false };
  }

  const parsedServers = rawServers.map((server) => parseMcpServer(server, options));
  const enabledServers = parsedServers
    .filter((result): result is { ok: true; server: McpServerConfig } => result.ok && result.server.enabled)
    .map((result) => result.server);
  const errors: Array<{ serverId: string; serverName: string; error: string }> = parsedServers.flatMap((result) =>
    !result.ok && result.error ? [result.error] : [],
  );

  return { ok: true, enabledServers, errors };
};

const handleListResources = async (
  request: IncomingMessage,
  response: ServerResponse,
  allowedOrigins: string[],
  mcpClient: McpClientBridge,
  options: McpRouteOptions,
): Promise<void> => {
  const parsed = await parseServersFromListBody(request, response, allowedOrigins, options);
  if (!parsed.ok) return;

  const servers: Array<{
    serverId: string;
    serverName: string;
    resources: Awaited<ReturnType<NonNullable<McpClientBridge['listResources']>>>;
    resourceTemplates: Awaited<ReturnType<NonNullable<McpClientBridge['listResourceTemplates']>>>;
  }> = [];
  const errors = [...parsed.errors];

  // List concurrently so one slow server does not delay the rest.
  const results = await Promise.all(
    parsed.enabledServers.map(async (server) => {
      if (server.transport === 'stdio' && !options.enableStdio) {
        return {
          error: {
            serverId: server.id,
            serverName: server.name,
            error: 'MCP stdio transport is disabled on this API server.',
          },
        };
      }

      try {
        if (!mcpClient.listResourcesAndTemplates) {
          throw new Error('MCP resources are not supported by this API server.');
        }

        const { resources, resourceTemplates } = await mcpClient.listResourcesAndTemplates(server);
        return {
          server: {
            serverId: server.id,
            serverName: server.name,
            resources,
            resourceTemplates,
          },
        };
      } catch (error) {
        return {
          error: {
            serverId: server.id,
            serverName: server.name,
            error: getErrorMessage(error),
          },
        };
      }
    }),
  );
  for (const result of results) {
    if (result.server) servers.push(result.server);
    else errors.push(result.error);
  }

  sendJson(request, response, 200, { servers, errors }, allowedOrigins);
};

const handleReadResource = async (
  request: IncomingMessage,
  response: ServerResponse,
  allowedOrigins: string[],
  mcpClient: McpClientBridge,
  options: McpRouteOptions,
): Promise<void> => {
  const body = await readJsonBody(request);
  if (!isRecord(body)) {
    sendJson(request, response, 400, { error: 'MCP request body must be an object.' }, allowedOrigins);
    return;
  }

  const parsedServer = parseMcpServer(body.server, options);
  const uri = typeof body.uri === 'string' ? body.uri.trim() : '';
  if (!parsedServer.ok) {
    sendJson(
      request,
      response,
      400,
      { error: parsedServer.error?.error ?? 'MCP server and resource URI are required.' },
      allowedOrigins,
    );
    return;
  }

  if (!parsedServer.server.enabled) {
    sendJson(request, response, 400, { error: 'MCP server is disabled.' }, allowedOrigins);
    return;
  }

  if (!uri) {
    sendJson(request, response, 400, { error: 'MCP resource URI is required.' }, allowedOrigins);
    return;
  }

  const { server } = parsedServer;
  if (server.transport === 'stdio' && !options.enableStdio) {
    sendJson(request, response, 403, { error: 'MCP stdio transport is disabled on this API server.' }, allowedOrigins);
    return;
  }
  if (!mcpClient.readResource) {
    sendJson(
      request,
      response,
      501,
      { error: 'MCP resource reads are not supported by this API server.' },
      allowedOrigins,
    );
    return;
  }

  try {
    const result = await mcpClient.readResource(server, uri);
    sendJson(request, response, 200, { result: result as Record<string, unknown> }, allowedOrigins);
  } catch (error) {
    sendJson(request, response, 502, { error: getErrorMessage(error) }, allowedOrigins);
  }
};

const handleListPrompts = async (
  request: IncomingMessage,
  response: ServerResponse,
  allowedOrigins: string[],
  mcpClient: McpClientBridge,
  options: McpRouteOptions,
): Promise<void> => {
  const parsed = await parseServersFromListBody(request, response, allowedOrigins, options);
  if (!parsed.ok) return;

  const servers: Array<{
    serverId: string;
    serverName: string;
    prompts: Awaited<ReturnType<NonNullable<McpClientBridge['listPrompts']>>>;
  }> = [];
  const errors = [...parsed.errors];

  // List concurrently so one slow server does not delay the rest.
  const results = await Promise.all(
    parsed.enabledServers.map(async (server) => {
      if (server.transport === 'stdio' && !options.enableStdio) {
        return {
          error: {
            serverId: server.id,
            serverName: server.name,
            error: 'MCP stdio transport is disabled on this API server.',
          },
        };
      }

      try {
        if (!mcpClient.listPrompts) {
          throw new Error('MCP prompts are not supported by this API server.');
        }

        return {
          server: {
            serverId: server.id,
            serverName: server.name,
            prompts: await mcpClient.listPrompts(server),
          },
        };
      } catch (error) {
        return {
          error: {
            serverId: server.id,
            serverName: server.name,
            error: getErrorMessage(error),
          },
        };
      }
    }),
  );
  for (const result of results) {
    if (result.server) servers.push(result.server);
    else errors.push(result.error);
  }

  sendJson(request, response, 200, { servers, errors }, allowedOrigins);
};

const handleGetPrompt = async (
  request: IncomingMessage,
  response: ServerResponse,
  allowedOrigins: string[],
  mcpClient: McpClientBridge,
  options: McpRouteOptions,
): Promise<void> => {
  const body = await readJsonBody(request);
  if (!isRecord(body)) {
    sendJson(request, response, 400, { error: 'MCP request body must be an object.' }, allowedOrigins);
    return;
  }

  const parsedServer = parseMcpServer(body.server, options);
  const promptName = typeof body.promptName === 'string' ? body.promptName.trim() : '';
  const args = sanitizeStringRecord(body.args) ?? {};
  if (!parsedServer.ok) {
    sendJson(
      request,
      response,
      400,
      { error: parsedServer.error?.error ?? 'MCP server and prompt name are required.' },
      allowedOrigins,
    );
    return;
  }

  if (!parsedServer.server.enabled) {
    sendJson(request, response, 400, { error: 'MCP server is disabled.' }, allowedOrigins);
    return;
  }

  if (!promptName) {
    sendJson(request, response, 400, { error: 'MCP prompt name is required.' }, allowedOrigins);
    return;
  }

  const { server } = parsedServer;
  if (server.transport === 'stdio' && !options.enableStdio) {
    sendJson(request, response, 403, { error: 'MCP stdio transport is disabled on this API server.' }, allowedOrigins);
    return;
  }
  if (!mcpClient.getPrompt) {
    sendJson(request, response, 501, { error: 'MCP prompts are not supported by this API server.' }, allowedOrigins);
    return;
  }

  try {
    const result = await mcpClient.getPrompt(server, promptName, args);
    sendJson(request, response, 200, { result: result as Record<string, unknown> }, allowedOrigins);
  } catch (error) {
    sendJson(request, response, 502, { error: getErrorMessage(error) }, allowedOrigins);
  }
};

export const handleMcpRequest = async (
  request: IncomingMessage,
  response: ServerResponse,
  path: string,
  allowedOrigins: string[],
  mcpClient: McpClientBridge,
  options: McpRouteOptions = { enableStdio: false, enablePrivateHttp: false },
): Promise<boolean> => {
  if (path === MCP_LOGS_PATH) {
    if (request.method !== 'GET') {
      sendJson(request, response, 405, { error: 'Method not allowed' }, allowedOrigins);
      return true;
    }
    try {
      const url = new URL(request.url || '/', 'http://localhost');
      const serverId = url.searchParams.get('serverId')?.trim();
      if (!serverId) {
        sendJson(request, response, 400, { error: 'serverId required' }, allowedOrigins);
        return true;
      }
      // C1: private-host guard parity and 404 for unknown serverId.
      // GET /api/mcp/logs sits before POST-only guard; enforce same private-HTTP awareness
      // as handleListTools/handleCallTool. Unknown serverIds return 404 to avoid probing.
      if (mcpClient.hasLogs && !mcpClient.hasLogs(serverId)) {
        sendJson(request, response, 404, { error: 'MCP server not found.' }, allowedOrigins);
        return true;
      }
      // When private HTTP is disabled, we still serve logs for known servers but unknown
      // already 404s above; no hostname to check via isPrivateNetworkHostname here.
      // The hasLogs gate is the equivalent guard for this GET endpoint.
      void options.enablePrivateHttp;
      const logs = mcpClient.getLogs?.(serverId) ?? [];
      sendJson(request, response, 200, { logs }, allowedOrigins);
    } catch (error) {
      console.error('[mcp] logs request failed:', error);
      sendJson(request, response, 500, { error: 'MCP request failed.' }, allowedOrigins);
    }
    return true;
  }

  if (
    path !== MCP_TOOLS_PATH &&
    path !== MCP_CALL_PATH &&
    path !== MCP_RESOURCES_PATH &&
    path !== MCP_RESOURCE_PATH &&
    path !== MCP_PROMPTS_PATH &&
    path !== MCP_PROMPT_PATH
  ) {
    return false;
  }

  if (request.method !== 'POST') {
    sendJson(request, response, 405, { error: 'Method not allowed' }, allowedOrigins);
    return true;
  }

  try {
    switch (path) {
      case MCP_TOOLS_PATH:
        await handleListTools(request, response, allowedOrigins, mcpClient, options);
        break;
      case MCP_CALL_PATH:
        await handleCallTool(request, response, allowedOrigins, mcpClient, options);
        break;
      case MCP_RESOURCES_PATH:
        await handleListResources(request, response, allowedOrigins, mcpClient, options);
        break;
      case MCP_RESOURCE_PATH:
        await handleReadResource(request, response, allowedOrigins, mcpClient, options);
        break;
      case MCP_PROMPTS_PATH:
        await handleListPrompts(request, response, allowedOrigins, mcpClient, options);
        break;
      case MCP_PROMPT_PATH:
        await handleGetPrompt(request, response, allowedOrigins, mcpClient, options);
        break;
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      sendJson(request, response, 400, { error: error.message }, allowedOrigins);
      return true;
    }

    if (error instanceof Error && error.name === 'HttpError') {
      sendJson(request, response, 413, { error: error.message }, allowedOrigins);
      return true;
    }

    console.error('[mcp] request failed:', error);
    sendJson(request, response, 500, { error: 'MCP request failed.' }, allowedOrigins);
  }

  return true;
};

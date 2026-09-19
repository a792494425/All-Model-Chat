import { describe, expect, it, vi } from 'vitest';
import { createLocalJsVirtualMcpServer, LOCAL_JS_MCP_TOOLS, LOCAL_JS_VIRTUAL_MCP_ID } from './localJsVirtualMcpServer';

interface ToolCallResult {
  isError?: boolean;
  content: Array<{ type: string; text: string }>;
}

describe('localJsVirtualMcpServer', () => {
  it('has correct server id and lists run_javascript tool', async () => {
    const server = createLocalJsVirtualMcpServer();
    expect(server.id).toBe(LOCAL_JS_VIRTUAL_MCP_ID);
    const tools = await server.listTools();
    expect(tools).toEqual(LOCAL_JS_MCP_TOOLS);
    expect(tools[0]?.name).toBe('run_javascript');
    expect(tools[0]?.inputSchema?.required).toContain('code');
  });

  it('returns error when unknown tool is requested', async () => {
    const server = createLocalJsVirtualMcpServer();
    const result = (await server.callTool('unknown_tool', { code: '1+1' })) as ToolCallResult;
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('Unknown tool: unknown_tool');
  });

  it('returns error when code is empty or missing', async () => {
    const server = createLocalJsVirtualMcpServer();
    const result = (await server.callTool('run_javascript', { code: '   ' })) as ToolCallResult;
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('requires a non-empty "code" string');
  });

  it('calls execute with provided code, files, timeoutMs and abortSignal', async () => {
    const mockExecute = vi.fn().mockResolvedValue({
      status: 'success',
      output: 'result: 42',
      result: '42',
    });
    const mockGetActiveFiles = vi.fn().mockReturnValue({ 'data.json': '{"a":1}' });

    const server = createLocalJsVirtualMcpServer({
      execute: mockExecute,
      getActiveFiles: mockGetActiveFiles,
    });

    const controller = new AbortController();
    const result = (await server.callTool(
      'run_javascript',
      { code: 'return 42;', timeoutMs: 3000 },
      controller.signal,
    )) as ToolCallResult;

    expect(mockGetActiveFiles).toHaveBeenCalled();
    expect(mockExecute).toHaveBeenCalledWith('return 42;', {
      files: { 'data.json': '{"a":1}' },
      timeoutMs: 3000,
      abortSignal: controller.signal,
    });

    expect(result.isError).toBeFalsy();
    expect(result.content[0]?.text).toBe('result: 42');
  });

  it('handles execution error correctly', async () => {
    const mockExecute = vi.fn().mockResolvedValue({
      status: 'error',
      output: '[Error] TypeError: null has no properties',
      error: 'TypeError: null has no properties',
    });

    const server = createLocalJsVirtualMcpServer({
      execute: mockExecute,
      getActiveFiles: () => ({}),
    });

    const result = (await server.callTool('run_javascript', { code: 'null.foo' })) as ToolCallResult;
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('TypeError: null has no properties');
  });

  it('supports alternative code field names (js_code, script)', async () => {
    const mockExecute = vi.fn().mockResolvedValue({
      status: 'success',
      output: 'ok',
    });

    const server = createLocalJsVirtualMcpServer({
      execute: mockExecute,
      getActiveFiles: () => ({}),
    });

    await server.callTool('run_javascript', { script: 'console.log("hi")' });
    expect(mockExecute).toHaveBeenCalledWith('console.log("hi")', expect.any(Object));
  });
});

import { describe, expect, it, vi } from 'vitest';
import {
  CHAT_MEMORY_MCP_TOOLS,
  CHAT_MEMORY_VIRTUAL_MCP_ID,
  createChatMemoryVirtualMcpServer,
} from './chatMemoryVirtualMcpServer';

interface ToolCallResult {
  isError?: boolean;
  content: Array<{ type: string; text: string }>;
}

describe('chatMemoryVirtualMcpServer', () => {
  it('has correct server ID and defines both tools', async () => {
    const server = createChatMemoryVirtualMcpServer();
    expect(server.id).toBe(CHAT_MEMORY_VIRTUAL_MCP_ID);
    const tools = await server.listTools();
    expect(tools).toEqual(CHAT_MEMORY_MCP_TOOLS);
    expect(tools.map((t) => t.name)).toEqual(['search_chat_history', 'get_chat_detail']);
  });

  it('returns an error for unknown tool call', async () => {
    const server = createChatMemoryVirtualMcpServer();
    const result = (await server.callTool('invalid_tool', {})) as ToolCallResult;
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('Unknown tool: invalid_tool');
  });

  describe('search_chat_history tool', () => {
    it('returns error when query parameter is missing or empty', async () => {
      const server = createChatMemoryVirtualMcpServer();
      const result = (await server.callTool('search_chat_history', { query: '   ' })) as ToolCallResult;
      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('requires a non-empty "query" string');
    });

    it('formats matched results into markdown list', async () => {
      const mockSearch = vi.fn().mockResolvedValue([
        {
          sessionId: 's1',
          title: '魔搭部署指南',
          updatedAt: '2026/9/19 12:00',
          messageCount: 5,
          snippet: '...清理 /mnt/workspace/ 解决配额超限...',
        },
      ]);

      const server = createChatMemoryVirtualMcpServer({
        searchChatHistory: mockSearch,
      });

      const result = (await server.callTool('search_chat_history', {
        query: '魔搭',
        limit: 3,
      })) as ToolCallResult;

      expect(mockSearch).toHaveBeenCalledWith('魔搭', { limit: 3 });
      expect(result.isError).toBeFalsy();
      expect(result.content[0]?.text).toContain('魔搭部署指南');
      expect(result.content[0]?.text).toContain('ID: `s1`');
      expect(result.content[0]?.text).toContain('...清理 /mnt/workspace/');
    });

    it('returns friendly notice when no sessions match', async () => {
      const mockSearch = vi.fn().mockResolvedValue([]);
      const server = createChatMemoryVirtualMcpServer({
        searchChatHistory: mockSearch,
      });

      const result = (await server.callTool('search_chat_history', {
        query: '不存在的关键词',
      })) as ToolCallResult;

      expect(result.isError).toBeFalsy();
      expect(result.content[0]?.text).toContain('未找到与 "不存在的关键词" 相关的历史会话');
    });
  });

  describe('get_chat_detail tool', () => {
    it('returns error when sessionId is missing', async () => {
      const server = createChatMemoryVirtualMcpServer();
      const result = (await server.callTool('get_chat_detail', {})) as ToolCallResult;
      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('requires a non-empty "sessionId" string');
    });

    it('returns chat detail text on success', async () => {
      const mockGetDetail = vi.fn().mockResolvedValue({
        found: true,
        text: '### 会话: 魔搭部署指南\n\n**user**: 你好\n**model**: 你好！',
      });

      const server = createChatMemoryVirtualMcpServer({
        getChatDetail: mockGetDetail,
      });

      const result = (await server.callTool('get_chat_detail', {
        sessionId: 's1',
        maxMessages: 5,
      })) as ToolCallResult;

      expect(mockGetDetail).toHaveBeenCalledWith('s1', { maxMessages: 5 });
      expect(result.isError).toBeFalsy();
      expect(result.content[0]?.text).toContain('### 会话: 魔搭部署指南');
    });

    it('handles not found error from getChatDetail', async () => {
      const mockGetDetail = vi.fn().mockResolvedValue({
        found: false,
        text: '未找到会话 ID 为 "s999" 的记录。',
      });

      const server = createChatMemoryVirtualMcpServer({
        getChatDetail: mockGetDetail,
      });

      const result = (await server.callTool('get_chat_detail', {
        sessionId: 's999',
      })) as ToolCallResult;

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('未找到会话 ID 为 "s999"');
    });
  });
});

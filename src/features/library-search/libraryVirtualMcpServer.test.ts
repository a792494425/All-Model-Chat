import { describe, it, expect, vi } from 'vitest';
import {
  createLibraryVirtualMcpServer,
  LIBRARY_MCP_TOOLS,
  LIBRARY_SEARCH_VIRTUAL_MCP_ID,
  initLibraryVirtualMcpServer,
} from './libraryVirtualMcpServer';
import { getVirtualMcpServers, clearVirtualMcpServers } from '@/features/mcp/virtualMcpRegistry';
import type { LibrarySearchResult, ReadLibraryFileResult } from './librarySearch';

type ToolCallResult = {
  isError?: boolean;
  content: Array<{ type: string; text: string }>;
};

describe('libraryVirtualMcpServer', () => {
  it('exposes correct server metadata and tools', async () => {
    const server = createLibraryVirtualMcpServer();
    expect(server.id).toBe(LIBRARY_SEARCH_VIRTUAL_MCP_ID);
    expect(server.name).toBe('Knowledge Base & Library Search');

    const tools = await server.listTools();
    expect(tools).toEqual(LIBRARY_MCP_TOOLS);
    expect(tools.map((t) => t.name)).toEqual(['search_library', 'read_library_file']);
  });

  describe('search_library', () => {
    it('returns error when query is missing', async () => {
      const server = createLibraryVirtualMcpServer();
      const res = (await server.callTool('search_library', {})) as ToolCallResult;
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('缺少必需的搜索关键词参数');
    });

    it('returns friendly notice when no files match', async () => {
      const searchMock = vi.fn().mockResolvedValue([]);
      const server = createLibraryVirtualMcpServer({ searchLibrary: searchMock });

      const res = (await server.callTool('search_library', { query: 'nonexistent' })) as ToolCallResult;
      expect(res.isError).toBe(false);
      expect(res.content[0].text).toContain('未在资料库中找到');
    });

    it('returns formatted markdown list of files with snippet', async () => {
      const mockResults: LibrarySearchResult[] = [
        {
          id: 'file-123',
          name: 'notes.md',
          type: 'text/markdown',
          fileType: 'document',
          size: 2048,
          formattedSize: '2 KB',
          timestamp: 1700000000000,
          dateStr: '2023-11-14',
          source: 'standalone',
          snippet: '...matched keyword snippet...',
          score: 100,
        },
      ];
      const searchMock = vi.fn().mockResolvedValue(mockResults);
      const server = createLibraryVirtualMcpServer({ searchLibrary: searchMock });

      const res = (await server.callTool('search_library', { query: 'keyword' })) as ToolCallResult;
      expect(res.isError).toBe(false);
      const text = res.content[0].text;
      expect(text).toContain('在资料库中检索到 1 个匹配文件');
      expect(text).toContain('notes.md');
      expect(text).toContain('file-123');
      expect(text).toContain('matched keyword snippet');
      expect(text).toContain('read_library_file(fileId="file-123")');
    });
  });

  describe('read_library_file', () => {
    it('returns error when fileId is missing', async () => {
      const server = createLibraryVirtualMcpServer();
      const res = (await server.callTool('read_library_file', {})) as ToolCallResult;
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('缺少必需的文件 ID 参数');
    });

    it('returns error when file is not found', async () => {
      const readMock = vi.fn().mockResolvedValue({
        found: false,
        id: 'missing-id',
        message: 'File missing-id not found',
      } as ReadLibraryFileResult);
      const server = createLibraryVirtualMcpServer({ readLibraryFile: readMock });

      const res = (await server.callTool('read_library_file', { fileId: 'missing-id' })) as ToolCallResult;
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('File missing-id not found');
    });

    it('handles binary media files safely', async () => {
      const readMock = vi.fn().mockResolvedValue({
        found: true,
        id: 'img-1',
        name: 'photo.jpg',
        type: 'image/jpeg',
        isBinary: true,
        message: 'Binary media file cannot be read as text.',
      } as ReadLibraryFileResult);
      const server = createLibraryVirtualMcpServer({ readLibraryFile: readMock });

      const res = (await server.callTool('read_library_file', { fileId: 'img-1' })) as ToolCallResult;
      expect(res.isError).toBe(false);
      expect(res.content[0].text).toContain('photo.jpg');
      expect(res.content[0].text).toContain('无法以纯文本读取');
    });

    it('formats text file with code block and truncation message', async () => {
      const readMock = vi.fn().mockResolvedValue({
        found: true,
        id: 'code-1',
        name: 'app.ts',
        type: 'text/typescript',
        isBinary: false,
        content: 'const x = 1;',
        startLine: 1,
        endLine: 1,
        totalLines: 10,
        truncated: true,
      } as ReadLibraryFileResult);
      const server = createLibraryVirtualMcpServer({ readLibraryFile: readMock });

      const res = (await server.callTool('read_library_file', { fileId: 'code-1', maxLines: 1 })) as ToolCallResult;
      expect(res.isError).toBe(false);
      const text = res.content[0].text;
      expect(text).toContain('app.ts');
      expect(text).toContain('```typescript');
      expect(text).toContain('const x = 1;');
      expect(text).toContain('内容已截断');
    });
  });

  describe('unknown tool', () => {
    it('returns isError for unknown tool name', async () => {
      const server = createLibraryVirtualMcpServer();
      const res = (await server.callTool('unknown_tool', {})) as ToolCallResult;
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('未知的工具名称');
    });
  });

  describe('initLibraryVirtualMcpServer', () => {
    it('registers into virtualMcpRegistry', () => {
      clearVirtualMcpServers();
      initLibraryVirtualMcpServer();
      const servers = getVirtualMcpServers();
      expect(servers.some((s) => s.id === LIBRARY_SEARCH_VIRTUAL_MCP_ID)).toBe(true);
    });
  });
});

import { describe, it, expect, vi } from 'vitest';
import { extractSnippet, getActiveLibraryItems, searchLibrary, readLibraryFile } from './librarySearch';
import type { LibraryItem } from '@/types';
import type { dbService } from '@/services/db/dbService';

describe('librarySearch', () => {
  const mockStandaloneFiles: LibraryItem[] = [
    {
      id: 'file-doc-1',
      name: 'architecture.md',
      type: 'text/markdown',
      size: 1024,
      timestamp: 1700000000000,
      source: 'uploaded',
      isStandalone: true,
      textContent: '# AMC Architecture\nThis explains virtual MCP.\nVirtual MCP runs completely inside the browser.',
    },
    {
      id: 'file-img-1',
      name: 'banner.png',
      type: 'image/png',
      size: 40960,
      timestamp: 1700001000000,
      source: 'uploaded',
      isStandalone: true,
    },
  ];

  const mockHistoricalFiles: LibraryItem[] = [
    {
      id: 'file-code-1',
      name: 'config.json',
      type: 'application/json',
      size: 512,
      timestamp: 1700002000000,
      source: 'uploaded',
      sessionId: 'session-123',
      sessionTitle: 'Config Review Chat',
      textContent: '{\n  "version": 2,\n  "cache": true\n}',
    },
    {
      id: 'file-blob-1',
      name: 'meeting_notes.txt',
      type: 'text/plain',
      size: 256,
      timestamp: 1700003000000,
      source: 'uploaded',
      sessionId: 'session-456',
      sessionTitle: 'Project Sync',
    },
    {
      id: 'file-deleted-1',
      name: 'old_draft.txt',
      type: 'text/plain',
      size: 128,
      timestamp: 1700004000000,
      source: 'uploaded',
      textContent: 'This draft was deleted.',
    },
  ];

  const mockBlob = new Blob(['Line 1: Meeting started\nLine 2: Action items defined\nLine 3: Adjourned']);

  const createMockDb = () =>
    ({
      getStandaloneLibraryFiles: vi.fn().mockResolvedValue(mockStandaloneFiles),
      getAllHistoricalSessionFiles: vi.fn().mockResolvedValue(mockHistoricalFiles),
      getDeletedLibraryFileIds: vi.fn().mockResolvedValue(['file-deleted-1']),
      fetchLibraryFileBlob: vi.fn().mockImplementation(async (item: LibraryItem) => {
        if (item.id === 'file-blob-1') {
          return mockBlob;
        }
        return undefined;
      }),
    }) as unknown as typeof dbService;

  describe('extractSnippet', () => {
    it('returns empty string if text or query is empty', () => {
      expect(extractSnippet('', 'test')).toBe('');
      expect(extractSnippet('some text', '')).toBe('');
    });

    it('extracts snippet centered on query with ellipsis', () => {
      const text = 'Alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau';
      const snippet = extractSnippet(text, 'zeta', 10);
      expect(snippet).toContain('zeta');
      expect(snippet.startsWith('...')).toBe(true);
      expect(snippet.endsWith('...')).toBe(true);
    });

    it('normalizes newlines and whitespace', () => {
      const text = 'Line 1\nLine 2\nLine 3 with KEYWORD here\nLine 4';
      const snippet = extractSnippet(text, 'KEYWORD', 15);
      expect(snippet).not.toContain('\n');
      expect(snippet).toContain('KEYWORD');
    });
  });

  describe('getActiveLibraryItems', () => {
    it('merges standalone and historical files while excluding deleted IDs', async () => {
      const mockDb = createMockDb();
      const items = await getActiveLibraryItems(mockDb);

      const ids = items.map((i) => i.id);
      expect(ids).toContain('file-doc-1');
      expect(ids).toContain('file-img-1');
      expect(ids).toContain('file-code-1');
      expect(ids).toContain('file-blob-1');
      expect(ids).not.toContain('file-deleted-1');
    });
  });

  describe('searchLibrary', () => {
    it('returns empty array when query is empty or whitespace', async () => {
      const mockDb = createMockDb();
      const res = await searchLibrary({ query: '   ' }, mockDb);
      expect(res).toEqual([]);
    });

    it('finds files matching name with high score', async () => {
      const mockDb = createMockDb();
      const res = await searchLibrary({ query: 'architecture' }, mockDb);
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].id).toBe('file-doc-1');
      expect(res[0].name).toBe('architecture.md');
      expect(res[0].score).toBeGreaterThanOrEqual(100);
      expect(res[0].source).toBe('standalone');
    });

    it('finds files matching content snippet', async () => {
      const mockDb = createMockDb();
      const res = await searchLibrary({ query: 'Virtual MCP' }, mockDb);
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].id).toBe('file-doc-1');
      expect(res[0].snippet).toContain('Virtual MCP');
    });

    it('filters by fileType', async () => {
      const mockDb = createMockDb();
      const docRes = await searchLibrary({ query: 'banner', fileType: 'image' }, mockDb);
      expect(docRes.length).toBe(1);
      expect(docRes[0].id).toBe('file-img-1');

      const nonDocRes = await searchLibrary({ query: 'banner', fileType: 'document' }, mockDb);
      expect(nonDocRes.length).toBe(0);
    });

    it('respects limit parameter', async () => {
      const mockDb = createMockDb();
      const res = await searchLibrary({ query: 'e', limit: 1 }, mockDb);
      expect(res.length).toBe(1);
    });
  });

  describe('readLibraryFile', () => {
    it('returns error if fileId is empty', async () => {
      const mockDb = createMockDb();
      const res = await readLibraryFile({ fileId: '' }, mockDb);
      expect(res.found).toBe(false);
      expect(res.message).toContain('fileId is required');
    });

    it('returns error if file is not found or was deleted', async () => {
      const mockDb = createMockDb();
      const notFoundRes = await readLibraryFile({ fileId: 'unknown-id' }, mockDb);
      expect(notFoundRes.found).toBe(false);

      const deletedRes = await readLibraryFile({ fileId: 'file-deleted-1' }, mockDb);
      expect(deletedRes.found).toBe(false);
    });

    it('handles binary media files gracefully without reading raw binary', async () => {
      const mockDb = createMockDb();
      const res = await readLibraryFile({ fileId: 'file-img-1' }, mockDb);
      expect(res.found).toBe(true);
      expect(res.isBinary).toBe(true);
      expect(res.message).toContain('binary media file');
      expect(res.content).toBeUndefined();
    });

    it('reads text content from textContent property with line slicing', async () => {
      const mockDb = createMockDb();
      const res = await readLibraryFile({ fileId: 'file-doc-1', startLine: 2, maxLines: 2 }, mockDb);
      expect(res.found).toBe(true);
      expect(res.isBinary).toBe(false);
      expect(res.startLine).toBe(2);
      expect(res.endLine).toBe(3);
      expect(res.totalLines).toBe(3);
      expect(res.content).toBe('This explains virtual MCP.\nVirtual MCP runs completely inside the browser.');
    });

    it('reads text content via db.fetchLibraryFileBlob when textContent is missing', async () => {
      const mockDb = createMockDb();
      const res = await readLibraryFile({ fileId: 'file-blob-1' }, mockDb);
      expect(res.found).toBe(true);
      expect(res.isBinary).toBe(false);
      expect(res.content).toContain('Meeting started');
      expect(res.totalLines).toBe(3);
    });
  });
});

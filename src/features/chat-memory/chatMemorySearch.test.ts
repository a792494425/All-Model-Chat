import { describe, expect, it } from 'vitest';
import type { SavedChatSession } from '@/types';
import { extractSnippet, getChatDetail, searchChatHistory } from './chatMemorySearch';

describe('chatMemorySearch', () => {
  describe('extractSnippet', () => {
    it('returns a snippet surrounding the query', () => {
      const text =
        'This is a long introductory text explaining the concepts. Specifically, we discuss the storage quota issue in魔搭 community. And then follow up with more solutions.';
      const snippet = extractSnippet(text, 'storage quota', 30);
      expect(snippet).toContain('storage quota');
      expect(snippet.startsWith('...')).toBe(true);
      expect(snippet.endsWith('...')).toBe(true);
    });

    it('returns the beginning if match is at the start', () => {
      const text = 'Quick brown fox jumps over the lazy dog';
      const snippet = extractSnippet(text, 'Quick', 20);
      expect(snippet.startsWith('Quick')).toBe(true);
    });

    it('returns empty string if query is not found', () => {
      expect(extractSnippet('hello world', 'missing')).toBe('');
    });
  });

  describe('searchChatHistory', () => {
    const mockSessions: SavedChatSession[] = [
      {
        id: 'session-1',
        title: '魔搭社区存储配额分析',
        titleSource: 'auto',
        timestamp: 2000,
        settings: {} as any,
        messages: [
          {
            id: 'm1',
            role: 'user',
            content: '魔搭存储配额超限怎么办？',
            timestamp: new Date(1000),
          },
          {
            id: 'm2',
            role: 'model',
            content: '清理 /mnt/workspace/ 缓存即可解决存储配额超限问题。',
            timestamp: new Date(2000),
          },
        ],
      },
      {
        id: 'session-2',
        title: 'ASR 语音识别开发指南',
        titleSource: 'auto',
        timestamp: 4000,
        settings: {} as any,
        messages: [
          {
            id: 'm3',
            role: 'user',
            content: '如何用 FunASR 或 Qwen-Audio 做语音识别？',
            timestamp: new Date(3000),
          },
        ],
      },
    ];

    it('finds sessions matching the title or message content', async () => {
      const results = await searchChatHistory(
        '存储配额',
        { limit: 5 },
        {
          getAllSessions: async () => mockSessions,
          getActiveSessionId: () => 'active-session',
        },
      );

      expect(results.length).toBe(1);
      expect(results[0].sessionId).toBe('session-1');
      expect(results[0].title).toBe('魔搭社区存储配额分析');
      expect(results[0].snippet).toContain('存储配额');
      expect(results[0].messageCount).toBe(2);
    });

    it('excludes the active session id', async () => {
      const results = await searchChatHistory(
        '存储配额',
        { limit: 5 },
        {
          getAllSessions: async () => mockSessions,
          getActiveSessionId: () => 'session-1', // Exclude this one
        },
      );

      expect(results.length).toBe(0);
    });

    it('limits the number of returned results', async () => {
      const extraSessions: SavedChatSession[] = [
        ...mockSessions,
        {
          id: 'session-3',
          title: '存储配额补充说明',
          titleSource: 'auto',
          timestamp: 6000,
          settings: {} as any,
          messages: [],
        },
      ];

      const results = await searchChatHistory(
        '存储配额',
        { limit: 1 },
        {
          getAllSessions: async () => extraSessions,
          getActiveSessionId: () => 'other',
        },
      );

      expect(results.length).toBe(1);
    });
  });

  describe('getChatDetail', () => {
    it('returns formatted chat history text', async () => {
      const session: SavedChatSession = {
        id: 'session-1',
        title: '测试会话',
        titleSource: 'auto',
        timestamp: 2000,
        settings: {} as any,
        messages: [
          {
            id: 'm1',
            role: 'user',
            content: '第一句话',
            timestamp: new Date(1000),
          },
          {
            id: 'm2',
            role: 'model',
            content: '第二句话回复',
            timestamp: new Date(2000),
          },
        ],
      };

      const detail = await getChatDetail(
        'session-1',
        { maxMessages: 5 },
        {
          getSession: async () => session,
        },
      );

      expect(detail.found).toBe(true);
      expect(detail.text).toContain('### 会话: 测试会话');
      expect(detail.text).toContain('**user**: 第一句话');
      expect(detail.text).toContain('**model**: 第二句话回复');
    });

    it('returns not found if session does not exist', async () => {
      const detail = await getChatDetail(
        'missing-session',
        {},
        {
          getSession: async () => undefined,
        },
      );

      expect(detail.found).toBe(false);
      expect(detail.text).toContain('未找到会话');
    });
  });
});

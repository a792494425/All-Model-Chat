import { describe, it, expect } from 'vitest';
import type { ChatMessage, SavedChatSession } from '@/types';
import { switchMessageVariant, appendModelVariant } from './messageVariants';

const createMockSession = (messages: ChatMessage[]): SavedChatSession => ({
  id: 'session-1',
  title: 'Test Session',
  timestamp: 1000,
  messages,
  settings: {} as any,
});

describe('messageVariants', () => {
  describe('switchMessageVariant', () => {
    it('returns unchanged session when message does not exist', () => {
      const session = createMockSession([]);
      const result = switchMessageVariant(session, 'non-existent', 0);
      expect(result).toBe(session);
    });

    it('returns unchanged session when message has no variants', () => {
      const message: ChatMessage = {
        id: 'msg-1',
        role: 'model',
        content: 'Original',
        timestamp: new Date('2026-01-01'),
      };
      const session = createMockSession([message]);
      const result = switchMessageVariant(session, 'msg-1', 1);
      expect(result).toBe(session);
    });

    it('returns unchanged session when targetIndex is out of bounds', () => {
      const message: ChatMessage = {
        id: 'msg-1',
        role: 'model',
        content: 'Version 1',
        timestamp: new Date('2026-01-01'),
        variants: [
          { id: 'msg-1-v1', role: 'model', content: 'Version 1', timestamp: new Date('2026-01-01') },
          { id: 'msg-1-v2', role: 'model', content: 'Version 2', timestamp: new Date('2026-01-02') },
        ],
        currentVariantIndex: 0,
      };
      const session = createMockSession([message]);
      expect(switchMessageVariant(session, 'msg-1', -1)).toBe(session);
      expect(switchMessageVariant(session, 'msg-1', 2)).toBe(session);
    });

    it('returns unchanged session when targetIndex equals currentVariantIndex', () => {
      const message: ChatMessage = {
        id: 'msg-1',
        role: 'model',
        content: 'Version 1',
        timestamp: new Date('2026-01-01'),
        variants: [
          { id: 'msg-1-v1', role: 'model', content: 'Version 1', timestamp: new Date('2026-01-01') },
          { id: 'msg-1-v2', role: 'model', content: 'Version 2', timestamp: new Date('2026-01-02') },
        ],
        currentVariantIndex: 0,
      };
      const session = createMockSession([message]);
      expect(switchMessageVariant(session, 'msg-1', 0)).toBe(session);
    });

    it('switches between variants and saves the active snapshot', () => {
      const v1Snapshot: ChatMessage = {
        id: 'msg-1',
        role: 'model',
        content: 'Version 1 edited in active state',
        thoughts: 'v1 thoughts',
        timestamp: new Date('2026-01-01'),
        promptTokens: 10,
        completionTokens: 20,
      };
      const v2Snapshot: ChatMessage = {
        id: 'msg-1-v2',
        role: 'model',
        content: 'Version 2 text',
        thoughts: 'v2 thoughts',
        timestamp: new Date('2026-01-02'),
        promptTokens: 12,
        completionTokens: 25,
      };

      const message: ChatMessage = {
        ...v1Snapshot,
        variants: [{ ...v1Snapshot }, { ...v2Snapshot }],
        currentVariantIndex: 0,
      };

      const session = createMockSession([message]);

      // Switch to index 1 (Version 2)
      const switchedToV2 = switchMessageVariant(session, 'msg-1', 1);
      const activeV2 = switchedToV2.messages[0];

      expect(activeV2.content).toBe('Version 2 text');
      expect(activeV2.thoughts).toBe('v2 thoughts');
      expect(activeV2.currentVariantIndex).toBe(1);
      expect(activeV2.variants).toHaveLength(2);
      // v1 snapshot in variants[0] should be updated with what was active
      expect(activeV2.variants![0].content).toBe('Version 1 edited in active state');

      // Now switch back to index 0 (Version 1)
      const switchedBackToV1 = switchMessageVariant(switchedToV2, 'msg-1', 0);
      const activeV1 = switchedBackToV1.messages[0];

      expect(activeV1.content).toBe('Version 1 edited in active state');
      expect(activeV1.thoughts).toBe('v1 thoughts');
      expect(activeV1.currentVariantIndex).toBe(0);
      expect(activeV1.variants![1].content).toBe('Version 2 text');
    });
  });

  describe('appendModelVariant', () => {
    it('initializes variants array when existing message has no variants', () => {
      const existing: ChatMessage = {
        id: 'msg-1',
        role: 'model',
        content: 'Initial Response',
        timestamp: new Date('2026-01-01'),
        promptTokens: 10,
      };
      const newLoading: ChatMessage = {
        id: 'msg-1-retry-1',
        role: 'model',
        content: '',
        isLoading: true,
        timestamp: new Date('2026-01-02'),
      };

      const result = appendModelVariant(existing, newLoading);

      expect(result.id).toBe('msg-1-retry-1');
      expect(result.isLoading).toBe(true);
      expect(result.currentVariantIndex).toBe(1);
      expect(result.variants).toHaveLength(2);
      expect(result.variants![0].content).toBe('Initial Response');
      expect(result.variants![1].id).toBe('msg-1-retry-1');
    });

    it('appends to existing variants when message already has multiple versions', () => {
      const existing: ChatMessage = {
        id: 'msg-1-retry-1',
        role: 'model',
        content: 'Second Response',
        timestamp: new Date('2026-01-02'),
        variants: [
          { id: 'msg-1', role: 'model', content: 'First Response', timestamp: new Date('2026-01-01') },
          { id: 'msg-1-retry-1', role: 'model', content: 'Second Response', timestamp: new Date('2026-01-02') },
        ],
        currentVariantIndex: 1,
      };
      const thirdLoading: ChatMessage = {
        id: 'msg-1-retry-2',
        role: 'model',
        content: '',
        isLoading: true,
        timestamp: new Date('2026-01-03'),
      };

      const result = appendModelVariant(existing, thirdLoading);

      expect(result.id).toBe('msg-1-retry-2');
      expect(result.currentVariantIndex).toBe(2);
      expect(result.variants).toHaveLength(3);
      expect(result.variants![0].content).toBe('First Response');
      expect(result.variants![1].content).toBe('Second Response');
      expect(result.variants![2].id).toBe('msg-1-retry-2');
    });
  });
});

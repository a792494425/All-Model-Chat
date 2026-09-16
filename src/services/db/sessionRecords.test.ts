import { describe, it, expect, beforeEach, vi } from 'vitest';
import { deleteFilesFromSessions } from './sessionRecords';
import type { SavedChatSession } from '@/types';

let mockSessions: Record<string, SavedChatSession> = {};
let mockFiles: Record<string, any> = {};

vi.mock('./indexedDbAccess', () => ({
  getDb: vi.fn(async () => ({
    transaction: (_stores: string[], _mode: string) => {
      const sessionStore = {
        openCursor: () => {
          const keys = Object.keys(mockSessions);
          let idx = 0;
          const req: any = {
            onsuccess: null,
            onerror: null,
            result: null,
          };
          const step = () => {
            if (idx < keys.length) {
              const k = keys[idx];
              req.result = {
                value: mockSessions[k],
                update: (newVal: any) => {
                  mockSessions[k] = newVal;
                },
                continue: () => {
                  idx++;
                  step();
                },
              };
            } else {
              req.result = null;
            }
            if (req.onsuccess) req.onsuccess({ target: req });
          };
          setTimeout(step, 0);
          return req;
        },
      };
      const fileStore = {
        delete: (id: string) => {
          delete mockFiles[id];
        },
      };
      return {
        objectStore: (name: string) => (name === 'sessions' ? sessionStore : fileStore),
      };
    },
  })),
  withWriteLock: vi.fn(async (fn: () => Promise<any>) => fn()),
  transactionToPromise: vi.fn(async () => undefined),
  getAll: vi.fn(async () => []),
  getItem: vi.fn(async () => undefined),
}));

describe('sessionRecords.deleteFilesFromSessions', () => {
  beforeEach(() => {
    mockSessions = {
      'session-1': {
        id: 'session-1',
        title: 'Chat 1',
        timestamp: 1000,
        settings: {} as any,
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'hello with files',
            timestamp: new Date(),
            files: [
              { id: 'f-1', name: 'a.png', type: 'image/png', size: 10 },
              { id: 'f-2', name: 'b.pdf', type: 'application/pdf', size: 20 },
            ],
          },
        ],
      },
    };
    mockFiles = {
      'f-1': { id: 'f-1', rawFile: new Blob(['f1']) },
      'f-2': { id: 'f-2', rawFile: new Blob(['f2']) },
    };
  });

  it('removes target file ids from sessions and deletes blobs from files store', async () => {
    await deleteFilesFromSessions(['f-1']);

    const session = mockSessions['session-1'];
    expect(session.messages[0].files).toHaveLength(1);
    expect(session.messages[0].files?.[0].id).toBe('f-2');
    expect(mockFiles['f-1']).toBeUndefined();
    expect(mockFiles['f-2']).toBeDefined();
  });

  it('sets files to undefined when all files in message are removed', async () => {
    await deleteFilesFromSessions(['f-1', 'f-2']);

    const session = mockSessions['session-1'];
    expect(session.messages[0].files).toBeUndefined();
    expect(mockFiles['f-1']).toBeUndefined();
    expect(mockFiles['f-2']).toBeUndefined();
  });

  it('bails out early if fileIds is empty', async () => {
    await deleteFilesFromSessions([]);
    expect(mockFiles['f-1']).toBeDefined();
  });
});

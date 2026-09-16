import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from './chatStore';
import type { UploadedFile } from '@/types';

describe('chatStore.removeFilesFromStore', () => {
  beforeEach(() => {
    useChatStore.setState({
      activeSessionId: 'sess-1',
      selectedFiles: [{ id: 'f-1', name: 'draft.png' } as UploadedFile],
      activeMessages: [
        {
          id: 'm-1',
          role: 'user',
          content: 'test',
          timestamp: new Date(),
          files: [{ id: 'f-1', name: 'draft.png' } as UploadedFile],
        },
      ],
      savedSessions: [
        {
          id: 'sess-1',
          title: 'Session 1',
          timestamp: 1000,
          settings: {} as any,
          messages: [
            {
              id: 'm-1',
              role: 'user',
              content: 'test',
              timestamp: new Date(),
              files: [{ id: 'f-1', name: 'draft.png' } as UploadedFile],
            },
          ],
        },
      ],
    });
  });

  it('removes target files from selectedFiles, activeMessages, and savedSessions', () => {
    useChatStore.getState().removeFilesFromStore(['f-1']);

    const state = useChatStore.getState();
    expect(state.selectedFiles).toHaveLength(0);
    expect(state.activeMessages[0].files).toBeUndefined();
    expect(state.savedSessions[0].messages[0].files).toBeUndefined();
  });

  it('ignores non-matching files', () => {
    useChatStore.getState().removeFilesFromStore(['f-nonexistent']);

    const state = useChatStore.getState();
    expect(state.selectedFiles).toHaveLength(1);
    expect(state.activeMessages[0].files).toHaveLength(1);
  });
});

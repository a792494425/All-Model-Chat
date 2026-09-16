# Library True File Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement true physical and cascade file deletion in the AMC-WebUI Library, ensuring that deleting files (both standalone uploads and chat session attachments) permanently frees IndexedDB storage, removes attachments from associated chat conversations, deletes multimodal search embeddings, and provides clear user confirmation.

**Architecture:** Build a transactional database helper `deleteFilesFromSessions` in `sessionRecords.ts` that removes file references from `SESSIONS_STORE` and wipes binary payloads from `FILES_STORE`. Add a corresponding `removeFilesFromStore` action in `chatStore.ts` to keep in-memory active messages and saved sessions synchronized. Wire these into `LibraryView.tsx` so both single-item and multi-item batch deletions cascade cleanly through standalone storage, session storage, vector embeddings, and in-memory state. Update confirmation dialog copy across all 7 supported languages.

**Tech Stack:** TypeScript, React, Zustand, IndexedDB (`idb` wrapper), Vitest, Tailwind CSS.

**Spec:** User requirement: "直接彻底删除：在资料库删除时，一律同步从原对话中删除该附件并释放 IndexedDB 空间；无需联动云端删除，云端文件交由 Google 48 小时自动过期或在云端文件管理中手动清理。"

## Global Constraints

- Never modify `DB_VERSION = 5` in `src/services/db/dbSchema.ts` (project structure architectural test boundary).
- Never introduce structural or explanatory comments into JSX/TSX returns (readability architectural test boundary).
- ESLint must pass with `--max-warnings=0`. No unused variables or unused imports.
- Knip must pass: only export symbols used across modules or in tests.
- All UI user-facing strings must be localized across 7 languages (`zh`, `en`, `ja`, `ko`, `de`, `fr`, `es`).
- Preserve existing comments and docstrings.

---

### Task 1: Session Files Deletion in IndexedDB (`sessionRecords.ts` & `dbService.ts`)

**Files:**

- Modify: `src/services/db/sessionRecords.ts`
- Modify: `src/services/db/dbService.ts`
- Modify: `src/test/doubles/services.ts`
- Create: `src/services/db/sessionRecords.test.ts`

**Interfaces:**

- Produces: `deleteFilesFromSessions(fileIds: string[]): Promise<void>`
  - Scans `SESSIONS_STORE`, removes matching `fileIds` from all `message.files` across sessions, updates modified sessions.
  - Deletes matching `fileIds` from `FILES_STORE` to release binary Blobs.
- Re-exports: `deleteFilesFromSessions` on `dbService`.

- [x] **Step 1: Write failing unit test for `deleteFilesFromSessions`**

Create `src/services/db/sessionRecords.test.ts`:

```typescript
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
```

- [x] **Step 2: Run test to verify it fails**

Run: `node scripts/run-vitest.mjs run src/services/db/sessionRecords.test.ts`
Expected: FAIL with `deleteFilesFromSessions is not exported from './sessionRecords'`.

- [x] **Step 3: Implement `deleteFilesFromSessions` in `src/services/db/sessionRecords.ts` and re-export in `dbService.ts`**

In `src/services/db/sessionRecords.ts`:

```typescript
export const deleteFilesFromSessions = async (fileIds: string[]): Promise<void> => {
  if (!fileIds || fileIds.length === 0) {
    return;
  }
  const targetIds = new Set(fileIds);

  return withWriteLock(async () => {
    const db = await getDb();
    const tx = db.transaction([SESSIONS_STORE, FILES_STORE], 'readwrite');
    const sessionStore = tx.objectStore(SESSIONS_STORE);
    const fileStore = tx.objectStore(FILES_STORE);

    const request = sessionStore.openCursor();
    await new Promise<void>((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (!cursor) {
          resolve();
          return;
        }

        const session = cursor.value as SavedChatSession;
        if (session.messages && session.messages.length > 0) {
          let sessionChanged = false;
          const updatedMessages = session.messages.map((msg) => {
            if (msg.files && msg.files.some((f) => targetIds.has(f.id))) {
              sessionChanged = true;
              const remainingFiles = msg.files.filter((f) => !targetIds.has(f.id));
              return {
                ...msg,
                files: remainingFiles.length > 0 ? remainingFiles : undefined,
              };
            }
            return msg;
          });

          if (sessionChanged) {
            cursor.update({
              ...session,
              messages: updatedMessages,
            });
          }
        }
        cursor.continue();
      };
      request.onerror = () => reject(request.error);
    });

    for (const id of fileIds) {
      fileStore.delete(id);
    }

    return transactionToPromise(tx);
  });
};
```

Update `src/services/db/dbService.ts`:

- Import `deleteFilesFromSessions` from `./sessionRecords`.
- Add `deleteFilesFromSessions` to `dbService` object.

Update `src/test/doubles/services.ts`:

- Add `deleteFilesFromSessions: MockFn;` to `MockDbService`.
- Add `deleteFilesFromSessions: asyncMockFn(undefined),` to the mock object.

- [x] **Step 4: Run tests to verify they pass**

Run: `node scripts/run-vitest.mjs run src/services/db/sessionRecords.test.ts`
Expected: PASS (all 3 tests pass).

---

### Task 2: In-Memory File Removal Action in `chatStore.ts`

**Files:**

- Modify: `src/stores/chatStore.ts`
- Create: `src/stores/chatStore.removeFiles.test.ts`

**Interfaces:**

- Consumes: `useChatStore`
- Produces: `removeFilesFromStore: (fileIds: string[]) => void`
  - Removes matching file IDs from `activeMessages` (updating `msg.files`), `selectedFiles`, and `savedSessions`.

- [x] **Step 1: Write failing test for `removeFilesFromStore`**

Create `src/stores/chatStore.removeFiles.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from './chatStore';
import type { ChatMessage, SavedChatSession, UploadedFile } from '@/types';

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
```

- [x] **Step 2: Run test to verify it fails**

Run: `node scripts/run-vitest.mjs run src/stores/chatStore.removeFiles.test.ts`
Expected: FAIL with `removeFilesFromStore is not a function`.

- [x] **Step 3: Implement `removeFilesFromStore` in `src/stores/chatStore.ts`**

Add to `ChatActions` interface in `src/stores/chatStore.ts`:

```typescript
  removeFilesFromStore: (fileIds: string[]) => void;
```

Implement in `chatStore.ts`:

```typescript
  removeFilesFromStore: (fileIds) => {
    if (!fileIds || fileIds.length === 0) return;
    const targetSet = new Set(fileIds);

    set((state) => {
      const nextSelected = state.selectedFiles.filter((f) => !targetSet.has(f.id));
      const hasSelectedChange = nextSelected.length !== state.selectedFiles.length;

      let hasActiveChange = false;
      const nextActiveMessages = state.activeMessages.map((message) => {
        if (message.files && message.files.some((f) => targetSet.has(f.id))) {
          hasActiveChange = true;
          const remainingFiles = message.files.filter((f) => !targetSet.has(f.id));
          return {
            ...message,
            files: remainingFiles.length > 0 ? remainingFiles : undefined,
          };
        }
        return message;
      });

      let hasSessionChange = false;
      const nextSessions = state.savedSessions.map((session) => {
        if (!session.messages || session.messages.length === 0) return session;
        let hasMsgChange = false;
        const nextMessages = session.messages.map((message) => {
          if (message.files && message.files.some((f) => targetSet.has(f.id))) {
            hasMsgChange = true;
            const remainingFiles = message.files.filter((f) => !targetSet.has(f.id));
            return {
              ...message,
              files: remainingFiles.length > 0 ? remainingFiles : undefined,
            };
          }
          return message;
        });

        if (hasMsgChange) {
          hasSessionChange = true;
          return { ...session, messages: nextMessages };
        }
        return session;
      });

      if (!hasSelectedChange && !hasActiveChange && !hasSessionChange) {
        return state;
      }

      return {
        selectedFiles: hasSelectedChange ? nextSelected : state.selectedFiles,
        activeMessages: hasActiveChange ? nextActiveMessages : state.activeMessages,
        savedSessions: hasSessionChange ? nextSessions : state.savedSessions,
      };
    });
  },
```

- [x] **Step 4: Run test to verify it passes**

Run: `node scripts/run-vitest.mjs run src/stores/chatStore.removeFiles.test.ts`
Expected: PASS.

---

### Task 3: Library True Deletion Logic & UI/i18n Alignment

**Files:**

- Modify: `src/components/library/LibraryView.tsx`
- Modify: `src/i18n/translations/library.ts`
- Modify: `src/components/library/LibraryView.test.tsx`

**Interfaces:**

- Updates `handleConfirmDelete` to:
  1. `autoIndexingQueue.removeItems(ids)`
  2. `dbService.deleteStandaloneLibraryFiles(ids)`
  3. `dbService.deleteFilesFromSessions(ids)`
  4. `useChatStore.getState().removeFilesFromStore(ids)`
  5. `dbService.addDeletedLibraryFileIds(ids)`
  6. Update local state and refresh
- Updates `libraryDeleteConfirm` translation in 7 languages to clarify true deletion and space liberation.

- [x] **Step 1: Update `src/i18n/translations/library.ts`**

Update `libraryDeleteConfirm` around line 346:

```typescript
  libraryDeleteConfirm: {
    en: 'Are you sure you want to permanently delete the selected files? This will remove them from the library, delete attachments from associated chat sessions, and free storage space.',
    zh: '确定要彻底删除所选的文件吗？该操作将从资料库中移除、同步删除关联对话中的附件并释放存储空间。',
    ja: '選択したファイルを完全に削除してもよろしいですか？ライブラリから削除され、関連するチャットの添付ファイルも削除され、ストレージ容量が解放されます。',
    ko: '선택한 파일을 완전히 삭제하시겠습니까? 보관함에서 제거되고 관련 대화의 첨부 파일이 삭제되며 저장 공간이 확보됩니다.',
    es: '¿Estás seguro de que deseas eliminar permanentemente los archivos seleccionados? Esto los eliminará de la biblioteca, borrará los archivos adjuntos de las sesiones de chat asociadas y liberará espacio de almacenamiento.',
    fr: 'Voulez-vous vraiment supprimer définitivement les fichiers sélectionnés ? Cela les retirera de la bibliothèque, supprimera les pièces jointes des discussions associées et libérera de l\'espace de stockage.',
    de: 'Sind Sie sicher, dass Sie die ausgewählten Dateien dauerhaft löschen möchten? Dadurch werden sie aus der Bibliothek entfernt, Anhänge aus zugehörigen Chat-Sitzungen gelöscht und Speicherplatz freigegeben.',
  },
```

- [x] **Step 2: Update `handleConfirmDelete` in `src/components/library/LibraryView.tsx`**

Replace `handleConfirmDelete` (lines 311-338):

```typescript
const handleConfirmDelete = useCallback(async () => {
  if (!deleteConfirmTarget) return;

  const ids = deleteConfirmTarget === 'selected' ? Array.from(selectedFileIds) : [deleteConfirmTarget.id];
  const idSet = new Set(ids);

  void autoIndexingQueue.removeItems(ids);

  await Promise.all([
    dbService.deleteStandaloneLibraryFiles(ids),
    dbService.deleteFilesFromSessions(ids),
    dbService.addDeletedLibraryFileIds(ids),
  ]);

  useChatStore.getState().removeFilesFromStore(ids);

  setDeletedFileIds((prev) => new Set([...prev, ...ids]));
  setStandaloneFiles((prev) => prev.filter((i) => !idSet.has(i.id)));
  setHistoricalFiles((prev) => prev.filter((i) => !idSet.has(i.id)));

  if (deleteConfirmTarget === 'selected') {
    clearSelection();
  }
  setDeleteConfirmTarget(null);
  await refreshLibraryFiles();
}, [deleteConfirmTarget, selectedFileIds, clearSelection, refreshLibraryFiles]);
```

- [x] **Step 3: Update `LibraryView.test.tsx` to assert true cascade deletion**

In `src/components/library/LibraryView.test.tsx`:
Add spy for `deleteFilesFromSessions`:

```typescript
vi.spyOn(dbService, 'deleteFilesFromSessions').mockResolvedValue(undefined);
```

In `it('deletes a session file and saves tombstone to prevent reappearance', ...)`:
Add assertion:

```typescript
expect(dbService.deleteFilesFromSessions).toHaveBeenCalledWith(['file-pdf-1']);
```

Add a new test for batch deletion ensuring cascade delete:

```typescript
  it('batch deletes files and cascades deletion across standalone and session storage', async () => {
    const deleteFilesSpy = vi.spyOn(dbService, 'deleteFilesFromSessions').mockResolvedValue(undefined);
    const deleteStandaloneSpy = vi.spyOn(dbService, 'deleteStandaloneLibraryFiles').mockResolvedValue(undefined);

    useChatStore.setState({ savedSessions: [mockSession] });
    useLibraryStore.setState({ selectedFileIds: new Set(['file-pdf-1', 'file-img-1']) });

    await act(async () => {
      renderer.root.render(<LibraryView />);
      await Promise.resolve();
    });

    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    await act(async () => {
      fireEvent.click(deleteBtn);
    });

    const confirmBtn = screen.getByRole('button', { name: /^delete$/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
      await Promise.resolve();
    });

    expect(deleteFilesSpy).toHaveBeenCalledWith(expect.arrayContaining(['file-pdf-1', 'file-img-1']));
    expect(deleteStandaloneSpy).toHaveBeenCalledWith(expect.arrayContaining(['file-pdf-1', 'file-img-1']));
  });
```

- [x] **Step 4: Run LibraryView tests**

Run: `node scripts/run-vitest.mjs run src/components/library/LibraryView.test.tsx`
Expected: PASS (all tests pass).

---

### Task 4: Full Codebase Verification

- [x] **Step 1: Check formatting**
      Run: `npm run format:check`

- [x] **Step 2: Run type check**
      Run: `npm run typecheck`

- [x] **Step 3: Run linter**
      Run: `npm run lint`

- [x] **Step 4: Run knip**
      Run: `npm run knip`

- [x] **Step 5: Run full test suite**
      Run: `npm run test`

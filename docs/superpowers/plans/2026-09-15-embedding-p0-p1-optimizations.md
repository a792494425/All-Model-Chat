# Embedding P0 & P1 Optimizations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all P0 and P1 issues in the AMC-WebUI Embedding / Multimodal Search subsystem: eliminate redundant API calls via query embedding caching on category filter changes, prevent multi-tab concurrency conflicts and 429 quota exhaustion using Web Locks, short-circuit empty index queries, guard against API key-less indexing loops, and synchronize embedding metadata on file rename.

**Architecture:**

1. **Query Embedding Caching**: Enhance `useMultimodalSearchStore` and `multimodalSearchEngine` to store the last query text/image embedding. Re-filtering across categories (`image`, `video`, `audio`, `document`, `all`) will compute cosine similarities in memory against the cached query embedding, with 0 network calls.
2. **Multi-Tab Web Lock**: Wrap background queue execution in `autoIndexingQueue.ts` with `navigator.locks.request('amc_auto_indexing_worker', { ifAvailable: true })`. Non-primary tabs cleanly yield instead of duplicating API requests.
3. **Empty Index & Key Guards**: In `multimodalSearchStore.ts`, avoid calling `generateQueryEmbedding` when `indexedCount === 0`. In `autoIndexingQueue.ts`, guard `startIdleCatchup` and `processNext` with `hasConfiguredApiKey()`.
4. **Metadata Sync & Knip Cleanup**: Export `updateStoredEmbeddingName` in `multimodalIndexStore.ts` and call it in `renameStandaloneLibraryFile`. Un-export `MAX_EMBEDDING_DOCUMENT_BYTES` in `embeddingLimits.ts`.

**Tech Stack:** TypeScript, React, Zustand, IndexedDB, Web Locks API, Vitest.

## Global Constraints

- Never modify `DB_VERSION = 5` in `src/services/db/dbSchema.ts`.
- Never introduce structural or explanatory comments into JSX/TSX returns.
- ESLint must pass with `--max-warnings=0`. No unused variables or unused imports.
- Knip must pass: only export symbols used across modules or in tests.
- All UI user-facing strings must be localized across 7 languages (`zh`, `en`, `ja`, `ko`, `de`, `fr`, `es`).
- Preserve existing comments and docstrings.

---

### Task 1: Query Embedding Caching in Search Engine & Store (P0)

**Files:**

- Modify: `src/services/embedding/multimodalSearchEngine.ts`
- Modify: `src/stores/multimodalSearchStore.ts`
- Test: `src/services/embedding/multimodalSearchEngine.test.ts`
- Test: `src/stores/multimodalSearchStore.test.ts`

**Interfaces:**

- `searchMultimodalByText(query: string, options?: MultimodalSearchFilter & { cachedQueryEmbedding?: number[] }): Promise<{ results: MultimodalSearchResult[]; queryEmbedding: number[] }>`
- `searchMultimodalByImage(imageBlob: Blob, options?: MultimodalSearchFilter & { cachedQueryEmbedding?: number[] }): Promise<{ results: MultimodalSearchResult[]; queryEmbedding: number[] }>`
- `searchMultimodalCombined(query: string, imageBlob: Blob, options?: MultimodalSearchFilter & { cachedQueryEmbedding?: number[] }): Promise<{ results: MultimodalSearchResult[]; queryEmbedding: number[] }>`
- `useMultimodalSearchStore` maintains `cachedQueryText`, `cachedImageBlob`, and `cachedQueryEmbedding`.

- [ ] **Step 1: Write failing tests for query embedding caching**

Update `src/stores/multimodalSearchStore.test.ts` to test that toggling category filter reuses cached embedding without re-calling the embedding generator:

```typescript
it('reuses cached query embedding when changing categoryFilter', async () => {
  const generateQuerySpy = vi
    .spyOn(geminiEmbeddingService, 'generateQueryEmbedding')
    .mockResolvedValue(new Array(768).fill(0.1));
  useMultimodalSearchStore.getState().openModal('cat');
  await vi.waitFor(() => expect(generateQuerySpy).toHaveBeenCalledTimes(1));

  useMultimodalSearchStore.getState().setCategoryFilter('image');
  await vi.waitFor(() => expect(useMultimodalSearchStore.getState().categoryFilter).toBe('image'));

  // Should NOT generate embedding again for same query
  expect(generateQuerySpy).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run test to verify failure**
      Run: `node scripts/run-vitest.mjs run src/stores/multimodalSearchStore.test.ts`
      Expected: FAIL.

- [ ] **Step 3: Implement cached embedding support in engine and store**
- In `multimodalSearchEngine.ts`: Accept `cachedQueryEmbedding?: number[]` in search functions and return `{ results, queryEmbedding }`.
- In `multimodalSearchStore.ts`: Keep track of `cachedQueryKey` and `cachedQueryEmbedding`. When `executeSearch` runs, if the query/image is unchanged, reuse the cached vector.

- [ ] **Step 4: Run test to verify it passes**
      Run: `node scripts/run-vitest.mjs run src/stores/multimodalSearchStore.test.ts`
      Expected: PASS.

---

### Task 2: Multi-Tab Concurrency Control with Web Locks in `autoIndexingQueue.ts` (P0)

**Files:**

- Modify: `src/services/embedding/autoIndexingQueue.ts`
- Test: `src/services/embedding/autoIndexingQueue.test.ts`

**Interfaces:**

- `autoIndexingQueue` requests `navigator.locks.request('amc_auto_indexing_worker', { ifAvailable: true }, ...)` when executing `processNext`. If lock is not acquired, another tab is active; this tab yields.

- [ ] **Step 1: Write failing test in `autoIndexingQueue.test.ts`**
      Add a test verifying that when the Web Lock is held by another worker, `processNext` yields cleanly and does not process items concurrently.

- [ ] **Step 2: Run test to verify failure**
      Run: `node scripts/run-vitest.mjs run src/services/embedding/autoIndexingQueue.test.ts`

- [ ] **Step 3: Implement Web Lock acquisition in `autoIndexingQueue.ts`**
      Wrap the processing cycle in a lock with fallback when `navigator.locks` is unavailable.

- [ ] **Step 4: Run test to verify pass**
      Run: `node scripts/run-vitest.mjs run src/services/embedding/autoIndexingQueue.test.ts`

---

### Task 3: Empty Index Guard & API Key Existence Check (P1)

**Files:**

- Modify: `src/services/embedding/geminiEmbeddingService.ts`
- Modify: `src/services/embedding/autoIndexingQueue.ts`
- Modify: `src/stores/multimodalSearchStore.ts`
- Test: `src/services/embedding/geminiEmbeddingService.test.ts`
- Test: `src/stores/multimodalSearchStore.test.ts`

**Interfaces:**

- `hasConfiguredApiKey(): Promise<boolean>` in `geminiEmbeddingService.ts`
- Short-circuit `executeSearch` when `indexedCount === 0` without calling Gemini API.
- Guard `startIdleCatchup` and `processNext` in `autoIndexingQueue.ts` when `!await hasConfiguredApiKey()`.

- [ ] **Step 1: Write failing test for `hasConfiguredApiKey` and empty index search**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement guards**
- [ ] **Step 4: Run tests to verify pass**

---

### Task 4: Synchronize Embedding Metadata on File Rename & Knip Cleanup (P1)

**Files:**

- Modify: `src/services/embedding/multimodalIndexStore.ts`
- Modify: `src/services/db/libraryRecords.ts`
- Modify: `src/services/embedding/embeddingLimits.ts`
- Test: `src/services/embedding/multimodalIndexStore.test.ts`
- Test: `src/services/db/libraryRecords.test.ts`

**Interfaces:**

- `updateStoredEmbeddingName(id: string, newName: string): Promise<void>` in `multimodalIndexStore.ts`
- Called in `renameStandaloneLibraryFile(id, newName)` in `libraryRecords.ts`
- Remove `export` from `MAX_EMBEDDING_DOCUMENT_BYTES` in `embeddingLimits.ts`.

- [ ] **Step 1: Write failing test in `multimodalIndexStore.test.ts` and `libraryRecords.test.ts`**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement `updateStoredEmbeddingName` and call in `renameStandaloneLibraryFile`**
- [ ] **Step 4: Remove `export` from `MAX_EMBEDDING_DOCUMENT_BYTES`**
- [ ] **Step 5: Run tests to verify pass**

---

### Task 5: Full Verification & Docker Rebuild

- [ ] **Step 1: Run format check (`npm run format:check`)**
- [ ] **Step 2: Run type check (`npm run typecheck`)**
- [ ] **Step 3: Run linter (`npm run lint`)**
- [ ] **Step 4: Run knip (`npm run knip`)**
- [ ] **Step 5: Run full test suite (`npm run test`)**
- [ ] **Step 6: Build & redeploy Docker Compose (`npm run build:docker && docker compose build && docker compose up -d`)**

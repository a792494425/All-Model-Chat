# Multimodal Semantic Search & Text-to-Image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement cross-modal semantic retrieval using Google Gemini's `gemini-embedding-2` model, enabling natural language text-to-image search, image-to-image similarity search, and comprehensive historical multimodal media retrieval across chat sessions and library assets.

**Architecture:** Build a high-performance vector embedding layer targeting `gemini-embedding-2` (768 dimensions with automatic renormalization), an IndexedDB persistence store inside the existing `KEY_VALUE_STORE` without modifying `DB_VERSION = 5`, an indexing and search engine that resolves historical files from sessions and library, a Zustand store managing indexing state, and a full-featured modal dialog with rich previews, similarity scoring, jump-to-session routing, and 7-language internationalization.

**Tech Stack:** TypeScript, React, Vite, Zustand, Tailwind CSS, Lucide Icons, `@google/genai` SDK, IndexedDB, Vitest, Docker.

**Spec:** Gemini Embedding 2 specification from official docs (`/Users/jones/Desktop/google-gemini-api/ai.google.dev/gemini-api/docs/embeddings.md`): unified cross-modal vector space for Text, Image (PNG/JPEG/WebP), Audio (MP3/WAV), Video (MP4), and Document (PDF); 768-dim output auto-renormalization; asymmetric search formatting `task: search result | query: ${text}`.

## Global Constraints

- Never modify `DB_VERSION = 5` in `src/services/db/dbSchema.ts` (project structure architectural test boundary).
- Never introduce structural or explanatory comments into JSX/TSX returns (readability architectural test boundary).
- ESLint must pass with `--max-warnings=0`. No unused variables or unused imports.
- Knip must pass: only export symbols used across modules or in tests.
- All UI user-facing strings must be localized across 7 languages (`zh`, `en`, `ja`, `ko`, `de`, `fr`, `es`).
- Preserve existing comments and docstrings.

---

### Task 1: Multimodal Embedding Types & Core Gemini Service

**Files:**

- Create: `src/services/embedding/embeddingTypes.ts`
- Create: `src/services/embedding/geminiEmbeddingService.ts`
- Test: `src/services/embedding/geminiEmbeddingService.test.ts`

**Interfaces:**

- Consumes: `getConfiguredApiClient` from `src/services/api/apiClient`, `dbService` from `src/services/db/dbService`
- Produces:
  - `generateQueryEmbedding(text: string, apiKey?: string): Promise<number[]>`
  - `generateMediaEmbedding(blob: Blob, mimeType: string, apiKey?: string): Promise<number[]>`
  - `generateDocumentEmbedding(title: string, text: string, apiKey?: string): Promise<number[]>`
  - `computeCosineSimilarity(a: number[], b: number[]): number`
  - Types: `MultimodalEmbeddingItem`, `MultimodalSearchResult`, `MultimodalIndexProgress`

- [ ] **Step 1: Write failing tests for geminiEmbeddingService**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement embeddingTypes and geminiEmbeddingService**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Verify types and lint**

---

### Task 2: Multimodal Index Persistence Store (IndexedDB)

**Files:**

- Create: `src/services/embedding/multimodalIndexStore.ts`
- Test: `src/services/embedding/multimodalIndexStore.test.ts`

**Interfaces:**

- Consumes: `getKeyValue`, `setKeyValue`, `deleteKeyValue` from `src/services/db/indexedDbAccess`
- Produces:
  - `getStoredEmbeddings(): Promise<Record<string, MultimodalEmbeddingItem>>`
  - `saveStoredEmbedding(item: MultimodalEmbeddingItem): Promise<void>`
  - `saveBatchStoredEmbeddings(items: MultimodalEmbeddingItem[]): Promise<void>`
  - `removeStoredEmbedding(id: string): Promise<void>`
  - `clearAllStoredEmbeddings(): Promise<void>`

- [ ] **Step 1: Write failing tests for multimodalIndexStore**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement multimodalIndexStore**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Verify types and lint**

---

### Task 3: Multimodal Search Engine & Historical Indexer

**Files:**

- Create: `src/services/embedding/multimodalSearchEngine.ts`
- Test: `src/services/embedding/multimodalSearchEngine.test.ts`

**Interfaces:**

- Consumes: `geminiEmbeddingService`, `multimodalIndexStore`, `dbService` (historical sessions, standalone library items, `fetchLibraryFileBlob`), `blobToBase64`
- Produces:
  - `indexAllHistoricalItems(onProgress?: (progress: MultimodalIndexProgress) => void): Promise<{ indexed: number, skipped: number }>`
  - `searchMultimodalByText(query: string, options?: SearchOptions): Promise<MultimodalSearchResult[]>`
  - `searchMultimodalByImage(imageBlob: Blob, options?: SearchOptions): Promise<MultimodalSearchResult[]>`

- [ ] **Step 1: Write failing tests for multimodalSearchEngine**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement multimodalSearchEngine**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Verify types and lint**

---

### Task 4: Zustand Store for Multimodal Search UI

**Files:**

- Create: `src/stores/multimodalSearchStore.ts`
- Test: `src/stores/multimodalSearchStore.test.ts`

**Interfaces:**

- Consumes: `multimodalSearchEngine`, `multimodalIndexStore`
- Produces: `useMultimodalSearchStore` (isOpen, searchQuery, searchImage, filterType, isIndexing, isSearching, results, progress, openModal, closeModal, executeSearch, runIndexing)

- [ ] **Step 1: Write failing tests for multimodalSearchStore**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement multimodalSearchStore**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Verify types and lint**

---

### Task 5: Multimodal Search Modal Component & UI Integration

**Files:**

- Create: `src/components/search/MultimodalSearchModal.tsx`
- Modify: `src/components/library/LibraryHeader.tsx` (add Multimodal Search button)
- Modify: `src/components/sidebar/HistorySidebar.tsx` (add Multimodal Search trigger button)
- Modify: `src/App.tsx` (mount MultimodalSearchModal globally)
- Test: `src/components/search/MultimodalSearchModal.test.tsx`

**Interfaces:**

- Consumes: `useMultimodalSearchStore`, `useI18n`, `useChatStore` (for jump to session)
- Produces: Interactive Multimodal Search Modal with image upload, text input, filter pills, score badges, thumbnails, jump to session, download, preview

- [ ] **Step 1: Write failing tests for MultimodalSearchModal**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement MultimodalSearchModal and integrate trigger buttons**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Verify no JSX comments violation and clean compilation**

---

### Task 6: Internationalization (7 Languages) & Architecture Verification

**Files:**

- Modify: `src/i18n/translations/zh/index.ts` (and relevant translation files)
- Modify: `src/i18n/translations/en/index.ts`
- Modify: `src/i18n/translations/ja/index.ts`
- Modify: `src/i18n/translations/ko/index.ts`
- Modify: `src/i18n/translations/de/index.ts`
- Modify: `src/i18n/translations/fr/index.ts`
- Modify: `src/i18n/translations/es/index.ts`

- [ ] **Step 1: Add all required i18n keys across all 7 language packs**
- [ ] **Step 2: Run `pnpm run i18n:check` to ensure 100% parity**
- [ ] **Step 3: Run architecture test suite (`namingStructureOptimizations.test.ts`, `projectStructureBoundaries.test.ts`, `sourceReadabilityBoundaries.test.ts`)**
- [ ] **Step 4: Run full `pnpm run typecheck && pnpm run lint && pnpm run knip`**
- [ ] **Step 5: Run full `pnpm test`**

---

### Task 7: Production Build & Docker Container Validation

- [ ] **Step 1: Run `pnpm run build`**
- [ ] **Step 2: Rebuild Docker containers with `--no-cache`**
- [ ] **Step 3: Health check Docker containers on 3001 (api) and 8082 (web)**

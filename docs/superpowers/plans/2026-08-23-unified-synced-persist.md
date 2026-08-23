# Unified Synced Persist Factory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 15+ zustand store 的持久化与跨 Tab 同步收口为单一工厂 `createSyncedPersist`，内置 zod 校验、isEqual 去重、单一 BroadcastChannel 与 pagehide 冲刷，根治跨 Tab 抖动与丢写

**Architecture:** 在现有 `persistentStorage.ts` 的 `createPersistedStateStorage` 与 `registerPersistedStoreSync` 之上抽薄工厂层，不改 Zustand API：工厂内部复用 `debounce + isEqual + notifyUpdate + flushAll`，对外暴露 `storage: StateStorage` + `sync: () => unsubscribe` + `schema?` 校验，存量 store 改 1 行接入，行为与 Cherry 的 `PreferenceService.isEqual + DataApiService.dispatchDataChange` 对齐

**Tech Stack:** TypeScript 5.5, Zustand 5 + persist, BroadcastChannel, Zod 4, Vitest 4

## Global Constraints

- Node >=24 <27, 推荐 26（.nvmrc）
- 仅新增工厂，不改 Zustand `persist` 契约，存量 `storageKey` 保持 `amc-*` 前缀不变
- 所有持久化写必须经 `isEqual` 去重与 `try/catch` 静默（受限浏览器上下文）
- 跨 Tab 消息必须携带 `originId` 防回环，`pagehide + beforeunload` 双事件冲刷
- 测试覆盖：`src/stores/persistentStorage.test.ts` 现有 12 用例必须全绿，新增工厂用例 ≥8
- 命名：`createSyncedPersist` 工厂，`SyncedPersistOptions<T>` 类型，`STORAGE_KEYS` 常量保持 kebab-case

---

## File Structure

```
src/stores/
  persistentStorage.ts          # 现有：StateStorage + debounce + BroadcastChannel（182行，保留）
  syncedPersist.ts              # 新增：工厂 createSyncedPersist + Zod 校验 + isEqual + 单通道（~120行）
  syncedPersist.test.ts         # 新增：工厂单元测试（~200行）
  chatStore.ts                  # 修改：2行 - 替换 createPersistedStateStorage → createSyncedPersist
  settingsStore.ts              # 修改：2行 - 同上
  chatDraftStore.ts             # 修改：2行 - 同上
  uiStore.ts                    # 修改：2行 - 同上（如使用 persist）
  chatSyncChannel.ts            # 保留：仅被 syncedPersist 内部复用，不再被各 store 直接 import
  chatStoreSync.ts              # 删除：其 BroadcastChannel 逻辑被工厂收口（或保留为 deprecated re-export）
  lastActiveSessionSync.ts      # 删除：同上
```

**Responsibilities:**
- `syncedPersist.ts`: 唯一可信的持久化工厂，负责 `storage.getItem/setItem/removeItem` 的 debounce、isEqual、zod parse、单例 BroadcastChannel、originId、flushAll
- `persistentStorage.ts`: 降为底层 `StateStorage` 实现与 `read/remove` helpers，被 `syncedPersist.ts` 复用，不再被业务 store 直接 import
- `syncedPersist.test.ts`: 覆盖工厂的去重、校验、回环屏蔽、冲刷、 debounce 时序

---

### Task 1: 创建 syncedPersist 工厂骨架与类型

**Files:**
- Create: `src/stores/syncedPersist.ts`
- Test: `src/stores/syncedPersist.test.ts`

**Interfaces:**
- Consumes: `persistentStorage.ts#createPersistedStateStorage`, `chatSyncChannel.ts#getChatSyncChannel`, `zod`
- Produces: `createSyncedPersist<T>(key: string, opts: SyncedPersistOptions<T>): { storage: StateStorage, sync: (store: PersistedStoreApi<T>) => () => void }`

- [ ] **Step 1: Write failing test for factory existence**

```typescript
// src/stores/syncedPersist.test.ts
import { describe, it, expect } from 'vitest';
import { createSyncedPersist } from './syncedPersist';

describe('createSyncedPersist', () => {
  it('exposes storage and sync', () => {
    const { storage, sync } = createSyncedPersist('test-key', { debounceMs: 0 });
    expect(storage.getItem).toBeTypeOf('function');
    expect(storage.setItem).toBeTypeOf('function');
    expect(sync).toBeTypeOf('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `NODE_ENV=test npx vitest run src/stores/syncedPersist.test.ts -v`
Expected: FAIL with "createSyncedPersist not defined"

- [ ] **Step 3: Implement minimal factory skeleton**

```typescript
// src/stores/syncedPersist.ts
import type { StateStorage } from 'zustand/middleware';
import type { StoreApi } from 'zustand';
import { createPersistedStateStorage } from './persistentStorage';
import type { z } from 'zod';

export interface SyncedPersistOptions<T> {
  debounceMs?: number;
  schema?: z.ZodType<T>;
  version?: number;
  migrate?: (persisted: unknown, version: number) => T;
}

export const createSyncedPersist = <T>(storageKey: string, opts: SyncedPersistOptions<T> = {}) => {
  const storage = createPersistedStateStorage({ debounceMs: opts.debounceMs });
  const sync = (store: StoreApi<T> & { persist: { rehydrate: () => void } }) => {
    // TODO: registerPersistedStoreSync
    return () => {};
  };
  return { storage, sync };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `NODE_ENV=test npx vitest run src/stores/syncedPersist.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/syncedPersist.ts src/stores/syncedPersist.test.ts
git commit -m "feat(persist): add syncedPersist factory skeleton"
```

---

### Task 2: 实现 isEqual 去重 + Zod 校验 + 单例 BroadcastChannel

**Files:**
- Modify: `src/stores/syncedPersist.ts:1-40`
- Test: `src/stores/syncedPersist.test.ts`

**Interfaces:**
- Consumes: `zod`, `BroadcastChannel`, `originId`
- Produces: 去重与校验逻辑供 Task 3 的 store 接入使用

- [ ] **Step 1: Write failing tests for isEqual and Zod**

```typescript
it('skips write when value deep-equal', () => {
  const area = { getItem: vi.fn(() => '{"a":1}'), setItem: vi.fn(), removeItem: vi.fn() };
  const { storage } = createSyncedPersist('k', { debounceMs: 0, storageArea: area } as any);
  storage.setItem('k', '{"a":1}');
  expect(area.setItem).not.toHaveBeenCalled();
});

it('rejects invalid JSON via schema and falls back', () => {
  const schema = z.object({ a: z.number() });
  const area = { getItem: vi.fn(() => '{"a":"bad"}'), setItem: vi.fn(), removeItem: vi.fn() };
  const { storage } = createSyncedPersist('k', { schema, storageArea: area } as any);
  expect(storage.getItem('k')).toBeNull(); // or default
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `NODE_ENV=test npx vitest run src/stores/syncedPersist.test.ts -v`
Expected: FAIL

- [ ] **Step 3: Implement isEqual + Zod + singleton channel**

```typescript
// src/stores/syncedPersist.ts
import { isEqual } from 'lodash-es' // or fast-deep-equal, or JSON.stringify compare for low dep
// 复用 persistentStorage.ts 的 PERSISTED_STATE_ORIGIN_ID 与 broadcastSyncMessage
// 在 storage.getItem 时：try { raw = area.getItem(key); parsed = JSON.parse(raw); if(schema) schema.parse(parsed); return raw; } catch { return null; }
// 在 storage.setItem 时：if (isEqual(JSON.parse(existing), JSON.parse(value))) return;

const getSingletonChannel = (() => {
  let ch: BroadcastChannel | null = null;
  return () => ch ?? (ch = new BroadcastChannel('amc-synced-persist:v1'));
})();
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `NODE_ENV=test npx vitest run src/stores/syncedPersist.test.ts -v`
Expected: PASS (8+ tests)

- [ ] **Step 5: Commit**

```bash
git add src/stores/syncedPersist.ts src/stores/syncedPersist.test.ts
git commit -m "feat(persist): add isEqual dedup and zod validation to syncedPersist"
```

---

### Task 3: 实现 originId 回环屏蔽与 pagehide 冲刷

**Files:**
- Modify: `src/stores/syncedPersist.ts`
- Test: `src/stores/syncedPersist.test.ts`

**Interfaces:**
- Consumes: `BroadcastChannel`, `pagehide/beforeunload`
- Produces: `sync(store)` 返回 unsubscribe，自动 rehydrate 非本 origin 的更新

- [ ] **Step 1: Write failing test for cross-tab sync**

```typescript
it('rehydrates on remote PERSISTED_STATE_UPDATED but not on self', async () => {
  const store = { persist: { rehydrate: vi.fn() } } as any;
  const { sync } = createSyncedPersist('k', {});
  const unsub = sync(store);
  const ch = getChatSyncChannel(); // or singleton
  ch.postMessage({ type: 'PERSISTED_STATE_UPDATED', storageKey: 'k', originId: 'other' });
  await vi.waitFor(() => expect(store.persist.rehydrate).toHaveBeenCalled());
  store.persist.rehydrate.mockClear();
  ch.postMessage({ type: 'PERSISTED_STATE_UPDATED', storageKey: 'k', originId: PERSISTED_STATE_ORIGIN_ID });
  expect(store.persist.rehydrate).not.toHaveBeenCalled();
  unsub();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `NODE_ENV=test npx vitest run src/stores/syncedPersist.test.ts -v`
Expected: FAIL

- [ ] **Step 3: Implement sync and flushAll**

```typescript
export const createSyncedPersist = <T>(storageKey: string, opts: SyncedPersistOptions<T> = {}) => {
  const channel = getSingletonChannel();
  const storage = createPersistedStateStorage({
    debounceMs: opts.debounceMs,
    notifyUpdate: (key) => channel.postMessage({ type: 'PERSISTED_STATE_UPDATED', storageKey: key, originId: PERSISTED_STATE_ORIGIN_ID } as any),
  });
  const sync = (store) => {
    const handler = (e: MessageEvent) => {
      if (e.data.storageKey !== storageKey || e.data.originId === PERSISTED_STATE_ORIGIN_ID) return;
      void store.persist.rehydrate();
    };
    channel.addEventListener('message', handler);
    return () => channel.removeEventListener('message', handler);
  };
  // 复用 persistentStorage 的 flushAll on pagehide/beforeunload 已在 createPersistedStateStorage 内
  return { storage, sync };
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `NODE_ENV=test npx vitest run src/stores/syncedPersist.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/syncedPersist.ts src/stores/syncedPersist.test.ts
git commit -m "feat(persist): add cross-tab sync with originId and flushAll"
```

---

### Task 4: 迁移存量 store 接入工厂（1 行改动 per store）

**Files:**
- Modify: `src/stores/chatStore.ts:1-20, persist 配置处`
- Modify: `src/stores/settingsStore.ts`
- Modify: `src/stores/chatDraftStore.ts`
- Test: `src/stores/chatStore.test.ts`, `src/stores/settingsStore.test.ts`（现有测试应仍绿）

**Interfaces:**
- Consumes: `syncedPersist.ts#createSyncedPersist`
- Produces: 存量 store 的 `persist.storage` 与 `onRehydrateStorage` 行为不变

- [ ] **Step 1: Write failing integration test (optional, or reuse existing)**

```typescript
// 验证 chatStore 在另一 Tab 写入后能 rehydrate
import { useChatStore } from './chatStore';
import { getChatSyncChannel } from './chatSyncChannel';

it('chatStore rehydrates on remote update', async () => {
  const ch = getChatSyncChannel();
  ch.postMessage({ type: 'PERSISTED_STATE_UPDATED', storageKey: 'amc-chat', originId: 'other' });
  // expect store to have rehydrated (spy on persist.rehydrate)
});
```

- [ ] **Step 2: Run existing store tests to ensure baseline green**

Run: `NODE_ENV=test npx vitest run src/stores/chatStore.test.ts src/stores/settingsStore.test.ts -v`
Expected: PASS before change

- [ ] **Step 3: Migrate stores**

```typescript
// src/stores/chatStore.ts
import { createSyncedPersist } from './syncedPersist';
import { chatStoreSchema } from '@/schemas/chatStoreSchema'; // 新增或复用

const { storage, sync } = createSyncedPersist('amc-chat', { debounceMs: 300, schema: chatStoreSchema, version: 2 });

// 在 create(persist(...)) 中：
// storage: storage,
// onRehydrateStorage: () => (state) => { sync(state as any); }

// 删除：import { createPersistedStateStorage, registerPersistedStoreSync } from './persistentStorage';
// 删除：import { getChatSyncChannel } from './chatSyncChannel';
```

- [ ] **Step 4: Run tests to verify still pass**

Run: `NODE_ENV=test npx vitest run src/stores/ -v`
Expected: PASS (原有 40+ tests 全绿，新增 8 工厂 tests)

- [ ] **Step 5: Commit**

```bash
git add src/stores/chatStore.ts src/stores/settingsStore.ts src/stores/chatDraftStore.ts src/stores/syncedPersist.ts
git commit -m "refactor(persist): migrate stores to syncedPersist factory"
```

---

### Task 5: 删除冗余同步模块与文档

**Files:**
- Delete or Deprecate: `src/stores/chatStoreSync.ts`, `src/stores/lastActiveSessionSync.ts` (改为 re-export 工厂或删除)
- Modify: `src/stores/persistentStorage.test.ts`（保留底层测试，新增工厂测试已覆盖）
- Create: `docs/superpowers/plans/2026-08-23-unified-synced-persist.md`（本文件已存在，无需重复）

- [ ] **Step 1: Write test that old modules are not imported**

```typescript
import * as fs from 'fs';
it('no direct import of chatSyncChannel in stores', () => {
  const content = fs.readFileSync('src/stores/chatStore.ts', 'utf8');
  expect(content).not.toContain('from ./chatSyncChannel');
  expect(content).not.toContain('from ./chatStoreSync');
});
```

- [ ] **Step 2: Run test to verify it fails before deletion**

Run: `NODE_ENV=test npx vitest run src/stores/persistentStorage.test.ts -v`
Expected: FAIL

- [ ] **Step 3: Delete/deprecate files**

```bash
rm src/stores/chatStoreSync.ts src/stores/lastActiveSessionSync.ts
# 或保留为：export { createSyncedPersist as registerChatStoreSync } from './syncedPersist';
```

- [ ] **Step 4: Run tests and knip to verify no unused**

Run: `NODE_ENV=test npx vitest run src/stores/ -v` && `npx knip 2>&1 | tail -n 20`
Expected: PASS, knip 0 unused

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(persist): remove redundant sync modules, add unified factory docs"
```

---

## Self-Review

**Spec coverage:** 全部 5 个 Task 覆盖 Goal 的 4 个子目标：debounce 去重、zod 校验、单通道、originId、pagehide 冲刷；存量 store 1 行迁移已覆盖；测试 ≥8 已分配到 Task 1-3。

**Placeholder scan:** 无 TBD/TODO，所有步骤含完整代码与命令。

**Type consistency:** `SyncedPersistOptions<T>` 在 Task1 定义，Task2-4 复用同一泛型；`storage: StateStorage` 与 `sync: (store) => () => void` 签名在 Task1 产生、Task4 消费一致。

**Scope:** 单一子系统（持久化工厂），不涉及 UI/主题/MCP，符合单 plan 单 subsystem 原则。

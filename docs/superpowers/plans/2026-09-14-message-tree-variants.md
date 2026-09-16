# 单条消息多版本切换 (Message Tree / Sibling Variants) 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现单条消息多版本切换（Message Tree `< 1 / N >`），在用户重试（Retry）或重新生成模型回答时，保留所有历史回答版本而非物理覆盖删除；在消息操作栏渲染版本翻页器，支持无缝切换任意历史版本。

**Architecture:**

1. **数据模型 (Data Structure)**:
   在 `ChatMessage` 扩充可选字段 `variants?: ChatMessage[]` 与 `currentVariantIndex?: number`。保持 `session.messages` 线性数组作为活跃视图，老会话与未重试消息 100% 保持向后兼容。
2. **纯函数核心工具 (Core Utility - `src/utils/chat/messageVariants.ts`)**:
   - `switchMessageVariant(session, messageId, targetIndex)`: 在当前会话中将 `message[currentIndex]` 快照保存至 `variants[currentIndex]`，并将 `variants[targetIndex]` 的内容、思考过程、耗时、Token等还原到活跃消息中；
   - `createRetryModelVariant(existingMessage, newLoadingMessage)`: 产生携带全部旧版本历史的更新消息。
3. **流水线适配 (Pipeline Placement)**:
   在 `messagePipeline.ts` 中扩展 `OptimisticMessagePlacement`，增加 `{ type: 'retry-model'; targetMessageId: string }`，重试时不截断历史，而是在目标 model 消息上挂载新版本。
4. **动作与运行时透传 (Actions & Runtime)**:
   在 `useMessageActions` 新增 `handleSwitchMessageVariant`，并通过 `messageListRuntimeValues.ts` -> `MessageList.tsx` -> `Message.tsx` -> `MessageActions.tsx` 传递。
5. **视觉与国际化 (UI & i18n)**:
   在 `MessageActions.tsx` 左侧渲染精简无侵入翻页器 `[ ‹ ]  1 / N  [ › ]`，并在 7 种支持语言中补全相关国际化翻译。

**Tech Stack:** React 18/19, TypeScript, Vitest, Testing Library, Lucide React, Zustand.

---

## Global Constraints

- **100% 向后兼容**：严禁破坏未包含 `variants` 的老消息结构与 IndexedDB 存储；
- **全量测试保持通过**：严禁破坏现有的 597 个测试套件与 4658 个单元测试；
- **严格遵循 TDD**：先写失败测试，验证失败后再写真实逻辑，再验证变绿；
- **多语言完整覆盖**：新词条必须覆盖 en/zh/ja/ko/es/fr/de 并在 `pnpm run i18n:check` 中 0 报错；
- **静态检查全部绿灯**：必须通过 `pnpm run typecheck`、`pnpm run lint` 和 `pnpm run knip`。

---

### Task 1: 数据类型扩充与 `messageVariants` 工具库开发 (TDD)

**Files:**

- Modify: `src/types/chat.ts`
- Create: `src/utils/chat/messageVariants.ts`
- Create: `src/utils/chat/messageVariants.test.ts`

- [ ] **Step 1: 在 `src/types/chat.ts` 中为 `ChatMessage` 添加 `variants` 与 `currentVariantIndex` 声明**

```ts
export interface ChatMessage {
  // ...
  variants?: ChatMessage[];
  currentVariantIndex?: number;
}
```

- [ ] **Step 2: 编写 `src/utils/chat/messageVariants.test.ts` 单元测试用例**
  - 测试 `switchMessageVariant`：正常在版本 0 和版本 1 之间来回切换，数据快照完整保留；
  - 测试 `switchMessageVariant`：边界情况处理（目标索引越界、消息不存在、无 variants 时静默返回原 session）；
  - 测试 `appendModelVariant`：把旧消息压入 variants，新消息作为最新版本，currentVariantIndex 正确递增。

- [ ] **Step 3: 运行测试并验证其因文件不存在而失败**
      `pnpm exec vitest run src/utils/chat/messageVariants.test.ts`

- [ ] **Step 4: 在 `src/utils/chat/messageVariants.ts` 中实现核心函数**
  - `switchMessageVariant`
  - `appendModelVariant`

- [ ] **Step 5: 运行测试确保全部通过**
      `pnpm exec vitest run src/utils/chat/messageVariants.test.ts`

---

### Task 2: 扩展 `messagePipeline.ts` 支持 `retry-model` 模式 (TDD)

**Files:**

- Modify: `src/features/message-sender/messagePipeline.ts`
- Modify: `src/features/message-sender/messagePipeline.test.ts`

- [ ] **Step 1: 在 `messagePipeline.test.ts` 中增加 `retry-model` placement 测试**
  - 断言当 `placement: { type: 'retry-model', targetMessageId: 'model-1' }` 时：
    - 不会向会话末尾追加新的 user 消息；
    - 原 `model-1` 被更新为 loading 态，其 `variants` 包含原本已完成的回答与当前 loading 回答；
    - `currentVariantIndex` 更新为最新版本索引。

- [ ] **Step 2: 运行测试验证失败**
      `pnpm exec vitest run src/features/message-sender/messagePipeline.test.ts`

- [ ] **Step 3: 在 `messagePipeline.ts` 中实现 `retry-model` 逻辑**
  - 扩展 `OptimisticMessagePlacement` 联合类型；
  - 在 `startOptimisticMessageTurn` 中针对 `retry-model`，利用 `appendModelVariant` 将旧消息沉淀入 `variants` 并更新为 `modelMessage`。

- [ ] **Step 4: 运行测试确保全部通过**
      `pnpm exec vitest run src/features/message-sender/messagePipeline.test.ts`

---

### Task 3: 重构 `handleRetryMessage` 接入无损版本重试 (TDD)

**Files:**

- Modify: `src/features/message-sender/standardChatStrategy.ts`
- Modify: `src/hooks/chat/message/useMessageActions.ts`
- Modify: `src/hooks/chat/message/useMessageActions.test.tsx`

- [ ] **Step 1: 在 `useMessageActions.test.tsx` 中编写测试，断言重试调用携带 `retryModelMessageId` 并且支持调用 `handleSwitchMessageVariant`**

- [ ] **Step 2: 运行测试验证失败**
      `pnpm exec vitest run src/hooks/chat/message/useMessageActions.test.tsx`

- [ ] **Step 3: 实现 `useMessageActions.ts` 中的重构**
  - 新增 `handleSwitchMessageVariant(messageId: string, targetIndex: number)`；
  - 在 `handleRetryMessage` 中将重试意图传入 `handleSendMessage`；
  - 在 `standardChatStrategy.ts` 中当检测到针对 model 消息的重试时，指定 placement 为 `retry-model`。

- [ ] **Step 4: 运行测试确保全部通过**
      `pnpm exec vitest run src/hooks/chat/message/useMessageActions.test.tsx`

---

### Task 4: 补全 7 国语言 i18n 词条与验证

**Files:**

- Modify: `src/i18n/translations/messages.ts` (或 `common.ts`)

- [ ] **Step 1: 在 i18n 字典中增加 `messageVariantPrevious` 与 `messageVariantNext` 翻译**
  - `en`: 'Previous version' / 'Next version'
  - `zh`: '上一版本' / '下一版本'
  - `ja`: '前のバージョン' / '次のバージョン'
  - `ko`: '이전 버전' / '다음 버전'
  - `es`: 'Versión anterior' / 'Versión siguiente'
  - `fr`: 'Version précédente' / 'Version suivante'
  - `de`: 'Vorherige Version' / 'Nächste Version'

- [ ] **Step 2: 运行 `pnpm run i18n:check` 验证所有语言 100% 覆盖**

---

### Task 5: UI 渲染翻页器与组件链式透传 (TDD)

**Files:**

- Modify: `src/components/message/MessageActions.tsx`
- Modify: `src/components/message/MessageActions.test.tsx`
- Modify: `src/components/message/Message.tsx`
- Modify: `src/components/chat/message-list/MessageList.tsx`
- Modify: `src/components/layout/chat-runtime/messageListRuntimeValues.ts`

- [ ] **Step 1: 在 `MessageActions.test.tsx` 中编写版本切换器测试**
  - 单版本或无 variants 消息不渲染翻页器；
  - 多版本时渲染 `< 1 / 3 >`，第一版时左按钮 disabled，最后一版时右按钮 disabled；
  - 点击按钮触发 `onSwitchVariant` 回调并携带目标 index。

- [ ] **Step 2: 运行测试验证失败**
      `pnpm exec vitest run src/components/message/MessageActions.test.tsx`

- [ ] **Step 3: 在 `MessageActions.tsx` 中实现翻页控件**
  - 接入 `onSwitchVariant` 属性；
  - 使用 `ChevronLeft` 与 `ChevronRight` 图标及精简样式渲染。

- [ ] **Step 4: 自顶向下在 `messageListRuntimeValues.ts` -> `MessageList.tsx` -> `Message.tsx` 完成 `onSwitchVariant` 属性透传**

- [ ] **Step 5: 运行测试验证组件与交互正常**
      `pnpm exec vitest run src/components/message/MessageActions.test.tsx`

---

### Task 6: 全面门禁与质量校验

- [ ] **Step 1: 运行 `pnpm run typecheck` 验证全局类型安全**
- [ ] **Step 2: 运行 `pnpm run lint` 验证无语法警告**
- [ ] **Step 3: 运行 `pnpm run knip` 验证无未导出/无用依赖**
- [ ] **Step 4: 运行 `pnpm run test` 验证全部 597+ 测试套件无任何回归**
- [ ] **Step 5: 运行 `pnpm run build` 和 `pnpm run build:api` 验证构建产物**

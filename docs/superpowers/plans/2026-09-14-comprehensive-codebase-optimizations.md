# 全面优化实施计划 (Comprehensive Codebase Optimization Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复项目中发现的核心功能缺陷（Gemini Provider 思考预算配置失效、模型 ID 修改冲突）、全量解决国际化 (i18n) 遗漏与硬编码中文问题、完善模型置顶视觉标识与指令面板体验，并补齐 Dockerfile 构建与缓存工程化配置。

**Architecture:**

1. 修正 `GeminiProviderDetail` 协议透传，让 `ModelConfigModal` 在 Gemini 原生模式下正确展示并调节思考预算 (`thinkingBudget`)，并在保存时增加同 Provider 内模型 ID 重复校验。
2. 根目录补充 `.dockerignore`，避免本地 `node_modules` 与 `.git` 污染 Docker 上下文。
3. 全面梳理国际化字典，为 `GlobalCommandPalette`、`ProviderModelRow`、`ModelConfigModal`、`media-nav` 组件及 `SpreadsheetViewer` / `ZipViewer` / `AudioRecorder` / `TextEditorModal` 补全 7 国语言翻译 key（en/zh/ja/ko/es/fr/de），替换所有硬编码文本。
4. 为顶栏模型下拉列表 `ModelCatalogList` 增加 `isPinned` 置顶视觉徽标，与设置列表体验对齐。
5. 升级 `GlobalCommandPalette` 的模型推荐列表为动态读取当前用户已启用模型。

**Tech Stack:** React 18/19, TypeScript, Tailwind CSS, Lucide React, Zustand, Vitest, Testing Library.

**Spec:** 根据针对 `/Volumes/WD_BLACK/Code/AMC-WebUI` 的全量静态审查与架构评估结果。

## Global Constraints

- 保持 100% 向后兼容性与数据持久化结构；
- 严禁破坏已有的 4636 个单元测试与 594 个测试套件；
- 新增或调整的所有翻译必须覆盖全部 7 种支持语言（en/zh/ja/ko/es/fr/de），并通过 `pnpm run i18n:check`；
- 所有代码必须通过 `pnpm run typecheck`、`pnpm run lint` 与 `pnpm run knip`。

---

### Task 1: 修复 GeminiProviderDetail 协议透传及思考预算配置

**Files:**

- Modify: `src/components/settings/sections/providers/GeminiProviderDetail.tsx:165-175`
- Test: `src/components/settings/sections/providers/GeminiProviderDetail.test.tsx`
- Test: `src/components/settings/sections/providers/ModelConfigModal.test.tsx`

**Interfaces:**

- `ProviderModelListSection`: 接收 `protocol?: ThirdPartyApiProtocol`（Gemini 为 `undefined`）
- `ModelConfigModal`: 当 `protocol` 未传入时，`isOpenAI = false`，展示 `Thinking Budget Tokens`

- [ ] **Step 1: 在 `GeminiProviderDetail.test.tsx` 中编写测试，断言点击配置弹窗时传入非 openai 协议并展示思考预算**

```tsx
it('does not pass openai-compatible protocol to ProviderModelListSection so thinkingBudget can be configured', () => {
  render(
    <GeminiProviderDetail
      settings={{ apiKey: 'test-key', useCustomApiConfig: true } as any}
      onUpdateSettings={vi.fn()}
    />,
  );
  // 打开第一个模型的配置弹窗
  const configButtons = screen.getAllByTitle(/configure|配置/i);
  fireEvent.click(configButtons[0]);

  // 切换到参数 Tab
  const paramTab = screen.getByRole('tab', { name: /generation|reasoning|parameters|参数|生成/i });
  fireEvent.click(paramTab);

  // 此时应展示 Thinking Budget 输入控件，而非 Reasoning Effort
  expect(screen.getByText(/Thinking Budget Tokens|思考预算/i)).toBeInTheDocument();
  expect(screen.queryByText(/Reasoning Effort/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `pnpm --dir /Volumes/WD_BLACK/Code/AMC-WebUI vitest run src/components/settings/sections/providers/GeminiProviderDetail.test.tsx`  
Expected: FAIL（因原本硬编码了 protocol="openai-compatible" 展示了 Reasoning Effort）

- [ ] **Step 3: 修改 `GeminiProviderDetail.tsx` 移除 `protocol="openai-compatible"`**

```tsx
<ProviderModelListSection
  providerId="gemini"
  providerName="Gemini"
  models={effectiveModels}
  onUpdateModels={handleUpdateModels}
  onProbeSingleModel={handleSingleModelProbe}
  onProbeBatchModels={handleBatchHealthCheck}
  isProbingBatch={isCheckingBatch}
  probingModelIds={probingModelIds}
  modelProbeResults={modelProbeResults}
  onStopProbe={handleStopBatchHealthCheck}
  batchProgress={batchProgress}
/>
```

- [ ] **Step 4: 运行测试确保通过**

Run: `pnpm --dir /Volumes/WD_BLACK/Code/AMC-WebUI vitest run src/components/settings/sections/providers/GeminiProviderDetail.test.tsx`  
Expected: PASS

---

### Task 2: ModelConfigModal 模型 ID 修改增加冲突保护

**Files:**

- Modify: `src/components/settings/sections/providers/ModelConfigModal.tsx`
- Modify: `src/components/settings/sections/providers/models/ProviderModelListSection.tsx`
- Test: `src/components/settings/sections/providers/ModelConfigModal.test.tsx`

**Interfaces:**

- `ModelConfigModalProps`: 增加 `existingModelIds?: string[]`
- `handleSave`: 校验 `newId !== model.id && existingModelIds.includes(newId)`，若冲突则拦截并 Toast 报错

- [ ] **Step 1: 在 `ModelConfigModal.test.tsx` 中编写重复 ID 校验测试**

```tsx
it('prevents saving when model ID conflicts with another existing model ID', () => {
  const handleSave = vi.fn();
  render(
    <ModelConfigModal
      isOpen={true}
      model={mockModel}
      existingModelIds={['gpt-4o', 'existing-model-2']}
      onClose={vi.fn()}
      onSave={handleSave}
    />,
  );

  const idInput = screen.getByDisplayValue('gpt-4o');
  fireEvent.change(idInput, { target: { value: 'existing-model-2' } });

  const saveBtn = screen.getByRole('button', { name: /save|保存/i });
  fireEvent.click(saveBtn);

  expect(handleSave).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `pnpm --dir /Volumes/WD_BLACK/Code/AMC-WebUI vitest run src/components/settings/sections/providers/ModelConfigModal.test.tsx`  
Expected: FAIL

- [ ] **Step 3: 在 `ModelConfigModal.tsx` 中实现 ID 查重并在 `ProviderModelListSection.tsx` 中传入 `existingModelIds`**

- [ ] **Step 4: 运行测试确保全部通过**

Run: `pnpm --dir /Volumes/WD_BLACK/Code/AMC-WebUI vitest run src/components/settings/sections/providers/ModelConfigModal.test.tsx`  
Expected: PASS

---

### Task 3: 新增 `.dockerignore` 完善工程化配置

**Files:**

- Create: `.dockerignore`

- [ ] **Step 1: 编写 `.dockerignore` 文件**

```dockerignore
node_modules/
npm-debug.log*
.git/
.github/
.vscode/
.idea/
coverage/
playwright-report/
test-results/
tmp-live-artifact-demo/
.playwright-visible-demo-profile/
.codex-dev-*
docs-site/.astro/
docs-site/dist/
*.log
```

- [ ] **Step 2: 验证 git 状态确认 `.dockerignore` 正常生效**

Run: `git -C /Volumes/WD_BLACK/Code/AMC-WebUI status`

---

### Task 4: 全局指令面板 (`GlobalCommandPalette`) 完整国际化与动态模型加载

**Files:**

- Modify: `src/i18n/translations/common.ts` 或 `src/i18n/translations/chat.ts` (添加指令面板所需的 i18n 词条)
- Modify: `src/components/command/GlobalCommandPalette.tsx`
- Test: `src/components/command/GlobalCommandPalette.test.tsx`

**Interfaces:**

- `useI18n`: 引入 `t` 替换占位符、分组标题、按钮文字和 toast 提示
- 动态从 `savedSessions` 或 `useModelPreferencesStore` 获取最近使用的活跃/置顶模型替代写死的 `COMMON_MODELS`

- [ ] **Step 1: 在 i18n 字典中添加指令面板所需的 7 国语言翻译 key**
- [ ] **Step 2: 编写测试用例验证多语言环境下的指令面板渲染与动态模型展示**
- [ ] **Step 3: 重构 `GlobalCommandPalette.tsx` 接入 `useI18n` 并动态生成模型列表**
- [ ] **Step 4: 运行测试套件与 `pnpm run i18n:check` 验证完全覆盖**

---

### Task 5: 服务商模型列表与配置弹窗 (`ProviderModelRow` / `ModelConfigModal`) 国际化

**Files:**

- Modify: `src/i18n/translations/settings/model.ts`
- Modify: `src/components/settings/sections/providers/models/ProviderModelRow.tsx`
- Modify: `src/components/settings/sections/providers/ModelConfigModal.tsx`
- Test: `src/components/settings/sections/providers/models/ProviderModelRow.test.tsx`
- Test: `src/components/settings/sections/providers/ModelConfigModal.test.tsx`

- [ ] **Step 1: 编写测试，断言在不同语言下 ProviderModelRow 能力徽标与 ModelConfigModal 标签正确本地化**
- [ ] **Step 2: 替换 `ProviderModelRow.tsx` 中硬编码的 'Free', 'Thinking', 'Vision', 'Image', 'Audio' 为 `t('thirdPartyCapability...')`**
- [ ] **Step 3: 为 `ModelConfigModal.tsx` 中的能力选项与推理强度级别接入 i18n 字典**
- [ ] **Step 4: 运行测试并执行 `pnpm run i18n:check` 确保 7 语言一致**

---

### Task 6: 顶栏模型选择器 (`ModelCatalogList`) 渲染置顶 (Pin) 视觉标识

**Files:**

- Modify: `src/components/shared/ModelCatalogList.tsx`
- Test: `src/components/shared/ModelPicker.test.tsx`

- [ ] **Step 1: 在 `ModelPicker.test.tsx` 中增加针对置顶模型的视觉渲染测试**
- [ ] **Step 2: 在 `ModelCatalogList.tsx` 中针对 `entry.model.isPinned` 渲染精美 Pin 图标**
- [ ] **Step 3: 运行测试验证**

---

### Task 7: 媒体导航与文件预览残留硬编码中文收归

**Files:**

- Modify: `src/i18n/translations/common.ts` / `src/i18n/translations/chat.ts`
- Modify: `src/components/media-nav/InlinePdfLocateButton.tsx`
- Modify: `src/components/media-nav/InlineImageLocateButton.tsx`
- Modify: `src/components/media-nav/ImageHighlightOverlay.tsx`
- Modify: `src/components/media-nav/InlineTimestampSeekButton.tsx`
- Modify: `src/components/shared/file-preview/SpreadsheetViewer.tsx`
- Modify: `src/components/shared/file-preview/ZipViewer.tsx`
- Modify: `src/components/modals/AudioRecorder.tsx`
- Modify: `src/components/modals/TextEditorModal.tsx`
- Modify: `src/components/chat/message-list/text-selection/SelectionAskPanel.tsx`

- [ ] **Step 1: 在 i18n 字典中统一补全媒体导航与预览组件的 7 语言词条**
- [ ] **Step 2: 将各组件内的硬编码中文（如「目标定位」、「正在解析电子表格」等）全部替换为 `t()` 调用**
- [ ] **Step 3: 在 `SelectionAskPanel.tsx` 中支持多语言快捷提问提示词**
- [ ] **Step 4: 运行 `pnpm run i18n:check` 与关联单元测试**

---

### Task 8: 全量构建与代码质量验证

- [ ] **Step 1: 执行 `pnpm run i18n:check` 验证所有语言覆盖**
- [ ] **Step 2: 执行 `pnpm run typecheck` 验证类型安全**
- [ ] **Step 3: 执行 `pnpm run lint` 验证代码规范**
- [ ] **Step 4: 执行 `pnpm run test` 验证全量 4600+ 单元测试无回归**
- [ ] **Step 5: 执行 `pnpm run build` 和 `pnpm run build:api` 验证构建产物**

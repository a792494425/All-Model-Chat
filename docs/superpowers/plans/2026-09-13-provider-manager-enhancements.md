# Provider Manager 增强功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增强 Provider Manager，支持模型显示名称/ID编辑、手动能力纠偏与置顶、进阶采样与自适应推理参数覆写、拆解抽离通用模型列表模块，并在 Provider Manager 中统一集成 Gemini 官方模型管理。

**Architecture:** 
1. 扩展 `ModelOption` 与 `ModelParameters` 类型定义；
2. 在 `standardChatApiCall` 与 API 请求构造层注入模型级进阶参数；
3. 开发双 Tab 统一弹窗 `ModelConfigModal` 替代原有的简单参数弹窗；
4. 将 1400 行的 `ProviderDetail.tsx` 拆解为 `models/ProviderModelListSection` 通用模型管理容器及其子组件；
5. 构建 `GeminiProviderDetail.tsx` 将 Gemini 原生模型与第三方模型管理体验深度统一。

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, Zustand, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-13-provider-manager-enhancements-design.md`

## Global Constraints

- 不破坏向后兼容性：原有 `parameters` 中的 `temperature`、`topP`、`maxOutputTokens` 保持既有语义与字段结构。
- 零破坏性迁移：第三方连接存 `thirdPartyApi.connections`，Gemini 存 `modelPreferencesStore.customModels`，不强制重构底层存储。
- 遵循现有的设计模式、Tailwind 主题类名与无障碍（A11y）标准。
- 所有新增 UI 文案必须通过 `useI18n` 接入国际化。

---

### Task 1: 扩展模型参数与元数据类型定义 (Types & Schemas)

**Files:**
- Modify: `src/types/settings.ts:47-54`
- Test: `src/test/architecture/modelTypes.test.ts` (新建测试)

**Interfaces:**
- Consumes: `ModelOption`, `ModelCapabilities`, `ChatSettings`
- Produces: `ModelParameters` 接口扩展（`topK`, `presencePenalty`, `frequencyPenalty`, `stopSequences`, `seed`, `reasoningEffort`, `thinkingBudget`）；`ModelOption` 扩展（`isPinned`, `contextWindow`, `capabilities`, `parameters`）

- [ ] **Step 1: 编写针对新类型的单元测试**

```typescript
// src/test/architecture/modelTypes.test.ts
import { describe, it, expect } from 'vitest';
import type { ModelOption, ModelParameters } from '@/types';

describe('ModelOption & ModelParameters types', () => {
  it('supports advanced parameters and metadata', () => {
    const params: ModelParameters = {
      temperature: 0.7,
      maxOutputTokens: 4096,
      topP: 0.9,
      topK: 40,
      presencePenalty: 0.5,
      frequencyPenalty: 0.5,
      stopSequences: ['<|end|>'],
      seed: 42,
      reasoningEffort: 'high',
      thinkingBudget: 8192,
    };

    const model: ModelOption = {
      id: 'custom-model',
      name: 'Custom Model',
      isPinned: true,
      contextWindow: 128000,
      capabilities: {
        vision: true,
        tools: true,
        thinking: true,
      },
      parameters: params,
    };

    expect(model.isPinned).toBe(true);
    expect(model.contextWindow).toBe(128000);
    expect(model.parameters?.reasoningEffort).toBe('high');
    expect(model.parameters?.thinkingBudget).toBe(8192);
  });
});
```

- [ ] **Step 2: 运行测试并验证其编译/类型检查行为**

Run: `npm test src/test/architecture/modelTypes.test.ts`  
Expected: FAIL（若 `ModelParameters` 未导出或字段不完整）

- [ ] **Step 3: 在 `src/types/settings.ts` 中实现类型定义**

```typescript
// src/types/settings.ts
export interface ModelParameters {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stopSequences?: string[];
  seed?: number;
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
  thinkingBudget?: number;
}

export interface ModelOption {
  id: string;
  name: string;
  isPinned?: boolean;
  apiMode?: ApiMode;
  providerId?: ChatProviderId;
  templateId?: ThirdPartyTemplateId;
  connectionName?: string;
  unavailable?: boolean;
  missingApiKey?: boolean;
  visibleInSelector?: boolean;
  enableThinking?: boolean;
  enableTools?: boolean;
  contextWindow?: number;
  maxOutputTokens?: number;
  capabilities?: ModelCapabilities;
  ownedBy?: string;
  parameters?: ModelParameters;
}
```

- [ ] **Step 4: 重新运行测试验证通过**

Run: `npm test src/test/architecture/modelTypes.test.ts`  
Expected: PASS

- [ ] **Step 5: 提交代码**

```bash
git add src/types/settings.ts src/test/architecture/modelTypes.test.ts
git commit -m "feat(types): expand ModelParameters and ModelOption interfaces"
```

---

### Task 2: 运行时参数下发链路贯通 (Runtime Parameter Propagation)

**Files:**
- Modify: `src/features/message-sender/standardChatApiCall.ts:376-445`
- Modify: `src/services/api/openaiCompatibleMessages.ts:215-260`
- Test: `src/services/api/openaiCompatibleMessages.test.ts`
- Test: `src/features/message-sender/standardChatApiCall.test.ts`

**Interfaces:**
- Consumes: `activeModel.parameters`
- Produces: `OpenAICompatibleChatConfig` 注入 `reasoningEffort`；请求体 `reasoning_effort` 映射；`topK`、`presencePenalty`、`frequencyPenalty`、`stopSequences`、`seed` 从 `activeModel.parameters` 优先取值

- [ ] **Step 1: 编写测试用例验证 OpenAI 请求体包含 `reasoning_effort` 和高级参数**

在 `src/services/api/openaiCompatibleMessages.test.ts` 中追加：

```typescript
it('maps reasoningEffort to reasoning_effort field when provided', () => {
  const body = buildOpenAICompatibleRequestBody(
    'o3-mini',
    [],
    [{ text: 'Hello' }],
    { reasoningEffort: 'high' } as any,
    'user',
    false,
  );
  expect(body.reasoning_effort).toBe('high');
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test src/services/api/openaiCompatibleMessages.test.ts`  
Expected: FAIL with `expected undefined to be 'high'`

- [ ] **Step 3: 更新 `openaiCompatibleMessages.ts` 与 `standardChatApiCall.ts`**

在 `src/services/api/openaiCompatibleTypes.ts` 中确保 `OpenAICompatibleChatConfig` 拥有 `reasoningEffort?: 'none' | 'low' | 'medium' | 'high'`。  
在 `src/services/api/openaiCompatibleMessages.ts` 的 `buildOpenAICompatibleRequestBody` 中添加：

```typescript
if (config.reasoningEffort && config.reasoningEffort !== 'none') {
  body.reasoning_effort = config.reasoningEffort;
}
```

在 `src/features/message-sender/standardChatApiCall.ts` 的 `activeProvider` 配置组装处：

```typescript
const activeModel = activeProvider.models?.find((m) => m.id === apiModelId);
const params = activeModel?.parameters;
const providerConfig = {
  baseUrl: activeProvider.baseUrl,
  templateId: activeProvider.templateId,
  systemInstruction: effectiveSystemInstruction,
  temperature: params?.temperature ?? sessionToUpdate.temperature,
  topP: params?.topP ?? sessionToUpdate.topP,
  topK: params?.topK ?? sessionToUpdate.topK,
  maxOutputTokens: params?.maxOutputTokens ?? sessionToUpdate.maxOutputTokens,
  stopSequences: params?.stopSequences ?? sessionToUpdate.stopSequences,
  presencePenalty: params?.presencePenalty ?? sessionToUpdate.presencePenalty,
  frequencyPenalty: params?.frequencyPenalty ?? sessionToUpdate.frequencyPenalty,
  seed: params?.seed ?? sessionToUpdate.seed,
  thinkingLevel: activeModel?.enableThinking === false ? ('NONE' as const) : sessionToUpdate.thinkingLevel,
  thinkingBudget: params?.thinkingBudget ?? sessionToUpdate.thinkingBudget,
  reasoningEffort: params?.reasoningEffort,
  extraHeaders: activeProvider.extraHeaders,
};
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npm test src/services/api/openaiCompatibleMessages.test.ts`  
Run: `npm test src/features/message-sender/standardChatApiCall.test.ts`  
Expected: PASS

- [ ] **Step 5: 提交代码**

```bash
git add src/services/api/openaiCompatibleMessages.ts src/services/api/openaiCompatibleTypes.ts src/features/message-sender/standardChatApiCall.ts src/services/api/openaiCompatibleMessages.test.ts
git commit -m "feat(api): support model-level reasoningEffort and advanced parameter overrides"
```

---

### Task 3: 实现统一模型配置中心弹窗 (`ModelConfigModal.tsx`)

**Files:**
- Create: `src/components/settings/sections/providers/ModelConfigModal.tsx`
- Create: `src/components/settings/sections/providers/ModelConfigModal.test.tsx`
- Modify: `src/i18n/translations/` (增加对应多语言键值)

**Interfaces:**
- Consumes: `model: ModelOption`, `protocol?: ThirdPartyApiProtocol`, `onSave: (updated: Partial<ModelOption>) => void`, `onClose: () => void`
- Produces: 完整的模型元数据（`name`, `id`, `isPinned`, `contextWindow`, `capabilities`）与参数（`parameters`）统一编辑保存

- [ ] **Step 1: 编写 `ModelConfigModal` 的单元测试**

```tsx
// src/components/settings/sections/providers/ModelConfigModal.test.tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelConfigModal } from './ModelConfigModal';
import type { ModelOption } from '@/types';

const mockModel: ModelOption = {
  id: 'gpt-4o',
  name: 'GPT-4o Original',
  isPinned: false,
  contextWindow: 128000,
  capabilities: {
    vision: true,
    tools: true,
  },
  parameters: {
    temperature: 0.7,
  },
};

describe('ModelConfigModal', () => {
  it('renders info tab and allows editing name and toggling pin', () => {
    const handleSave = vi.fn();
    render(
      <ModelConfigModal
        isOpen={true}
        model={mockModel}
        onClose={vi.fn()}
        onSave={handleSave}
      />
    );

    expect(screen.getByDisplayValue('GPT-4o Original')).toBeInTheDocument();
    const nameInput = screen.getByDisplayValue('GPT-4o Original');
    fireEvent.change(nameInput, { target: { value: 'GPT-4o Renamed' } });

    // Click Save
    const saveBtn = screen.getByRole('button', { name: /save|保存/i });
    fireEvent.click(saveBtn);

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'GPT-4o Renamed',
      })
    );
  });

  it('switches to parameters tab and saves custom reasoningEffort', () => {
    const handleSave = vi.fn();
    render(
      <ModelConfigModal
        isOpen={true}
        model={mockModel}
        protocol="openai-compatible"
        onClose={vi.fn()}
        onSave={handleSave}
      />
    );

    // Switch tab
    const paramTab = screen.getByRole('tab', { name: /parameters|参数/i });
    fireEvent.click(paramTab);

    // Click high effort if present
    const highBtn = screen.getByText(/high|高/i);
    fireEvent.click(highBtn);

    const saveBtn = screen.getByRole('button', { name: /save|保存/i });
    fireEvent.click(saveBtn);

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        parameters: expect.objectContaining({
          reasoningEffort: 'high',
        }),
      })
    );
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test src/components/settings/sections/providers/ModelConfigModal.test.tsx`  
Expected: FAIL with module not found

- [ ] **Step 3: 实现 `ModelConfigModal.tsx`**

实现完整包含双 Tab 的模态窗组件：
- Tab 切换（`info` | `parameters`）。
- Tab 1: Name 输入、ID 输入、Pin Toggle、Context Window（带 32k/128k/200k/1M 快速点击标签）、Capabilities 多项 Checkbox（vision, tools, thinking, audio, image, webSearch）。
- Tab 2: Temperature, Top-P, Top-K, MaxOutputTokens, PresencePenalty, FrequencyPenalty, StopSequences, Seed；协议自适应（OpenAI 渲染 reasoningEffort，Anthropic/Gemini 渲染 thinkingBudget 滑块）。
- 底部左侧：重置为默认值。底部右侧：取消与保存。

- [ ] **Step 4: 运行测试验证通过**

Run: `npm test src/components/settings/sections/providers/ModelConfigModal.test.tsx`  
Expected: PASS

- [ ] **Step 5: 提交代码**

```bash
git add src/components/settings/sections/providers/ModelConfigModal.tsx src/components/settings/sections/providers/ModelConfigModal.test.tsx
git commit -m "feat(ui): add ModelConfigModal for editing metadata and parameters"
```

---

### Task 4: 拆离通用模型列表子模块 (`models/ProviderModelListSection.tsx`)

**Files:**
- Create: `src/components/settings/sections/providers/models/ProviderModelRow.tsx`
- Create: `src/components/settings/sections/providers/models/ProviderModelToolbar.tsx`
- Create: `src/components/settings/sections/providers/models/ProviderBatchActionBar.tsx`
- Create: `src/components/settings/sections/providers/models/ProviderModelListSection.tsx`
- Create: `src/components/settings/sections/providers/models/ProviderModelListSection.test.tsx`

**Interfaces:**
- Consumes: `ProviderModelListSectionProps`（`providerId`, `providerName`, `protocol`, `models`, `onUpdateModels`, `onProbeSingleModel`, `onProbeBatchModels`, `onSyncRemoteModels`）
- Produces: 可在第三方 Provider 和 Gemini 中无缝复用的模型列表管理模块

- [ ] **Step 1: 编写 `ProviderModelListSection` 基础测试**

```tsx
// src/components/settings/sections/providers/models/ProviderModelListSection.test.tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProviderModelListSection } from './ProviderModelListSection';
import type { ModelOption } from '@/types';

const mockModels: ModelOption[] = [
  { id: 'm1', name: 'Model One', visibleInSelector: true },
  { id: 'm2', name: 'Model Two', visibleInSelector: false },
];

describe('ProviderModelListSection', () => {
  it('renders model list and handles visible toggle', () => {
    const handleUpdate = vi.fn();
    render(
      <ProviderModelListSection
        providerId="test-provider"
        providerName="Test Provider"
        models={mockModels}
        onUpdateModels={handleUpdate}
        onProbeSingleModel={vi.fn()}
        onProbeBatchModels={vi.fn()}
      />
    );

    expect(screen.getByText('Model One')).toBeInTheDocument();
    expect(screen.getByText('Model Two')).toBeInTheDocument();

    // Toggle visibility for m1
    const eyeButtons = screen.getAllByTitle(/visible|隐藏|显示/i);
    fireEvent.click(eyeButtons[0]);

    expect(handleUpdate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'm1', visibleInSelector: false }),
      ])
    );
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test src/components/settings/sections/providers/models/ProviderModelListSection.test.tsx`  
Expected: FAIL with module not found

- [ ] **Step 3: 实现子组件与主容器**

1. `ProviderModelToolbar.tsx`：搜索过滤、折叠全组、能力过滤 Tabs、批量管理模式切换、探活与同步按钮。
2. `ProviderBatchActionBar.tsx`：批量全选、反选、批量显隐、批量探测、批量删除。
3. `ProviderModelRow.tsx`：模型卡片行渲染，Pin 标识，能力 Badges，显隐/思考/工具快捷开关，齿轮触发 `ModelConfigModal`，删除。
4. `ProviderModelListSection.tsx`：整合以上子组件，管理折叠状态、搜索过滤、能力标签过滤、批量选中 ID 集合。

- [ ] **Step 4: 运行测试验证通过**

Run: `npm test src/components/settings/sections/providers/models/ProviderModelListSection.test.tsx`  
Expected: PASS

- [ ] **Step 5: 提交代码**

```bash
git add src/components/settings/sections/providers/models/
git commit -m "refactor(ui): extract reusable ProviderModelListSection and subcomponents"
```

---

### Task 5: 重构轻量化 `ProviderDetail.tsx`

**Files:**
- Modify: `src/components/settings/sections/providers/ProviderDetail.tsx`
- Modify: `src/components/settings/sections/providers/ProviderDetail.test.tsx`

**Interfaces:**
- Consumes: `connection: ThirdPartyConnection`, `onUpdateConnection`, `onDeleteConnection`
- Produces: 极度轻量（~200 行）的第三方 Provider 详情页，底层模型列表全部委托给 `ProviderModelListSection`

- [ ] **Step 1: 检查现有 `ProviderDetail.test.tsx` 并确保能准备运行**

Run: `npm test src/components/settings/sections/providers/ProviderDetail.test.tsx`  
Expected: PASS（当前状态）

- [ ] **Step 2: 重构 `ProviderDetail.tsx`**

移除 `ProviderDetail.tsx` 中重复的搜索、过滤、批量选择、卡片渲染代码，仅保留：
1. 顶部连接 Header（头像、名称、启用 Toggle、设置按钮）；
2. API Key 与 Base URL 凭据区（含测速探测按钮、端点预览）；
3. 接入 `<ProviderModelListSection />` 承接所有模型管理。

- [ ] **Step 3: 运行 `ProviderDetail.test.tsx` 并确保全部通过**

Run: `npm test src/components/settings/sections/providers/ProviderDetail.test.tsx`  
Expected: PASS

- [ ] **Step 4: 提交代码**

```bash
git add src/components/settings/sections/providers/ProviderDetail.tsx src/components/settings/sections/providers/ProviderDetail.test.tsx
git commit -m "refactor(ui): slim down ProviderDetail using ProviderModelListSection"
```

---

### Task 6: 构建 Gemini 统一管理详情 (`GeminiProviderDetail.tsx`) 与路由接入

**Files:**
- Create: `src/components/settings/sections/providers/GeminiProviderDetail.tsx`
- Create: `src/components/settings/sections/providers/GeminiProviderDetail.test.tsx`
- Modify: `src/components/settings/sections/providers/ProviderSettingsSection.tsx:197-225`
- Modify: `src/components/settings/sections/providers/ProviderSettingsSection.test.tsx`

**Interfaces:**
- Consumes: `settings: AppSettings`, `onUpdateSettings`, `useModelPreferencesStore`
- Produces: Gemini 在 Provider 页面展现与第三方完全一致的“API 凭据 + 模型管理列表”

- [ ] **Step 1: 编写 `GeminiProviderDetail` 单元测试**

```tsx
// src/components/settings/sections/providers/GeminiProviderDetail.test.tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GeminiProviderDetail } from './GeminiProviderDetail';

describe('GeminiProviderDetail', () => {
  it('renders ApiConfigSection at top and model list at bottom', () => {
    render(
      <GeminiProviderDetail
        settings={{ apiKey: 'test-key', useCustomApiConfig: true } as any}
        onUpdateSettings={vi.fn()}
      />
    );

    // Checks presence of API Key section and Models section
    expect(screen.getByText(/Google Gemini/i)).toBeInTheDocument();
    expect(screen.getByText(/Models|模型/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test src/components/settings/sections/providers/GeminiProviderDetail.test.tsx`  
Expected: FAIL with module not found

- [ ] **Step 3: 实现 `GeminiProviderDetail.tsx` 并替换 `ProviderSettingsSection.tsx` 中的旧视图**

1. `GeminiProviderDetail.tsx`：
   - 上半部分：渲染 `ApiConfigSection`；
   - 下半部分：连接 `useModelPreferencesStore((s) => s.customModels)` 与 `getDefaultModelOptions()`，渲染 `<ProviderModelListSection />`。更新通过 `useModelPreferencesStore.getState().setCustomModels(...)`。
2. 在 `ProviderSettingsSection.tsx` 中，替换 `isGeminiSelected` 分支为 `<GeminiProviderDetail ... />`。

- [ ] **Step 4: 运行 `ProviderSettingsSection.test.tsx` 和新测试**

Run: `npm test src/components/settings/sections/providers/GeminiProviderDetail.test.tsx`  
Run: `npm test src/components/settings/sections/providers/ProviderSettingsSection.test.tsx`  
Expected: PASS

- [ ] **Step 5: 提交代码**

```bash
git add src/components/settings/sections/providers/GeminiProviderDetail.tsx src/components/settings/sections/providers/GeminiProviderDetail.test.tsx src/components/settings/sections/providers/ProviderSettingsSection.tsx src/components/settings/sections/providers/ProviderSettingsSection.test.tsx
git commit -m "feat(ui): add GeminiProviderDetail unifying Gemini and third-party model management"
```

---

### Task 7: 补全多语言字典与全局集成回归 (i18n & Global Verification)

**Files:**
- Modify: `src/i18n/translations/` (所有包含 settings/provider 相关翻译的语言字典)
- Test: 全量测试套件与打包检查

- [ ] **Step 1: 扫描并补齐新增词条**

补充 `ModelConfigModal` 和 Gemini 整合新增的多语言词条：
- `modelConfigTitle`: "模型配置" / "Model Configuration"
- `modelConfigTabInfo`: "基本信息与能力" / "Info & Capabilities"
- `modelConfigTabParams`: "生成与推理参数" / "Generation & Reasoning"
- `modelConfigName`: "显示名称" / "Display Name"
- `modelConfigId`: "模型标识 ID" / "Model ID"
- `modelConfigPin`: "置顶显示" / "Pin Model to Top"
- `modelConfigContextWindow`: "上下文窗口限制" / "Context Window (Tokens)"
- `modelConfigCapabilitiesOverride`: "能力标签纠偏" / "Capabilities Override"
- `modelConfigReasoningEffort`: "推理力度" / "Reasoning Effort"
- `modelConfigThinkingBudget`: "思考预算" / "Thinking Budget (Tokens)"

- [ ] **Step 2: 运行所有相关单元测试**

Run: `npm test src/components/settings/sections/providers/`  
Run: `npm test src/features/message-sender/`  
Expected: 全部通过 (PASS)

- [ ] **Step 3: 运行生产环境构建验证类型无报错**

Run: `npm run build`  
Expected: 成功构建 (Code 0, No TypeScript errors)

- [ ] **Step 4: 提交代码**

```bash
git add src/i18n/
git commit -m "feat(i18n): add translations for ModelConfigModal and provider enhancements"
```

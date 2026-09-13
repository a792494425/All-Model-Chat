# Provider Manager 增强设计：模型元数据与能力编辑、进阶推理参数与 Gemini 模型深度统一

日期：2026-09-13  
范围：
- `src/types/settings.ts`（类型扩展）
- `src/components/settings/sections/providers/ModelConfigModal.tsx`（新增，替代原 `ModelParameterModal`）
- `src/components/settings/sections/providers/models/`（新增目录，拆解通用模型管理容器）
  - `ProviderModelListSection.tsx`
  - `ProviderModelToolbar.tsx`
  - `ProviderBatchActionBar.tsx`
  - `ProviderModelRow.tsx`
- `src/components/settings/sections/providers/GeminiProviderDetail.tsx`（新增，Gemini 统一管理视图）
- `src/components/settings/sections/providers/ProviderDetail.tsx`（重构轻量化，接入通用模型模块）
- `src/components/settings/sections/providers/ProviderSettingsSection.tsx`（路由分发更新）
- `src/features/message-sender/standardChatApiCall.ts`（进阶模型参数运行时下发）
- `src/services/api/openaiCompatibleMessages.ts`（OpenAI 请求体参数映射）
- `src/i18n/translations/`（多语言词条更新）

状态：设计已确认，准备编写实现计划

---

## 1. 背景与目标

AMC-WebUI 目前的 Provider Manager 已支持多连接配置、24+ 预设模板向导、远程模型比对同步（Reconcile）、批量显隐与探活诊断等强大功能。但在日常重度使用中，仍暴露出以下核心痛点：

1. **模型元数据不可编辑与能力推断死板**：
   - 远程同步或手动添加的模型无法重命名（如火山引擎拉下的 `ep-20241223-xxxx` 无法改为“豆包 1.5 Pro”）。
   - 模型能力标签（Vision、Tools、Thinking、Audio 等）完全依赖静态字典 `enrichModelMetadata` 自动推断，当接入未收录的新模型或私有/本地 Ollama 微调模型时，推断失准且用户在 UI 上**无法手动勾选/纠偏**。
   - 无法手动设定模型的上下文窗口大小（`contextWindow`），也无法对模型进行置顶（`isPinned`）以控制在聊天下拉列表中的顺序。

2. **模型级进阶参数与思考力度缺失**：
   - 当前模型的齿轮弹窗（`ModelParameterModal`）仅支持 `temperature`、`topP`、`maxOutputTokens`。
   - 针对新一代推理模型（OpenAI o1/o3、Kimi k3、DeepSeek R1、Claude 3.7 Sonnet），缺少对 **Reasoning Effort**（Low / Medium / High）或 **Thinking Budget Tokens** 的配置项。
   - 缺少对 `presencePenalty`、`frequencyPenalty`、`topK`、`stopSequences`、`seed` 等常用生成参数的模型级独立覆盖。

3. **Gemini 官方模型与第三方连接心智割裂**：
   - Provider 侧边栏虽将 Google Gemini 列在最顶层，但点击后右侧仅展示原有的 `ApiConfigSection`（Key 与 Proxy 配置），**完全看不到 Gemini 官方的模型列表**。
   - Gemini 的模型管理被孤立在设置侧边栏的另一个一级 Tab（“Models/模型配置”），造成“管理第三方模型在 Providers，管理 Gemini 模型在 Models”的心智割裂。

4. **单文件膨胀与代码维护性问题**：
   - `ProviderDetail.tsx` 代码量已近 1400 行（66KB），杂糅了 Header、凭据、模型工具栏、能力过滤 Tab、批量操作条、分组逻辑与模型卡片渲染。

**本次增强目标**：
- 抽取可复用的模型管理容器 `ProviderModelListSection`，将 `ProviderDetail.tsx` 拆解轻量化。
- 构建 `GeminiProviderDetail.tsx`，让 Gemini 在 Provider Manager 中拥有与第三方连接完全一致的模型列表管理体验。
- 构建一体化的 `ModelConfigModal.tsx`（包含“基本信息与能力纠偏”和“生成与推理参数”两大 Tab）。
- 运行时链路全线打通，使模型级保存的高级参数（包括协议自适应的思考参数）在生成时精准生效。

---

## 2. 详细技术方案

### 2.1 数据结构扩展 (`src/types/settings.ts`)

扩展 `ModelParameters` 接口与 `ModelOption` 定义：

```typescript
export interface ModelParameters {
  // 基础采样参数
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;

  // 惩罚项与停止序列
  presencePenalty?: number; // -2.0 ~ 2.0
  frequencyPenalty?: number; // -2.0 ~ 2.0
  stopSequences?: string[]; // 停止词数组
  seed?: number; // 随机种子

  // 思考与推理参数（协议自适应）
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high'; // OpenAI o1/o3 / Kimi
  thinkingBudget?: number; // Gemini / Claude 3.7 Sonnet (tokens)
}

export interface ModelOption {
  id: string;
  name: string;
  isPinned?: boolean; // 🌟 支持置顶
  contextWindow?: number; // 🌟 上下文窗口限制 (tokens)
  maxOutputTokens?: number; // 最大输出 tokens
  capabilities?: ModelCapabilities; // 🌟 手动覆盖/纠偏的能力标签
  parameters?: ModelParameters; // 🌟 扩展后的生成参数
  // 既有字段保持不变
  apiMode?: ApiMode;
  providerId?: ChatProviderId;
  templateId?: ThirdPartyTemplateId;
  connectionName?: string;
  unavailable?: boolean;
  missingApiKey?: boolean;
  visibleInSelector?: boolean;
  enableThinking?: boolean;
  enableTools?: boolean;
  ownedBy?: string;
}
```

---

### 2.2 模型配置弹窗重构 (`ModelConfigModal.tsx`)

替代原有的 `ModelParameterModal.tsx`。用户在模型行点击“设置/齿轮”图标时打开。

弹窗设计为双 Tab 结构：

#### Tab 1: 基本信息与能力纠偏 (Info & Capabilities)
1. **基础标识**：
   - **显示名称 (`name`)**：可自由编辑别名（如将 `ep-xxx` 重命名为更友好的名字）。
   - **模型 ID (`id`)**：展示模型底层标识，支持复制，支持修改（修改时提供小提示防手误）。
   - **置顶显示 (`isPinned`)**：Toggle 开关。开启后在主界面的模型下拉列表中置顶展示。
2. **上下文窗口 (`contextWindow`)**：
   - 数字输入框（单位 Tokens），右侧提供快捷芯片预设（`32k`、`128k`、`200k`、`1M`），点击快速填充。
3. **能力标签手动纠偏 (`capabilities`)**：
   - 当系统字典推断不准时，用户可手动纠偏勾选：
     - `vision`（图像识别/视觉理解）
     - `tools`（支持 Function Calling / MCP 工具）
     - `thinking`（深度思考/推理模型）
     - `audio`（音频输入/理解）
     - `image`（生图模型）
     - `webSearch`（原生联网搜索）

#### Tab 2: 生成与推理参数 (Generation & Reasoning)
1. **基础采样**：
   - `temperature`：0.00 ~ 2.00 滑块 + 精确数字输入框。
   - `topP`：0.00 ~ 1.00 滑块 + 精确数字输入框。
   - `topK`：0 ~ 100 数字输入框。
   - `maxOutputTokens`：1 ~ 131072 数字输入框。
2. **思考与推理控制（协议自适应）**：
   - **协议感知判定**：
     - 若当前模型属于 `openai-compatible` / `openai-responses`（或识别为 o1/o3/DeepSeek/Kimi）：
       - 显示 **推理力度 (Reasoning Effort)** 分段控制器：`默认(会话级)` / `None` / `Low` / `Medium` / `High`。
     - 若属于 `anthropic` 或 `gemini-native`：
       - 显示 **思考预算 (Thinking Budget)** 滑块与数字输入框（0 ~ 65536 Tokens）。
3. **高级采样参数**：
   - `presencePenalty`（-2.0 ~ 2.0，鼓励探讨新主题）。
   - `frequencyPenalty`（-2.0 ~ 2.0，降低词汇重复率）。
   - `stopSequences`（停止词，支持回车分词添加为标签）。
   - `seed`（确定性采样随机种子）。
4. **重置功能**：
   - 底部左侧保留“重置为默认值”按钮。

---

### 2.3 通用模型管理容器抽取 (`models/ProviderModelListSection.tsx`)

将原 `ProviderDetail.tsx` 中杂糅的 ~800 行模型列表逻辑抽离为通用组件：

```typescript
interface ProviderModelListSectionProps {
  providerId: string; // 'gemini-native' 或第三方连接 id
  providerName: string; // 用于分组前缀匹配与提示
  protocol?: ThirdPartyApiProtocol; // 用于协议自适应
  templateId?: ThirdPartyTemplateId;
  models: ModelOption[];
  onUpdateModels: (models: ModelOption[]) => void;
  // 连通性探活相关
  onProbeSingleModel: (modelId: string) => Promise<void>;
  onProbeBatchModels: (models: ModelOption[]) => Promise<void>;
  isProbingBatch?: boolean;
  probingModelIds?: Set<string>;
  modelProbeResults?: Record<string, ConnectionHealthProbeResult>;
  // 同步能力（Gemini 不需远程 sync，第三方连接可传入）
  onSyncRemoteModels?: () => void;
  isSyncingRemoteModels?: boolean;
}
```

内部子组件拆分：
- `ProviderModelToolbar.tsx`：搜索栏、折叠/展开全部、能力过滤 Tabs（All/Text/Vision/Thinking/Image/Audio/Free）、批量管理开关、探活按钮、同步按钮、添加模型按钮。
- `ProviderBatchActionBar.tsx`：批量管理激活时的浮条（全选/反选、批量显隐、批量探活、批量删除）。
- `ProviderModelRow.tsx`：单个模型的卡片展示、能力 Badges、置顶星标、显隐开关、Thinking 开关、Tools 开关、齿轮打开 `ModelConfigModal`、删除。

---

### 2.4 Gemini 统一视图集成 (`GeminiProviderDetail.tsx`)

在 `src/components/settings/sections/providers/GeminiProviderDetail.tsx` 中：
1. **上半部分**：嵌入 [ApiConfigSection](file:///Volumes/WD_BLACK/Code/AMC-WebUI/src/components/settings/sections/ApiConfigSection.tsx)（API Key、代理端点、Docker 托管状态、连通性测试）。
2. **下半部分**：直接挂载 `<ProviderModelListSection />`！
   - 数据源直接绑定 `useModelPreferencesStore` 中的 `customModels`（若无则展示 `defaultModels`）。
   - `onUpdateModels` 触发 `useModelPreferencesStore.getState().setCustomModels(updatedModels)`。
   - 探活测试使用 Gemini 原生快速测试逻辑（如 `gemini-2.5-flash` 极简探活或针对具体模型的 token 探活）。
   - 隐藏“远程同步按钮”（Gemini 官方模型由系统维护并支持手动新增，无需远程拉取），其他能力筛选、搜索、显隐、置顶、参数覆盖完全与第三方一致！

---

### 2.5 运行时执行链参数注入 (`standardChatApiCall.ts`)

在聊天执行阶段，确保模型级进阶参数被优先采纳：

1. **第三方 Provider 执行路径**：
   - 在构建 `providerConfig` 时：
     ```typescript
     const activeModel = activeProvider.models?.find((m) => m.id === apiModelId);
     const params = activeModel?.parameters;
     
     const providerConfig = {
       // ... 基础配置
       temperature: params?.temperature ?? sessionToUpdate.temperature,
       topP: params?.topP ?? sessionToUpdate.topP,
       topK: params?.topK ?? sessionToUpdate.topK,
       maxOutputTokens: params?.maxOutputTokens ?? sessionToUpdate.maxOutputTokens,
       stopSequences: params?.stopSequences ?? sessionToUpdate.stopSequences,
       presencePenalty: params?.presencePenalty ?? sessionToUpdate.presencePenalty,
       frequencyPenalty: params?.frequencyPenalty ?? sessionToUpdate.frequencyPenalty,
       seed: params?.seed ?? sessionToUpdate.seed,
       thinkingBudget: params?.thinkingBudget ?? sessionToUpdate.thinkingBudget,
       reasoningEffort: params?.reasoningEffort,
       // ...
     };
     ```
   - 在 [openaiCompatibleMessages.ts](file:///Volumes/WD_BLACK/Code/AMC-WebUI/src/services/api/openaiCompatibleMessages.ts) 中：
     - 若 `config.reasoningEffort` 存在且不为 `none`，注入请求体 `reasoning_effort: config.reasoningEffort`。
   - 在 [anthropicMessages.ts](file:///Volumes/WD_BLACK/Code/AMC-WebUI/src/services/api/anthropicMessages.ts) 中：
     - 若 `config.thinkingBudget` 存在，注入 `thinking: { type: "enabled", budget_tokens: config.thinkingBudget }`。

2. **Gemini 原生执行路径**：
   - 在 [generationConfig.ts](file:///Volumes/WD_BLACK/Code/AMC-WebUI/src/services/api/generationConfig.ts) 中：
     - 查询当前活跃的 Gemini 模型的 `parameters`，优先覆盖会话级的 `temperature`、`topP`、`topK`、`maxOutputTokens`、`thinkingBudget` 等。

---

## 3. 测试与验证方案

1. **单元测试 (Unit Tests)**：
   - `ModelConfigModal.test.tsx`：测试 Tab 切换、名称编辑、能力纠偏勾选、参数设置与重置为默认值。
   - `ProviderModelListSection.test.tsx`：测试搜索过滤、能力标签过滤、批量显隐与批量删除。
   - `standardChatApiCall.test.ts`：验证当 `activeModel.parameters` 存在 `reasoningEffort` / `presencePenalty` / `topK` 时，正确传递给底层的 API 请求构造函数。
2. **集成验证 (End-to-End Walkthrough)**：
   - **第三方模型场景**：
     - 新增/同步一个 DeepSeek 或 OpenAI 模型，打开齿轮，将名称修改为中文名，勾选/去掉 Vision，设置 Reasoning Effort 为 `high`，设置 `presencePenalty` 为 0.6。
     - 发起对话，通过网络日志与调试信息确认请求体包含对应的参数。
   - **Gemini 模型场景**：
     - 在 Provider Manager 点击 Google Gemini，下方出现官方模型列表。
     - 将某个不常用模型（如 `gemini-1.5-flash`）设为隐藏（隐藏后主界面模型下拉菜单不再出现）。
     - 为 `gemini-2.5-pro` 单独覆写 Temperature 为 0.2，置顶该模型，验证主界面下拉菜单置顶且生成时使用 0.2。

# 借鉴 Cherry Studio 服务商预设市场与开关模式实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构 AMC-WebUI 服务商设置体验，借鉴 Cherry Studio 的统一列表、预设常驻、分段过滤与零弹窗直接启用模式，并将全屏添加弹窗精简为轻量自定义弹窗。

**Architecture:**
- 侧边栏动态合成用户已有连接与官方预设（Virtual Presets），顶部增加 `已启用` / `全部` / `未启用` 快速分段过滤。
- 点击未配置预设无需弹窗，右侧面板直接渲染草稿，用户输入 Key 或打开开关时无缝自动保存入库。
- 将原本 92vh 的全屏 `ProviderCreateDrawer` 替换为约 440px 紧凑单栏的 `ProviderCreateModal`，仅用于自定义服务商或多账号复制。

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide Icons, dnd-kit, Vitest.

**Spec:** [`docs/superpowers/specs/2026-09-16-cherry-studio-provider-catalog-design.md`](file:///Volumes/WD_BLACK/Code/AMC-WebUI/docs/superpowers/specs/2026-09-16-cherry-studio-provider-catalog-design.md)

---

### Task 1: 国际化词条补充 (I18n Locales)

**Files:**
- Modify: `src/i18n/locales/zh-CN.json`
- Modify: `src/i18n/locales/en.json`

- [ ] **Step 1: 补充三态过滤与轻量添加文案**
  - 添加 `thirdPartyFilterEnabled`、`thirdPartyFilterAll`、`thirdPartyFilterDisabled`
  - 添加 `thirdPartyAddCustomConnection` ("添加自定义服务商")
  - 添加 `thirdPartyPresetBadge` ("预设")
  - 添加 `thirdPartyCustomModalTitle` ("添加自定义服务商")
  - 添加 `thirdPartyCustomModalSubtitle` ("接入自建中转、OneAPI 或第三方 OpenAI 兼容端点")
- [ ] **Step 2: 验证 i18n 完整性**

---

### Task 2: 轻量级自定义服务商弹窗 (`ProviderCreateModal.tsx`)

**Files:**
- Create: `src/components/settings/sections/providers/ProviderCreateModal.tsx`
- Test: `src/components/settings/sections/providers/ProviderCreateModal.test.tsx`

- [ ] **Step 1: 实现 440px 紧凑型弹窗**
  - 支持模式：自定义服务商 (custom) 与复制服务商 (duplicate)
  - 核心字段：服务商名称、协议类型单选、Base URL、API Key
  - 底部动作：取消、保存并配置
- [ ] **Step 2: 编写并运行单元测试**

---

### Task 3: 侧边栏列表重构 (`ProviderList.tsx`)

**Files:**
- Modify: `src/components/settings/sections/providers/ProviderList.tsx`
- Test: `src/components/settings/sections/providers/ProviderList.test.tsx`

- [ ] **Step 1: 增加胶囊分段过滤 (Segmented Control)**
  - `已启用 (N)`、`全部 (N)`、`未启用 (N)` 快捷切换
- [ ] **Step 2: 合成预设列表展示**
  - 渲染已配置连接（支持拖拽排序、操作菜单、状态指示灯）
  - 渲染未配置预设项（带弱化“预设”标签、点击触发选中）
- [ ] **Step 3: 底部按钮更新**
  - 替换为 `+ 添加自定义服务商`
- [ ] **Step 4: 编写并运行单元测试**

---

### Task 4: 容器协调与草稿自动持久化 (`ProviderSettingsSection.tsx`)

**Files:**
- Modify: `src/components/settings/sections/providers/ProviderSettingsSection.tsx`
- Test: `src/components/settings/sections/providers/ProviderSettingsSection.test.tsx`

- [ ] **Step 1: 支持选中虚拟预设草稿**
  - 如果选中的是虚拟预设，生成 draft 连接传递给 `ProviderDetail`
  - 监听 `onUpdateConnection`：当用户在草稿中填入 Key 或切换 `enabled: true` 时，自动为其创建正式连接并持久化到 `settings.thirdPartyApi`
  - 自动切换选中 ID 到新生成的正式连接 ID
- [ ] **Step 2: 接入轻量 `ProviderCreateModal` 替换原 `ProviderCreateDrawer`**
- [ ] **Step 3: 运行完整提供商测试套件**

---

### Task 5: 验证、构建与 Docker Compose 部署

- [ ] **Step 1: 运行全量前端单元测试**
- [ ] **Step 2: 生产构建 `npm run build`**
- [ ] **Step 3: 重新部署到 Docker Compose 并验证服务健康状态**

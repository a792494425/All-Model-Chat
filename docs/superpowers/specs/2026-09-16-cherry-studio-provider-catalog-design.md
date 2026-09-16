# 借鉴 Cherry Studio 服务商预设市场与开关模式设计规范

## 1. 目标与背景

当前 AMC-WebUI 在设置中点击“添加服务商”时，会弹出一个全屏级（`max-w-5xl`、高度 `92vh`）的双栏复杂表单，包含了 22+ 预设分类矩阵、协议选择、测速、模型拉取、模型树预览等，与已有的详情页严重重叠，视觉压迫感强且操作繁琐。
本设计借鉴 Cherry Studio 的“预设内置 + 统一列表 + 开关启用”模式：

1. **预设常驻侧边栏**：官方预设（DeepSeek、OpenAI、Claude、SiliconFlow、通义千问、Ollama 等）内置于左侧列表，无需弹窗查找。
2. **三态过滤与搜索**：顶部支持「已启用 / 全部 / 未启用」切换，搜索支持检索服务商与模型名称。
3. **纯右侧面板零弹窗接入**：点击未配置预设直接在右侧打开配置面板，初始为未启用状态，填入 API Key 开启开关即可自动保存入库。
4. **轻量自定义服务商弹窗**：原有的全屏巨型弹窗被替换为约 440px 宽的紧凑弹窗，仅供添加自建中转（OneAPI/反代）与多账号复制。

## 2. 架构与数据模型

### 2.1 存储无污染（Virtual Presets）

- 用户实际保存的配置依然为 `settings.thirdPartyApi.connections`（不预先将 22+ 个空配置写入用户存储）。
- 侧边栏列表动态计算：
  - 将用户已持久化的 `connections` 与官方预设库 `TEMPLATE_PRESETS` 合成。
  - 已在 `connections` 中的项：展示为正常服务商（带启用/禁用点、拖拽排序、操作菜单）。
  - 未在 `connections` 中的预设：展示为虚拟预设项（带弱化“预设”标签，在「全部」和「未启用」分类中可见）。

### 2.2 零弹窗就地实例化（On-the-fly Instantiation）

- 当用户在侧边栏点击虚拟预设时：
  - 内存中基于该预设生成一个草稿连接（`createConnectionFromTemplate`），分配草稿标识，`enabled: false`，API Key 为空。
  - 右侧主区域直接渲染 `ProviderDetail`。
  - 用户在右侧修改 API Key 或点击打开「启用」开关时，触发 `onUpdateConnection`，系统自动为其分配正式 `connectionId` 并通过 `addThirdPartyConnection` 保存到 `settings.thirdPartyApi.connections` 中。

## 3. 组件划分与修改

1. `ProviderList.tsx`：
   - 增加顶部 `[已启用 (N)] [全部 (N)] [未启用 (N)]` 胶囊分段切换。
   - 渲染合成后的服务商列表：Gemini（官方置顶）+ 已配置服务商（支持拖拽排序）+ 虚拟预设项（点击即就地配置）。
   - 底部按钮调整为轻量次级操作：`+ 添加自定义服务商`。
2. `ProviderSettingsSection.tsx`：
   - 维护当前选中的服务商 ID（支持选定虚拟预设）。
   - 处理虚拟预设向真实连接的自动持久化过渡。
   - 挂载轻量级的 `ProviderCreateModal` 替换原先的 `ProviderCreateDrawer`。
3. `ProviderCreateModal.tsx`（新增轻量组件，替换原全屏 Drawer）：
   - 宽度控制在 440px 左右，单栏居中浮层或侧边滑出。
   - 仅包含：服务商名称、协议类型、Base URL、API Key 四项。
4. 国际化文案：同步支持中英文。

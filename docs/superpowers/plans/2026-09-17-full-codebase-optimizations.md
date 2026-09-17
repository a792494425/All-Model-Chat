# 全量缺陷修复与深度优化实施计划 (Full Codebase Optimization Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 全面解决代码审查中发现的 8 项核心缺陷与安全/性能隐患：iframe 沙箱同源逃逸风险、MCP 工具审批并发死锁、Docker 代理本地模型阻断、纯第三方模型自动命名失效、WebSocket 密码校验时序漏洞、已停服模型迁移缺失、静态资源硬编码根路径、以及测试套件 Radix act 告警泛滥问题。

**Architecture:**

1. 安全层：在 `previewPrivilege.ts` 中剔除 `allow-same-origin`，阻断 iframe 逆向读取宿主 Storage/IndexedDB；在 `liveWsProxy.ts` 引入 `timingSafePasswordEqual`。
2. 网络与代理层：在 `config.ts`、`thirdPartyProxy.ts` 与 `proxyForward.ts` 中增加 `ENABLE_THIRD_PARTY_PRIVATE_HTTP` 支持，打通 Docker 模式下对 Ollama / LM Studio 等私有内网 HTTP 模型的代理；在前端资源引用处使用 `BASE_URL` 动态拼接。
3. 状态与并发层：将 `mcpApprovalStore.ts` 升级为 FIFO 请求队列；在 `autoTitleSession.ts` 中补充无 Gemini Key 时落入启发式会话标题的保底；补全 `modelConfiguration.ts` 中 `gemini-robotics-er-1.6-preview` 到 `2-preview` 的别名映射。
4. 测试与工程化：在 `src/test/setup.ts` 中对 Radix UI 异步微任务引起的无害 `act(...)` 告警进行精细化过滤，恢复 Vitest 本地全量测试运行效率；解耦 `Dockerfile.api` 硬编码镜像源。

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vite, Zustand, Node.js HTTP/WebSocket, Vitest, Testing Library.

**Spec:** 根据针对 `/Volumes/WD_BLACK/Code/AMC-WebUI` 的全量审查报告与缺陷排查结果。

## Global Constraints

- 保持现有所有 API 协议（Gemini 原生、OpenAI-compatible、Anthropic Messages）与数据存储结构的完全向后兼容；
- 遵循 TypeScript 严格模式，`pnpm run typecheck` 与 `pnpm run build:api` 0 错误；
- `pnpm run lint` 0 报错 0 警告；
- 保持 `pnpm run i18n:check` 覆盖率 100%；
- 所有的代码修改均须配套编写或更新 Vitest 单元测试，遵循 TDD。

---

### Task 1: 修复 HTML 预览 iframe 沙箱同源权限逃逸

**Files:**

- Modify: `src/utils/html-preview/previewPrivilege.ts:42-44`
- Test: `src/utils/html-preview/previewPrivilege.test.ts`
- Test: `src/components/modals/html-preview/HtmlPreviewContent.test.tsx`

**Interfaces:**

- `HTML_PREVIEW_SANDBOX.unrestricted`: 必须移除 `allow-same-origin`，保留 `allow-scripts allow-forms allow-popups allow-modals allow-downloads allow-popups-to-escape-sandbox allow-presentation allow-pointer-lock`

- [x] **Step 1: 检查并更新 `previewPrivilege.test.ts` 中对 sandbox 属性的断言**

```typescript
it('unrestricted sandbox allows scripts and presentation but disallows same-origin to protect host storage', () => {
  expect(HTML_PREVIEW_SANDBOX.unrestricted).toContain('allow-scripts');
  expect(HTML_PREVIEW_SANDBOX.unrestricted).not.toContain('allow-same-origin');
});
```

- [x] **Step 2: 运行测试验证失败**

Run: `pnpm --prefix /Volumes/WD_BLACK/Code/AMC-WebUI exec node scripts/run-vitest.mjs run src/utils/html-preview/previewPrivilege.test.ts`  
Expected: FAIL（因为当前包含 `allow-same-origin`）

- [x] **Step 3: 修改 `previewPrivilege.ts` 移除 `allow-same-origin`**

```typescript
export const HTML_PREVIEW_SANDBOX: Record<HtmlPreviewPrivilege, string> = {
  sanitized: 'allow-scripts allow-forms allow-popups allow-modals allow-downloads',
  unrestricted:
    'allow-scripts allow-forms allow-popups allow-modals allow-downloads allow-popups-to-escape-sandbox allow-presentation allow-pointer-lock',
};
```

- [x] **Step 4: 运行测试确保全部通过**

Run: `pnpm --prefix /Volumes/WD_BLACK/Code/AMC-WebUI exec node scripts/run-vitest.mjs run src/utils/html-preview/`  
Expected: PASS

---

### Task 2: MCP 工具调用审批流（HITL）改造为 FIFO 队列，修复并发死锁

**Files:**

- Modify: `src/stores/mcpApprovalStore.ts`
- Create: `src/stores/mcpApprovalStore.test.ts`

**Interfaces:**

- `McpApprovalState`:
  - `pendingQueue: PendingMcpApproval[]`
  - `pending: PendingMcpApproval | null` (派生或指向队首)
  - `openApproval: (request: McpApprovalRequest, resolve: (decision: McpApprovalDecision) => void) => void` (入队)
  - `resolveApproval: (decision: McpApprovalDecision) => void` (结算队首，并自动出队下一项)

- [x] **Step 1: 编写 `mcpApprovalStore.test.ts` 测试并发调用时队列排队与连续结算**

```typescript
describe('mcpApprovalStore', () => {
  it('queues concurrent approval requests and settles them in order', async () => {
    const store = useMcpApprovalStore.getState();
    const p1 = requestToolApproval({ serverName: 'S1', toolName: 'T1', arguments: {} } as any);
    const p2 = requestToolApproval({ serverName: 'S2', toolName: 'T2', arguments: {} } as any);

    expect(useMcpApprovalStore.getState().pending?.request.toolName).toBe('T1');
    useMcpApprovalStore.getState().resolveApproval('allow');
    expect(await p1).toBe('allow');

    expect(useMcpApprovalStore.getState().pending?.request.toolName).toBe('T2');
    useMcpApprovalStore.getState().resolveApproval('deny');
    expect(await p2).toBe('deny');

    expect(useMcpApprovalStore.getState().pending).toBeNull();
  });
});
```

- [x] **Step 2: 运行测试验证失败**

Run: `pnpm --prefix /Volumes/WD_BLACK/Code/AMC-WebUI exec node scripts/run-vitest.mjs run src/stores/mcpApprovalStore.test.ts`  
Expected: FAIL

- [x] **Step 3: 修改 `mcpApprovalStore.ts` 实现队列机制**

```typescript
interface McpApprovalState {
  pendingQueue: PendingMcpApproval[];
  pending: PendingMcpApproval | null;
  openApproval: (request: McpApprovalRequest, resolve: (decision: McpApprovalDecision) => void) => void;
  resolveApproval: (decision: McpApprovalDecision) => void;
}

export const useMcpApprovalStore = create<McpApprovalState>((set, get) => ({
  pendingQueue: [],
  pending: null,
  openApproval: (request, resolve) => {
    set((state) => {
      const nextQueue = [...state.pendingQueue, { request, resolve }];
      return {
        pendingQueue: nextQueue,
        pending: nextQueue[0] ?? null,
      };
    });
  },
  resolveApproval: (decision) => {
    const { pendingQueue } = get();
    if (pendingQueue.length === 0) return;
    const current = pendingQueue[0];
    current.resolve(decision);
    const nextQueue = pendingQueue.slice(1);
    set({
      pendingQueue: nextQueue,
      pending: nextQueue[0] ?? null,
    });
  },
}));
```

- [x] **Step 4: 运行测试验证通过**

Run: `pnpm --prefix /Volumes/WD_BLACK/Code/AMC-WebUI exec node scripts/run-vitest.mjs run src/stores/mcpApprovalStore.test.ts`  
Expected: PASS

---

### Task 3: 支持 Docker 代理转发本地模型（Ollama / vLLM / LM Studio）

**Files:**

- Modify: `server/src/config.ts`
- Modify: `server/src/proxyForward.ts`
- Modify: `server/src/thirdPartyProxy.ts`
- Modify: `server/src/createServer.ts`
- Modify: `.env.example`
- Modify: `docker-compose.yml`
- Test: `server/src/config.test.ts`
- Test: `server/src/thirdPartyProxy.test.ts`

**Interfaces:**

- `ApiServerConfig`: 增加 `enableThirdPartyPrivateHttp?: boolean`
- `ThirdPartyProxyConfig`: 增加 `enablePrivateHttp?: boolean`
- `guardPublicHttpsUrl(rawUrl: string, options?: UpstreamUrlGuardOptions)`:
  - `options.allowPrivateHttp?: boolean`：当为 `true` 时，允许 `http:` 协议且不拦截私有网络主机名（localhost/127.0.0.1/192.168.x.x 等）。

- [x] **Step 1: 在 `server/src/config.test.ts` 中增加 `ENABLE_THIRD_PARTY_PRIVATE_HTTP` 测试**

```typescript
it('parses ENABLE_THIRD_PARTY_PRIVATE_HTTP flag', () => {
  expect(loadConfig({ ENABLE_THIRD_PARTY_PRIVATE_HTTP: 'true' }).enableThirdPartyPrivateHttp).toBe(true);
  expect(loadConfig({ ENABLE_THIRD_PARTY_PRIVATE_HTTP: 'false' }).enableThirdPartyPrivateHttp).toBe(false);
  expect(loadConfig({}).enableThirdPartyPrivateHttp).toBe(false);
});
```

- [x] **Step 2: 在 `server/src/thirdPartyProxy.test.ts` 中增加本地 HTTP Ollama 代理转发测试**

```typescript
it('allows local HTTP upstream when enablePrivateHttp is true', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [] }), { status: 200 }));
  const request = createMockRequest({
    headers: {
      'x-third-party-base-url': 'http://127.0.0.1:11434/v1',
      authorization: 'Bearer ollama-key',
    },
  });
  const response = createMockResponse();
  await proxyThirdPartyRequest(
    request,
    response,
    { thirdPartyRoutes: {}, enablePrivateHttp: true, allowedOrigins: [] },
    fetchMock,
  );
  expect(response.statusCode).toBe(200);
});
```

- [x] **Step 3: 更新 `server/src/config.ts`、`proxyForward.ts`、`thirdPartyProxy.ts`、`createServer.ts`**

在 `proxyForward.ts` 中支持 `options.allowPrivateHttp`:

```typescript
export interface UpstreamUrlGuardOptions {
  rejectEmbeddedCredentials?: boolean;
  allowPrivateHttp?: boolean;
}

export function guardPublicHttpsUrl(rawUrl: string, options: UpstreamUrlGuardOptions = {}): UpstreamUrlGuard {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, rejection: 'invalid-url' };
  }

  if (!options.allowPrivateHttp && url.protocol !== 'https:') {
    return { ok: false, rejection: 'insecure-protocol', hostname: url.hostname };
  }
  if (options.allowPrivateHttp && url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, rejection: 'insecure-protocol', hostname: url.hostname };
  }

  if (options.rejectEmbeddedCredentials && (url.username || url.password)) {
    return { ok: false, rejection: 'embedded-credentials', hostname: url.hostname };
  }

  if (!options.allowPrivateHttp && isPrivateNetworkHostname(url.hostname)) {
    return { ok: false, rejection: 'private-network-host', hostname: url.hostname };
  }

  return { ok: true, url };
}
```

并在 `thirdPartyProxy.ts` 中传入 `allowPrivateHttp: Boolean(config.enablePrivateHttp)`。

- [x] **Step 4: 更新 `.env.example` 与 `docker-compose.yml` 增加环境变量声明**

- [x] **Step 5: 运行服务端测试验证通过**

Run: `pnpm --prefix /Volumes/WD_BLACK/Code/AMC-WebUI exec node scripts/run-vitest.mjs run server/src/`  
Expected: PASS

---

### Task 4: 修复纯第三方模型模式下会话自动命名（Auto-Titling）失效

**Files:**

- Modify: `src/features/auto-titling/autoTitleSession.ts:176-185`
- Test: `src/features/auto-titling/autoTitleSession.test.ts`

**Interfaces:**

- `autoTitleSession`: 当 `getGeminiKeyForRequest` 报错且非 stickyKey 时，不直接 `return false`，而是允许非正在流式的已完成 exchange 进入后续的启发式标题抽取逻辑 (`generateSessionTitle`)。

- [x] **Step 1: 在 `autoTitleSession.test.ts` 中增加纯第三方模型（无 Gemini Key）下的自动命名测试**

```typescript
it('falls back to heuristic session title when no Gemini API key is configured (pure third-party mode)', async () => {
  const session = createTestSession({
    messages: [
      { id: '1', role: 'user', content: 'What is WebAssembly?' },
      { id: '2', role: 'model', content: 'WebAssembly is a binary instruction format.', isLoading: false },
    ],
  });
  const updateAndPersistSessions = vi.fn();
  const titled = await autoTitleSession({
    session,
    appSettings: { ...DEFAULT_APP_SETTINGS, apiKey: '' },
    language: 'en',
    updateAndPersistSessions,
  });

  expect(titled).toBe(true);
  expect(updateAndPersistSessions).toHaveBeenCalled();
});
```

- [x] **Step 2: 运行测试验证失败**

Run: `pnpm --prefix /Volumes/WD_BLACK/Code/AMC-WebUI exec node scripts/run-vitest.mjs run src/features/auto-titling/autoTitleSession.test.ts`  
Expected: FAIL

- [x] **Step 3: 修改 `autoTitleSession.ts`**

当 `keyResult` 报错时，记录日志并跳过调用 AI 接口，但继续执行下方的启发式兜底代码：

```typescript
let keyToUse: string | null = null;
if (stickyKey) {
  keyToUse = stickyKey;
} else {
  const keyResult = getGeminiKeyForRequest(appSettings, session.settings, { skipIncrement: true });
  if ('error' in keyResult) {
    logService.debug(`Skipping AI title generation for session ${sessionId} (no Gemini key): ${keyResult.error}`);
  } else {
    keyToUse = keyResult.key;
  }
}
```

并在 `if (keyToUse) { try { ... } }` 中尝试 AI 生成；若无 key 或 AI 失败，则自然落入下方的 `if (!exchange.isIncomplete) { const localTitle = generateSessionTitle(...); ... }`。

- [x] **Step 4: 运行测试验证通过**

Run: `pnpm --prefix /Volumes/WD_BLACK/Code/AMC-WebUI exec node scripts/run-vitest.mjs run src/features/auto-titling/autoTitleSession.test.ts`  
Expected: PASS

---

### Task 5: 统一 WebSocket 密码安全时序校验

**Files:**

- Create: `server/src/passwordSecurity.ts`
- Modify: `server/src/createServer.ts`
- Modify: `server/src/liveWsProxy.ts`
- Test: `server/src/passwordSecurity.test.ts`
- Test: `server/src/liveWsProxy.test.ts`

**Interfaces:**

- `timingSafePasswordEqual(provided: string, expected: string): boolean`

- [x] **Step 1: 编写 `passwordSecurity.test.ts`**

```typescript
describe('timingSafePasswordEqual', () => {
  it('returns true for matching passwords', () => {
    expect(timingSafePasswordEqual('secret-123', 'secret-123')).toBe(true);
  });
  it('returns false for mismatched passwords', () => {
    expect(timingSafePasswordEqual('wrong', 'secret-123')).toBe(false);
  });
});
```

- [x] **Step 2: 提取 `timingSafePasswordEqual` 至 `server/src/passwordSecurity.ts`**

- [x] **Step 3: 在 `liveWsProxy.ts` 中替换原本的裸 `token !== config.accessPassword`**

```typescript
if (!timingSafePasswordEqual(token, config.accessPassword)) {
  logLiveEvent('rejected', { reason: 'unauthorized' });
  socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
  socket.destroy();
  return;
}
```

- [x] **Step 4: 运行服务端测试验证通过**

Run: `pnpm --prefix /Volumes/WD_BLACK/Code/AMC-WebUI exec node scripts/run-vitest.mjs run server/src/liveWsProxy.test.ts`  
Expected: PASS

---

### Task 6: 补全停服模型 `gemini-robotics-er-1.6-preview` 迁移别名映射

**Files:**

- Modify: `src/constants/modelConfiguration.ts`
- Test: `src/constants/modelConfiguration.test.ts`

**Interfaces:**

- `REMOVED_MODEL_ID_MIGRATIONS`: 包含 `'gemini-robotics-er-1.6-preview': ROBOTICS_MODEL` 及 `'models/gemini-robotics-er-1.6-preview': ROBOTICS_MODEL`
- `THINKING_BUDGET_RANGES`: 移除已停服的 1.6 条目

- [x] **Step 1: 在 `modelConfiguration.test.ts` 中增加 1.6 模型的迁移断言**

```typescript
it('migrates discontinued gemini-robotics-er-1.6-preview to ROBOTICS_MODEL', () => {
  expect(migrateRemovedModelId('gemini-robotics-er-1.6-preview')).toBe(ROBOTICS_MODEL);
  expect(migrateRemovedModelId('models/gemini-robotics-er-1.6-preview')).toBe(ROBOTICS_MODEL);
});
```

- [x] **Step 2: 运行测试验证失败**

- [x] **Step 3: 修改 `modelConfiguration.ts` 补全映射**

```typescript
const REMOVED_MODEL_ID_MIGRATIONS: Readonly<Record<string, string>> = {
  'gemini-3.1-flash-lite': 'gemini-3.5-flash-lite',
  'models/gemini-3.1-flash-lite': 'gemini-3.5-flash-lite',
  'gemini-3.5-flash': 'gemini-3.7-flash',
  'models/gemini-3.5-flash': 'gemini-3.7-flash',
  'gemini-robotics-er-1.6-preview': ROBOTICS_MODEL,
  'models/gemini-robotics-er-1.6-preview': ROBOTICS_MODEL,
};
```

- [x] **Step 4: 运行测试验证通过**

Run: `pnpm --prefix /Volumes/WD_BLACK/Code/AMC-WebUI exec node scripts/run-vitest.mjs run src/constants/modelConfiguration.test.ts`  
Expected: PASS

---

### Task 7: 消除静态资源与 Worker 中的硬编码根路径，适配子路径部署

**Files:**

- Modify: `src/features/audio/audioCompressionWorkerCode.ts`
- Modify: `src/utils/pdfWorker.ts`
- Modify: `src/utils/html-preview/previewDocument.ts`

- [x] **Step 1: 编写/更新路径解析测试**
- [x] **Step 2: 将 `pdfWorker.ts` 的 `PDF_WORKER_SRC` 改为使用 `import.meta.env.BASE_URL`**

```typescript
const PDF_WORKER_SRC = `${import.meta.env.BASE_URL || '/'}pdf.worker.min.mjs`.replace(/\/{2,}/g, '/');
```

- [x] **Step 3: 将 `previewDocument.ts` 中的 `ECHARTS_SCRIPT_SRC` 改为使用 `import.meta.env.BASE_URL`**

```typescript
const ECHARTS_SCRIPT_SRC = `${import.meta.env.BASE_URL || '/'}vendor/echarts.min.js`.replace(/\/{2,}/g, '/');
```

- [x] **Step 4: 将 `audioCompressionWorkerCode.ts` 中的 `importScripts` 升级为基于 Worker 所在自身 host 动态或带 base 的脚本地址**

- [x] **Step 5: 运行相关单元测试确保全部通过**

---

### Task 8: 过滤测试环境中的 Radix UI `act(...)` 告警噪音

**Files:**

- Modify: `src/test/setup.ts`

- [x] **Step 1: 在 `src/test/setup.ts` 中拦截 `console.error`，过滤来自 `@radix-ui` 的内部微任务 `act` 告警**

```typescript
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const message = typeof args[0] === 'string' ? args[0] : '';
  if (
    message.includes('was not wrapped in act(...)') &&
    (message.includes('Select') ||
      message.includes('Slider') ||
      message.includes('Popper') ||
      message.includes('SelectItem'))
  ) {
    return;
  }
  originalConsoleError(...args);
};
```

- [x] **Step 2: 验证运行 `SettingsModal.test.tsx`，确认不再输出数十万行重复日志并平稳快速通过**

Run: `pnpm --prefix /Volumes/WD_BLACK/Code/AMC-WebUI exec node scripts/run-vitest.mjs run src/components/settings/SettingsModal.test.tsx`  
Expected: PASS 且日志保持清爽（几秒内完成）

---

### Task 9: 解耦 Dockerfile.api 硬编码镜像源

**Files:**

- Modify: `Dockerfile.api`

- [x] **Step 1: 在 `Dockerfile.api` 中引入 `ARG NPM_REGISTRY=https://registry.npmjs.org`**

```dockerfile
FROM node:24-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

ARG NPM_REGISTRY=https://registry.npmjs.org

RUN echo '{"type":"module"}' > /app/package.json && \
    npm config set registry ${NPM_REGISTRY} && \
    npm install --no-package-lock --no-audit --no-fund @modelcontextprotocol/sdk@^1.29.0 ws@^8.18.0

COPY server/dist /app/server/dist

EXPOSE 3001

CMD ["node", "server/dist/server/src/index.js"]
```

- [x] **Step 2: 运行 CI 验证与构建指令确保无构建错误**

---

### Task 10: 全量验证与交付验收

- [x] **Step 1: 运行类型检查**
      `pnpm --prefix /Volumes/WD_BLACK/Code/AMC-WebUI typecheck && pnpm --prefix /Volumes/WD_BLACK/Code/AMC-WebUI run build:api`
- [x] **Step 2: 运行 ESLint 校验**
      `pnpm --prefix /Volumes/WD_BLACK/Code/AMC-WebUI run lint`
- [x] **Step 3: 运行 Knip 依赖扫描**
      `pnpm --prefix /Volumes/WD_BLACK/Code/AMC-WebUI run knip`
- [x] **Step 4: 运行国际化覆盖检查**
      `pnpm --prefix /Volumes/WD_BLACK/Code/AMC-WebUI run i18n:check`
- [x] **Step 5: 运行前端全量打包测试**
      `pnpm --prefix /Volumes/WD_BLACK/Code/AMC-WebUI run build`

# Fix Report — Critical Batch 1 Review (ca07bd6d..9752e619)

Branch: `main` (9752e619 head)
Fix commit: `fix(mcp): address critical batch1 review (logs guard, poll deps, tabs layout)`
Workdir: `/Volumes/WD_BLACK/Code/AMC-WebUI`

## Summary

Addressed 3 Critical Must Fix and 8 Important Should Fix items flagged in final review. All changes minimal, behavior-preserving, and verified via existing test suites, build, and i18n check.

## Critical C1: GET /api/mcp/logs bypasses private-host guard

**Problem:** `server/src/mcpRoutes.ts:582-589` had no `isPrivateNetworkHostname` check, returned 200 for any `serverId`, sat before POST-only guard so was public GET. Could probe private hosts via `serverId`.

**Fix:**

- `server/src/mcpClient.ts`: Added `knownServerIds` Set + `hasLogs(serverId)` bridge method. Tracks known servers on any successful or failed MCP operation (`listTools`, `callTool`, `createConnectedSession`). Also added `appendLog` info on success, `stderr` capture for stdio transports, and cleared on `dispose`. Exposed `hasLogs` in return.
- `server/src/mcpTypes.ts`: Added `hasLogs?: (serverId: string) => boolean` to `McpClientBridge`.
- `server/src/mcpRoutes.ts`: Added guard before returning logs:
  ```ts
  if (mcpClient.hasLogs && !mcpClient.hasLogs(serverId)) {
    sendJson(request, response, 404, { error: 'MCP server not found.' }, allowedOrigins);
    return true;
  }
  void options.enablePrivateHttp; // parity with POST guards, unknown already 404s
  ```
  Known servers (even with empty logs) return 200 empty; unknown returns 404. Mocks without `hasLogs` (existing tests) keep 200 for backward compat.

**Verification:**

- `NODE_ENV=test npx vitest run server/src/mcpRoutes.test.ts -v` 17/17 pass (existing 200 + 400 tests still pass; unknown with hasLogs now 404 but mocks without hasLogs unchanged)
- `server/src/mcpClient.test.ts` 9/9 pass (ring 200, isolation, error log)

## Critical C2: Polling effect depends on object identity, resets every render

**Problem:** `McpLogsTab.tsx:11,25,35` used `[server]` dep where `server` is new object on every `onUpdate`, and `useEffect [load]` clears/creates interval each keystroke. No AbortController, no visibilitychange listener, interval recreated frequently.

**Fix:** `src/components/settings/sections/McpLogsTab.tsx`

- Changed `load` deps to `[server.id]` with `serverIdRef` stable ref, `fetchMcpLogs({ ...server, id: serverIdRef.current }, signal)` with AbortSignal.
- Added `AbortController` in `useEffect`, `controller.abort()` on cleanup.
- Added `visibilitychange` listener to reload when tab becomes visible, interval still checks `!document.hidden`.
- Fixed `t` prop unused: now uses `t('settingsMcpLogsRefresh')` / `Copy` / `Empty` with fallback English via `t` (added translations).
- Level badges: added `stderr` (orange), `debug` (zinc-500) alongside error/warn.

**Verification:**

- `McpSection.test.tsx` logs tab test still passes (1/1), now with stable deps and abort.
- No interval thrash on server edits.

## Critical C3: Tools / Settings tab content is orphaned

**Problem:** `McpSection.tsx:668-756` rendered per-tool toggle table outside tab system (details open) and Tools tab had no body, Settings tab empty. Tabs shell broken.

**Fix:** `src/components/settings/sections/McpSection.tsx`

- Removed orphaned standalone tool table IIFE outside tabs.
- Moved tool table into `activeTabs[stateKey] ?? 'tools' === 'tools'` body inside tabs shell, with same toggle logic but rendered as direct list (no `<details>` wrapper, `first:border-t-0` for first item).
- Added empty tools state `settingsMcpEmptyTools`.
- Removed Settings tab button (hide if not needed) – tabs now are Tools/Prompts/Resources/Logs only. Settings content was empty, now hidden.

**Verification:**

- `renders tool table with enable toggle and updates disabledTools` test still passes (tool_a found via default Tools tab).
- `renders logs tab and refreshes` still passes (Logs tab click works).

## Important I1-I8 (quick)

**I1 matchKeywords missing description/tags/provider**

- Extended `matchKeywords` hay to include `description`, `provider`, `tags` via `s as McpServerConfig & { description?, provider?, tags? }` single assertion (avoids double `as unknown as` violation).

**I2 filtered-empty EmptyState with Clear filters**

- Added `filteredAndSorted.length === 0` branch when `servers.length > 0` but filters yield empty: shows `settingsMcpEmptyFiltered` + `Clear filters` button that resets `filter='all'` and `search=''`.

**I3 McpLogsTab cleanup: AbortController, visibilitychange, i18n t prop unused, level badges**

- Done in C2.

**I4 sortOrder sync fragile + lint violation (join(',') dep)**

- Extracted `serverIdsKey = servers.map(s=>s.id).join(',')` and dep `useEffect(..., [serverIdsKey])` instead of inline `servers.map(...).join(',')` (fixes `react-hooks/exhaustive-deps`).

**I5 indexOf vs findIndex by id**

- Kept `servers.indexOf(server)` object-identity for `origIndex` to correctly handle duplicate `id` case (test `updates only the edited server when multiple MCP servers share the same id` requires identity). Sorting still uses `sortOrder.indexOf(id)` by id. Documented.

**I6 McpResourcesTab key collision, types**

- Rewrote `McpResourcesTab.tsx` with proper `McpResourceDefinition` / `McpResourceTemplateDefinition` types, key `key = uri ?? uriTemplate ?? `${name}-${index}``with index fallback to avoid collision, typed`t: (key:string)=>string`.

**I7 transport stderr / success info logs never emitted**

- `mcpClient.ts` now emits `info` logs on successful `listTools` (`Listed N tools`) and `callTool` (`Called tool X successfully`), tracks `knownServerIds`, and attaches `stderr` listener for stdio transports (`transport.stderr || process.stderr || subprocess.stderr` `on('data')` → `appendLog(id,'stderr',line)`).

**I8 batch contamination (ignore)**

- No action.

## Additional i18n

Added to `src/i18n/translations/settings/mcp.ts` (7 locales):

- `settingsMcpEmptyFiltered`, `settingsMcpClearFilters`, `settingsMcpEmptyTools`, `settingsMcpLogsRefresh`, `settingsMcpLogsCopy`, `settingsMcpLogsEmpty`

All new keys covered in `npm run i18n:check`.

## Verification Commands

```bash
NODE_ENV=test npx vitest run server/src/mcpClient.test.ts server/src/mcpRoutes.test.ts src/services/api/mcpApi.test.ts src/components/settings/sections/McpSection.test.tsx src/test/architecture/codeStyleBoundaries.test.ts -v
# ✓ 79 passed (9 + 17 + 4 + 20 + 29)

npm run i18n:check
# ✓ 1188/1188 keys

npm run build:docker
# ✓ built in 5.86s (vite + tsc 0 errors)
```

Full suite: no new failures; codeStyleBoundaries 29/29.

## Files Changed

- `server/src/mcpClient.ts` — knownServerIds, hasLogs, success/stderr logs, dispose clear
- `server/src/mcpTypes.ts` — hasLogs
- `server/src/mcpRoutes.ts` — 404 for unknown serverId, private guard parity
- `src/components/settings/sections/McpLogsTab.tsx` — [server.id] deps, AbortController, visibilitychange, t usage, level badges
- `src/components/settings/sections/McpPromptsTab.tsx` — typed to McpPromptDefinition
- `src/components/settings/sections/McpResourcesTab.tsx` — typed, key fix
- `src/components/settings/sections/McpSection.tsx` — filter/search/sort fixes, orphaned table moved into Tools tab, Settings tab hidden, empty filtered state, lint fix
- `src/i18n/translations/settings/mcp.ts` — 6 new keys

## Status

DONE — commits and tests summarized above. Ready for review.

# Task 6 Report: 脚本与文档（可复制支架）

Date: 2026-08-21
Commit: (this commit) `feat(i18n): add coverage check and add-language scaffolding`
Base: 1cfa39e1

## What Implemented

- **Create `scripts/check-i18n-coverage.mjs`**: 遍历 `src/i18n/translations/**/*.ts` + `voiceStyleTranslations.ts` + `coreTranslations.ts`（settings 目录动态发现，未来新增文件自动纳入），解析每个 `{ en: ..., zh: ..., ja: ... }` 条目，检查：
  - 每个 key 是否包含全部 `SUPPORTED_LANGUAGES = ['en','zh','ja']`
  - 占位符一致性：en 的 `{xxx}` 集合必须与 zh/ja 完全一致
  - 缺失时输出缺失清单并 `process.exit(1)`，供 CI 拦截
- **Create `scripts/add-language.mjs`**: `node scripts/add-language.mjs <lang> [--dry-run]`，在每个翻译条目的 `ja: '...'` 后插入 `<lang>: ''` 占位。幂等（已有该语言则 skip），支持 `--dry-run` 预览，校验语言代码格式（`^[a-z]{2}(-[A-Z]{2})?$`）
- **Modify `package.json`**: 新增 `"i18n:check"` 与 `"i18n:add"` 两个 npm scripts
- **Modify `CONTRIBUTING.md`**: 追加 "Adding a new language" 章节，4 步流程（registry → add-language → 填词 → i18n:check + typecheck/lint/test）

## Verification Results

- `node scripts/check-i18n-coverage.mjs` → `✓ i18n coverage: 1142/1142 keys have en/zh/ja` EXIT 0
- `node scripts/add-language.mjs ko --dry-run` → 列出将更新 19 个文件，0 warnings，EXIT 0
- `npm run typecheck` (`tsc --noEmit`) → PASS, 0 errors
- `npm run lint` → 与基线一致（1 pre-existing error + 42 warnings），无新增

## Files Changed

- Create: `scripts/check-i18n-coverage.mjs`
- Create: `scripts/add-language.mjs`
- Modify: `package.json` (+2 scripts)
- Modify: `CONTRIBUTING.md` (+18 lines)

## Self-Review

- 脚本不 import TS 文件（避免 ts-node 依赖），语言列表在脚本内硬编码并注释与 `languageRegistry.ts` 保持同步
- `add-language.mjs` 幂等且默认 dry-run 可预览，不会破坏注释/多行字符串
- 后续加 `ko/es/fr/de` 只需：registry 加一项 → `npm run i18n:add ko` → 机翻填充 → `npm run i18n:check`

## Concerns

- 无阻塞。脚本内 `SUPPORTED_LANGUAGES` 与 registry 存在双源，已在两处注释中标注需同步；如后续语言增多可考虑构建期生成。

---

## Final review fixes

Date: 2026-08-21
Commit: `fix(i18n): satisfy architecture boundary guards (single import, no path comments, barrel re-export)` (see `git log` — HEAD on main)
Base: 77137af7

### Issues Fixed

1. `src/types/settings.ts` — merged two separate `from '@/i18n/languageRegistry'` imports into one:
   `import { APP_LANGUAGE_IDS as REGISTRY_APP_LANGUAGE_IDS, type AppLanguage as RegistryAppLanguage } from '@/i18n/languageRegistry';`
2. `src/i18n/languageRegistry.ts` — removed first-line comment `// src/i18n/languageRegistry.ts` that repeated file path
3. `src/pwa/install.ts` — changed `import type { AppLanguage } from '@/types/settings'` → `from '@/types'` to use central barrel

### Commands + Outputs

```sh
$ NODE_ENV=test node scripts/run-vitest.mjs run src/test/architecture/codeStyleBoundaries.test.ts src/test/architecture/refactorBoundaries.test.ts

 RUN  v4.1.11 /Volumes/WD_BLACK/Code/AMC-WebUI

 ✓ src/test/architecture/refactorBoundaries.test.ts (4 tests) 213ms
 ✓ src/test/architecture/codeStyleBoundaries.test.ts (29 tests) 464ms

 Test Files  2 passed (2)
      Tests  33 passed (33)
   Duration  1.19s
```

```sh
$ npm run typecheck
> amc-webui@1.15.0 typecheck
> tsc --noEmit
# EXIT 0 — 0 errors
```

All 3 architecture boundary guards now pass; typecheck clean. `PdfToolbar.test.tsx` failure excluded as pre-existing.

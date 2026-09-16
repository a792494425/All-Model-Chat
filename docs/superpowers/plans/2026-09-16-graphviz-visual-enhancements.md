# Graphviz Visual Display Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate the visual display quality of Graphviz diagrams in AMC-WebUI to modern design standards (soft card drop shadows, clean edge label text halos, comfortable CJK vertical breathing margins, refined edge arrowheads, and an engineering dot-grid canvas background).

**Architecture:**

1. Refine default DOT attribute injections in `vizRuntime.ts` (`buildThemeDefaults`: tighter arrow proportions `arrowsize="0.75"`, comfortable node padding `margin="0.22,0.13"`, clean nodesep/ranksep).
2. Enhance post-render SVG processing in `vizRuntime.ts`: inject a reusable SVG `<feDropShadow>` filter applied specifically to node background shapes (keeping text crisp), and inject edge text halo styling (`paint-order: stroke fill`) so crossing edges don't cut through label text.
3. Bump `RENDER_STYLE_VERSION` to `v9` for cache invalidation.
4. Add a subtle blueprint dot-grid canvas texture to `DiagramWrapper.tsx` for a high-end whiteboard/architecture feel.

**Tech Stack:** TypeScript, React, Graphviz DOT, WebAssembly (`@viz-js/viz`), SVG Filters & Styling, Tailwind CSS, Vitest.

**Spec:** Current conversation recommendations on Graphviz visual display enhancements.

## Global Constraints

- Must not break existing Live Artifacts relay protocol or chat markdown rendering.
- Must preserve SVG sanitization through DOMPurify (filters and SVG styles must remain clean and safe).
- Node text must remain crisp and readable (shadows apply to card shapes, not text elements).
- Dark and light theme compatibility across all registered themes.
- All existing tests in `vizRuntime.test.ts` and `GraphvizBlock.test.tsx` must pass.

---

### Task 1: Update DOT Defaults and SVG Filter/Halo Post-Processing in `vizRuntime.ts`

**Files:**

- Modify: `src/features/graphviz/vizRuntime.ts:220-295, 595-675`
- Test: `src/features/graphviz/vizRuntime.test.ts`

**Interfaces:**

- Consumes: `Theme['colors']`, `renderDotToSvg`
- Produces: `RENDER_STYLE_VERSION = 'v9'`, enhanced `buildThemeDefaults`, enhanced `renderDotToSvg`

- [ ] **Step 1: Write tests in `src/features/graphviz/vizRuntime.test.ts` for new visual enhancements**

Add test cases asserting:

- `getGraphvizCacheKey` starts with `v9:`
- `buildThemeDefaults` uses `arrowsize="0.75"`, `margin="0.22,0.13"`
- `renderDotToSvg` injects `<filter id="amc-graphviz-shadow"` into `<defs>`
- `renderDotToSvg` applies `filter="url(#amc-graphviz-shadow)"` to node shapes
- `renderDotToSvg` injects edge text halo styles into `<style>`

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm vitest run src/features/graphviz/vizRuntime.test.ts`
Expected: FAIL due to `v8` cache key mismatch and missing filter/style assertions.

- [ ] **Step 3: Implement DOT defaults updates and SVG enhancement in `src/features/graphviz/vizRuntime.ts`**

1. Update `RENDER_STYLE_VERSION = 'v9';`.
2. Update `buildThemeDefaults`:
   - `arrowsize="0.75"`
   - `margin="0.22,0.13"`
   - `nodesep="0.48"`
   - `ranksep="0.72"`
   - `penwidth="1.2"`
3. Implement `enhanceGraphvizSvg(svgElement: SVGSVGElement, colors: Theme['colors']): void`:
   - Inject `<defs>` with `<filter id="amc-graphviz-shadow">` using `<feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.08" flood-color="#000000" />`.
   - Apply `filter="url(#amc-graphviz-shadow)"` to `<polygon>`, `<path>`, `<ellipse>` inside `<g class="node">` (avoiding text).
   - Inject `<style>` containing:
     ```css
     .edge text {
       paint-order: stroke fill;
       stroke-width: 3.5px;
       stroke-linejoin: round;
       stroke-linecap: round;
     }
     ```
     with `stroke` dynamically bound to the theme surface background.
4. Wire `enhanceGraphvizSvg` into `renderDotToSvg` right after `applyGraphvizSvgFonts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/features/graphviz/vizRuntime.test.ts`
Expected: PASS (all tests green).

- [ ] **Step 5: Commit changes**

```bash
git add src/features/graphviz/vizRuntime.ts src/features/graphviz/vizRuntime.test.ts
git commit -m "feat(graphviz): enhance visual rendering with node shadows, edge text halos, and refined typography"
```

---

### Task 2: Add Blueprint Dot-Grid Canvas Background in `DiagramWrapper.tsx`

**Files:**

- Modify: `src/components/message/blocks/parts/DiagramWrapper.tsx:49-55`
- Test: `src/components/message/blocks/GraphvizBlock.test.tsx`

**Interfaces:**

- Consumes: Tailwind classes and CSS variables (`--theme-border-secondary`, `--theme-bg-secondary`)

- [ ] **Step 1: Update container background styling in `DiagramWrapper.tsx`**

Add delicate dot-grid texture on the diagram wrapper canvas:

```tsx
const bgClass = isDarkThemeId(themeId) ? 'bg-[var(--theme-bg-secondary)]' : 'bg-white';
const dotGridClass =
  'bg-[radial-gradient(var(--theme-border-secondary)_1px,transparent_1px)] [background-size:16px_16px]';
```

Combine into the diagram container div:

```tsx
className={`${containerClasses} ${bgClass} ${dotGridClass} ...`}
```

- [ ] **Step 2: Run tests to ensure no regressions**

Run: `pnpm vitest run src/components/message/blocks/GraphvizBlock.test.tsx`
Expected: PASS.

- [ ] **Step 3: Commit changes**

```bash
git add src/components/message/blocks/parts/DiagramWrapper.tsx
git commit -m "style(diagram): add blueprint dot-grid texture to diagram container"
```

---

### Task 3: Comprehensive Test Suite & Visual Regression Verification

**Files:**

- Test: `src/features/graphviz/vizRuntime.test.ts`
- Test: `src/features/graphviz/graphvizLimits.test.ts`
- Test: `src/utils/html-preview/graphvizRendererScript.test.ts`
- Test: `src/components/message/blocks/GraphvizBlock.test.tsx`

- [ ] **Step 1: Run all graphviz and diagram tests**

Run: `pnpm vitest run src/features/graphviz/ src/utils/html-preview/graphvizRendererScript.test.ts src/components/message/blocks/GraphvizBlock.test.tsx`
Expected: PASS (all tests pass).

- [ ] **Step 2: Run linter / typecheck if applicable**

Run: `pnpm tsc --noEmit`
Expected: 0 type errors in modified files.

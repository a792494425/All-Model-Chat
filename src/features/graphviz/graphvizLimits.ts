/**
 * Single source of truth for the declarative graphviz limits advertised in the
 * Live Artifacts prompts (liveArtifacts.ts) and enforced at runtime (vizRuntime.ts).
 *
 * Both the node and edge counters are heuristic UPPER-BOUND guards, not a DOT
 * parser: they must never UNDER-count (a too-big graph slipping past the guard),
 * while occasional OVER-counting is acceptable (an edge-case graph refused).
 * Keep this bias in mind when touching the regexes.
 */

export const DOT_MAX_CHARS = 64_000;
export const DOT_MAX_NODES = 200;
export const DOT_MAX_EDGES = 400;

const DOT_RESERVED_WORDS = new Set(['graph', 'digraph', 'subgraph', 'node', 'edge', 'strict']);

/**
 * Replaces comment contents and string/attribute contents with same-length
 * spaces so they cannot contribute node/edge matches. Mirrors the comment state
 * machine from isProbablyCompleteDot in graphvizRendererScript.ts (kept in sync
 * by hand; no shared import between the injected string and this module).
 */
const stripDotCommentsAndStrings = (dot: string): string => {
  const chars = dot.split('');
  let inLineComment = false;
  let inBlockComment = false;
  let inDoubleQuote = false;

  for (let charIndex = 0; charIndex < chars.length; charIndex += 1) {
    const char = chars[charIndex];
    const next = charIndex + 1 < chars.length ? chars[charIndex + 1] : '';

    if (inLineComment) {
      chars[charIndex] = ' ';
      if (char === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      chars[charIndex] = ' ';
      if (char === '*' && next === '/') {
        chars[charIndex + 1] = ' ';
        inBlockComment = false;
        charIndex += 1;
      }
      continue;
    }
    if (char === '\\') {
      chars[charIndex] = ' ';
      charIndex += 1;
      if (charIndex < chars.length) chars[charIndex] = ' ';
      continue;
    }
    if (inDoubleQuote) {
      chars[charIndex] = ' ';
      if (char === '"') inDoubleQuote = false;
      continue;
    }
    if (char === '"') {
      inDoubleQuote = true;
      // Keep the quote character so string boundaries survive; blank only the
      // content. This stops an id inside a label from looking like a standalone
      // node declaration after blanking.
      continue;
    }
    if (char === '/' && next === '/') {
      inLineComment = true;
      chars[charIndex] = ' ';
      chars[charIndex + 1] = ' ';
      charIndex += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      inBlockComment = true;
      chars[charIndex] = ' ';
      chars[charIndex + 1] = ' ';
      charIndex += 1;
      continue;
    }
    if (char === '#') {
      inLineComment = true;
      chars[charIndex] = ' ';
      continue;
    }
  }

  return chars.join('');
};

export const countDotEdges = (dot: string): number => {
  const cleaned = stripDotCommentsAndStrings(dot);
  const matches = cleaned.match(/->|--/g);
  return matches ? matches.length : 0;
};

export const countDotNodes = (dot: string): number => {
  let cleaned = stripDotCommentsAndStrings(dot);
  // A subgraph's name (`subgraph cluster0 {`) is a cluster id, not a node.
  cleaned = cleaned.replace(/\bsubgraph\s+[A-Za-z_]\w*/g, ' ');
  // Attribute assignments (key=value, incl. label="...", rank=same, shape=box)
  // are not node declarations: blank the whole assignment so neither the key
  // nor the value is counted as a node. The value terminates at `;` `,` `[`
  // `]` `}` or newline — never swallow the next declaration.
  cleaned = cleaned.replace(/\b[A-Za-z_]\w*\s*=\s*[^;,[\]}\n]*/g, ' ');
  // Edge operators and statement terminators are not part of an id: replace
  // them with spaces so `A->C }` and `A; B` yield cleanly separated tokens.
  cleaned = cleaned.replace(/->|--|;/g, ' ');

  const ids = new Set<string>();
  const tokenPattern = /[A-Za-z_][\w.-]*|\d+/g;
  for (const tokenMatch of cleaned.matchAll(tokenPattern)) {
    const nodeIdentifier = tokenMatch[0];
    if (!DOT_RESERVED_WORDS.has(nodeIdentifier)) {
      ids.add(nodeIdentifier);
    }
  }
  return ids.size;
};

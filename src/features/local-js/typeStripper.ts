/**
 * Lightweight, fast type-stripping utility for user-supplied TypeScript/JavaScript.
 * Strips common TS interfaces, type aliases, type assertions ('as Type'), and annotations
 * without pulling in a heavy compiler bundle.
 */
export const stripTypeScriptTypes = (sourceCode: string): string => {
  if (!sourceCode) return '';

  let code = sourceCode;

  // 1. Remove multi-line or single-line interface declarations
  code = code.replace(
    /(?:^|\n)\s*interface\s+[A-Za-z0-9_$]+(?:\s*<[^>]*>)?(?:\s+extends\s+[^{]+)?\s*\{[\s\S]*?\n\s*\}/g,
    '\n',
  );

  // 2. Remove type aliases: type Foo = ...;
  code = code.replace(/(?:^|\n)\s*type\s+[A-Za-z0-9_$]+(?:\s*<[^>]*>)?\s*=\s*[^;\n]+;/g, '\n');

  // 3. Remove 'as Type' or 'as const' or 'as any'
  code = code.replace(/\s+as\s+(?:const|any|unknown|string|number|boolean|[A-Za-z0-9_$]+(?:<[^>]*>)?(?:\[\])?)/g, '');

  // 4. Remove return type annotations on functions: ): ReturnType { or ): ReturnType =>
  code = code.replace(/\):\s*[A-Za-z0-9_$]+(?:<[^>]*>)?(?:\[\])?\s*(\{)/g, ') $1');
  code = code.replace(/\):\s*[A-Za-z0-9_$]+(?:<[^>]*>)?(?:\[\])?\s*(=>)/g, ') $1');

  // 5. Remove parameter type annotations: (a: number, b: string) -> (a, b)
  // Run repeatedly to handle consecutive parameters
  const paramRegex = /(\(|,\s*)([A-Za-z0-9_$]+)\s*:\s*[A-Za-z0-9_$]+(?:<[^>]*>)?(?:\[\])?(\s*[,=)])/;
  while (paramRegex.test(code)) {
    code = code.replace(paramRegex, '$1$2$3');
  }

  // 6. Remove variable type annotations: const x: number = 5 -> const x = 5
  code = code.replace(
    /(const|let|var)\s+([A-Za-z0-9_$]+)\s*:\s*[A-Za-z0-9_$]+(?:<[^>]*>)?(?:\[\])?\s*(=)/g,
    '$1 $2 $3',
  );

  return code;
};

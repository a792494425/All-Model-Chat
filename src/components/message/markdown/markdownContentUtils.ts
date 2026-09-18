const INLINE_MATH_OPERATOR_REGEX = /(?:^|[^A-Za-z])(?:\d+\s*[=+\-*/<>]\s*\d+|[A-Za-z]\s*[=+\-*/<>]\s*[A-Za-z0-9])/;
const INLINE_MATH_MARKER_REGEX = /[\\^_{}]/;

const SINGLE_LIVE_ARTIFACT_FENCE_REGEX =
  /^```(amc-live-artifact-html|amc-live-artifact-interaction)\n([\s\S]*?)\n?```\s*$/;

export const extractSingleLiveArtifactFence = (content: string): { language: string; code: string } | null => {
  const match = content.trim().match(SINGLE_LIVE_ARTIFACT_FENCE_REGEX);
  if (!match) {
    return null;
  }

  return {
    language: match[1],
    code: match[2] ?? '',
  };
};

const isLikelyMathExpression = (value: string): boolean => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return false;
  }

  return (
    INLINE_MATH_MARKER_REGEX.test(trimmedValue) ||
    INLINE_MATH_OPERATOR_REGEX.test(trimmedValue) ||
    trimmedValue.includes('\n')
  );
};

export const normalizeEscapedMathDelimiters = (value: string): string => {
  let nextValue = value.replace(/\\\$\$([\s\S]+?)\\\$\$/g, (match, innerContent: string) =>
    isLikelyMathExpression(innerContent) ? `$$${innerContent}$$` : match,
  );

  nextValue = nextValue.replace(/\\\$((?:\\.|[^\\$])+?)\\\$/g, (match, innerContent: string) =>
    isLikelyMathExpression(innerContent) ? `$${innerContent}$` : match,
  );

  return nextValue;
};

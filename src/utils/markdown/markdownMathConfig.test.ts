import { describe, expect, it } from 'vitest';

import { containsTexMathMarkdown, hasLikelyTexMathMarkdown } from './markdownMathConfig';

describe('containsTexMathMarkdown', () => {
  it('detects inline and block TeX math markdown', () => {
    expect(containsTexMathMarkdown('Use $x$ in the explanation.')).toBe(true);
    expect(containsTexMathMarkdown('Use $x + 1$ in the explanation.')).toBe(true);
    expect(containsTexMathMarkdown('Use $$x$$ in the explanation.')).toBe(true);
    expect(containsTexMathMarkdown('Use $$\\frac{1}{2}$$ in the explanation.')).toBe(true);
  });

  it('ignores plain text and escaped dollar signs', () => {
    expect(containsTexMathMarkdown('plain text without math')).toBe(false);
    expect(containsTexMathMarkdown('cost is \\$5 and no math')).toBe(false);
    expect(containsTexMathMarkdown('cost is $5 and no closing delimiter')).toBe(false);
  });
});

describe('hasLikelyTexMathMarkdown', () => {
  it('detects real math outside code blocks', () => {
    expect(hasLikelyTexMathMarkdown('Let $x^2 + y^2 = z^2$ be true.')).toBe(true);
    expect(hasLikelyTexMathMarkdown('The formula is $$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$.')).toBe(true);
    expect(hasLikelyTexMathMarkdown('Complexity is $O(n \\log n)$.')).toBe(true);
  });

  it('ignores plain currency values', () => {
    expect(hasLikelyTexMathMarkdown('It costs $5 and $10.')).toBe(false);
    expect(hasLikelyTexMathMarkdown('Price between $50 and $100')).toBe(false);
  });

  it('ignores code blocks containing dollar signs and template literals', () => {
    expect(
      hasLikelyTexMathMarkdown('```bash\n$ git status\n$ npm run build\n```'),
    ).toBe(false);

    expect(
      hasLikelyTexMathMarkdown('```html\n<script>\nconst el = $("#app");\nconst text = `${foo}`;\n</script>\n```'),
    ).toBe(false);

    expect(
      hasLikelyTexMathMarkdown('Here is code:\n`$foo = $bar;`\nDone.'),
    ).toBe(false);
  });
});


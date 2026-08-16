import { describe, expect, it } from 'vitest';
import { deriveDefaultFilename } from './deriveDefaultFilename';

describe('deriveDefaultFilename', () => {
  it('prefers the first markdown heading', () => {
    expect(deriveDefaultFilename('intro line\n\n# 季度报告\n\nbody')).toBe('季度报告');
  });

  it('falls back to the first non-empty line when no heading exists', () => {
    expect(deriveDefaultFilename('\n\n  hello world  \nsecond line')).toBe('hello world');
  });

  it('strips markdown emphasis and filesystem-unsafe characters', () => {
    expect(deriveDefaultFilename('# **Bold** `code` title')).toBe('Bold code title');
    expect(deriveDefaultFilename('a/b:c?d*e')).toBe('abcde');
  });

  it('collapses repeated whitespace and caps the derived length', () => {
    expect(deriveDefaultFilename('# a   b\t\tc')).toBe('a b c');
    expect(deriveDefaultFilename('# ' + 'a'.repeat(80))).toHaveLength(60);
  });

  it('returns null for empty or blank-only content', () => {
    expect(deriveDefaultFilename('')).toBeNull();
    expect(deriveDefaultFilename(' \n\t \n')).toBeNull();
    expect(deriveDefaultFilename('# **`<>`**')).toBeNull();
  });
});

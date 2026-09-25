import { describe, expect, it } from 'vitest';
import { asTrimmedString, isRecord } from './predicates';

describe('shared predicates', () => {
  describe('isRecord', () => {
    it('returns true for plain objects', () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ key: 'val' })).toBe(true);
    });

    it('returns false for arrays, null, undefined, and primitives', () => {
      expect(isRecord([])).toBe(false);
      expect(isRecord(null)).toBe(false);
      expect(isRecord(undefined)).toBe(false);
      expect(isRecord('string')).toBe(false);
      expect(isRecord(123)).toBe(false);
      expect(isRecord(true)).toBe(false);
    });
  });

  describe('asTrimmedString', () => {
    it('returns trimmed string for non-empty string inputs', () => {
      expect(asTrimmedString('hello')).toBe('hello');
      expect(asTrimmedString('  world  ')).toBe('world');
    });

    it('returns undefined for empty, whitespace-only, or non-string inputs', () => {
      expect(asTrimmedString('')).toBeUndefined();
      expect(asTrimmedString('   ')).toBeUndefined();
      expect(asTrimmedString(null)).toBeUndefined();
      expect(asTrimmedString(undefined)).toBeUndefined();
      expect(asTrimmedString(123)).toBeUndefined();
      expect(asTrimmedString({})).toBeUndefined();
    });
  });
});

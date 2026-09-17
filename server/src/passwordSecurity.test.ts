// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { timingSafePasswordEqual } from './passwordSecurity';

describe('timingSafePasswordEqual', () => {
  it('returns true when provided matches expected exactly', () => {
    expect(timingSafePasswordEqual('secret-123', 'secret-123')).toBe(true);
    expect(timingSafePasswordEqual('', '')).toBe(true);
  });

  it('returns false when passwords differ', () => {
    expect(timingSafePasswordEqual('secret-123', 'secret-456')).toBe(false);
    expect(timingSafePasswordEqual('short', 'much-longer-password')).toBe(false);
    expect(timingSafePasswordEqual('secret', 'SECRET')).toBe(false);
  });

  it('returns false for undefined or null inputs', () => {
    expect(timingSafePasswordEqual(undefined, 'secret')).toBe(false);
    expect(timingSafePasswordEqual('secret', undefined)).toBe(false);
    expect(timingSafePasswordEqual(null, 'secret')).toBe(false);
    expect(timingSafePasswordEqual('secret', null)).toBe(false);
    expect(timingSafePasswordEqual(undefined, undefined)).toBe(false);
  });
});

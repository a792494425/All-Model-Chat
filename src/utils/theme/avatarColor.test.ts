import { describe, expect, it } from 'vitest';
import { getAvatarColor } from './avatarColor';

describe('getAvatarColor', () => {
  it('returns fallback initials for empty string', () => {
    const result = getAvatarColor('');
    expect(result.initials).toBe('?');
    expect(result.bg).toContain('hsl');
    expect(result.text).toBe('#ffffff');
  });

  it('generates deterministic two-letter initials for ASCII names', () => {
    const r1 = getAvatarColor('DeepSeek');
    const r2 = getAvatarColor('DeepSeek');
    expect(r1.initials).toBe('DE');
    expect(r1.bg).toBe(r2.bg);
  });

  it('handles single character and non-ASCII names', () => {
    const result = getAvatarColor('通义千问');
    expect(result.initials).toBe('通');
    expect(result.bg).toContain('hsl');
  });

  it('strips leading special characters when extracting initials', () => {
    const result = getAvatarColor('@#OpenAI');
    expect(result.initials).toBe('OP');
  });
});

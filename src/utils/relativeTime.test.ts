import { describe, it, expect } from 'vitest';
import { formatRelativeTime, formatDateTime } from './relativeTime';

describe('formatRelativeTime', () => {
  const now = 1700000000000;
  const t = (key: string, params?: Record<string, string | number>) => {
    if (key === 'historyTimeJustNow') return '刚刚';
    if (key === 'historyTimeMinutes') return `${params?.n}分钟`;
    if (key === 'historyTimeHours') return `${params?.n}小时`;
    if (key === 'historyTimeDays') return `${params?.n}天`;
    if (key === 'historyTimeMonths') return `${params?.n}个月`;
    if (key === 'historyTimeYears') return `${params?.n}年`;
    return key;
  };

  it('formats < 1 min as just now', () => {
    expect(formatRelativeTime(now - 30_000, t, now)).toBe('刚刚');
    expect(formatRelativeTime(now - 5_000, t, now)).toBe('刚刚');
  });

  it('formats minutes', () => {
    expect(formatRelativeTime(now - 60_000, t, now)).toBe('1分钟');
    expect(formatRelativeTime(now - 5 * 60_000, t, now)).toBe('5分钟');
  });

  it('formats hours', () => {
    expect(formatRelativeTime(now - 3600_000, t, now)).toBe('1小时');
    expect(formatRelativeTime(now - 3 * 3600_000, t, now)).toBe('3小时');
  });

  it('formats days', () => {
    expect(formatRelativeTime(now - 86400_000, t, now)).toBe('1天');
    expect(formatRelativeTime(now - 4 * 86400_000, t, now)).toBe('4天');
  });

  it('formats months and years', () => {
    expect(formatRelativeTime(now - 45 * 86400_000, t, now)).toBe('1个月');
    expect(formatRelativeTime(now - 400 * 86400_000, t, now)).toBe('1年');
  });

  it('handles future or invalid timestamps gracefully', () => {
    expect(formatRelativeTime(now + 10_000, t, now)).toBe('刚刚');
    expect(formatRelativeTime(NaN, t, now)).toBe('刚刚');
  });
});

describe('formatDateTime', () => {
  it('formats timestamp to standard YYYY-MM-DD HH:mm string', () => {
    const timestamp = new Date(2026, 8, 26, 18, 30).getTime();
    const result = formatDateTime(timestamp);
    expect(result).toBe('2026-09-26 18:30');
  });

  it('returns empty string for invalid timestamp', () => {
    expect(formatDateTime(NaN)).toBe('');
  });
});

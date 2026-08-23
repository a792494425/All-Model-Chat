import { describe, expect, it } from 'vitest';
import { isTrustedServer, needsApproval } from './mcpTrust';

describe('isTrustedServer', () => {
  it('returns true when isTrusted is true', () => {
    expect(isTrustedServer({ isTrusted: true } as any)).toBe(true);
  });

  it('returns false when isTrusted is false', () => {
    expect(isTrustedServer({ isTrusted: false } as any)).toBe(false);
  });

  it('returns false when isTrusted is undefined', () => {
    expect(isTrustedServer({} as any)).toBe(false);
  });
});

describe('needsApproval', () => {
  it('needs approval when not trusted', () => {
    expect(needsApproval({ isTrusted: false, disabledTools: [], disabledAutoApproveTools: [] } as any, 't1')).toBe(
      true,
    );
  });

  it('needs approval when auto-approve disabled', () => {
    expect(needsApproval({ isTrusted: true, disabledAutoApproveTools: ['t1'] } as any, 't1')).toBe(true);
  });

  it('no approval when trusted and auto-approve enabled', () => {
    expect(needsApproval({ isTrusted: true, disabledAutoApproveTools: [] } as any, 't1')).toBe(false);
  });

  it('needs approval when isTrusted undefined', () => {
    expect(needsApproval({ disabledAutoApproveTools: [] } as any, 't1')).toBe(true);
  });

  it('needs approval when trusted but disabledAutoApproveTools undefined treats as empty', () => {
    expect(needsApproval({ isTrusted: true } as any, 't1')).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { sanitizeMcpServers } from './mcpServerConfig';

describe('sanitizeMcpServers trust fields', () => {
  it('preserves disabledAutoApproveTools', () => {
    const out = sanitizeMcpServers([{ id:'a', name:'A', enabled:true, transport:'http', url:'https://x', disabledAutoApproveTools:['t1'] } as any]);
    expect(out[0].disabledAutoApproveTools).toEqual(['t1']);
  });
  it('preserves isTrusted boolean', () => {
    const out = sanitizeMcpServers([{ id:'a', name:'A', enabled:true, transport:'http', url:'https://x', isTrusted:true } as any]);
    expect(out[0].isTrusted).toBe(true);
  });
  it('drops non-boolean isTrusted', () => {
    const out = sanitizeMcpServers([{ id:'a', name:'A', enabled:true, transport:'http', url:'https://x', isTrusted:'yes' } as any]);
    expect(out[0].isTrusted).toBeUndefined();
  });
});

describe('sanitizeMcpServers disabledTools', () => {
  it('preserves disabledTools array of strings', () => {
    const out = sanitizeMcpServers([{ id:'a', name:'A', enabled:true, transport:'http', url:'https://x', disabledTools:['tool_a','tool_b'] } as any]);
    expect(out[0].disabledTools).toEqual(['tool_a','tool_b']);
  });
  it('drops non-string entries and empty arrays', () => {
    const out = sanitizeMcpServers([{ id:'a', name:'A', enabled:true, transport:'http', url:'https://x', disabledTools:['ok', 123, null] } as any]);
    expect(out[0].disabledTools).toEqual(['ok']);
  });
  it('undefined when not array', () => {
    const out = sanitizeMcpServers([{ id:'a', name:'A', enabled:true, transport:'http', url:'https://x', disabledTools:'bad' } as any]);
    expect(out[0].disabledTools).toBeUndefined();
  });
});

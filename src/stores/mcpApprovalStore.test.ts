import { describe, expect, it, beforeEach } from 'vitest';
import { requestToolApproval, useMcpApprovalStore } from './mcpApprovalStore';
import type { McpApprovalRequest } from '@/features/mcp/toolApproval';

const makeRequest = (toolName: string): McpApprovalRequest => ({
  serverName: 'test-server',
  toolName,
  arguments: { foo: 'bar' },
});

describe('mcpApprovalStore', () => {
  beforeEach(() => {
    useMcpApprovalStore.setState({ pendingQueue: [], pending: null });
  });

  it('sets pending immediately when queue is empty', () => {
    const resolve = () => {};
    useMcpApprovalStore.getState().openApproval(makeRequest('tool-1'), resolve);

    expect(useMcpApprovalStore.getState().pending?.request.toolName).toBe('tool-1');
    expect(useMcpApprovalStore.getState().pendingQueue).toHaveLength(1);
  });

  it('queues concurrent approval requests and settles them in FIFO order', async () => {
    const p1 = requestToolApproval(makeRequest('tool-1'));
    const p2 = requestToolApproval(makeRequest('tool-2'));
    const p3 = requestToolApproval(makeRequest('tool-3'));

    expect(useMcpApprovalStore.getState().pending?.request.toolName).toBe('tool-1');
    expect(useMcpApprovalStore.getState().pendingQueue).toHaveLength(3);

    // Resolve first
    useMcpApprovalStore.getState().resolveApproval('allow');
    expect(await p1).toBe('allow');

    // Second now becomes pending
    expect(useMcpApprovalStore.getState().pending?.request.toolName).toBe('tool-2');
    expect(useMcpApprovalStore.getState().pendingQueue).toHaveLength(2);

    // Resolve second with deny
    useMcpApprovalStore.getState().resolveApproval('deny');
    expect(await p2).toBe('deny');

    // Third now becomes pending
    expect(useMcpApprovalStore.getState().pending?.request.toolName).toBe('tool-3');
    expect(useMcpApprovalStore.getState().pendingQueue).toHaveLength(1);

    // Resolve third with allow-always
    useMcpApprovalStore.getState().resolveApproval('allow-always');
    expect(await p3).toBe('allow-always');

    // Queue now empty
    expect(useMcpApprovalStore.getState().pending).toBeNull();
    expect(useMcpApprovalStore.getState().pendingQueue).toHaveLength(0);
  });

  it('removes aborted request from queue and advances to next pending request', async () => {
    const ac1 = new AbortController();
    const ac2 = new AbortController();

    const p1 = requestToolApproval(makeRequest('tool-1'), ac1.signal);
    const p2 = requestToolApproval(makeRequest('tool-2'), ac2.signal);

    expect(useMcpApprovalStore.getState().pending?.request.toolName).toBe('tool-1');
    expect(useMcpApprovalStore.getState().pendingQueue).toHaveLength(2);

    // Abort first request
    ac1.abort();
    expect(await p1).toBe('deny');

    // Next request automatically surfaces as pending
    expect(useMcpApprovalStore.getState().pending?.request.toolName).toBe('tool-2');
    expect(useMcpApprovalStore.getState().pendingQueue).toHaveLength(1);

    useMcpApprovalStore.getState().resolveApproval('allow');
    expect(await p2).toBe('allow');
    expect(useMcpApprovalStore.getState().pending).toBeNull();
  });
});

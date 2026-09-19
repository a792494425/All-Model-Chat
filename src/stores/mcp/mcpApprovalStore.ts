import { create } from 'zustand';
import type { McpApprovalDecision, McpApprovalRequest } from '@/features/mcp/toolApproval';

interface PendingMcpApproval {
  request: McpApprovalRequest;
  resolve: (decision: McpApprovalDecision) => void;
}

interface McpApprovalState {
  pendingQueue: PendingMcpApproval[];
  pending: PendingMcpApproval | null;
  openApproval: (request: McpApprovalRequest, resolve: (decision: McpApprovalDecision) => void) => void;
  resolveApproval: (decision: McpApprovalDecision) => void;
  cancelApproval: (resolveFn: (decision: McpApprovalDecision) => void) => void;
}

export const useMcpApprovalStore = create<McpApprovalState>((set, get) => ({
  pendingQueue: [],
  pending: null,
  openApproval: (request, resolve) => {
    set((state) => {
      const nextQueue = [...state.pendingQueue, { request, resolve }];
      return {
        pendingQueue: nextQueue,
        pending: nextQueue[0] ?? null,
      };
    });
  },
  resolveApproval: (decision) => {
    const { pendingQueue } = get();
    if (pendingQueue.length === 0) return;
    const current = pendingQueue[0];
    const nextQueue = pendingQueue.slice(1);
    set({
      pendingQueue: nextQueue,
      pending: nextQueue[0] ?? null,
    });
    current.resolve(decision);
  },
  cancelApproval: (resolveFn) => {
    set((state) => {
      const nextQueue = state.pendingQueue.filter((item) => item.resolve !== resolveFn);
      return {
        pendingQueue: nextQueue,
        pending: nextQueue[0] ?? null,
      };
    });
  },
}));

/**
 * Chat-path entry point: resolves 'deny' when the turn is aborted while the
 * dialog waits, so a cancelled send never leaves a dangling approval.
 */
export const requestToolApproval = (
  request: McpApprovalRequest,
  abortSignal?: AbortSignal,
): Promise<McpApprovalDecision> =>
  new Promise((resolve) => {
    let settled = false;
    const settle = (decision: McpApprovalDecision) => {
      if (settled) return;
      settled = true;
      abortSignal?.removeEventListener('abort', onAbort);
      resolve(decision);
    };
    const onAbort = () => {
      useMcpApprovalStore.getState().cancelApproval(settle);
      settle('deny');
    };
    abortSignal?.addEventListener('abort', onAbort, { once: true });
    if (abortSignal?.aborted) {
      settle('deny');
      return;
    }
    useMcpApprovalStore.getState().openApproval(request, settle);
  });

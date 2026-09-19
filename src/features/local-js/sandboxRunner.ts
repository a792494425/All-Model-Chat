import { SANDBOX_WORKER_SCRIPT } from './sandboxWorkerScript';
import { stripTypeScriptTypes } from './typeStripper';

export interface SandboxExecutionResult {
  status: 'success' | 'error';
  output: string;
  result?: string;
  error?: string;
}

export interface SandboxRunnerOptions {
  timeoutMs?: number;
  files?: Record<string, string>;
  abortSignal?: AbortSignal;
  createWorker?: () => Worker;
}

const DEFAULT_TIMEOUT_MS = 5000;
const MAX_TIMEOUT_MS = 30000;

const defaultCreateWorker = (): Worker => {
  const blob = new Blob([SANDBOX_WORKER_SCRIPT], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  URL.revokeObjectURL(url);
  return worker;
};

export const executeJavaScript = async (
  rawCode: string,
  options: SandboxRunnerOptions = {},
): Promise<SandboxExecutionResult> => {
  const cleanCode = stripTypeScriptTypes(rawCode).trim();
  if (!cleanCode) {
    return {
      status: 'error',
      output: 'Error: Empty code string provided.',
      error: 'Empty code string provided.',
    };
  }

  const timeoutMs = Math.min(Math.max(100, options.timeoutMs ?? DEFAULT_TIMEOUT_MS), MAX_TIMEOUT_MS);

  let worker: Worker;
  try {
    worker = options.createWorker ? options.createWorker() : defaultCreateWorker();
  } catch (workerInitErr) {
    const message = workerInitErr instanceof Error ? workerInitErr.message : String(workerInitErr);
    return {
      status: 'error',
      output: `Failed to initialize JavaScript sandbox worker: ${message}`,
      error: message,
    };
  }

  return new Promise((resolve) => {
    let isSettled = false;
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const cleanup = () => {
      isSettled = true;
      if (timer) clearTimeout(timer);
      if (options.abortSignal) {
        options.abortSignal.removeEventListener('abort', onAbort);
      }
      try {
        worker.terminate();
      } catch {
        // no-op
      }
    };

    const settle = (res: SandboxExecutionResult) => {
      if (isSettled) return;
      cleanup();
      resolve(res);
    };

    const timer = setTimeout(() => {
      settle({
        status: 'error',
        output: `[Timeout] Execution timed out after ${timeoutMs}ms.`,
        error: `Execution timed out after ${timeoutMs}ms.`,
      });
    }, timeoutMs);

    const onAbort = () => {
      settle({
        status: 'error',
        output: '[Aborted] Execution was cancelled.',
        error: 'Execution cancelled.',
      });
    };

    if (options.abortSignal) {
      if (options.abortSignal.aborted) {
        settle({
          status: 'error',
          output: '[Aborted] Execution was cancelled.',
          error: 'Execution cancelled.',
        });
        return;
      }
      options.abortSignal.addEventListener('abort', onAbort, { once: true });
    }

    worker.onmessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.id !== executionId) return;

      const logs = typeof data.logs === 'string' ? data.logs.trim() : '';
      const result = typeof data.result === 'string' ? data.result : undefined;
      const error = typeof data.error === 'string' ? data.error : undefined;

      if (data.status === 'success') {
        const parts: string[] = [];
        if (logs) parts.push(logs);
        if (result !== undefined && result !== 'undefined') {
          parts.push(`=> ${result}`);
        }

        settle({
          status: 'success',
          output: parts.join('\n\n') || '(Execution completed with no output)',
          result,
        });
      } else {
        const parts: string[] = [];
        if (logs) parts.push(logs);
        if (error) parts.push(`[Error] ${error}`);

        settle({
          status: 'error',
          output: parts.join('\n\n') || '[Error] Execution failed.',
          error,
        });
      }
    };

    worker.onerror = (errEvent: ErrorEvent) => {
      settle({
        status: 'error',
        output: `[Worker Error] ${errEvent.message || 'Unknown sandbox worker error'}`,
        error: errEvent.message || 'Unknown worker error',
      });
    };

    worker.postMessage({
      id: executionId,
      code: cleanCode,
      files: options.files ?? {},
    });
  });
};

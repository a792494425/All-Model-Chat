import { describe, expect, it, vi } from 'vitest';
import { executeJavaScript } from './sandboxRunner';

describe('sandboxRunner', () => {
  it('returns an error if the code string is empty', async () => {
    const res = await executeJavaScript('   ');
    expect(res.status).toBe('error');
    expect(res.error).toBe('Empty code string provided.');
  });

  it('handles worker initialization failure', async () => {
    const res = await executeJavaScript('console.log("hello")', {
      createWorker: () => {
        throw new Error('Worker constructor disabled');
      },
    });

    expect(res.status).toBe('error');
    expect(res.output).toContain('Failed to initialize JavaScript sandbox worker: Worker constructor disabled');
    expect(res.error).toBe('Worker constructor disabled');
  });

  it('handles successful worker execution with logs and result', async () => {
    class MockWorker {
      onmessage: ((e: MessageEvent) => void) | null = null;
      onerror: ((e: ErrorEvent) => void) | null = null;
      terminate = vi.fn();
      postMessage = vi.fn((data: { id: string; code: string; files: Record<string, string> }) => {
        setTimeout(() => {
          this.onmessage?.({
            data: {
              id: data.id,
              status: 'success',
              logs: 'Log 1\nLog 2',
              result: '42',
            },
          } as MessageEvent);
        }, 10);
      });
    }

    const mockWorker = new MockWorker();
    const res = await executeJavaScript('return 42;', {
      createWorker: () => mockWorker as unknown as Worker,
    });

    expect(res.status).toBe('success');
    expect(res.output).toContain('Log 1\nLog 2');
    expect(res.output).toContain('=> 42');
    expect(res.result).toBe('42');
    expect(mockWorker.terminate).toHaveBeenCalled();
  });

  it('handles execution error message from worker', async () => {
    class MockWorker {
      onmessage: ((e: MessageEvent) => void) | null = null;
      onerror: ((e: ErrorEvent) => void) | null = null;
      terminate = vi.fn();
      postMessage = vi.fn((data: { id: string; code: string }) => {
        setTimeout(() => {
          this.onmessage?.({
            data: {
              id: data.id,
              status: 'error',
              logs: 'Partial log',
              error: 'ReferenceError: foo is not defined',
            },
          } as MessageEvent);
        }, 10);
      });
    }

    const mockWorker = new MockWorker();
    const res = await executeJavaScript('foo()', {
      createWorker: () => mockWorker as unknown as Worker,
    });

    expect(res.status).toBe('error');
    expect(res.output).toContain('Partial log');
    expect(res.output).toContain('[Error] ReferenceError: foo is not defined');
    expect(res.error).toBe('ReferenceError: foo is not defined');
    expect(mockWorker.terminate).toHaveBeenCalled();
  });

  it('handles worker error event (onerror)', async () => {
    class MockWorker {
      onmessage: ((e: MessageEvent) => void) | null = null;
      onerror: ((e: ErrorEvent) => void) | null = null;
      terminate = vi.fn();
      postMessage = vi.fn(() => {
        setTimeout(() => {
          this.onerror?.({
            message: 'Script syntax error',
          } as ErrorEvent);
        }, 10);
      });
    }

    const mockWorker = new MockWorker();
    const res = await executeJavaScript('const a = ;', {
      createWorker: () => mockWorker as unknown as Worker,
    });

    expect(res.status).toBe('error');
    expect(res.output).toContain('[Worker Error] Script syntax error');
    expect(mockWorker.terminate).toHaveBeenCalled();
  });

  it('terminates worker on timeout', async () => {
    class MockWorker {
      onmessage: ((e: MessageEvent) => void) | null = null;
      onerror: ((e: ErrorEvent) => void) | null = null;
      terminate = vi.fn();
      postMessage = vi.fn(); // Never responds
    }

    const mockWorker = new MockWorker();
    const res = await executeJavaScript('while(true){}', {
      timeoutMs: 150,
      createWorker: () => mockWorker as unknown as Worker,
    });

    expect(res.status).toBe('error');
    expect(res.output).toContain('[Timeout] Execution timed out after 150ms.');
    expect(mockWorker.terminate).toHaveBeenCalled();
  });

  it('terminates worker when abort signal triggers', async () => {
    class MockWorker {
      onmessage: ((e: MessageEvent) => void) | null = null;
      onerror: ((e: ErrorEvent) => void) | null = null;
      terminate = vi.fn();
      postMessage = vi.fn();
    }

    const controller = new AbortController();
    const mockWorker = new MockWorker();
    const promise = executeJavaScript('console.log(1)', {
      abortSignal: controller.signal,
      createWorker: () => mockWorker as unknown as Worker,
    });

    controller.abort();
    const res = await promise;

    expect(res.status).toBe('error');
    expect(res.output).toContain('[Aborted] Execution was cancelled.');
    expect(mockWorker.terminate).toHaveBeenCalled();
  });

  it('settles immediately if abort signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    class MockWorker {
      onmessage: null = null;
      onerror: null = null;
      terminate = vi.fn();
      postMessage = vi.fn();
    }
    const mockWorker = new MockWorker();

    const res = await executeJavaScript('console.log(1)', {
      abortSignal: controller.signal,
      createWorker: () => mockWorker as unknown as Worker,
    });

    expect(res.status).toBe('error');
    expect(res.output).toContain('[Aborted]');
    expect(mockWorker.terminate).toHaveBeenCalled();
    expect(mockWorker.postMessage).not.toHaveBeenCalled();
  });
});

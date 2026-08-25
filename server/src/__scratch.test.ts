// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdkMocks = vi.hoisted(() => {
  const clientInstances: any[] = [];
  const clientConstructor = vi.fn(function MockClient() {
    const instance = { tag: 'base', listTools: vi.fn() };
    clientInstances.push(instance);
    return instance;
  });
  return { clientInstances, clientConstructor };
});

describe('scratch queue', () => {
  const baseClientFactory = sdkMocks.clientConstructor.getMockImplementation()!;
  const resetClientQueue = (): void => {
    sdkMocks.clientConstructor.mockReset();
    sdkMocks.clientConstructor.mockImplementation(baseClientFactory);
    sdkMocks.clientInstances.length = 0;
  };
  const enqueueClient = (overrides: Record<string, unknown> = {}): void => {
    sdkMocks.clientConstructor.mockImplementationOnce(() => {
      const instance = { tag: 'enqueued', listTools: vi.fn(), ...overrides };
      sdkMocks.clientInstances.push(instance);
      return instance;
    });
  };

  beforeEach(() => {
    sdkMocks.clientInstances.length = 0;
    vi.clearAllMocks();
  });

  it('probe queue ordering', () => {
    resetClientQueue();
    enqueueClient({ tag: 'first-once' });
    const c1 = sdkMocks.clientConstructor();
    console.log('c1.tag =', c1.tag);
    const c2 = sdkMocks.clientConstructor();
    console.log('c2.tag =', c2.tag);
    expect(c1.tag).toBe('first-once');
    expect(c2.tag).toBe('base');
  });
});

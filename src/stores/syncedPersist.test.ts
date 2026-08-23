import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { createSyncedPersist, SYNCED_PERSIST_CHANNEL_NAME } from './syncedPersist';

// Helper to create a mock storage area
function makeArea(initial: string | null = null) {
  const store = new Map<string, string>();
  if (initial !== null) store.set('k', initial);
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    _store: store,
  };
}

describe('createSyncedPersist', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('exposes storage and sync', () => {
    const { storage, sync } = createSyncedPersist('test-key', { debounceMs: 0 });
    expect(storage.getItem).toBeTypeOf('function');
    expect(storage.setItem).toBeTypeOf('function');
    expect(sync).toBeTypeOf('function');
  });

  it('skips write when value deep-equal (Task ref: isEqual dedup)', () => {
    const area = makeArea('{"a":1}');
    const { storage } = createSyncedPersist('k', { debounceMs: 0, storageArea: area } as never);
    storage.setItem('k', '{"a":1}');
    expect(area.setItem).not.toHaveBeenCalled();
  });

  it('skips write when value deep-equal but key order differs', () => {
    const area = makeArea('{"a":1,"b":2}');
    const { storage } = createSyncedPersist('k', { debounceMs: 0, storageArea: area } as never);
    // JSON with different key order should be considered equal via isEqual
    storage.setItem('k', '{"b":2,"a":1}');
    expect(area.setItem).not.toHaveBeenCalled();
  });

  it('writes when value is deep-not-equal', () => {
    const area = makeArea('{"a":1}');
    const { storage } = createSyncedPersist('k', { debounceMs: 0, storageArea: area } as never);
    storage.setItem('k', '{"a":2}');
    expect(area.setItem).toHaveBeenCalledWith('k', '{"a":2}');
  });

  it('rejects invalid JSON via schema and falls back to null', () => {
    const schema = z.object({ a: z.number() });
    const area = makeArea('{"a":"bad"}');
    const { storage } = createSyncedPersist('k', { schema, storageArea: area } as never);
    expect(storage.getItem('k')).toBeNull();
  });

  it('returns null on malformed JSON silently (try/catch)', () => {
    const area = makeArea('not-json');
    const schema = z.object({ a: z.number() });
    const { storage } = createSyncedPersist('k', { schema, storageArea: area } as never);
    expect(storage.getItem('k')).toBeNull();
  });

  it('returns raw when schema validation passes', () => {
    const schema = z.object({ a: z.number() });
    const area = makeArea('{"a":1}');
    const { storage } = createSyncedPersist('k', { schema, storageArea: area } as never);
    expect(storage.getItem('k')).toBe('{"a":1}');
  });

  it('applies migrate when schema fails and migrate returns valid – returns migrated JSON string', () => {
    const badSchema = z.object({ a: z.number() });
    const migrate = vi.fn((persisted: unknown) => ({ a: 1 }));
    const area = makeArea('{"a":"bad"}');
    const { storage } = createSyncedPersist('k', {
      schema: badSchema,
      version: 1,
      migrate,
      storageArea: area,
    } as never);
    const result = storage.getItem('k');
    expect(migrate).toHaveBeenCalledWith({ a: 'bad' }, 1);
    expect(result).toBe(JSON.stringify({ a: 1 }));
    // Optionally persists migrated value (baseStorage.setItem may be called)
    // For debounceMs=0, immediate persist may have updated area
  });

  it('returns null when migrate returns invalid value (negative case)', () => {
    const badSchema = z.object({ a: z.number() });
    const migrate = vi.fn(() => ({ a: 'still-bad' }));
    const area = makeArea('{"a":"bad"}');
    const { storage } = createSyncedPersist('k', {
      schema: badSchema,
      version: 1,
      migrate,
      storageArea: area,
    } as never);
    const result = storage.getItem('k');
    expect(migrate).toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('returns null when schema fails and no migrate provided', () => {
    const badSchema = z.object({ a: z.number() });
    const area = makeArea('{"a":"bad"}');
    const { storage } = createSyncedPersist('k', {
      schema: badSchema,
      storageArea: area,
    } as never);
    expect(storage.getItem('k')).toBeNull();
  });

  it('forwards storageKey correctly and does not void it', () => {
    const area = makeArea(null);
    const { storage } = createSyncedPersist('amc-test-key', { debounceMs: 0, storageArea: area } as never);
    storage.setItem('amc-test-key', '{"x":1}');
    expect(area.setItem).toHaveBeenCalledWith('amc-test-key', '{"x":1}');
    expect(area.getItem).not.toHaveBeenCalledWith('wrong-key');
  });

  it('exposes singleton BroadcastChannel via repeated calls (same instance)', async () => {
    const { getSingletonChannel } = await import('./syncedPersist');
    const ch1 = getSingletonChannel();
    const ch2 = getSingletonChannel();
    expect(ch1).toBe(ch2);
    expect(ch1.name).toBe(SYNCED_PERSIST_CHANNEL_NAME);
  });

  it('isEqual dedup also works with debounceMs > 0 (no immediate write, flush deduped)', () => {
    const area = makeArea('{"a":1}');
    const { storage } = createSyncedPersist('k', { debounceMs: 100, storageArea: area } as never);
    storage.setItem('k', '{"a":1}');
    vi.advanceTimersByTime(100);
    // Should not have written because deep-equal to existing
    expect(area.setItem).not.toHaveBeenCalled();
  });

  it('removes item via removeItem and handles try/catch silently', () => {
    const area = {
      getItem: vi.fn(() => '{"a":1}'),
      setItem: vi.fn(),
      removeItem: vi.fn(() => {
        throw new Error('restricted');
      }),
    };
    const { storage } = createSyncedPersist('k', { debounceMs: 0, storageArea: area } as never);
    expect(() => storage.removeItem('k')).not.toThrow();
  });

  it('keeps amc- prefix convention when storageKey is passed', () => {
    const { storage } = createSyncedPersist('amc-chat', { debounceMs: 0 });
    // Just verify factory accepts amc- prefixed key without error and storage works
    expect(storage).toBeDefined();
  });
});

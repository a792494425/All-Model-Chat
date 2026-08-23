import { describe, it, expect } from 'vitest';
import { createSyncedPersist } from './syncedPersist';

describe('createSyncedPersist', () => {
  it('exposes storage and sync', () => {
    const { storage, sync } = createSyncedPersist('test-key', { debounceMs: 0 });
    expect(storage.getItem).toBeTypeOf('function');
    expect(storage.setItem).toBeTypeOf('function');
    expect(sync).toBeTypeOf('function');
  });
});

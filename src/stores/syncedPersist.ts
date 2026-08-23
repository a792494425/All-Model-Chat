import type { StateStorage } from 'zustand/middleware';
import type { StoreApi } from 'zustand';
import { createPersistedStateStorage } from './persistentStorage';
import type { z } from 'zod';

export interface SyncedPersistOptions<T> {
  debounceMs?: number;
  schema?: z.ZodType<T>;
  version?: number;
  migrate?: (persisted: unknown, version: number) => T;
}

export const createSyncedPersist = <T>(
  storageKey: string,
  opts: SyncedPersistOptions<T> = {},
): { storage: StateStorage; sync: (store: StoreApi<T> & { persist: { rehydrate: () => void } }) => () => void } => {
  void storageKey;
  const storage = createPersistedStateStorage({ debounceMs: opts.debounceMs });
  const sync = (store: StoreApi<T> & { persist: { rehydrate: () => void } }) => {
    void store;
    // TODO: registerPersistedStoreSync
    return () => {};
  };
  return { storage, sync };
};

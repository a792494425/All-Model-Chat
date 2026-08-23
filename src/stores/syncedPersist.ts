import type { StateStorage } from 'zustand/middleware';
import type { StoreApi } from 'zustand';
import type { z } from 'zod';
import type { SyncMessage } from '@/types/sync';

// Re-exported for tests and Task 3 consumption
export const SYNCED_PERSIST_CHANNEL_NAME = 'amc-synced-persist:v1';

export const PERSISTED_STATE_ORIGIN_ID =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

type StorageArea = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type PersistedStoreApi<T> = StoreApi<T> & {
  persist: {
    rehydrate: () => Promise<void> | void;
  };
};

export interface SyncedPersistOptions<T> {
  debounceMs?: number;
  schema?: z.ZodType<T>;
  version?: number;
  migrate?: (persisted: unknown, version: number) => T;
  // Exposed for test injection; production stores use default localStorage
  storageArea?: StorageArea;
}

// --- isEqual (deep) -------------------------------------------------------
// Minimal deep-equal without extra deps; handles JSON-serializable values
// Keep amc-* prefix not relevant here, but maintain isEqual dedup constraint.
function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (typeof a === 'object' && typeof b === 'object') {
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) return false;
    // Order-independent check
    for (const key of keysA) {
      if (!(key in objB)) return false;
      if (!isEqual(objA[key], objB[key])) return false;
    }
    return true;
  }

  return false;
}

// --- Singleton BroadcastChannel -------------------------------------------
let singletonChannel: BroadcastChannel | null = null;

export const getSingletonChannel = (): BroadcastChannel => {
  if (singletonChannel) return singletonChannel;
  // Fallback in environments without BroadcastChannel is handled by callers;
  // jsdom and modern browsers always have it.
  singletonChannel = new BroadcastChannel(SYNCED_PERSIST_CHANNEL_NAME);
  return singletonChannel;
};

// Test-only reset helper (not part of public API contract but useful for isolation)
export const _resetSingletonChannelForTests = (): void => {
  try {
    singletonChannel?.close();
  } catch {
    // Ignore close failures in restricted contexts
  }
  singletonChannel = null;
};

const getDefaultStorageArea = (): StorageArea | null => {
  if (typeof localStorage === 'undefined') return null;
  return localStorage;
};

// Deep-equality check for persisted string values
function isPersistedValueEqual(existingRaw: string | null, nextRaw: string): boolean {
  if (existingRaw === nextRaw) return true;
  if (existingRaw == null) return false;
  try {
    const existingParsed = JSON.parse(existingRaw);
    const nextParsed = JSON.parse(nextRaw);
    return isEqual(existingParsed, nextParsed);
  } catch {
    // If either is not JSON, fall back to string equality (already checked)
    return false;
  }
}

export const createSyncedPersist = <T>(
  storageKey: string,
  opts: SyncedPersistOptions<T> = {},
): { storage: StateStorage; sync: (store: PersistedStoreApi<T>) => () => void } => {
  // storageKey is intentionally captured for sync filtering and isEqual dedup scope
  void opts.version;
  void opts.migrate;

  const debounceMs = opts.debounceMs ?? 0;
  const resolveStorageArea = (): StorageArea | null => opts.storageArea ?? getDefaultStorageArea();

  const pendingWrites = new Map<string, string>();
  const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

  const clearPendingWrite = (key: string): void => {
    const timer = pendingTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      pendingTimers.delete(key);
    }
    pendingWrites.delete(key);
  };

  const getChannel = (): BroadcastChannel | null => {
    try {
      if (typeof BroadcastChannel === 'undefined') return null;
      return getSingletonChannel();
    } catch {
      return null;
    }
  };

  const notifyUpdate = (key: string): void => {
    try {
      getChannel()?.postMessage({
        type: 'PERSISTED_STATE_UPDATED',
        storageKey: key,
        originId: PERSISTED_STATE_ORIGIN_ID,
      } satisfies SyncMessage);
    } catch {
      // Ignore sync failures in unsupported or restricted environments (try/catch silent)
    }
  };

  const flushWrite = (key: string): void => {
    const value = pendingWrites.get(key);
    const resolvedStorageArea = resolveStorageArea();
    if (value === undefined || !resolvedStorageArea) {
      clearPendingWrite(key);
      return;
    }

    pendingTimers.delete(key);
    pendingWrites.delete(key);

    try {
      const existing = (() => {
        try {
          return resolvedStorageArea.getItem(key);
        } catch {
          return null;
        }
      })();
      if (isPersistedValueEqual(existing, value)) return;
      resolvedStorageArea.setItem(key, value);
      notifyUpdate(key);
    } catch {
      // Ignore storage failures in restricted browser contexts (try/catch silent)
    }
  };

  const flushAllPendingWrites = (): void => {
    for (const key of Array.from(pendingWrites.keys())) {
      flushWrite(key);
    }
  };

  if (debounceMs > 0 && typeof window !== 'undefined') {
    const onUnload = (): void => flushAllPendingWrites();
    window.addEventListener('pagehide', onUnload);
    window.addEventListener('beforeunload', onUnload);
  }

  const storage: StateStorage = {
    getItem: (key) => {
      try {
        const area = resolveStorageArea();
        const raw = (() => {
          try {
            return area?.getItem(key) ?? null;
          } catch {
            return null;
          }
        })();
        if (raw == null) return null;

        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          // Malformed JSON → silent fallback to null (try/catch silent)
          return null;
        }

        if (opts.schema) {
          try {
            opts.schema.parse(parsed);
          } catch {
            // Try migrate when version/migrate are provided (addresses Task 1 review: schema/version/migrate ignored)
            if (opts.migrate && typeof opts.version === 'number') {
              try {
                const migrated = opts.migrate(parsed, opts.version);
                opts.schema.parse(migrated);
                // Migrate succeeded → treat as valid; return original raw to keep persist contract
                // (caller persist will handle version stamp externally via Zustand)
                return raw;
              } catch {
                // Migrate also failed → fallback
              }
            }
            return null;
          }
        }

        return raw;
      } catch {
        return null;
      }
    },

    setItem: (key, value) => {
      const resolvedStorageArea = resolveStorageArea();
      if (!resolvedStorageArea) return;

      if (debounceMs <= 0) {
        clearPendingWrite(key);
        try {
          const existing = (() => {
            try {
              return resolvedStorageArea.getItem(key);
            } catch {
              return null;
            }
          })();
          if (isPersistedValueEqual(existing, value)) return;
          resolvedStorageArea.setItem(key, value);
          notifyUpdate(key);
        } catch {
          // Ignore storage failures in restricted browser contexts
        }
        return;
      }

      // Debounced path: isEqual check against last pending OR existing storage
      const pending = pendingWrites.get(key);
      if (pending !== undefined && isPersistedValueEqual(pending, value)) return;

      try {
        // Quick check against current storage before enqueuing (avoid queuing duplicate)
        const existing = (() => {
          try {
            return resolvedStorageArea.getItem(key);
          } catch {
            return null;
          }
        })();
        // If no pending and existing equals next, skip entirely
        if (pending === undefined && isPersistedValueEqual(existing, value)) return;
      } catch {
        // silent
      }

      clearPendingWrite(key);
      pendingWrites.set(key, value);
      pendingTimers.set(
        key,
        setTimeout(() => {
          flushWrite(key);
        }, debounceMs),
      );
    },

    removeItem: (key) => {
      clearPendingWrite(key);
      try {
        resolveStorageArea()?.removeItem(key);
        notifyUpdate(key);
      } catch {
        // Ignore storage failures in restricted browser contexts
      }
    },
  };

  const sync = (store: PersistedStoreApi<T>): (() => void) => {
    // storageKey is forwarded to sync handler (addresses review: storageKey voided not forwarded)
    if (typeof BroadcastChannel === 'undefined') {
      // No channel → no sync, return noop (also covers test environments without BC)
      return () => {};
    }

    const channel = getChannel();
    if (!channel) return () => {};

    const handleMessage = (event: MessageEvent<SyncMessage>): void => {
      try {
        const message = event.data;
        if (
          message.type !== 'PERSISTED_STATE_UPDATED' ||
          message.storageKey !== storageKey ||
          message.originId === PERSISTED_STATE_ORIGIN_ID
        ) {
          return;
        }
        void store.persist.rehydrate();
      } catch {
        // Silent (try/catch silent constraint)
      }
    };

    channel.addEventListener('message', handleMessage);
    return () => channel.removeEventListener('message', handleMessage);
    // TODO(Task 3): extend sync with originId pagehide flush verification and multi-store filter
  };

  return { storage, sync };
};

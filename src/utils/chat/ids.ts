/**
 * Generates a unique, collision-resistant identifier with an optional prefix (defaults to 'chat').
 * Uses crypto.randomUUID when available, falling back to a timestamp + random base-36 scheme.
 */
export const generateUniqueId = (prefix = 'chat'): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

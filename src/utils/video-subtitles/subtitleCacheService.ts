import { SubtitleCue } from './subtitleFormatter';
import { getKeyValue, setKeyValue, deleteKeyValue } from '@/services/db/indexedDbAccess';

export interface CachedSubtitles {
  cues: SubtitleCue[];
  srtContent: string;
  vttContent: string;
  bilingualVttContent?: string;
  translatedVttContent?: string;
  targetLanguage?: string;
  durationSeconds?: number;
  createdAt: number;
}

export interface SubtitleCacheTarget {
  id?: string;
  name?: string;
  size?: number;
}

/**
 * Builds a unique cache key based on file name + size (or fallback to id / name).
 */
export function getSubtitleCacheKey(target: SubtitleCacheTarget): string | null {
  if (target.name && typeof target.size === 'number' && target.size > 0) {
    return `subtitles:v1:${target.name}:${target.size}`;
  }
  if (target.id) {
    return `subtitles:v1:id:${target.id}`;
  }
  if (target.name) {
    return `subtitles:v1:name:${target.name}`;
  }
  return null;
}

/**
 * Loads cached subtitles from IndexedDB.
 */
export async function getCachedSubtitles(target: SubtitleCacheTarget): Promise<CachedSubtitles | null> {
  const key = getSubtitleCacheKey(target);
  if (!key) return null;

  try {
    const cached = await getKeyValue<CachedSubtitles>(key);
    if (!cached || !Array.isArray(cached.cues) || cached.cues.length === 0) {
      return null;
    }
    return cached;
  } catch (err) {
    console.warn('[SubtitleCache] Failed to load cached subtitles:', err);
    return null;
  }
}

/**
 * Persists subtitles into IndexedDB.
 */
export async function saveCachedSubtitles(
  target: SubtitleCacheTarget,
  subtitles: {
    cues: SubtitleCue[];
    srtContent: string;
    vttContent: string;
    bilingualVttContent?: string;
    translatedVttContent?: string;
    targetLanguage?: string;
    durationSeconds?: number;
  },
): Promise<void> {
  if (!subtitles || !Array.isArray(subtitles.cues) || subtitles.cues.length === 0) {
    return;
  }

  const key = getSubtitleCacheKey(target);
  if (!key) return;

  try {
    const payload: CachedSubtitles = {
      ...subtitles,
      createdAt: Date.now(),
    };
    await setKeyValue(key, payload);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('subtitles-cache-updated', { detail: { target } }));
    }
  } catch (err) {
    console.warn('[SubtitleCache] Failed to save cached subtitles:', err);
  }
}

/**
 * Deletes cached subtitles from IndexedDB.
 */
export async function deleteCachedSubtitles(target: SubtitleCacheTarget): Promise<void> {
  const key = getSubtitleCacheKey(target);
  if (!key) return;

  try {
    await deleteKeyValue(key);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('subtitles-cache-updated', { detail: { target } }));
    }
  } catch (err) {
    console.warn('[SubtitleCache] Failed to delete cached subtitles:', err);
  }
}

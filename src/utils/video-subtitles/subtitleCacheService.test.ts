import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSubtitleCacheKey,
  getCachedSubtitles,
  saveCachedSubtitles,
  deleteCachedSubtitles,
  type CachedSubtitles,
} from './subtitleCacheService';
import type { SubtitleCue } from './subtitleFormatter';

let mockKvStore: Record<string, unknown> = {};

vi.mock('@/services/db/indexedDbAccess', () => ({
  getKeyValue: vi.fn(async (key: string) => mockKvStore[key]),
  setKeyValue: vi.fn(async (key: string, value: unknown) => {
    mockKvStore[key] = value;
  }),
  deleteKeyValue: vi.fn(async (key: string) => {
    delete mockKvStore[key];
  }),
}));

describe('subtitleCacheService', () => {
  const sampleCues: SubtitleCue[] = [
    {
      id: 1,
      startSeconds: 0,
      endSeconds: 2.5,
      startTimeSrt: '00:00:00,000',
      endTimeSrt: '00:00:02,500',
      startTimeVtt: '00:00:00.000',
      endTimeVtt: '00:00:02.500',
      text: '你好，世界',
    },
  ];

  beforeEach(() => {
    mockKvStore = {};
    vi.clearAllMocks();
  });

  describe('getSubtitleCacheKey', () => {
    it('generates key using name and size when both are valid', () => {
      const key = getSubtitleCacheKey({ name: 'test-video.mp4', size: 1048576 });
      expect(key).toBe('subtitles:v1:test-video.mp4:1048576');
    });

    it('falls back to id if size is missing or 0', () => {
      const key = getSubtitleCacheKey({ id: 'file-xyz-123', name: 'test.mp4', size: 0 });
      expect(key).toBe('subtitles:v1:id:file-xyz-123');
    });

    it('falls back to name if size and id are absent', () => {
      const key = getSubtitleCacheKey({ name: 'test.mp4' });
      expect(key).toBe('subtitles:v1:name:test.mp4');
    });

    it('returns null when target has no identifiable properties', () => {
      expect(getSubtitleCacheKey({})).toBeNull();
    });
  });

  describe('saveCachedSubtitles and getCachedSubtitles', () => {
    it('saves and retrieves subtitles from cache', async () => {
      const target = { name: 'sample.mp4', size: 5000 };
      await saveCachedSubtitles(target, {
        cues: sampleCues,
        srtContent: '1\n00:00:00,000 --> 00:00:02,500\n你好，世界\n',
        vttContent: 'WEBVTT\n\n1\n00:00:00.000 --> 00:00:02.500\n你好，世界\n',
        durationSeconds: 15.2,
      });

      const cached = await getCachedSubtitles(target);
      expect(cached).not.toBeNull();
      expect(cached?.cues).toEqual(sampleCues);
      expect(cached?.srtContent).toContain('你好，世界');
      expect(cached?.vttContent).toContain('WEBVTT');
      expect(cached?.durationSeconds).toBe(15.2);
      expect(cached?.createdAt).toBeGreaterThan(0);
    });

    it('returns null on cache miss', async () => {
      const cached = await getCachedSubtitles({ name: 'missing.mp4', size: 1234 });
      expect(cached).toBeNull();
    });

    it('returns null if cached item has empty cues', async () => {
      const target = { name: 'empty.mp4', size: 2000 };
      await saveCachedSubtitles(target, {
        cues: [],
        srtContent: '',
        vttContent: '',
      });

      const cached = await getCachedSubtitles(target);
      expect(cached).toBeNull();
    });

    it('handles database errors gracefully without throwing', async () => {
      const { getKeyValue } = await import('@/services/db/indexedDbAccess');
      vi.mocked(getKeyValue).mockRejectedValueOnce(new Error('IndexedDB failure'));

      const cached = await getCachedSubtitles({ name: 'error.mp4', size: 999 });
      expect(cached).toBeNull();
    });
  });

  describe('deleteCachedSubtitles', () => {
    it('removes the subtitle entry from cache', async () => {
      const target = { name: 'to-delete.mp4', size: 3000 };
      await saveCachedSubtitles(target, {
        cues: sampleCues,
        srtContent: 'SRT',
        vttContent: 'VTT',
      });

      expect(await getCachedSubtitles(target)).not.toBeNull();

      await deleteCachedSubtitles(target);
      expect(await getCachedSubtitles(target)).toBeNull();
    });
  });
});

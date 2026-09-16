import { describe, it, expect, vi, beforeEach } from 'vitest';
import { probeMediaDuration } from './mediaDuration';

describe('probeMediaDuration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves duration when metadata loads successfully', async () => {
    const mockElement = {
      preload: '',
      src: '',
      duration: 45.5,
      removeAttribute: vi.fn(),
      load: vi.fn(),
      onloadedmetadata: null as any,
      onerror: null as any,
    };

    vi.spyOn(document, 'createElement').mockReturnValue(mockElement as any);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const promise = probeMediaDuration(new Blob(['video data'], { type: 'video/mp4' }), 'video/mp4');
    mockElement.onloadedmetadata();

    const duration = await promise;
    expect(duration).toBe(45.5);
    expect(mockElement.removeAttribute).toHaveBeenCalledWith('src');
  });

  it('resolves null on media error', async () => {
    const mockElement = {
      preload: '',
      src: '',
      duration: 0,
      removeAttribute: vi.fn(),
      load: vi.fn(),
      onloadedmetadata: null as any,
      onerror: null as any,
    };

    vi.spyOn(document, 'createElement').mockReturnValue(mockElement as any);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const promise = probeMediaDuration(new Blob(['corrupted'], { type: 'audio/mp3' }), 'audio/mp3');
    mockElement.onerror();

    const duration = await promise;
    expect(duration).toBeNull();
  });
});

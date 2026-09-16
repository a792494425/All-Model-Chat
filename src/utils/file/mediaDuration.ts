/**
 * Probes the duration (in seconds) of an audio or video Blob in a browser environment.
 * Returns null if duration cannot be determined or if not in a DOM environment.
 */
export const probeMediaDuration = async (blob: Blob, mimeType: string): Promise<number | null> => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }
  return new Promise<number | null>((resolve) => {
    try {
      const url = URL.createObjectURL(blob);
      const isVideo = (mimeType || blob.type || '').toLowerCase().startsWith('video/');
      const element = document.createElement(isVideo ? 'video' : 'audio');
      element.preload = 'metadata';

      const cleanup = () => {
        element.removeAttribute('src');
        element.load();
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      };

      const timer = setTimeout(() => {
        cleanup();
        resolve(null);
      }, 1500);

      element.onloadedmetadata = () => {
        clearTimeout(timer);
        const duration = element.duration;
        cleanup();
        resolve(Number.isFinite(duration) && duration > 0 ? duration : null);
      };

      element.onerror = () => {
        clearTimeout(timer);
        cleanup();
        resolve(null);
      };

      element.src = url;
    } catch {
      resolve(null);
    }
  });
};

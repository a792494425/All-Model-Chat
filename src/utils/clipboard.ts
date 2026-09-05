import { logService } from '@/services/logService';

/**
 * Copies the given plain text string to the system clipboard.
 * Uses navigator.clipboard.writeText with fallback to document.execCommand('copy').
 *
 * @param text The string to copy.
 * @param targetDoc Optional document reference for the execCommand fallback.
 * @returns A Promise resolving to true if copy succeeded, false otherwise.
 */
export const copyTextToClipboard = async (text: string, targetDoc?: Document): Promise<boolean> => {
  if (!text) {
    return false;
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (clipboardError) {
      logService.warn('navigator.clipboard.writeText failed, attempting fallback:', clipboardError);
    }
  }

  const doc = targetDoc ?? (typeof document !== 'undefined' ? document : null);
  if (doc && typeof doc.createElement === 'function' && typeof doc.execCommand === 'function') {
    try {
      const textarea = doc.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      doc.body.appendChild(textarea);
      textarea.select();
      const successful = doc.execCommand('copy');
      textarea.remove();
      if (successful) {
        return true;
      }
    } catch (execError) {
      logService.error('execCommand copy fallback failed:', execError);
    }
  }

  logService.error('Failed to copy text: clipboard API unavailable or rejected');
  return false;
};

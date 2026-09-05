import { copyTextToClipboard } from '@/utils/clipboard';

export const copySelectionTextToClipboardEvent = (event: ClipboardEvent, text: string): boolean => {
  if (!text || !event.clipboardData) {
    return false;
  }

  event.preventDefault();
  event.clipboardData.setData('text/plain', text);
  return true;
};

export const writeSelectionTextToClipboard = async (text: string): Promise<boolean> => {
  return copyTextToClipboard(text);
};

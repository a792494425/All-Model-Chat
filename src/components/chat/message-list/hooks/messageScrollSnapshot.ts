import { CHAT_SCROLL_POS_STORAGE_PREFIX } from '@/constants/storageKeys';
import { safeJsonParse } from '@/utils/safeJsonParse';
const SCROLL_BOTTOM_THRESHOLD_PX = 150;
export const ANCHOR_SCROLL_DELAY_MS = 50;
export const RESTORE_SCROLL_DELAY_MS = 50;
export const BOTTOM_LOCK_MS = 2500;

export type StoredMessageScrollSnapshot = {
  messageId: string;
  scrollTop: number;
  topOffset: number;
};

export type StoredBottomScrollSnapshot = {
  atBottom: true;
  scrollTop: number;
};

export type StoredScrollSnapshot = StoredMessageScrollSnapshot | StoredBottomScrollSnapshot;

export const getScrollStorageKey = (sessionId: string) => `${CHAT_SCROLL_POS_STORAGE_PREFIX}${sessionId}`;

export const parseStoredScrollSnapshot = (rawValue: string | null): StoredScrollSnapshot | number | null => {
  if (rawValue === null) {
    return null;
  }

  const legacyTop = Number(rawValue);
  if (Number.isFinite(legacyTop)) {
    return legacyTop;
  }

  const parsed = safeJsonParse<Partial<StoredMessageScrollSnapshot & StoredBottomScrollSnapshot> | null>(
    rawValue,
    null,
  );
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  if (parsed.atBottom && Number.isFinite(parsed.scrollTop)) {
    return {
      atBottom: true,
      scrollTop: Number(parsed.scrollTop),
    };
  }
  if (typeof parsed.messageId === 'string' && Number.isFinite(parsed.scrollTop) && Number.isFinite(parsed.topOffset)) {
    return {
      messageId: parsed.messageId,
      scrollTop: Number(parsed.scrollTop),
      topOffset: Number(parsed.topOffset),
    };
  }
  if (Number.isFinite(parsed.scrollTop)) {
    return Number(parsed.scrollTop);
  }

  return null;
};

const isNearScrollBottom = (container: HTMLElement) =>
  container.scrollHeight - container.clientHeight - container.scrollTop <= SCROLL_BOTTOM_THRESHOLD_PX;

export const createScrollSnapshot = (container: HTMLElement): StoredScrollSnapshot | null => {
  if (isNearScrollBottom(container)) {
    return {
      atBottom: true,
      scrollTop: Math.max(0, Math.round(container.scrollTop)),
    };
  }

  const containerRect = container.getBoundingClientRect();
  const renderedMessages = Array.from(container.querySelectorAll<HTMLElement>('[data-message-id]'));
  const firstVisibleMessage =
    renderedMessages.find((element) => element.getBoundingClientRect().top >= containerRect.top) ??
    renderedMessages.find((element) => element.getBoundingClientRect().bottom > containerRect.top);

  const messageId = firstVisibleMessage?.dataset.messageId;
  if (!firstVisibleMessage || !messageId) {
    return null;
  }

  return {
    messageId,
    scrollTop: Math.max(0, Math.round(container.scrollTop)),
    topOffset: Math.round(firstVisibleMessage.getBoundingClientRect().top - containerRect.top),
  };
};

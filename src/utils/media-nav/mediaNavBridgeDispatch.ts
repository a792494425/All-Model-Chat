import type { HtmlPreviewMediaSeekPayload } from '@/utils/html-preview/previewMessageProtocol';
import { seekSessionPdf } from './seekPdf';
import { seekSessionVideo } from './seekVideo';
import { seekSessionImage } from './seekImage';

export interface DispatchMediaSeekOptions {
  messageId?: string;
}

/**
 * Dispatches a media seek request triggered from within an HTML preview (Live UI iframe)
 * to the appropriate media viewer (PDF, video, audio, or image).
 */
export const dispatchMediaSeekFromBridge = (
  payload: HtmlPreviewMediaSeekPayload,
  options?: DispatchMediaSeekOptions,
): boolean => {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const { kind, page, seconds, doc, box2d, point, arrow, label, snippet } = payload;
  const messageId = options?.messageId;

  // 1. PDF seek
  if (kind === 'pdf' || (page !== undefined && Number.isFinite(page))) {
    if (page !== undefined && page >= 1) {
      return seekSessionPdf({
        pageNumber: page,
        docName: doc,
        box2d,
        point,
        snippet,
        messageId,
      });
    }
  }

  // 2. Video / Audio seek
  if (kind === 'video' || kind === 'audio' || (seconds !== undefined && Number.isFinite(seconds))) {
    if (seconds !== undefined && seconds >= 0) {
      return seekSessionVideo({
        startSeconds: seconds,
        videoName: doc,
        kind: kind === 'audio' ? 'audio' : 'video',
        messageId,
        annotation: box2d || point || snippet ? { box2d, point, snippet } : undefined,
      });
    }
  }

  // 3. Image seek
  if (kind === 'image') {
    return seekSessionImage({
      fileName: doc,
      box2d,
      point,
      arrow,
      label,
      snippet,
      messageId,
    });
  }

  return false;
};

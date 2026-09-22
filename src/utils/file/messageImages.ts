import type { ChatMessage, UploadedFile } from '@/types';
import { isImageFile, isImageMimeType } from './fileTypeClassification';

const MARKDOWN_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
const HTML_IMAGE_REGEX = /<img\b[^>]*?\bsrc=["']([^"']+)["'][^>]*?>/gi;
const HTML_ALT_REGEX = /\balt=["']([^"']*)["']/i;

const inferMimeTypeFromSrc = (src: string): string => {
  if (src.startsWith('data:image/')) {
    const semiIndex = src.indexOf(';');
    if (semiIndex !== -1) {
      const mime = src.slice(5, semiIndex);
      if (isImageMimeType(mime)) return mime;
    }
  }

  try {
    const url = new URL(src, 'http://localhost');
    const pathname = url.pathname.toLowerCase();
    if (pathname.endsWith('.png')) return 'image/png';
    if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'image/jpeg';
    if (pathname.endsWith('.webp')) return 'image/webp';
    if (pathname.endsWith('.gif')) return 'image/gif';
    if (pathname.endsWith('.svg')) return 'image/svg+xml';
    if (pathname.endsWith('.bmp')) return 'image/bmp';
  } catch {
    // If not a valid URL or path, fall back
  }

  return 'image/jpeg';
};

/**
 * Extracts all previewable images from a single ChatMessage, combining attached image files
 * and inline Markdown / HTML images in chronological appearance order without duplicates.
 */
export const extractMessageImages = (message: ChatMessage): UploadedFile[] => {
  const images: UploadedFile[] = [];
  const seenUrls = new Set<string>();

  // 1. Collect attached files that are images
  if (Array.isArray(message.files)) {
    for (const file of message.files) {
      if (file && isImageFile(file)) {
        images.push(file);
        if (file.dataUrl) {
          seenUrls.add(file.dataUrl);
        }
      }
    }
  }

  // 2. Collect inline markdown images from message.content
  if (typeof message.content === 'string' && message.content.length > 0) {
    let inlineIndex = 0;

    // A. Parse standard markdown ![alt](src)
    for (const match of message.content.matchAll(MARKDOWN_IMAGE_REGEX)) {
      const alt = match[1]?.trim() || '';
      const src = match[2]?.trim() || '';

      if (src && !seenUrls.has(src)) {
        seenUrls.add(src);
        images.push({
          id: `${message.id}-inline-${inlineIndex++}`,
          name: alt || `image-${inlineIndex}.png`,
          type: inferMimeTypeFromSrc(src),
          size: 0,
          dataUrl: src,
          uploadState: 'active',
        });
      }
    }

    // B. Parse HTML <img src="..."> tags
    for (const match of message.content.matchAll(HTML_IMAGE_REGEX)) {
      const fullTag = match[0];
      const src = match[1]?.trim() || '';

      if (src && !seenUrls.has(src)) {
        seenUrls.add(src);
        const altMatch = fullTag.match(HTML_ALT_REGEX);
        const alt = altMatch?.[1]?.trim() || '';

        images.push({
          id: `${message.id}-inline-${inlineIndex++}`,
          name: alt || `image-${inlineIndex}.png`,
          type: inferMimeTypeFromSrc(src),
          size: 0,
          dataUrl: src,
          uploadState: 'active',
        });
      }
    }
  }

  return images;
};

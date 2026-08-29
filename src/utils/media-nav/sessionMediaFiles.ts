import { isVideoMimeType } from '@/utils/file/fileTypeClassification';
import type { ChatMessage, ContentPart, UploadedFile } from '@/types';

export const isPdfFile = (file: UploadedFile): boolean =>
  file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

export const isVideoFile = (file: UploadedFile): boolean => isVideoMimeType(file.type);

const partMimeType = (part: ContentPart): string | undefined =>
  'inlineData' in part ? part.inlineData?.mimeType : 'fileData' in part ? part.fileData?.mimeType : undefined;

const collectDeduped = (
  selectedFiles: UploadedFile[],
  activeMessages: ChatMessage[],
  keep: (file: UploadedFile) => boolean,
): UploadedFile[] => {
  const byId = new Map<string, UploadedFile>();
  for (const file of [...selectedFiles, ...activeMessages.flatMap((m) => m.files ?? [])]) {
    if (file && keep(file) && !byId.has(file.id)) {
      byId.set(file.id, file);
    }
  }
  return [...byId.values()];
};

/**
 * Collect every PDF of the current session: pending attachments first (they are
 * what the user is about to send), then files attached to historical messages.
 * Deduplicated by file id, order preserved.
 */
const collectSessionPdfFiles = (selectedFiles: UploadedFile[], activeMessages: ChatMessage[]): UploadedFile[] =>
  collectDeduped(selectedFiles, activeMessages, isPdfFile);

/** Collect every video attachment of the current session, same ordering rules. */
export const collectSessionVideoFiles = (
  selectedFiles: UploadedFile[],
  activeMessages: ChatMessage[],
): UploadedFile[] => collectDeduped(selectedFiles, activeMessages, isVideoFile);

export const collectSessionMediaFiles = (
  selectedFiles: UploadedFile[],
  activeMessages: ChatMessage[],
): { pdfs: UploadedFile[]; videos: UploadedFile[] } => ({
  pdfs: collectSessionPdfFiles(selectedFiles, activeMessages),
  videos: collectSessionVideoFiles(selectedFiles, activeMessages),
});

export const sessionHasMediaFiles = (selectedFiles: UploadedFile[], activeMessages: ChatMessage[]): boolean => {
  const { pdfs, videos } = collectSessionMediaFiles(selectedFiles, activeMessages);
  return pdfs.length > 0 || videos.length > 0;
};

/** True when any API part carries a PDF payload (inline or Files-API reference). */
export const partsContainPdf = (parts: ContentPart[] | undefined): boolean =>
  !!parts?.some((part) => partMimeType(part) === 'application/pdf');

/** True when any API part carries a video payload (inline or Files-API reference). */
export const partsContainVideo = (parts: ContentPart[] | undefined): boolean =>
  !!parts?.some((part) => partMimeType(part)?.startsWith('video/'));

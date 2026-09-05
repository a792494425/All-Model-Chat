import {
  isAudioFile,
  isAudioMimeType,
  isImageFile,
  isImageMimeType,
  isPdfFile,
  isPdfMimeType,
  isVideoFile,
  isVideoMimeType,
} from '@/utils/file/fileTypeClassification';
import type { ChatMessage, ContentPart, UploadedFile } from '@/types';

export { isAudioFile, isImageFile, isPdfFile, isVideoFile };

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
const collectSessionVideoFiles = (selectedFiles: UploadedFile[], activeMessages: ChatMessage[]): UploadedFile[] =>
  collectDeduped(selectedFiles, activeMessages, isVideoFile);

/** Collect every audio attachment of the current session, same ordering rules. */
export const collectSessionAudioFiles = (
  selectedFiles: UploadedFile[],
  activeMessages: ChatMessage[],
): UploadedFile[] => collectDeduped(selectedFiles, activeMessages, isAudioFile);

/** Collect every image attachment of the current session, same ordering rules. */
export const collectSessionImageFiles = (
  selectedFiles: UploadedFile[],
  activeMessages: ChatMessage[],
): UploadedFile[] => collectDeduped(selectedFiles, activeMessages, isImageFile);

export const collectSessionMediaFiles = (
  selectedFiles: UploadedFile[],
  activeMessages: ChatMessage[],
): { pdfs: UploadedFile[]; videos: UploadedFile[]; audios: UploadedFile[]; images: UploadedFile[] } => ({
  pdfs: collectSessionPdfFiles(selectedFiles, activeMessages),
  videos: collectSessionVideoFiles(selectedFiles, activeMessages),
  audios: collectSessionAudioFiles(selectedFiles, activeMessages),
  images: collectSessionImageFiles(selectedFiles, activeMessages),
});

/** True when any API part carries a PDF payload (inline or Files-API reference). */
export const partsContainPdf = (parts: ContentPart[] | undefined): boolean =>
  !!parts?.some((part) => isPdfMimeType(partMimeType(part)));

/** True when any API part carries a video payload (inline or Files-API reference). */
export const partsContainVideo = (parts: ContentPart[] | undefined): boolean =>
  !!parts?.some((part) => isVideoMimeType(partMimeType(part)));

/** True when any API part carries an audio payload (inline or Files-API reference). */
export const partsContainAudio = (parts: ContentPart[] | undefined): boolean =>
  !!parts?.some((part) => isAudioMimeType(partMimeType(part)));

/** True when any API part carries an image payload (inline or Files-API reference). */
export const partsContainImage = (parts: ContentPart[] | undefined): boolean =>
  !!parts?.some((part) => isImageMimeType(partMimeType(part)));

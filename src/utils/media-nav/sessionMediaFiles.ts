import { isImageMimeType, isVideoMimeType } from '@/utils/file/fileTypeClassification';
import type { ChatMessage, ContentPart, UploadedFile } from '@/types';

export const isPdfFile = (file: UploadedFile): boolean =>
  file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v', '.flv', '.wmv', '.3gp'];
export const isVideoFile = (file: UploadedFile): boolean =>
  isVideoMimeType(file.type) || VIDEO_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.aiff', '.wma'];
export const isAudioFile = (file: UploadedFile): boolean =>
  file.type.startsWith('audio/') || AUDIO_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg', '.tiff', '.ico', '.avif'];
export const isImageFile = (file: UploadedFile): boolean =>
  isImageMimeType(file.type) || IMAGE_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));

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
  !!parts?.some((part) => partMimeType(part) === 'application/pdf');

/** True when any API part carries a video payload (inline or Files-API reference). */
export const partsContainVideo = (parts: ContentPart[] | undefined): boolean =>
  !!parts?.some((part) => partMimeType(part)?.startsWith('video/'));

/** True when any API part carries an audio payload (inline or Files-API reference). */
export const partsContainAudio = (parts: ContentPart[] | undefined): boolean =>
  !!parts?.some((part) => partMimeType(part)?.startsWith('audio/'));

/** True when any API part carries an image payload (inline or Files-API reference). */
export const partsContainImage = (parts: ContentPart[] | undefined): boolean =>
  !!parts?.some((part) => isImageMimeType(partMimeType(part)));

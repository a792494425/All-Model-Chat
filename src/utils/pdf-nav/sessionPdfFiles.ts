import type { ChatMessage, ContentPart, UploadedFile } from '@/types';

export const isPdfFile = (file: UploadedFile): boolean =>
  file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

/**
 * Collect every PDF of the current session: pending attachments first (they are
 * what the user is about to send), then files attached to historical messages.
 * Deduplicated by file id, order preserved.
 */
export const collectSessionPdfFiles = (
  selectedFiles: UploadedFile[],
  activeMessages: ChatMessage[],
): UploadedFile[] => {
  const byId = new Map<string, UploadedFile>();
  for (const file of [...selectedFiles, ...activeMessages.flatMap((m) => m.files ?? [])]) {
    if (file && isPdfFile(file) && !byId.has(file.id)) {
      byId.set(file.id, file);
    }
  }
  return [...byId.values()];
};

export const sessionHasPdfFiles = (selectedFiles: UploadedFile[], activeMessages: ChatMessage[]): boolean =>
  collectSessionPdfFiles(selectedFiles, activeMessages).length > 0;

/** True when any API part carries a PDF payload (inline or Files-API reference). */
export const partsContainPdf = (parts: ContentPart[] | undefined): boolean =>
  !!parts?.some((part) => {
    const mimeType =
      'inlineData' in part ? part.inlineData?.mimeType : 'fileData' in part ? part.fileData?.mimeType : undefined;
    return mimeType === 'application/pdf';
  });

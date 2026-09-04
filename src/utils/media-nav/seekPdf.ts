import { useChatStore } from '@/stores/chatStore';
import { useMediaNavStore } from '@/stores/mediaNavStore';
import { collectSessionMediaFiles, isPdfFile } from './sessionMediaFiles';
import { parseLocateMarkers, toPdfNavHighlight } from './locateMarker';
import { applyMediaNavKindToSettings } from './mediaNavSettings';

const resolveNamedFile = (files: { id: string; name: string }[], locateName?: string, activeFileId?: string | null) => {
  if (locateName) {
    return (
      files.find((file) => file.name === locateName) ??
      files.find((file) => file.name.toLowerCase().includes(locateName.toLowerCase())) ??
      files[0]
    );
  }
  if (activeFileId) {
    const current = files.find((file) => file.id === activeFileId);
    if (current) return current;
  }
  return files[0];
};

export interface SeekSessionPdfParams {
  pageNumber: number;
  docName?: string;
  box2d?: [number, number, number, number];
  point?: [number, number];
  snippet?: string;
  messageId?: string;
}

/**
 * Open the PDF navigation panel, jump to a target page, and highlight visual bounding box.
 * Automatically resolves the active PDF document in the current session.
 */
export const seekSessionPdf = (params: SeekSessionPdfParams): boolean => {
  const { selectedFiles, activeMessages } = useChatStore.getState();
  const { pdfs } = collectSessionMediaFiles(selectedFiles, activeMessages);
  if (pdfs.length === 0) return false;

  let { docName, box2d, point, snippet } = params;

  // Fallback to inspect message context if docName or box2d/point wasn't embedded in the link
  if (params.messageId && (!docName || (!box2d && !point))) {
    const msg = activeMessages.find((m) => m.id === params.messageId);
    if (msg) {
      if (!docName && msg.files) {
        const msgPdf = msg.files.find(isPdfFile);
        if (msgPdf) docName = msgPdf.name;
      }
      if (!box2d && !point && msg.content) {
        const { pdfLocates } = parseLocateMarkers(msg.content);
        const matched = pdfLocates.find((loc) => loc.pageNumber === params.pageNumber);
        if (matched) {
          docName = docName || matched.docName;
          box2d = box2d || matched.box2d;
          point = point || matched.point;
          snippet = snippet || matched.snippet;
        }
      }
    }
  }

  const store = useMediaNavStore.getState();
  const target = resolveNamedFile(pdfs, docName, store.activeFileId);
  if (!target) return false;

  store.openAs('pdf');
  store.setActiveFile(target.id);
  store.setHighlight(
    toPdfNavHighlight(
      {
        docName: target.name,
        pageNumber: params.pageNumber,
        box2d,
        point,
        snippet,
      },
      { messageId: params.messageId },
    ),
  );
  store.jumpToPage(params.pageNumber);

  const chatStore = useChatStore.getState();
  if (typeof chatStore.setCurrentChatSettings === 'function') {
    chatStore.setCurrentChatSettings((prev) => applyMediaNavKindToSettings(prev, 'pdf'));
  }

  return true;
};

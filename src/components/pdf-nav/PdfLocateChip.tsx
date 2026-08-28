import React from 'react';
import { MapPin } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { interpolate } from '@/i18n/interpolate';
import { useChatStore } from '@/stores/chatStore';
import { usePdfNavStore } from '@/stores/pdfNavStore';
import { toPdfNavHighlight, type PdfLocate } from '@/utils/pdf-nav/locateMarker';
import { collectSessionPdfFiles } from '@/utils/pdf-nav/sessionPdfFiles';

interface PdfLocateChipsProps {
  messageId: string;
  locates: PdfLocate[];
}

/**
 * "Locate in PDF" chips rendered under a model message. Clicking one opens the
 * PDF navigation panel on the referenced document, jumps to the page and shows
 * the visual-grounding highlight.
 */
export const PdfLocateChips: React.FC<PdfLocateChipsProps> = ({ messageId, locates }) => {
  const { t } = useI18n();

  if (locates.length === 0) return null;

  const handleLocate = (locate: PdfLocate) => {
    const { selectedFiles, activeMessages } = useChatStore.getState();
    const pdfFiles = collectSessionPdfFiles(selectedFiles, activeMessages);
    if (pdfFiles.length === 0) return;

    const target = locate.docName
      ? (pdfFiles.find((file) => file.name === locate.docName) ??
        pdfFiles.find((file) => file.name.toLowerCase().includes(locate.docName!.toLowerCase())))
      : pdfFiles[0];
    if (!target) return;

    const store = usePdfNavStore.getState();
    store.open();
    store.setActiveFile(target.id);
    store.setHighlight(toPdfNavHighlight(locate, { messageId }));
    store.jumpToPage(locate.pageNumber);
  };

  return (
    <div className="flex flex-wrap gap-1.5 mt-2" data-testid="pdf-locate-chips">
      {locates.map((locate, index) => (
        <button
          key={`${locate.pageNumber}:${locate.snippet ?? ''}:${index}`}
          type="button"
          onClick={() => handleLocate(locate)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors duration-150 bg-[var(--theme-bg-accent)]/10 text-[var(--theme-text-link)] border-[var(--theme-border-secondary)] hover:border-[var(--theme-border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]"
          title={locate.snippet || t('pdfNavLocateButton')}
          data-testid={`pdf-locate-chip-${locate.pageNumber}`}
        >
          <MapPin size={13} strokeWidth={2} />
          <span>{t('pdfNavLocateButton')}</span>
          <span className="opacity-70">·</span>
          <span>{interpolate(t('pdfNavLocatePage'), { page: String(locate.pageNumber) })}</span>
        </button>
      ))}
    </div>
  );
};

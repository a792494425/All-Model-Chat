import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { useChatStore } from '@/stores/chatStore';
import { usePdfNavStore } from '@/stores/pdfNavStore';
import { collectSessionPdfFiles } from '@/utils/pdf-nav/sessionPdfFiles';
import { useIsMobile } from '@/hooks/useDevice';
import { Z_INDEX_SIDE_PANEL_MOBILE, Z_INDEX_TOPMOST_OVERLAY } from '@/constants/layout';
import { FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS } from '@/constants/focusClasses';
import { lazyNamedComponent } from '@/utils/lazyNamedComponent';
import type { UploadedFile } from '@/types';

const LazyPdfViewer = lazyNamedComponent(() => import('@/components/shared/file-preview/PdfViewerEntry'), 'PdfViewer');

/**
 * Resizable right-hand panel hosting the InsightPDF-style PDF navigation
 * viewer. Sits next to the chat area in MainContent's flex row; the chat
 * shrinks while it is open. On mobile it takes over the full screen.
 */
const PdfNavPanelComponent: React.FC = () => {
  const { t } = useI18n();
  const isMobile = useIsMobile();

  const isOpen = usePdfNavStore((state) => state.isOpen);
  const width = usePdfNavStore((state) => state.width);
  const activeFileId = usePdfNavStore((state) => state.activeFileId);
  const targetPage = usePdfNavStore((state) => state.targetPage);
  const highlight = usePdfNavStore((state) => state.highlight);
  const consumeTargetPage = usePdfNavStore((state) => state.consumeTargetPage);
  const setPage = usePdfNavStore((state) => state.setPage);
  const setActiveFile = usePdfNavStore((state) => state.setActiveFile);
  const setWidth = usePdfNavStore((state) => state.setWidth);
  const close = usePdfNavStore((state) => state.close);

  const selectedFiles = useChatStore((state) => state.selectedFiles);
  const activeMessages = useChatStore((state) => state.activeMessages);

  const pdfFiles = useMemo(
    () => collectSessionPdfFiles(selectedFiles, activeMessages),
    [selectedFiles, activeMessages],
  );

  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);

  // Keep the active document valid: default to the first PDF, fall back when
  // the selection disappears (file removed from the draft).
  useEffect(() => {
    if (pdfFiles.length === 0) {
      if (activeFileId !== null) setActiveFile(null);
      return;
    }
    if (!activeFileId || !pdfFiles.some((file) => file.id === activeFileId)) {
      setActiveFile(pdfFiles[0].id);
    }
  }, [pdfFiles, activeFileId, setActiveFile]);

  const activeFile: UploadedFile | undefined = useMemo(
    () => pdfFiles.find((file) => file.id === activeFileId) ?? pdfFiles[0],
    [pdfFiles, activeFileId],
  );

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    isResizingRef.current = true;
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    isResizingRef.current = false;
  }, []);

  const resize = useCallback(
    (mouseEvent: MouseEvent) => {
      if (isResizingRef.current) {
        setWidth(window.innerWidth - mouseEvent.clientX);
      }
    },
    [setWidth],
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, resize, stopResizing]);

  if (!isOpen) return null;

  return (
    <>
      {isResizing && (
        <div
          className={`fixed inset-0 ${Z_INDEX_TOPMOST_OVERLAY} bg-transparent cursor-col-resize`}
          style={{ touchAction: 'none' }}
        />
      )}

      <aside
        data-testid="pdf-nav-panel"
        className={`h-full flex flex-col bg-[var(--theme-bg-secondary)] border-l border-[var(--theme-border-primary)] shadow-2xl relative flex-shrink-0 z-40 slide-in-right-animate ${
          isMobile ? `fixed inset-0 w-full ${Z_INDEX_SIDE_PANEL_MOBILE}` : ''
        }`}
        style={{ width: isMobile ? '100%' : `${width}px` }}
      >
        {!isMobile && (
          <div
            onMouseDown={startResizing}
            className={`absolute left-0 top-0 bottom-0 w-1.5 -ml-0.5 z-50 cursor-col-resize flex items-center justify-center group transition-colors hover:bg-[var(--theme-bg-accent)] ${
              isResizing ? 'bg-[var(--theme-bg-accent)]' : 'bg-transparent'
            }`}
            title={t('sidePanelDragResize')}
          />
        )}

        <div className="flex items-center justify-between gap-2 px-3 h-12 border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-[var(--theme-text-primary)] flex-shrink-0">
              {t('pdfNavPanelTitle')}
            </span>
            {pdfFiles.length > 1 && (
              <select
                value={activeFile?.id ?? ''}
                onChange={(e) => setActiveFile(e.target.value)}
                aria-label={t('pdfNavDocument')}
                className="min-w-0 max-w-[220px] truncate text-xs rounded-md border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-input)] text-[var(--theme-text-primary)] px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]"
              >
                {pdfFiles.map((file) => (
                  <option key={file.id} value={file.id}>
                    {file.name}
                  </option>
                ))}
              </select>
            )}
            {pdfFiles.length === 1 && (
              <span className="min-w-0 truncate text-xs text-[var(--theme-text-tertiary)]" title={activeFile?.name}>
                {activeFile?.name}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={close}
            className={`p-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors flex-shrink-0 ${FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS}`}
            aria-label={t('close')}
            title={t('close')}
            data-testid="pdf-nav-panel-close"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-grow min-h-0">
          {activeFile ? (
            <LazyPdfViewer
              file={activeFile}
              highlight={highlight}
              targetPage={targetPage}
              onTargetPageConsumed={consumeTargetPage}
              onCurrentPageChange={setPage}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="text-sm text-[var(--theme-text-secondary)]">{t('pdfNavEmptyHint')}</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export const PdfNavPanel = React.memo(PdfNavPanelComponent);

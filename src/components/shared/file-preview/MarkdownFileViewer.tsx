import React from 'react';
import { Loader2 } from 'lucide-react';
import type { UploadedFile } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { VirtualSourceViewer } from './VirtualSourceViewer';
import { useTextFileContent } from './useTextFileContent';
import { LazyMarkdownRenderer } from '@/components/message/LazyMarkdownRenderer';
import { MarkdownFileViewerToolbar } from './markdown/MarkdownFileViewerToolbar';
import { MarkdownTocSidebar } from './markdown/MarkdownTocSidebar';
import { useMarkdownViewerState } from './markdown/useMarkdownViewerState';

interface MarkdownFileViewerProps {
  file: UploadedFile;
  content?: string | null;
  themeId?: string;
  isEditable?: boolean;
  layout?: 'contained' | 'overlay';
  onChange?: (value: string) => void;
  onLoad?: (content: string) => void;
}

export const MarkdownFileViewer: React.FC<MarkdownFileViewerProps> = ({
  file,
  content,
  themeId = 'pearl',
  isEditable = false,
  onChange,
  onLoad,
}) => {
  const { t } = useI18n();

  const { localContent, isLoading, textareaRef } = useTextFileContent(file, content, onLoad, {
    isEditable,
    errorLogLabel: 'Failed to load markdown content',
    ignoreStaleResponses: true,
    fetchTrigger: 'dataUrl',
  });

  const displayContent = content ?? localContent ?? '';

  const {
    previewContainerRef,
    showSource,
    shouldDefer,
    forcePreview,
    documentStats,
    tocItems,
    filteredTocItems,
    hasRepetitiveHeadings,
    tocVisible,
    tocFilterMode,
    setTocFilterMode,
    activeHeadingIndex,
    highlightedSourceLine,
    setHighlightedSourceLine,
    updateTocVisibility,
    handlePreviewSelect,
    handleSourceSelect,
    handleToggleToc,
    handleTocSelect,
  } = useMarkdownViewerState({
    file,
    displayContent,
    isEditable,
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--theme-text-tertiary)]">
        <Loader2 className="mr-2 animate-spin" /> {t('filePreviewLoadingTextContent')}
      </div>
    );
  }

  const sourceSurface = (
    <div className="h-full w-full bg-[var(--theme-bg-primary)]">
      <VirtualSourceViewer
        content={displayContent}
        highlightLine={highlightedSourceLine}
        onHighlightLineConsumed={() => setHighlightedSourceLine(null)}
        className="h-full w-full bg-[var(--theme-bg-primary)]"
      />
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)]">
      <MarkdownFileViewerToolbar
        showSource={showSource}
        isEditable={isEditable}
        tocCount={tocItems.length}
        tocVisible={tocVisible}
        shouldDefer={shouldDefer}
        forcePreview={forcePreview}
        documentStats={documentStats}
        onPreviewSelect={handlePreviewSelect}
        onSourceSelect={handleSourceSelect}
        onToggleToc={handleToggleToc}
        translate={t}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden bg-[var(--theme-bg-primary)]">
        {showSource ? (
          <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
            {isEditable ? (
              <textarea
                ref={textareaRef}
                value={displayContent}
                onChange={(event) => onChange?.(event.target.value)}
                className="h-full min-h-[60vh] w-full resize-none bg-[var(--theme-bg-secondary)] p-5 font-mono text-sm leading-6 text-[var(--theme-text-primary)] outline-none sm:p-8"
                spellCheck={false}
              />
            ) : (
              sourceSurface
            )}
          </div>
        ) : (
          <div
            ref={previewContainerRef}
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-[var(--theme-bg-primary)]"
          >
            <article className="mx-auto max-w-4xl px-4 pt-6 pb-24 sm:px-8">
              <div className="markdown-body modern-markdown-reader min-h-[60vh] bg-[var(--theme-bg-primary)]">
                <LazyMarkdownRenderer
                  content={displayContent}
                  isLoading={false}
                  onImageClick={() => {}}
                  onOpenHtmlPreview={() => {}}
                  onOpenSidePanel={() => {}}
                  expandCodeBlocksByDefault={true}
                  isMermaidRenderingEnabled={true}
                  isGraphvizRenderingEnabled={true}
                  allowHtml={true}
                  themeId={themeId}
                  interactiveMode="disabled"
                  fallbackMode="raw"
                />
              </div>
            </article>
          </div>
        )}

        <MarkdownTocSidebar
          isOpen={tocVisible}
          onClose={() => updateTocVisibility(false)}
          items={filteredTocItems}
          hasRepetitiveHeadings={hasRepetitiveHeadings}
          tocFilterMode={tocFilterMode}
          onFilterModeChange={setTocFilterMode}
          activeHeadingIndex={activeHeadingIndex}
          onSelect={handleTocSelect}
          translate={t}
        />
      </div>
    </div>
  );
};

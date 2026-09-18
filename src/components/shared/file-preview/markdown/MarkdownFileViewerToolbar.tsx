import React from 'react';
import { AlertCircle, Code2, Eye, List } from 'lucide-react';
import { interpolate } from '@/i18n/interpolate';
import type { MarkdownDocumentStats } from '@/components/shared/file-preview/markdownDocumentStats';

const TOGGLE_BUTTON_BASE_CLASS =
  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors';
const TOGGLE_BUTTON_ACTIVE_CLASS = 'bg-[var(--theme-bg-accent)] text-white shadow-sm';
const TOGGLE_BUTTON_INACTIVE_CLASS = 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]';

interface MarkdownFileViewerToolbarProps {
  showSource: boolean;
  isEditable: boolean;
  tocCount: number;
  tocVisible: boolean;
  shouldDefer: boolean;
  forcePreview: boolean;
  documentStats: MarkdownDocumentStats;
  onPreviewSelect: () => void;
  onSourceSelect: () => void;
  onToggleToc: () => void;
  translate: (key: string) => string;
}

export const MarkdownFileViewerToolbar: React.FC<MarkdownFileViewerToolbarProps> = ({
  showSource,
  isEditable,
  tocCount,
  tocVisible,
  shouldDefer,
  forcePreview,
  documentStats,
  onPreviewSelect,
  onSourceSelect,
  onToggleToc,
  translate,
}) => {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)] p-1">
          <button
            type="button"
            className={`${TOGGLE_BUTTON_BASE_CLASS} ${!showSource ? TOGGLE_BUTTON_ACTIVE_CLASS : TOGGLE_BUTTON_INACTIVE_CLASS}`}
            onClick={onPreviewSelect}
            disabled={isEditable}
            title={translate('markdownPreviewPreviewShortcut')}
          >
            <Eye size={15} />
            {translate('markdownPreviewPreview')}
          </button>
          <button
            type="button"
            className={`${TOGGLE_BUTTON_BASE_CLASS} ${showSource ? TOGGLE_BUTTON_ACTIVE_CLASS : TOGGLE_BUTTON_INACTIVE_CLASS}`}
            onClick={onSourceSelect}
            title={translate('markdownPreviewSourceShortcut')}
          >
            <Code2 size={15} />
            {translate('markdownPreviewSource')}
          </button>
        </div>

        {tocCount > 0 && (
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              tocVisible
                ? 'border-[var(--theme-border-focus)] bg-[var(--theme-bg-accent)]/10 text-[var(--theme-text-primary)]'
                : 'border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
            }`}
            onClick={onToggleToc}
            title={translate('markdownPreviewTocTitle')}
          >
            <List size={15} />
            {translate('markdownPreviewToc')}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        {shouldDefer && !forcePreview && !isEditable && (
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 sm:inline-flex">
              <AlertCircle size={13} className="shrink-0" />
              {translate('filePreviewLargeMarkdownNotice')}
            </span>
            <button
              type="button"
              className="rounded-lg border border-[var(--theme-border-focus)] bg-[var(--theme-bg-accent)]/10 px-3 py-1.5 text-xs font-medium text-[var(--theme-text-primary)] transition-colors hover:bg-[var(--theme-bg-accent)]/20 sm:text-sm"
              onClick={onPreviewSelect}
            >
              {translate('filePreviewRenderMarkdownAnyway')}
            </button>
          </div>
        )}

        <div className="rounded-lg border border-[var(--theme-border-secondary)]/50 bg-[var(--theme-bg-secondary)]/40 px-2.5 py-1 font-mono text-xs text-[var(--theme-text-secondary)] shadow-2xs">
          {interpolate(translate('markdownPreviewStats'), {
            lines: String(documentStats.lines),
            words: String(documentStats.words),
            characters: String(documentStats.characters),
          })}
        </div>
      </div>
    </div>
  );
};

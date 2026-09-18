import React from 'react';
import { List, X } from 'lucide-react';
import type { MarkdownTocItem } from '@/components/shared/file-preview/markdownToc';
import { MarkdownTocPanel } from './MarkdownTocPanel';

interface MarkdownTocSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  items: MarkdownTocItem[];
  hasRepetitiveHeadings: boolean;
  tocFilterMode: 'compact' | 'all';
  onFilterModeChange: (mode: 'compact' | 'all') => void;
  activeHeadingIndex?: number;
  onSelect: (item: MarkdownTocItem) => void;
  translate: (key: string) => string;
}

export const MarkdownTocSidebar: React.FC<MarkdownTocSidebarProps> = ({
  isOpen,
  onClose,
  items,
  hasRepetitiveHeadings,
  tocFilterMode,
  onFilterModeChange,
  activeHeadingIndex,
  onSelect,
  translate,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-20 bg-black/40 backdrop-blur-xs transition-opacity sm:hidden" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-30 flex w-72 max-w-[85vw] flex-col border-l border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] shadow-2xl custom-scrollbar sm:static sm:z-auto sm:w-80 sm:bg-[var(--theme-bg-secondary)]/30 sm:shadow-none">
        <div className="sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)]/90 px-4 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)]">
            <List size={14} />
            <span>{translate('markdownPreviewTocTitle')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {hasRepetitiveHeadings && (
              <div className="flex items-center rounded-md border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)]/60 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => onFilterModeChange('compact')}
                  className={`rounded px-1.5 py-0.5 transition-colors ${
                    tocFilterMode === 'compact'
                      ? 'bg-[var(--theme-bg-primary)] font-medium text-[var(--theme-text-primary)] shadow-2xs'
                      : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)]'
                  }`}
                  title={translate('markdownTocCompactTitle')}
                >
                  {translate('markdownTocCompact')}
                </button>
                <button
                  type="button"
                  onClick={() => onFilterModeChange('all')}
                  className={`rounded px-1.5 py-0.5 transition-colors ${
                    tocFilterMode === 'all'
                      ? 'bg-[var(--theme-bg-primary)] font-medium text-[var(--theme-text-primary)] shadow-2xs'
                      : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)]'
                  }`}
                  title={translate('markdownTocAllTitle')}
                >
                  {translate('markdownTocAll')}
                </button>
              </div>
            )}
            <span className="rounded-full bg-[var(--theme-bg-secondary)] px-2 py-0.5 font-mono text-xs text-[var(--theme-text-tertiary)]">
              {items.length}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-[var(--theme-text-tertiary)] hover:bg-[var(--theme-bg-secondary)] hover:text-[var(--theme-text-primary)] sm:hidden"
              title={translate('close')}
            >
              <X size={15} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
          <MarkdownTocPanel
            items={items}
            activeHeadingIndex={activeHeadingIndex}
            onSelect={onSelect}
            translate={translate}
          />
        </div>
      </aside>
    </>
  );
};

import React from 'react';
import type { MarkdownTocItem } from '@/components/shared/file-preview/markdownToc';

interface MarkdownTocPanelProps {
  items: MarkdownTocItem[];
  activeHeadingIndex?: number;
  onSelect: (item: MarkdownTocItem) => void;
  translate: (key: string) => string;
}

export const MarkdownTocPanel: React.FC<MarkdownTocPanelProps> = ({
  items,
  activeHeadingIndex,
  onSelect,
  translate,
}) => {
  if (items.length === 0) {
    return (
      <div className="px-4 py-6 text-sm text-[var(--theme-text-tertiary)]">{translate('markdownPreviewTocEmpty')}</div>
    );
  }

  return (
    <nav aria-label={translate('markdownPreviewTocTitle')} className="px-3 py-3">
      <ul className="space-y-1">
        {items.map((item) => {
          const isMinorDetailHeading = item.level >= 3 && (item.text === '详情' || item.text === '详细信息');
          const isActive = activeHeadingIndex !== undefined && item.index === activeHeadingIndex;

          return (
            <li key={`${item.id}-${item.line}`}>
              <button
                type="button"
                onClick={() => onSelect(item)}
                className={`group flex w-full items-start gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                  isActive
                    ? 'bg-[var(--theme-bg-accent)]/15 font-semibold text-[var(--theme-text-primary)] shadow-2xs'
                    : isMinorDetailHeading
                      ? 'text-[var(--theme-text-tertiary)] italic hover:bg-[var(--theme-bg-accent)]/10 hover:text-[var(--theme-text-secondary)]'
                      : item.level <= 2
                        ? 'font-medium text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-accent)]/10'
                        : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-accent)]/10 hover:text-[var(--theme-text-primary)]'
                }`}
                style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
                title={item.text}
              >
                <span
                  className={`mt-1 shrink-0 rounded-full transition-colors ${
                    isActive
                      ? 'h-2 w-2 bg-[var(--theme-bg-accent,#0ea5e9)] ring-2 ring-[var(--theme-bg-accent,#0ea5e9)]/30'
                      : isMinorDetailHeading
                        ? 'h-1 w-1 bg-[var(--theme-text-tertiary)]/40'
                        : item.level === 1
                          ? 'h-1.5 w-1.5 bg-[var(--theme-bg-accent,#0ea5e9)]'
                          : item.level === 2
                            ? 'h-1.5 w-1.5 bg-[var(--theme-text-secondary)]'
                            : 'h-1 w-1 bg-[var(--theme-text-tertiary)]'
                  }`}
                />
                <span className="line-clamp-2 leading-relaxed break-words">{item.text}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

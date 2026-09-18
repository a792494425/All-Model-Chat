import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface CodeBlockExpandOverlayProps {
  isOverflowing: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const CodeBlockExpandOverlay: React.FC<CodeBlockExpandOverlayProps> = ({
  isOverflowing,
  isExpanded,
  onToggleExpand,
}) => {
  const { t } = useI18n();

  if (!isOverflowing) return null;

  if (!isExpanded) {
    return (
      <div
        className="absolute bottom-0 left-0 right-0 h-20 select-none bg-gradient-to-t from-[var(--theme-bg-code-block)] to-transparent cursor-pointer flex items-end justify-center pb-2 group/expand code-block-expand-overlay rounded-b-lg"
        onClick={onToggleExpand}
      >
        <span
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 bg-[var(--theme-bg-primary)] hover:bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-secondary)] rounded-full text-xs font-medium text-[var(--theme-text-tertiary)] group-hover/expand:text-[var(--theme-text-primary)] shadow-sm transition-colors active:scale-95"
          title={t('codeShowMore')}
        >
          <ChevronDown size={12} strokeWidth={2} />
          <span>{t('codeShowMore')}</span>
        </span>
      </div>
    );
  }

  return (
    <div className="absolute bottom-2 left-0 right-0 flex select-none justify-center pointer-events-none z-10 code-block-expand-overlay">
      <button
        onClick={onToggleExpand}
        className="pointer-events-auto flex items-center gap-1.5 px-3 py-1 bg-[var(--theme-bg-primary)]/90 hover:bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-secondary)] rounded-full text-xs font-medium text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] shadow-sm transition-all active:scale-95"
        title={t('codeCollapseBlock')}
      >
        <ChevronUp size={12} strokeWidth={2} /> {t('codeShowLess')}
      </button>
    </div>
  );
};

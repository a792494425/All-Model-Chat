import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type ChatMessage } from '@/types';
import { useI18n } from '@/contexts/I18nContext';

export interface MessageVariantSwitcherProps {
  message: ChatMessage;
  onSwitchVariant?: (messageId: string, targetVariantIndex: number) => void;
}

export const MessageVariantSwitcher: React.FC<MessageVariantSwitcherProps> = ({ message, onSwitchVariant }) => {
  const { t } = useI18n();
  const variants = message.variants;
  if (!variants || variants.length <= 1 || message.isLoading) {
    return null;
  }

  const currentIndex = message.currentVariantIndex ?? 0;
  const totalVariants = variants.length;

  return (
    <div
      data-testid="message-variant-switcher"
      className="inline-flex items-center gap-0.5 text-xs text-[var(--theme-text-secondary)] select-none"
    >
      <button
        type="button"
        disabled={currentIndex <= 0}
        onClick={() => onSwitchVariant?.(message.id, currentIndex - 1)}
        aria-label={t('messageVariantPrevious') || 'Previous version'}
        title={t('messageVariantPrevious') || 'Previous version'}
        className="p-1 rounded-md hover:bg-[var(--theme-bg-tertiary)]/70 hover:text-[var(--theme-text-primary)] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft size={15} strokeWidth={1.75} />
      </button>
      <span className="font-mono text-xs tabular-nums px-1.5 leading-none font-normal text-[var(--theme-text-secondary)]">
        {currentIndex + 1} / {totalVariants}
      </span>
      <button
        type="button"
        disabled={currentIndex >= totalVariants - 1}
        onClick={() => onSwitchVariant?.(message.id, currentIndex + 1)}
        aria-label={t('messageVariantNext') || 'Next version'}
        title={t('messageVariantNext') || 'Next version'}
        className="p-1 rounded-md hover:bg-[var(--theme-bg-tertiary)]/70 hover:text-[var(--theme-text-primary)] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight size={15} strokeWidth={1.75} />
      </button>
    </div>
  );
};

import React from 'react';
import { RotateCcw, X } from 'lucide-react';
import { formatSelectionAskModelLabel } from '@/utils/text-selection/selectionAskDisplay';

export interface AskPanelHeaderProps {
  isDragging: boolean;
  isResizing: boolean;
  selectionAskModelId?: string | null;
  selectionAskProviderId?: string | null;
  handlePointerDown: (e: React.PointerEvent) => void;
  handleResetSize: () => void;
  onClose: () => void;
  t: (key: string) => string;
}

export const AskPanelHeader: React.FC<AskPanelHeaderProps> = ({
  isDragging,
  isResizing,
  selectionAskModelId,
  selectionAskProviderId,
  handlePointerDown,
  handleResetSize,
  onClose,
  t,
}) => {
  return (
    <div
      className="flex h-11 shrink-0 items-center gap-2 border-b border-[var(--theme-border-primary)] px-3.5 select-none"
      onPointerDown={handlePointerDown}
      style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
    >
      <span className="text-sm font-semibold text-[var(--theme-text-primary)]">{t('ask')}</span>
      {selectionAskModelId ? (
        <span
          className="max-w-[160px] truncate rounded-full bg-[var(--theme-bg-secondary)] px-2 py-0.5 text-xs font-medium text-[var(--theme-text-secondary)]"
          title={selectionAskProviderId ? `${selectionAskModelId} · ${selectionAskProviderId}` : selectionAskModelId}
        >
          {formatSelectionAskModelLabel(selectionAskModelId)}
        </span>
      ) : (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-[var(--theme-bg-secondary)] px-2 py-0.5 text-xs font-medium text-[var(--theme-text-secondary)]"
          title={t('selectionAskModelNotConfigured')}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--theme-text-danger)]" />
          {t('selectionAskModelNotConfigured')}
        </span>
      )}
      <div className="flex-1" />
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={handleResetSize}
        className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
          isResizing || isDragging
            ? 'text-[var(--theme-text-primary)]'
            : 'text-[var(--theme-text-tertiary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)]'
        }`}
        title={t('askResizeHint')}
        aria-label={t('askResetSize')}
      >
        <RotateCcw size={13} />
      </button>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onClose}
        className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--theme-text-tertiary)] transition-colors hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)]"
        aria-label={t('close')}
      >
        <X size={15} />
      </button>
    </div>
  );
};

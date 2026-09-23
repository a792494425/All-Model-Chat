import React from 'react';
import { Layers, RotateCw, X } from 'lucide-react';
import { Toggle } from '@/components/shared/Toggle';
import { useI18n } from '@/contexts/I18nContext';
import { interpolate } from '@/i18n/interpolate';

export interface MultimodalSearchHeaderProps {
  isAutoIndexEnabled: boolean;
  setIsAutoIndexEnabled: (enabled: boolean) => void;
  isIndexing: boolean;
  indexedCount: number;
  onTriggerIndexing: () => void | Promise<void>;
  onClose: () => void;
}

export const MultimodalSearchHeader: React.FC<MultimodalSearchHeaderProps> = ({
  isAutoIndexEnabled,
  setIsAutoIndexEnabled,
  isIndexing,
  indexedCount,
  onTriggerIndexing,
  onClose,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--theme-border-primary)] flex-shrink-0">
      <div className="flex items-center gap-2.5">
        <Layers size={20} className="text-[var(--theme-text-secondary)] shrink-0" strokeWidth={2} />
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-[var(--theme-text-primary)] leading-tight">
            {t('multimodalSearchTitle')}
          </h2>
          <p className="text-xs text-[var(--theme-text-tertiary)] mt-0.5 hidden sm:block">
            {t('multimodalSearchSubtitle')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[var(--theme-bg-tertiary)]"
          title={t('multimodalSearchAutoIndexTooltip')}
        >
          <span className="text-xs text-[var(--theme-text-secondary)] select-none hidden sm:inline">
            {t('multimodalSearchAutoIndex')}
          </span>
          <Toggle
            id="multimodal-auto-index-toggle"
            checked={isAutoIndexEnabled}
            onChange={setIsAutoIndexEnabled}
            ariaLabel={t('multimodalSearchAutoIndex')}
          />
        </div>

        <button
          type="button"
          onClick={() => void onTriggerIndexing()}
          disabled={isIndexing}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors disabled:opacity-50 cursor-pointer"
          title={t('multimodalSearchUpdateIndex')}
        >
          <RotateCw size={12} className={isIndexing ? 'animate-spin' : ''} />
          <span>
            {isIndexing
              ? t('multimodalSearchIndexing')
              : interpolate(t('multimodalSearchIndexedCount'), { count: indexedCount })}
          </span>
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          className="p-1.5 rounded-full text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

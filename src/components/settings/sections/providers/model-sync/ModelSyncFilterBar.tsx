import React from 'react';
import { Search, X } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import type { FilterTab } from './types';

interface ModelSyncFilterBarProps {
  filterTab: FilterTab;
  setFilterTab: (tab: FilterTab) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  totalRemote: number;
  newCount: number;
  existingCount: number;
  staleCount: number;
}

export const ModelSyncFilterBar: React.FC<ModelSyncFilterBarProps> = ({
  filterTab,
  setFilterTab,
  searchQuery,
  setSearchQuery,
  totalRemote,
  newCount,
  existingCount,
  staleCount,
}) => {
  const { t } = useI18n();

  return (
    <div className="px-6 pt-3.5 pb-3 border-b border-[var(--theme-border-primary)]/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--theme-bg-primary)]">
      <div className="flex items-center gap-1.5 p-1 bg-[var(--theme-bg-secondary)] rounded-xl text-xs font-medium">
        <button
          type="button"
          onClick={() => setFilterTab('all')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            filterTab === 'all'
              ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-xs font-semibold'
              : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
          }`}
        >
          {t('settingsOpenAICompatibleTabAll')} ({totalRemote + staleCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab('new')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            filterTab === 'new'
              ? 'bg-[var(--theme-bg-primary)] text-emerald-500 shadow-xs font-semibold'
              : 'text-[var(--theme-text-secondary)] hover:text-emerald-500'
          }`}
        >
          <span>{t('settingsOpenAICompatibleTabNew')}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-500 text-[10px] font-bold">
            {newCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setFilterTab('existing')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            filterTab === 'existing'
              ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-xs font-semibold'
              : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
          }`}
        >
          <span>{t('settingsOpenAICompatibleTabExisting')}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-[var(--theme-bg-primary)] text-[var(--theme-text-secondary)] text-[10px]">
            {existingCount}
          </span>
        </button>
        {staleCount > 0 && (
          <button
            type="button"
            onClick={() => setFilterTab('stale')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              filterTab === 'stale'
                ? 'bg-[var(--theme-bg-primary)] text-rose-500 shadow-xs font-semibold'
                : 'text-[var(--theme-text-secondary)] hover:text-rose-500'
            }`}
          >
            <span>{t('thirdPartyTabStale')}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500/15 text-rose-500 text-[10px] font-bold">
              {staleCount}
            </span>
          </button>
        )}
      </div>

      <div className="relative flex-1 max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-secondary)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('settingsOpenAICompatibleModelSearch')}
          className="w-full pl-8.5 pr-8 py-1.5 text-xs rounded-xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

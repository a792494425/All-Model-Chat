import React from 'react';
import { Search, X } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface ProviderListSearchAndFilterProps {
  search: string;
  setSearch: (query: string) => void;
  filterMode: 'all' | 'enabled' | 'disabled';
  setFilterMode: (mode: 'all' | 'enabled' | 'disabled') => void;
  enabledCount: number;
  allCount: number;
  disabledCount: number;
}

export const ProviderListSearchAndFilter: React.FC<ProviderListSearchAndFilterProps> = ({
  search,
  setSearch,
  filterMode,
  setFilterMode,
  enabledCount,
  allCount,
  disabledCount,
}) => {
  const { t } = useI18n();

  return (
    <div className="p-3 border-b border-[var(--theme-border-secondary)]/30 flex-shrink-0 space-y-2">
      <div className="relative w-full">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-secondary)]/60 pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('thirdPartySearchPlaceholder')}
          className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-[var(--theme-border-secondary)]/60 bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] placeholder:text-[var(--theme-text-secondary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--theme-border-focus)] transition-colors"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors"
          >
            <X size={12} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 p-0.5 bg-[var(--theme-bg-tertiary)]/60 rounded-xl">
        <button
          type="button"
          onClick={() => setFilterMode('enabled')}
          className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer flex items-center justify-center gap-1 ${
            filterMode === 'enabled'
              ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-xs font-semibold'
              : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
          }`}
        >
          <span>{t('thirdPartyFilterEnabled') || '已启用'}</span>
          <span className="text-[10px] opacity-60">({enabledCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('all')}
          className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer flex items-center justify-center gap-1 ${
            filterMode === 'all'
              ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-xs font-semibold'
              : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
          }`}
        >
          <span>{t('thirdPartyFilterAll') || '全部'}</span>
          <span className="text-[10px] opacity-60">({allCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('disabled')}
          className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer flex items-center justify-center gap-1 ${
            filterMode === 'disabled'
              ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-xs font-semibold'
              : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
          }`}
        >
          <span>{t('thirdPartyFilterDisabled') || '未启用'}</span>
          <span className="text-[10px] opacity-60">({disabledCount})</span>
        </button>
      </div>
    </div>
  );
};

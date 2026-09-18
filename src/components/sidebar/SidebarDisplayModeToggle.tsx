import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import type { HistoryDisplayMode } from './useHistorySidebarLogic';

interface SidebarDisplayModeToggleProps {
  displayMode: HistoryDisplayMode;
  onDisplayModeChange: (mode: HistoryDisplayMode) => void;
}

export const SidebarDisplayModeToggle: React.FC<SidebarDisplayModeToggleProps> = ({
  displayMode,
  onDisplayModeChange,
}) => {
  const { t } = useI18n();

  return (
    <div className="mb-2 flex gap-1 rounded-lg bg-[var(--theme-bg-tertiary)] p-1">
      <button
        onClick={() => onDisplayModeChange('group')}
        className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
          displayMode === 'group'
            ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-sm'
            : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]'
        }`}
      >
        {t('historyDisplayModeGroup')}
      </button>
      <button
        onClick={() => onDisplayModeChange('time')}
        title={t('historyReorderDisabledInTimeView')}
        className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
          displayMode === 'time'
            ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-sm'
            : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]'
        }`}
      >
        {t('historyDisplayModeTime')}
      </button>
    </div>
  );
};

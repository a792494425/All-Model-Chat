import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { interpolate } from '@/i18n/interpolate';
import { X } from 'lucide-react';
import {
  SETTINGS_SEGMENTED_ACTIVE_CLASS,
  SETTINGS_SEGMENTED_IDLE_CLASS,
  SETTINGS_SEGMENTED_TRACK_CLASS,
} from '@/constants/designTokens';
import { MODAL_CLOSE_BUTTON_CLASS } from '@/constants/buttonClasses';
import type { SettingsScope } from '@/components/layout/mainContentModels';
import type { SettingsTab } from '@/stores/settingsUiStore';

interface SettingsModalHeaderProps {
  activeTab: SettingsTab;
  activeTabLabelKey?: string;
  isSearching: boolean;
  searchResultsCount: number;
  activeTabUsesScope: boolean;
  visibleScope: SettingsScope;
  canEditCurrentChat: boolean;
  onScopeChange: (scope: SettingsScope) => void;
  onClose: () => void;
}

export const SettingsModalHeader: React.FC<SettingsModalHeaderProps> = ({
  activeTab,
  activeTabLabelKey,
  isSearching,
  searchResultsCount,
  activeTabUsesScope,
  visibleScope,
  canEditCurrentChat,
  onScopeChange,
  onClose,
}) => {
  const { t } = useI18n();

  return (
    <div
      className={`${
        activeTab === 'providers' && !isSearching
          ? 'w-full px-6 border-b border-[var(--theme-border-secondary)]/30 h-16 flex items-center justify-between flex-shrink-0 bg-[var(--theme-bg-primary)]'
          : 'max-w-3xl mx-auto w-full pb-4 md:pb-6 md:min-h-[48px] flex flex-col justify-center'
      }`}
    >
      <div className="flex items-center justify-between gap-3 w-full">
        <h2
          className={`${isSearching ? 'block' : 'hidden md:block'} text-xl font-semibold text-[var(--theme-text-primary)] min-w-0 truncate`}
        >
          {isSearching ? t('settingsSearchResultsTitle') : activeTabLabelKey ? t(activeTabLabelKey) : ''}
        </h2>
        {isSearching && (
          <span
            data-settings-search-count
            className="md:hidden flex-shrink-0 text-xs font-medium text-[var(--theme-text-secondary)]"
          >
            {interpolate(t('settingsSearchResultsCount'), { count: searchResultsCount })}
          </span>
        )}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          {activeTabUsesScope && (
            <div className={SETTINGS_SEGMENTED_TRACK_CLASS} role="group" aria-label={t('settingsScopeDefaults')}>
              <button
                type="button"
                onClick={() => onScopeChange('defaults')}
                className={
                  visibleScope === 'defaults' ? SETTINGS_SEGMENTED_ACTIVE_CLASS : SETTINGS_SEGMENTED_IDLE_CLASS
                }
              >
                {t('settingsScopeDefaults')}
              </button>
              <button
                type="button"
                onClick={() => canEditCurrentChat && onScopeChange('currentChat')}
                disabled={!canEditCurrentChat}
                title={!canEditCurrentChat ? t('settingsScopeCurrentChatUnavailable') : undefined}
                className={
                  visibleScope === 'currentChat' ? SETTINGS_SEGMENTED_ACTIVE_CLASS : SETTINGS_SEGMENTED_IDLE_CLASS
                }
              >
                {t('settingsScopeCurrentChat')}
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className={`${MODAL_CLOSE_BUTTON_CLASS} hidden md:inline-flex`}
            aria-label={t('close')}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
};

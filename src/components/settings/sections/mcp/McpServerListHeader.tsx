import React from 'react';
import { Plus } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { SETTINGS_PRIMARY_ACTION_BUTTON_CLASS } from '@/constants/buttonClasses';

interface McpServerListHeaderProps {
  onAddServer: () => void;
}

export const McpServerListHeader: React.FC<McpServerListHeaderProps> = ({ onAddServer }) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0 space-y-1">
        <h3 className="text-base font-semibold text-[var(--theme-text-primary)]">{t('settingsMcpTitle')}</h3>
        <p className="text-sm leading-relaxed text-[var(--theme-text-secondary)]">{t('settingsMcpDescription')}</p>
      </div>
      <button
        type="button"
        onClick={onAddServer}
        className={`${SETTINGS_PRIMARY_ACTION_BUTTON_CLASS} shrink-0 whitespace-nowrap`}
      >
        <Plus size={14} strokeWidth={2} />
        {t('settingsMcpAddServer')}
      </button>
    </div>
  );
};

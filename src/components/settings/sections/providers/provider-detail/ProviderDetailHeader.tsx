import React from 'react';
import { Settings, Copy } from 'lucide-react';
import type { ThirdPartyConnection } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { Toggle } from '@/components/shared/Toggle';
import { ProviderAvatar } from '@/components/settings/sections/providers/ProviderAvatar';

export interface ProviderDetailHeaderProps {
  connection: ThirdPartyConnection;
  onUpdateConnection: (updates: Partial<ThirdPartyConnection>) => void;
  onDuplicateConnection?: () => void;
  onOpenEdit: () => void;
}

export const ProviderDetailHeader: React.FC<ProviderDetailHeaderProps> = ({
  connection,
  onUpdateConnection,
  onDuplicateConnection,
  onOpenEdit,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-b border-[var(--theme-border-secondary)]/30 flex-shrink-0 bg-[var(--theme-bg-primary)]">
      <div className="flex items-center gap-3 min-w-0">
        <ProviderAvatar name={connection.name} templateId={connection.templateId} size={28} icon={connection.icon} />
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-xl font-bold text-[var(--theme-text-primary)] truncate">{connection.name}</h2>
          {connection.notes && (
            <span className="px-2 py-0.5 text-xs font-normal rounded-lg bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] border border-[var(--theme-border-secondary)]/40 truncate max-w-[120px] shrink-0">
              {connection.notes}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenEdit}
          className="p-1.5 rounded-lg text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors focus:outline-none cursor-pointer"
          title={t('thirdPartyConfigureProvider')}
        >
          <Settings size={15} />
        </button>
        {onDuplicateConnection && (
          <button
            type="button"
            data-testid="provider-duplicate-button"
            onClick={onDuplicateConnection}
            className="p-1.5 rounded-lg text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors focus:outline-none"
            title={t('thirdPartyDuplicate')}
            aria-label={t('thirdPartyDuplicate')}
          >
            <Copy size={15} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <Toggle
          checked={connection.enabled}
          onChange={(checked) => onUpdateConnection({ enabled: checked })}
          ariaLabel={connection.enabled ? t('enabled') : t('disabled')}
        />
      </div>
    </div>
  );
};

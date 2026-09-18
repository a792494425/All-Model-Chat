import React from 'react';
import { Sliders, X, Pin } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { ProviderAvatar } from '@/components/settings/sections/providers/ProviderAvatar';
import type { TabType } from './useModelConfigLogic';

export interface ModelConfigHeaderProps {
  modelId: string;
  modelName?: string;
  name: string;
  id: string;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onClose: () => void;
}

export const ModelConfigHeader: React.FC<ModelConfigHeaderProps> = ({
  modelId,
  modelName,
  name,
  id,
  activeTab,
  setActiveTab,
  onClose,
}) => {
  const { t } = useI18n();

  return (
    <>
      <div className="flex items-center justify-between border-b border-[var(--theme-border-secondary)]/40 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sliders size={18} className="text-[var(--theme-border-focus)]" />
          <h3 className="text-base font-semibold text-[var(--theme-text-primary)]">
            {t('settingsModelConfigTitle') || t('settingsModelParameters') || 'Model Configuration'}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="text-xs text-[var(--theme-text-secondary)] bg-[var(--theme-bg-secondary)]/60 px-3 py-2 rounded-xl border border-[var(--theme-border-secondary)]/30 flex items-center gap-2.5 flex-shrink-0">
        <ProviderAvatar
          modelId={modelId}
          modelName={modelName}
          name={modelName || modelId}
          size={24}
          className="text-[10px]"
        />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[var(--theme-text-primary)] truncate">{name || modelName}</div>
          <div className="font-mono text-[11px] opacity-75 truncate">{id || modelId}</div>
        </div>
      </div>

      <div className="flex border-b border-[var(--theme-border-secondary)]/30 text-xs font-medium flex-shrink-0">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'info'}
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-1.5 px-4 py-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'info'
              ? 'border-[var(--theme-border-focus)] text-[var(--theme-border-focus)] font-semibold'
              : 'border-transparent text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
          }`}
        >
          <Pin size={13} />
          <span>{t('settingsModelConfigTabInfo') || 'Info & Capabilities'}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'parameters'}
          onClick={() => setActiveTab('parameters')}
          className={`flex items-center gap-1.5 px-4 py-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'parameters'
              ? 'border-[var(--theme-border-focus)] text-[var(--theme-border-focus)] font-semibold'
              : 'border-transparent text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
          }`}
        >
          <Sliders size={13} />
          <span>{t('settingsModelConfigTabParams') || 'Generation & Reasoning'}</span>
        </button>
      </div>
    </>
  );
};

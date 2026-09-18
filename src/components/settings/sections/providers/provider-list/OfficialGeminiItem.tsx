import React from 'react';
import { GEMINI_PROVIDER_ID } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { ProviderAvatar } from '@/components/settings/sections/providers/ProviderAvatar';

interface OfficialGeminiItemProps {
  isSelected: boolean;
  onSelect: (id: string) => void;
  geminiStatus?: {
    isConfigured: boolean;
    useProxy: boolean;
  };
}

export const OfficialGeminiItem: React.FC<OfficialGeminiItemProps> = ({ isSelected, onSelect, geminiStatus }) => {
  const { t } = useI18n();

  return (
    <div className="space-y-1">
      <div className="px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[var(--theme-text-secondary)]/60 uppercase">
        {t('thirdPartyOfficialProviders')}
      </div>
      <div
        onClick={() => onSelect(GEMINI_PROVIDER_ID)}
        className={`group relative flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer select-none transition-all ${
          isSelected
            ? 'bg-[var(--theme-bg-secondary)] shadow-xs ring-1 ring-[var(--theme-border-focus)]/40 font-medium'
            : 'hover:bg-[var(--theme-bg-secondary)]/50'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <ProviderAvatar name="Google Gemini" templateId="gemini" size={26} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm truncate font-semibold text-[var(--theme-text-primary)]">Google Gemini</span>
              <span className="px-1.5 py-0.2 text-[9px] font-medium rounded-full bg-blue-500/15 text-blue-500 shrink-0">
                {t('thirdPartyBuiltin')}
              </span>
            </div>
            <div className="text-[10px] text-[var(--theme-text-secondary)]/70 truncate mt-0.5">
              {geminiStatus?.useProxy ? t('thirdPartyCustomProxyEndpoint') : t('thirdPartyOfficialEndpoint')}
            </div>
          </div>
        </div>
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${geminiStatus?.isConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`}
          title={geminiStatus?.isConfigured ? t('thirdPartyReady') : t('thirdPartyPendingKey')}
        />
      </div>
    </div>
  );
};

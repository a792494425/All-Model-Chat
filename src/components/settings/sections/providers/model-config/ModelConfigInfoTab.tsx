import React from 'react';
import { Copy, Check, Pin, Eye, Wrench, Lightbulb, Headphones, Image as ImageIcon, Globe } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { Toggle } from '@/components/shared/Toggle';
import { SETTINGS_INPUT_CLASS } from '@/constants/formClasses';
import type { ModelCapabilities } from '@/types';

const CONTEXT_WINDOW_PRESETS = [
  { label: '32k', value: 32768 },
  { label: '128k', value: 131072 },
  { label: '200k', value: 200000 },
  { label: '1M', value: 1048576 },
];

export interface ModelConfigInfoTabProps {
  name: string;
  setName: (name: string) => void;
  id: string;
  setId: (id: string) => void;
  copiedId: boolean;
  handleCopyId: () => void;
  isPinned: boolean;
  setIsPinned: (pinned: boolean) => void;
  contextWindow: number | undefined;
  setContextWindow: (val: number | undefined) => void;
  capabilities: ModelCapabilities;
  toggleCapability: (key: keyof ModelCapabilities) => void;
}

export const ModelConfigInfoTab: React.FC<ModelConfigInfoTabProps> = ({
  name,
  setName,
  id,
  setId,
  copiedId,
  handleCopyId,
  isPinned,
  setIsPinned,
  contextWindow,
  setContextWindow,
  capabilities,
  toggleCapability,
}) => {
  const { t } = useI18n();

  return (
    <div className="space-y-4 text-xs">
      <div className="space-y-1.5">
        <label className="font-semibold text-[var(--theme-text-primary)]">
          {t('settingsModelConfigName') || 'Display Name'}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. GPT-4o, DeepSeek V3..."
          className={`w-full p-2 rounded-xl border ${SETTINGS_INPUT_CLASS}`}
        />
      </div>

      <div className="space-y-1.5">
        <label className="font-semibold text-[var(--theme-text-primary)]">
          {t('settingsModelConfigId') || 'Model ID'}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="e.g. gpt-4o-mini"
            className={`flex-1 p-2 rounded-xl border font-mono ${SETTINGS_INPUT_CLASS}`}
          />
          <button
            type="button"
            onClick={handleCopyId}
            className="p-2 rounded-xl border border-[var(--theme-border-secondary)]/60 bg-[var(--theme-bg-secondary)]/40 hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors"
            title={t('settingsModelConfigCopyId')}
            aria-label={t('settingsModelConfigCopyId')}
          >
            {copiedId ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--theme-border-secondary)]/40 bg-[var(--theme-bg-secondary)]/30">
        <div className="flex items-center gap-2">
          <Pin size={15} className="text-[var(--theme-border-focus)]" />
          <div>
            <div className="font-medium text-[var(--theme-text-primary)]">
              {t('settingsModelConfigPin') || 'Pin Model to Top'}
            </div>
            <div className="text-[11px] text-[var(--theme-text-secondary)]">
              {t('settingsModelConfigPinHelp') || 'Show this model at the top of the chat model picker.'}
            </div>
          </div>
        </div>
        <Toggle checked={isPinned} onChange={setIsPinned} ariaLabel="Pin model" />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="font-semibold text-[var(--theme-text-primary)]">
            {t('settingsModelConfigContextWindow') || 'Context Window Limit (Tokens)'}
          </label>
          <span className="text-[11px] font-mono text-[var(--theme-text-secondary)]">
            {contextWindow ? `${contextWindow.toLocaleString()} tokens` : t('settingsDefault') || 'Default'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1024"
            max="10000000"
            step="1024"
            value={contextWindow ?? ''}
            placeholder="e.g. 128000"
            onChange={(e) => {
              const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
              setContextWindow(val);
            }}
            className={`flex-1 p-2 rounded-xl border font-mono ${SETTINGS_INPUT_CLASS}`}
          />
          <div className="flex items-center gap-1">
            {CONTEXT_WINDOW_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setContextWindow(preset.value)}
                className={`px-2 py-1 rounded-lg border text-[11px] font-mono font-medium transition-colors ${
                  contextWindow === preset.value
                    ? 'bg-[var(--theme-border-focus)] text-white border-transparent'
                    : 'border-[var(--theme-border-secondary)]/50 bg-[var(--theme-bg-secondary)]/40 hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)]'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2 pt-1 border-t border-[var(--theme-border-secondary)]/30">
        <label className="font-semibold text-[var(--theme-text-primary)]">
          {t('settingsModelConfigCapabilities') || 'Capabilities Override'}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 select-none">
          {[
            { key: 'vision', label: t('thirdPartyCapabilityVision') || 'Vision', icon: Eye },
            { key: 'tools', label: t('thirdPartyCapabilityTools') || 'Tools (MCP)', icon: Wrench },
            { key: 'thinking', label: t('thirdPartyCapabilityThinking') || 'Thinking', icon: Lightbulb },
            { key: 'audio', label: t('thirdPartyCapabilityAudio') || 'Audio', icon: Headphones },
            { key: 'image', label: t('thirdPartyCapabilityImage') || 'Image Gen', icon: ImageIcon },
            { key: 'webSearch', label: t('thirdPartyCapabilityWebSearch') || 'Web Search', icon: Globe },
          ].map(({ key, label, icon: Icon }) => {
            const isChecked = Boolean(capabilities[key as keyof ModelCapabilities]);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleCapability(key as keyof ModelCapabilities)}
                className={`flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer text-left ${
                  isChecked
                    ? 'border-[var(--theme-border-focus)] bg-[var(--theme-border-focus)]/10 text-[var(--theme-text-primary)]'
                    : 'border-[var(--theme-border-secondary)]/40 bg-[var(--theme-bg-secondary)]/20 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
                }`}
              >
                <Icon size={14} className={isChecked ? 'text-[var(--theme-border-focus)]' : 'opacity-60'} />
                <span className="font-medium text-xs">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { Sparkles, Copy, Check, Code, FileText, ChevronDown } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import type { AppSettings } from '@/types';
import { SETTINGS_SECTION_CARD_CLASS } from '@/constants/designTokens';
import { interpolate } from '@/i18n/interpolate';
import { getRegisteredModelName } from '@/constants/modelRegistry';
import { getDefaultModelOptions } from '@/utils/defaultModelOptions';

export interface AppearanceLivePreviewProps {
  settings: AppSettings;
}

export const AppearanceLivePreview: React.FC<AppearanceLivePreviewProps> = ({ settings }) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'code' | 'text'>('code');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const fontSize = settings.baseFontSize || 16;
  const codeFontSize = Math.max(11, Math.round(fontSize * 0.875));

  const modelDisplayName = useMemo(() => {
    const modelId = settings.modelId || 'gemini-3.8-flash';
    const registeredName = getRegisteredModelName(modelId);
    if (registeredName) return registeredName;
    const defaultModels = getDefaultModelOptions();
    const matched = defaultModels.find((m) => m.id === modelId);
    return matched?.name || modelId;
  }, [settings.modelId]);

  return (
    <div
      data-settings-item="interface-live-preview"
      className={`${SETTINGS_SECTION_CARD_CLASS} p-4 sm:p-5 space-y-3.5 transition-all overflow-hidden`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-amber-500 shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-secondary)]">
            {t('settingsLivePreviewTitle')}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--theme-bg-accent)]/15 text-[var(--theme-text-link)] font-medium">
            {t('settingsLivePreviewBadge')}
          </span>
        </div>

        <div className="flex items-center gap-1.5 p-0.5 bg-[var(--theme-bg-tertiary)]/60 rounded-lg border border-[var(--theme-border-secondary)]/40">
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`px-2 py-1 text-[11px] font-medium rounded-md transition-all flex items-center gap-1 ${
              activeTab === 'code'
                ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-xs'
                : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
            }`}
          >
            <Code size={12} />
            <span>{t('settingsLivePreviewTabCode')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`px-2 py-1 text-[11px] font-medium rounded-md transition-all flex items-center gap-1 ${
              activeTab === 'text'
                ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-xs'
                : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
            }`}
          >
            <FileText size={12} />
            <span>{t('settingsLivePreviewTabText')}</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)] p-3.5 sm:p-4 space-y-3.5 transition-all shadow-inner">
        <div className="flex justify-end">
          <div
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.5 }}
            className="ml-auto max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-xs px-3.5 py-2 bg-[var(--theme-bg-user-message)] text-[var(--theme-bg-user-message-text)] border border-[var(--theme-border-secondary)]/30 shadow-xs transition-all select-none"
          >
            {t('settingsLivePreviewUserSample')}
          </div>
        </div>

        <div className="flex items-start gap-2.5 sm:gap-3 select-none">
          <img
            src="/assets/assistant-avatar.png"
            alt={t('assistantAvatarAlt')}
            className="w-6 h-6 sm:w-7 sm:h-7 object-contain flex-shrink-0 mt-0.5"
          />

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-[var(--theme-text-primary)]">
                {modelDisplayName}
              </span>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--theme-bg-tertiary)]/50 border border-[var(--theme-border-secondary)]/40 text-[11px] text-[var(--theme-text-secondary)] font-medium">
                <span>{interpolate(t('thinkingTookTime'), { duration: '1.2s' })}</span>
                <ChevronDown size={12} className="text-[var(--theme-text-tertiary)]" />
              </div>
            </div>

          {activeTab === 'code' ? (
            <>
              <p
                style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}
                className="text-[var(--theme-text-primary)] transition-all"
              >
                {t('settingsLivePreviewAssistantSample')}
              </p>

              <div className="rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-bg-code-block)] overflow-hidden transition-all shadow-xs">
                <div className="bg-[var(--theme-bg-code-block-header)] px-3 py-1.5 flex items-center justify-between border-b border-[var(--theme-border-primary)] text-[11px] text-[var(--theme-text-secondary)] font-mono">
                  <span>python</span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1 hover:text-[var(--theme-text-primary)] transition-colors"
                  >
                    {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre
                  style={{ fontSize: `${codeFontSize}px`, lineHeight: 1.6 }}
                  className="p-3 font-mono text-[var(--theme-text-code)] overflow-x-auto"
                >
                  <code>
                    <span className="text-purple-400">def </span>
                    <span className="text-blue-400">fibonacci</span>
                    <span className="text-[var(--theme-text-primary)]">(n: int):</span>
                    {'\n'}    a, b = <span className="text-amber-400">0</span>, <span className="text-amber-400">1</span>
                    {'\n'}    <span className="text-purple-400">for </span>_ <span className="text-purple-400">in </span>
                    <span className="text-cyan-400">range</span>(n):
                    {'\n'}        <span className="text-purple-400">yield </span>a
                    {'\n'}        a, b = b, a + b
                  </code>
                </pre>
              </div>
            </>
          ) : (
            <div
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.65 }}
              className="space-y-2 text-[var(--theme-text-primary)] transition-all"
            >
              <p>{t('settingsLivePreviewTextSample')}</p>
              <div className="border-l-2 border-[var(--theme-border-focus)] pl-3 text-[var(--theme-text-secondary)] text-[0.95em] italic">
                “Design is not just what it looks like and feels like. Design is how it works.”
              </div>
            </div>
          )}

          {settings.showMessageTokenStats !== false && (
            <div className="flex items-center gap-2 pt-1 text-[10px] text-[var(--theme-text-secondary)]/70 font-mono">
              <span>⚡ 64 tokens</span>
              <span>•</span>
              <span>240ms</span>
              <span>•</span>
              <span>68.2 tok/s</span>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
  );
};

import React, { useMemo, useState } from 'react';
import { Eye, Copy, Check, Code, FileText, ChevronDown } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import type { AppSettings } from '@/types';
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
      className="rounded-2xl border border-[var(--theme-border-secondary)]/70 bg-[var(--theme-bg-secondary)]/30 p-3 sm:p-3.5 space-y-2.5 transition-all overflow-hidden shadow-xs"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Eye size={14} strokeWidth={1.5} className="text-[var(--theme-text-secondary)] shrink-0" />
          <span className="text-xs font-semibold tracking-wide text-[var(--theme-text-primary)]">
            {t('settingsLivePreviewTitle')}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-secondary)]/60 text-[var(--theme-text-tertiary)] font-medium">
            {t('settingsLivePreviewBadge')}
          </span>
        </div>

        <div className="flex items-center p-0.5 bg-[var(--theme-bg-tertiary)]/70 rounded-lg border border-[var(--theme-border-secondary)]/50 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-all flex items-center gap-1 ${
              activeTab === 'code'
                ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-xs'
                : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]'
            }`}
          >
            <Code size={11} />
            <span>{t('settingsLivePreviewTabCode')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-all flex items-center gap-1 ${
              activeTab === 'text'
                ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-xs'
                : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]'
            }`}
          >
            <FileText size={11} />
            <span>{t('settingsLivePreviewTabText')}</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--theme-border-secondary)]/80 bg-[var(--theme-bg-primary)] p-3 sm:p-3.5 space-y-2.5 transition-all shadow-sm">
        <div className="flex justify-end">
          <div
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.4 }}
            className="ml-auto max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-xs px-3 py-1.5 bg-[var(--theme-bg-user-message)] text-[var(--theme-bg-user-message-text)] border border-[var(--theme-border-secondary)]/20 shadow-xs transition-all select-none"
          >
            {t('settingsLivePreviewUserSample')}
          </div>
        </div>

        <div className="flex items-start gap-2.5 select-none">
          <img
            src="/assets/assistant-avatar.png"
            alt={t('assistantAvatarAlt')}
            className="w-5 h-5 sm:w-6 sm:h-6 object-contain flex-shrink-0 mt-0.5 rounded-md"
          />

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-[var(--theme-text-primary)]">{modelDisplayName}</span>
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--theme-bg-tertiary)]/60 border border-[var(--theme-border-secondary)]/40 text-[10px] text-[var(--theme-text-tertiary)] font-medium">
                <span>{interpolate(t('thinkingTookTime'), { duration: '1.2s' })}</span>
                <ChevronDown size={11} className="text-[var(--theme-text-tertiary)]" />
              </div>
            </div>

            {activeTab === 'code' ? (
              <>
                <p
                  style={{ fontSize: `${fontSize}px`, lineHeight: 1.5 }}
                  className="text-[var(--theme-text-primary)] transition-all"
                >
                  {t('settingsLivePreviewAssistantSample')}
                </p>

                <div className="rounded-lg border border-[var(--theme-border-primary)] bg-[var(--theme-bg-code-block)] overflow-hidden transition-all shadow-xs">
                  <div className="bg-[var(--theme-bg-code-block-header)] px-2.5 py-1 flex items-center justify-between border-b border-[var(--theme-border-primary)] text-[10px] text-[var(--theme-text-tertiary)] font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-400/80 inline-block" />
                      <span className="w-2 h-2 rounded-full bg-amber-400/80 inline-block" />
                      <span className="w-2 h-2 rounded-full bg-emerald-400/80 inline-block" />
                      <span className="ml-1 font-medium text-[var(--theme-text-secondary)]">python</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex items-center gap-1 hover:text-[var(--theme-text-primary)] transition-colors px-1 py-0.5 rounded"
                    >
                      {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre
                    style={{ fontSize: `${codeFontSize}px`, lineHeight: 1.5 }}
                    className="p-2.5 font-mono text-[var(--theme-text-code)] overflow-x-auto"
                  >
                    <code>
                      <span className="text-purple-600 dark:text-purple-400 font-medium">def </span>
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">fibonacci</span>
                      <span className="text-[var(--theme-text-primary)]">(n: int):</span>
                      {'\n'} a, b = <span className="text-amber-600 dark:text-amber-400">0</span>,{' '}
                      <span className="text-amber-600 dark:text-amber-400">1</span>
                      {'\n'} <span className="text-purple-600 dark:text-purple-400 font-medium">for </span>_{' '}
                      <span className="text-purple-600 dark:text-purple-400 font-medium">in </span>
                      <span className="text-cyan-600 dark:text-cyan-400">range</span>(n):{' '}
                      <span className="text-purple-600 dark:text-purple-400 font-medium">yield </span>a; a, b = b, a + b
                    </code>
                  </pre>
                </div>
              </>
            ) : (
              <div
                style={{ fontSize: `${fontSize}px`, lineHeight: 1.5 }}
                className="space-y-2 text-[var(--theme-text-primary)] transition-all"
              >
                <p>{t('settingsLivePreviewTextSample')}</p>
                <div className="border-l-2 border-[var(--theme-border-focus)] pl-2.5 py-0.5 text-[var(--theme-text-secondary)] text-[0.9em] italic bg-[var(--theme-bg-tertiary)]/20 rounded-r">
                  “Design is not just what it looks like and feels like. Design is how it works.”
                </div>
              </div>
            )}

            {settings.showMessageTokenStats !== false && (
              <div className="flex items-center gap-1.5 pt-0.5 text-[10px] text-[var(--theme-text-tertiary)] font-mono">
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

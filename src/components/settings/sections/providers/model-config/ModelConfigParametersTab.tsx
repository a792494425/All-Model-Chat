import React from 'react';
import { Sparkles } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { SETTINGS_INPUT_CLASS } from '@/constants/formClasses';
import type { ThinkingLevel } from '@/types';

export interface ModelConfigParametersTabProps {
  temperature: number | undefined;
  setTemperature: (val: number | undefined) => void;
  topP: number | undefined;
  setTopP: (val: number | undefined) => void;
  maxOutputTokens: number | undefined;
  setMaxOutputTokens: (val: number | undefined) => void;
  topK: number | undefined;
  setTopK: (val: number | undefined) => void;
  presencePenalty: number | undefined;
  setPresencePenalty: (val: number | undefined) => void;
  frequencyPenalty: number | undefined;
  setFrequencyPenalty: (val: number | undefined) => void;
  stopSequencesStr: string;
  setStopSequencesStr: (val: string) => void;
  seed: number | undefined;
  setSeed: (val: number | undefined) => void;
  reasoningEffort: 'none' | 'low' | 'medium' | 'high' | undefined;
  setReasoningEffort: (val: 'none' | 'low' | 'medium' | 'high' | undefined) => void;
  thinkingBudget: number | undefined;
  setThinkingBudget: (val: number | undefined) => void;
  thinkingLevel?: ThinkingLevel;
  setThinkingLevel?: (val: ThinkingLevel | undefined) => void;
  isOpenAI: boolean;
  isGemini?: boolean;
  isGemini3?: boolean;
}

export const ModelConfigParametersTab: React.FC<ModelConfigParametersTabProps> = ({
  temperature,
  setTemperature,
  topP,
  setTopP,
  maxOutputTokens,
  setMaxOutputTokens,
  topK,
  setTopK,
  presencePenalty,
  setPresencePenalty,
  frequencyPenalty,
  setFrequencyPenalty,
  stopSequencesStr,
  setStopSequencesStr,
  seed,
  setSeed,
  reasoningEffort,
  setReasoningEffort,
  thinkingBudget,
  setThinkingBudget,
  thinkingLevel,
  setThinkingLevel,
  isOpenAI,
  isGemini = false,
  isGemini3 = false,
}) => {
  const { t } = useI18n();

  return (
    <div className="space-y-4 text-xs">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="font-medium text-[var(--theme-text-primary)]">{t('settingsTemperature')}</label>
          <span className="font-mono text-[var(--theme-text-secondary)]">
            {temperature !== undefined ? temperature.toFixed(2) : t('settingsDefault')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={temperature ?? 1}
            onChange={(event) => setTemperature(parseFloat(event.target.value))}
            className="flex-1 accent-[var(--theme-border-focus)] cursor-pointer"
          />
          <input
            type="number"
            min="0"
            max="2"
            step="0.05"
            placeholder={t('settingsDefault')}
            value={temperature ?? ''}
            onChange={(event) => {
              const parsedTemperature = event.target.value === '' ? undefined : parseFloat(event.target.value);
              setTemperature(parsedTemperature);
            }}
            className={`w-20 p-1.5 font-mono rounded border ${SETTINGS_INPUT_CLASS}`}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="font-medium text-[var(--theme-text-primary)]">{t('settingsTopP')}</label>
          <span className="font-mono text-[var(--theme-text-secondary)]">
            {topP !== undefined ? topP.toFixed(2) : t('settingsDefault')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={topP ?? 0.95}
            onChange={(event) => setTopP(parseFloat(event.target.value))}
            className="flex-1 accent-[var(--theme-border-focus)] cursor-pointer"
          />
          <input
            type="number"
            min="0"
            max="1"
            step="0.05"
            placeholder={t('settingsDefault')}
            value={topP ?? ''}
            onChange={(event) => {
              const parsedTopP = event.target.value === '' ? undefined : parseFloat(event.target.value);
              setTopP(parsedTopP);
            }}
            className={`w-20 p-1.5 font-mono rounded border ${SETTINGS_INPUT_CLASS}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-medium text-[var(--theme-text-primary)]">{t('settingsMaxOutputTokens')}</label>
          </div>
          <input
            type="number"
            min="1"
            max="131072"
            step="256"
            placeholder={t('settingsMaxOutputTokensPlaceholder')}
            value={maxOutputTokens ?? ''}
            onChange={(event) => {
              const parsedTokens = event.target.value === '' ? undefined : parseInt(event.target.value, 10);
              setMaxOutputTokens(parsedTokens);
            }}
            className={`w-full p-2 font-mono rounded-xl border ${SETTINGS_INPUT_CLASS}`}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-medium text-[var(--theme-text-primary)]">{t('settingsTopK')}</label>
          </div>
          <input
            type="number"
            min="0"
            max="128"
            step="1"
            placeholder={t('settingsDefault')}
            value={topK ?? ''}
            onChange={(event) => {
              const parsedTopK = event.target.value === '' ? undefined : parseInt(event.target.value, 10);
              setTopK(parsedTopK);
            }}
            className={`w-full p-2 font-mono rounded-xl border ${SETTINGS_INPUT_CLASS}`}
          />
        </div>
      </div>

      <div className="p-3 rounded-xl border border-[var(--theme-border-secondary)]/40 bg-[var(--theme-bg-secondary)]/20 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-[var(--theme-text-primary)]">
            <Sparkles size={14} className="text-amber-500" />
            <span>
              {isOpenAI
                ? t('settingsModelConfigReasoningEffort') || 'Reasoning Effort'
                : isGemini3
                  ? t('settingsModelConfigThinkingLevel') || 'Thinking Level'
                  : t('settingsModelConfigThinkingBudget') || 'Thinking Budget Tokens'}
            </span>
          </div>
          <span className="text-[11px] font-mono text-[var(--theme-text-secondary)]">
            {isOpenAI
              ? (reasoningEffort ?? t('settingsModelConfigEffortDefault') ?? 'Default')
              : isGemini3
                ? (thinkingLevel ?? t('settingsDefault') ?? 'Default')
                : thinkingBudget
                  ? `${thinkingBudget} tokens`
                  : t('settingsDefault')}
          </span>
        </div>

        {isOpenAI ? (
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: undefined, label: t('settingsModelConfigEffortDefault') || 'Default' },
              { id: 'low' as const, label: t('settingsModelConfigEffortLow') || 'Low' },
              { id: 'medium' as const, label: t('settingsModelConfigEffortMedium') || 'Medium' },
              { id: 'high' as const, label: t('settingsModelConfigEffortHigh') || 'High' },
            ].map((item) => {
              const isSelected = reasoningEffort === item.id;
              return (
                <button
                  key={String(item.id)}
                  type="button"
                  onClick={() => setReasoningEffort(item.id)}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer text-center ${
                    isSelected
                      ? 'bg-[var(--theme-border-focus)] text-white border-transparent'
                      : 'border-[var(--theme-border-secondary)]/50 bg-[var(--theme-bg-secondary)]/40 hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        ) : isGemini3 ? (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {[
              { id: undefined, label: t('settingsDefault') || 'Default' },
              { id: 'NONE' as const, label: t('thinkingLevelNone') || 'Off' },
              { id: 'MINIMAL' as const, label: t('thinkingLevelMinimal') || 'Minimal' },
              { id: 'LOW' as const, label: t('thinkingLevelLow') || 'Low' },
              { id: 'MEDIUM' as const, label: t('thinkingLevelMedium') || 'Medium' },
              { id: 'HIGH' as const, label: t('thinkingLevelHigh') || 'High' },
            ].map((item) => {
              const isSelected = thinkingLevel === item.id;
              return (
                <button
                  key={String(item.id)}
                  type="button"
                  onClick={() => setThinkingLevel?.(item.id)}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer text-center ${
                    isSelected
                      ? 'bg-[var(--theme-border-focus)] text-white border-transparent'
                      : 'border-[var(--theme-border-secondary)]/50 bg-[var(--theme-bg-secondary)]/40 hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="65536"
              step="1024"
              value={thinkingBudget ?? 0}
              onChange={(event) => {
                const parsedBudget = parseInt(event.target.value, 10);
                setThinkingBudget(parsedBudget > 0 ? parsedBudget : undefined);
              }}
              className="flex-1 accent-amber-500 cursor-pointer"
            />
            <input
              type="number"
              min="0"
              max="65536"
              step="1024"
              placeholder="0 (Off/Default)"
              value={thinkingBudget ?? ''}
              onChange={(event) => {
                const parsedBudget = event.target.value === '' ? undefined : parseInt(event.target.value, 10);
                setThinkingBudget(parsedBudget);
              }}
              className={`w-28 p-1.5 font-mono rounded border ${SETTINGS_INPUT_CLASS}`}
            />
          </div>
        )}
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${isGemini ? 'opacity-50' : ''}`}>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-medium text-[var(--theme-text-primary)] flex items-center gap-1.5">
              <span>{t('settingsPresencePenalty')}</span>
              {isGemini && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--theme-bg-secondary)] text-[var(--theme-text-secondary)]">
                  {t('settingsGeminiUnsupportedPenalty') || 'Gemini 协议不支持'}
                </span>
              )}
            </label>
            <span className="font-mono text-[var(--theme-text-secondary)]">
              {isGemini ? '-' : presencePenalty !== undefined ? presencePenalty.toFixed(2) : t('settingsDefault')}
            </span>
          </div>
          <input
            type="range"
            min="-2"
            max="2"
            step="0.1"
            disabled={isGemini}
            value={presencePenalty ?? 0}
            onChange={(event) => setPresencePenalty(parseFloat(event.target.value))}
            className="w-full accent-[var(--theme-border-focus)] cursor-pointer disabled:cursor-not-allowed"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-medium text-[var(--theme-text-primary)] flex items-center gap-1.5">
              <span>{t('settingsFrequencyPenalty')}</span>
              {isGemini && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--theme-bg-secondary)] text-[var(--theme-text-secondary)]">
                  {t('settingsGeminiUnsupportedPenalty') || 'Gemini 协议不支持'}
                </span>
              )}
            </label>
            <span className="font-mono text-[var(--theme-text-secondary)]">
              {isGemini ? '-' : frequencyPenalty !== undefined ? frequencyPenalty.toFixed(2) : t('settingsDefault')}
            </span>
          </div>
          <input
            type="range"
            min="-2"
            max="2"
            step="0.1"
            disabled={isGemini}
            value={frequencyPenalty ?? 0}
            onChange={(event) => setFrequencyPenalty(parseFloat(event.target.value))}
            className="w-full accent-[var(--theme-border-focus)] cursor-pointer disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="font-medium text-[var(--theme-text-primary)]">{t('settingsStopSequences')}</label>
          <input
            type="text"
            value={stopSequencesStr}
            onChange={(event) => setStopSequencesStr(event.target.value)}
            placeholder={t('settingsStopSequencesPlaceholder')}
            className={`w-full p-2 font-mono rounded-xl border ${SETTINGS_INPUT_CLASS}`}
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-medium text-[var(--theme-text-primary)]">{t('settingsSeed')}</label>
          <input
            type="number"
            value={seed ?? ''}
            placeholder="e.g. 42"
            onChange={(event) => {
              const parsedSeed = event.target.value === '' ? undefined : parseInt(event.target.value, 10);
              setSeed(parsedSeed);
            }}
            className={`w-full p-2 font-mono rounded-xl border ${SETTINGS_INPUT_CLASS}`}
          />
        </div>
      </div>
    </div>
  );
};

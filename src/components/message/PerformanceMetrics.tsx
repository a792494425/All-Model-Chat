import React, { useState, useEffect, useRef } from 'react';
import { Zap } from 'lucide-react';
import { type ChatMessage } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { TokenDetailsCard } from './TokenDetailsCard';
import { buildMessageTokenStatsView, buildTokenStatsCopyText, formatCompactTokens } from './tokenStats';

interface PerformanceMetricsProps {
  message: ChatMessage;
  hideTimer?: boolean;
}

const MIN_GENERATION_DURATION_SECONDS = 0.2;
const LIVE_TIMER_REFRESH_MS = 100;
const COPY_FEEDBACK_MS = 1500;

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ message, hideTimer }) => {
  const { t } = useI18n();
  const { generationStartTime, generationEndTime, firstTokenTimeMs, isLoading } = message;
  const view = buildMessageTokenStatsView(message);

  const [liveElapsedTime, setLiveElapsedTime] = useState<number>(() => {
    if (!generationStartTime) return 0;
    return (Date.now() - new Date(generationStartTime).getTime()) / 1000;
  });
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!generationStartTime || !isLoading) return;
    const startTime = new Date(generationStartTime).getTime();
    const updateTimer = () => setLiveElapsedTime((Date.now() - startTime) / 1000);
    const intervalId = setInterval(updateTimer, LIVE_TIMER_REFRESH_MS);
    return () => clearInterval(intervalId);
  }, [generationStartTime, isLoading]);

  useEffect(() => () => window.clearTimeout(copyTimerRef.current), []);

  const elapsedTime = (() => {
    if (!generationStartTime) return 0;
    if (generationEndTime && !isLoading) {
      const startTime = new Date(generationStartTime).getTime();
      const endTime = new Date(generationEndTime).getTime();
      // 防时钟偏移导致负耗时（否则 t/s 虚高）。
      return Math.max(0, (endTime - startTime) / 1000);
    }
    return Math.max(0, liveElapsedTime);
  })();

  const generatedTokens = view.completionTokens + view.thoughtTokens;
  const ttftSeconds = firstTokenTimeMs !== undefined ? firstTokenTimeMs / 1000 : undefined;

  // 模型真实生成速度（扣掉首字延迟）：常态行口径，对标 Cherry 的 model TPS。
  let modelDuration = elapsedTime;
  if (ttftSeconds !== undefined) {
    modelDuration = Math.max(0, elapsedTime - ttftSeconds);
  }
  if (modelDuration < MIN_GENERATION_DURATION_SECONDS) {
    modelDuration = Math.max(MIN_GENERATION_DURATION_SECONDS, elapsedTime);
  }
  const modelTps = generatedTokens > 0 && modelDuration > 0 ? generatedTokens / modelDuration : 0;

  // 端到端速度（含工具调用与等待）：详情卡口径，用于归因“模型慢还是工具慢”。
  const endToEndTps = generatedTokens > 0 && elapsedTime > 0 ? generatedTokens / elapsedTime : 0;

  // P0 修 bug：只有分项真正 > 0 才显示。区分 undefined（无数据）与 0，
  // 无 usage 的消息不再误显示 "U: 0 O: 0"。
  const showTokens = view.hasAnyTokens;
  const showTimer = Boolean((isLoading && !hideTimer) || (generationStartTime && generationEndTime));

  if (!showTokens && !showTimer) return null;

  const totalLabel = formatCompactTokens(view.totalTokens);

  const handleCopy = () => {
    const text = buildTokenStatsCopyText(view, {
      modelTps: modelTps > 0 ? modelTps : undefined,
      endToEndTps: endToEndTps > 0 ? endToEndTps : undefined,
      elapsedSeconds: showTimer ? elapsedTime : undefined,
    });
    try {
      void navigator.clipboard?.writeText(text)?.then?.(
        () => {
          setCopied(true);
          window.clearTimeout(copyTimerRef.current);
          copyTimerRef.current = window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
        },
        () => undefined,
      );
    } catch {
      // 剪贴板不可用（如非安全上下文）时静默忽略，hover 明细仍可手动复制。
    }
  };

  // Token hover 卡片：意图延迟 200ms（对标 Cherry openDelay），划过不误弹；
  // 外层用 pb-2 而不用 mb-2（padding 属于 hover 区，鼠标从按钮移向卡片经过间隙时不会闪烁关闭）；
  // 键盘聚焦则 instant 显示，无需等待。
  return (
    <div className="mt-2 flex justify-end items-center flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--theme-text-primary)] font-mono">
      {showTokens && (
        <div className="group/tokens relative">
          <button
            type="button"
            onClick={handleCopy}
            aria-label={`${t('metricsTokenUsage')}: ${totalLabel}${modelTps > 0 ? `, ${modelTps.toFixed(1)} t/s` : ''}`}
            title={t('metricsTokenBreakdown')}
            className="flex items-center gap-1.5 bg-[var(--theme-bg-tertiary)]/30 px-2 py-0.5 rounded-md border border-[var(--theme-border-secondary)]/30 cursor-pointer select-none tabular-nums transition-colors hover:border-[var(--theme-border-focus)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-border-focus)]"
          >
            <span>{totalLabel}</span>
            {modelTps > 0 && (
              <>
                <span className="opacity-40" aria-hidden="true">
                  ·
                </span>
                <span className="flex items-center gap-1">
                  <Zap size={11} className="text-amber-400 fill-amber-400/20" strokeWidth={2} aria-hidden="true" />
                  {modelTps.toFixed(1)} t/s
                </span>
              </>
            )}
            {copied && <span className="text-[var(--theme-text-link)]">✓ {t('metricsCopied')}</span>}
          </button>

          <div className="absolute bottom-full right-0 z-20 pb-2 invisible opacity-0 translate-y-1 transition-all duration-150 pointer-events-none group-hover/tokens:visible group-hover/tokens:opacity-100 group-hover/tokens:translate-y-0 group-hover/tokens:delay-200 group-hover/tokens:pointer-events-auto group-focus-within/tokens:visible group-focus-within/tokens:opacity-100 group-focus-within/tokens:translate-y-0 group-focus-within/tokens:pointer-events-auto">
            <div className="rounded-xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] shadow-xl">
              <TokenDetailsCard
                message={message}
                modelTps={modelTps > 0 ? modelTps : undefined}
                endToEndTps={endToEndTps > 0 ? endToEndTps : undefined}
                elapsedSeconds={showTimer ? elapsedTime : undefined}
                ttftSeconds={ttftSeconds}
              />
            </div>
          </div>
        </div>
      )}

      {showTimer && (
        <div className="tabular-nums select-none" title={t('metricsTotalDuration')}>
          {elapsedTime.toFixed(1)}s
        </div>
      )}
    </div>
  );
};

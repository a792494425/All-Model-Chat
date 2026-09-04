import React, { useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { type ChatMessage } from '@/types';
import { buildMessageTokenStatsView, formatExactTokens } from './tokenStats';

interface MetricSegment {
  id: string;
  label: string;
  fullName: string;
  value: number;
  colorClassName: string;
}

const MetricBar: React.FC<{
  title: string;
  summary: string;
  summaryTitle: string;
  segments: MetricSegment[];
  locale: string;
}> = ({ title, summary, summaryTitle, segments, locale }) => {
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const visible = segments.filter((s) => s.value > 0);
  const total = visible.reduce((sum, s) => sum + s.value, 0);
  const active = visible.find((s) => s.id === activeId);
  if (total <= 0) return null;

  const pct = (v: number) => `${((v / total) * 100).toFixed(1)}%`;

  return (
    <section>
      <div className="flex h-5 min-w-0 items-center justify-between gap-3 text-xs leading-5">
        {active ? (
          <>
            <span className="truncate font-medium text-[var(--theme-text-primary)]" title={active.fullName}>
              {active.label}
            </span>
            <span className="shrink-0 text-[var(--theme-text-secondary)] tabular-nums">
              {formatExactTokens(active.value, locale)} · {pct(active.value)}
            </span>
          </>
        ) : (
          <>
            <span className="truncate text-[var(--theme-text-secondary)]">{title}</span>
            <span className="shrink-0 text-[var(--theme-text-primary)] tabular-nums" title={summaryTitle}>
              {summary}
            </span>
          </>
        )}
      </div>

      <div className="flex h-8 w-full items-stretch" onPointerLeave={() => setActiveId(undefined)}>
        {visible.map((segment, index) => {
          const isActive = activeId === segment.id;
          const isDimmed = activeId !== undefined && !isActive;
          return (
            <div
              key={segment.id}
              className="relative h-8 min-w-px flex-1"
              style={{ flexGrow: segment.value }}
              onPointerEnter={() => setActiveId(segment.id)}
              title={`${segment.fullName}: ${formatExactTokens(segment.value, locale)} (${pct(segment.value)})`}
            >
              <span
                className={`absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 transition-opacity duration-150 ${index === 0 ? 'rounded-l-full' : ''} ${index === visible.length - 1 ? 'rounded-r-full' : ''} ${segment.colorClassName} ${isDimmed ? 'opacity-35' : ''}`}
              />
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {visible.map((segment) => (
          <div
            key={segment.id}
            className="inline-flex items-center gap-1.5 text-[11px] leading-4 text-[var(--theme-text-tertiary)]"
            title={segment.fullName}
          >
            <span className={`size-1.5 rounded-full ${segment.colorClassName}`} aria-hidden="true" />
            <span>
              {segment.label} {formatExactTokens(segment.value, locale)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

interface TokenDetailsCardProps {
  message: ChatMessage;
  modelTps?: number;
  endToEndTps?: number;
  elapsedSeconds?: number;
  ttftSeconds?: number;
}

/** Hover 详情卡：三段条 + 缓存拆分 + 双 TPS + TTFT + 会话水位。Cherry Studio 同款信息结构。 */
export const TokenDetailsCard: React.FC<TokenDetailsCardProps> = ({
  message,
  modelTps,
  endToEndTps,
  elapsedSeconds,
  ttftSeconds,
}) => {
  const { t, language } = useI18n();
  const view = buildMessageTokenStatsView(message);
  const exact = (v: number) => formatExactTokens(v, language);

  return (
    <div className="w-72 space-y-2 p-3 text-left select-text" role="dialog" aria-label={t('metricsTokenUsage')}>
      <MetricBar
        title={t('metricsTokenUsage')}
        summary={t('metricsTotalTokens') + `: ${exact(view.totalTokens)}`}
        summaryTitle={t('metricsTotalTokens')}
        locale={language}
        segments={[
          {
            id: 'input',
            label: `U ${exact(view.uncachedInputTokens)}`,
            fullName: `Input uncached (P = U + C, P = ${exact(view.promptTokens)})`,
            value: view.uncachedInputTokens,
            colorClassName: 'bg-blue-500',
          },
          {
            id: 'tool',
            label: `T ${exact(view.toolUsePromptTokens)}`,
            fullName: 'Tool-use prompt tokens',
            value: view.toolUsePromptTokens,
            colorClassName: 'bg-amber-500',
          },
          {
            id: 'output',
            label: `O ${exact(view.completionTokens)}`,
            fullName: 'Completion (output) tokens',
            value: view.completionTokens,
            colorClassName: 'bg-violet-500',
          },
          {
            id: 'reasoning',
            label: `R ${exact(view.thoughtTokens)}`,
            fullName: 'Reasoning (thought) tokens',
            value: view.thoughtTokens,
            colorClassName: 'bg-fuchsia-500',
          },
        ]}
      />

      <MetricBar
        title={t('metricsTokenBreakdown')}
        summary={`P ${exact(view.promptTokens)}`}
        summaryTitle="P = U + C"
        locale={language}
        segments={[
          {
            id: 'uncached',
            label: `U ${exact(view.uncachedInputTokens)}`,
            fullName: 'Uncached input tokens',
            value: view.uncachedInputTokens,
            colorClassName: 'bg-neutral-400',
          },
          {
            id: 'cache',
            label: `C ${exact(view.cachedPromptTokens)}`,
            fullName: 'Cache-read prompt tokens',
            value: view.cachedPromptTokens,
            colorClassName: 'bg-teal-500',
          },
        ]}
      />

      <div className="space-y-1 border-t border-[var(--theme-border-secondary)]/40 pt-2 text-xs leading-5">
        {ttftSeconds !== undefined && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[var(--theme-text-secondary)]">{t('metricsTtft')}</span>
            <span className="text-[var(--theme-text-primary)] tabular-nums">{ttftSeconds.toFixed(2)}s</span>
          </div>
        )}
        {modelTps !== undefined && (
          <div className="flex items-center justify-between gap-3" title={t('metricsModelThroughput')}>
            <span className="text-[var(--theme-text-secondary)]">{t('metricsGenerationSpeed')}</span>
            <span className="text-[var(--theme-text-primary)] tabular-nums">{modelTps.toFixed(1)} t/s</span>
          </div>
        )}
        {endToEndTps !== undefined && (
          <div className="flex items-center justify-between gap-3" title={t('metricsEndToEndThroughput')}>
            <span className="text-[var(--theme-text-secondary)]">{t('metricsEndToEndThroughput')}</span>
            <span className="text-[var(--theme-text-primary)] tabular-nums">{endToEndTps.toFixed(1)} t/s</span>
          </div>
        )}
        {elapsedSeconds !== undefined && (
          <div className="flex items-center justify-between gap-3" title={t('metricsTotalDuration')}>
            <span className="text-[var(--theme-text-secondary)]">{t('metricsTotalDuration')}</span>
            <span className="text-[var(--theme-text-primary)] tabular-nums">{elapsedSeconds.toFixed(1)}s</span>
          </div>
        )}
        {view.cumulativeTotalTokens !== undefined && (
          <div className="flex items-center justify-between gap-3" title={t('metricsCumulativeTokens')}>
            <span className="text-[var(--theme-text-secondary)]">{t('metricsCumulativeTokens')}</span>
            <span className="text-[var(--theme-text-primary)] tabular-nums">{exact(view.cumulativeTotalTokens)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

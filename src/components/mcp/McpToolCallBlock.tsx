import React, { useEffect, useState } from 'react';
import { AlertTriangle, Ban, Check, Copy, Hourglass, Loader2, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { extractMcpResultSegments } from '@/features/mcp/mcpResultSummary';
import { resolveToolDisplay } from '@/features/mcp/toolDisplayNames';
import { useMcpApprovalStore } from '@/stores/mcpApprovalStore';

const MAX_ARG_VALUE_LENGTH = 4000;

export type McpToolCallStatus = 'invoking' | 'success' | 'error' | 'cancelled';

const formatElapsed = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  return `${Math.floor(totalSeconds / 60)}m${String(totalSeconds % 60).padStart(2, '0')}s`;
};

export const McpToolCallBlock: React.FC<{
  call: any;
  responsePart: any;
  status: McpToolCallStatus;
  autoApproved?: boolean;
}> = ({ call, responsePart, status, autoApproved }) => {
  const { t } = useI18n();
  // Follow the call lifecycle until the user takes over: running calls stay
  // expanded, finished ones collapse so tool output never floods the transcript.
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const expanded = manualExpanded ?? status === 'invoking';
  const [copied, setCopied] = useState(false);

  // Live elapsed time while running; freezes at the last tick once settled.
  const [liveMs, setLiveMs] = useState<number | null>(null);
  useEffect(() => {
    if (status !== 'invoking') return;
    const startedAt = Date.now();
    setLiveMs(0);
    const id = window.setInterval(() => setLiveMs(Date.now() - startedAt), 1000);
    return () => window.clearInterval(id);
  }, [status]);

  // Discovery responses are replayed into readable titles; unmatched names
  // (e.g. before the first discovery) fall back to the wire name.
  const display = resolveToolDisplay(String(call?.name ?? ''));
  const pendingApproval = useMcpApprovalStore((state) => state.pending);
  const awaitingApproval =
    status === 'invoking' &&
    !!pendingApproval &&
    !!display &&
    pendingApproval.request.serverId === display.serverId &&
    pendingApproval.request.toolName === display.toolName;

  const argsStr = JSON.stringify(call.args, null, 2);
  const truncated = argsStr.length > MAX_ARG_VALUE_LENGTH ? argsStr.slice(0, MAX_ARG_VALUE_LENGTH) + '…' : argsStr;
  const responseSegments = extractMcpResultSegments(responsePart?.functionResponse?.response);

  const statusLabel = awaitingApproval
    ? t('mcpToolStatusAwaitingApproval')
    : status === 'invoking'
      ? t('mcpToolStatusRunning')
      : status === 'success'
        ? t('mcpToolStatusDone')
        : status === 'error'
          ? t('mcpToolStatusError')
          : t('mcpToolStatusCancelled');

  return (
    <div className="rounded-lg border bg-[var(--theme-bg-secondary)] my-2">
      <button
        onClick={() => setManualExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm"
      >
        <span className="font-mono text-xs truncate">
          {display ? `${display.serverName} : ${display.toolName}` : call.name}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {autoApproved && <ShieldCheck data-testid="mcp-shield" className="h-3.5 w-3.5 text-emerald-600" />}
          <span
            data-testid="mcp-tool-status"
            className={`flex items-center gap-1.5 text-[11px] ${
              status === 'error' ? 'text-[var(--theme-text-danger)]' : 'text-[var(--theme-text-secondary)]'
            }`}
          >
            {awaitingApproval && <Hourglass className="h-3 w-3 animate-pulse text-amber-500" />}
            {statusLabel}
            {liveMs !== null && !awaitingApproval && <span className="tabular-nums">{formatElapsed(liveMs)}</span>}
          </span>
          {status === 'invoking' ? (
            awaitingApproval ? null : (
              <Loader2 className="h-4 w-4 animate-spin" />
            )
          ) : status === 'success' ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : status === 'cancelled' ? (
            <Ban data-testid="mcp-tool-cancelled" className="h-4 w-4 text-[var(--theme-text-tertiary)]" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          )}
        </span>
      </button>
      {expanded && (
        <div className="border-t px-3 py-2 text-xs">
          <pre className="overflow-auto max-h-[300px] whitespace-pre-wrap">{truncated}</pre>
          {argsStr.length > MAX_ARG_VALUE_LENGTH && (
            <div className="text-[11px] text-muted">{t('mcpToolTruncated')}</div>
          )}
          <div className="mt-2 overflow-auto max-h-[300px]">
            {responseSegments.map((segment, index) =>
              segment.kind === 'image' ? (
                <img
                  key={index}
                  src={segment.src}
                  alt="tool-result-image"
                  className="max-w-full rounded border my-1"
                />
              ) : (
                <pre key={index} className="whitespace-pre-wrap">
                  {segment.text}
                </pre>
              ),
            )}
          </div>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(
                JSON.stringify({ params: call.args, response: responsePart?.functionResponse?.response }, null, 2),
              );
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="mt-2 flex items-center gap-1 text-[11px]"
          >
            <Copy className="h-3 w-3" />
            {copied ? t('mcpToolCopied') : t('mcpToolCopy')}
          </button>
        </div>
      )}
    </div>
  );
};

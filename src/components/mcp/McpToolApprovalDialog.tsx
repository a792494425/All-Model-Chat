import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { useMcpApprovalStore } from '@/stores/mcpApprovalStore';

export const McpToolApprovalDialog: React.FC = () => {
  const { t } = useI18n();
  const pending = useMcpApprovalStore((state) => state.pending);
  const resolveApproval = useMcpApprovalStore((state) => state.resolveApproval);

  if (!pending) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" data-testid="mcp-approval-backdrop">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('mcpApprovalTitle')}
        className="w-full max-w-md rounded-xl border bg-[var(--theme-bg-primary)] shadow-xl"
      >
        <div className="flex items-start gap-3 px-4 pt-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">{t('mcpApprovalTitle')}</h2>
            <p className="mt-1 truncate text-xs text-[var(--theme-text-secondary)]">
              {pending.request.serverName} · <span className="font-mono">{pending.request.toolName}</span>
            </p>
          </div>
        </div>
        <pre className="mx-4 mt-3 max-h-[200px] overflow-auto whitespace-pre-wrap rounded-lg border bg-[var(--theme-bg-secondary)] p-2 text-xs">
          {JSON.stringify(pending.request.args, null, 2)}
        </pre>
        <div className="flex items-center justify-end gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => resolveApproval('deny')}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-[var(--theme-bg-tertiary)]"
          >
            {t('mcpApprovalDeny')}
          </button>
          <button
            type="button"
            onClick={() => resolveApproval('allow-once')}
            className="rounded-lg border border-emerald-600/40 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-600/10 dark:text-emerald-400"
          >
            {t('mcpApprovalAllowOnce')}
          </button>
          <button
            type="button"
            data-testid="mcp-approval-session"
            onClick={() => resolveApproval('allow-session')}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
          >
            {t('mcpApprovalAllowSession')}
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Copy, ShieldCheck, AlertTriangle, Check, Loader2 } from 'lucide-react';

export const MAX_ARG_VALUE_LENGTH = 4000;
export const MAX_ARG_OBJECT_KEYS = 24;
export const MAX_ARG_ARRAY_ITEMS = 24;

export const McpToolCallBlock: React.FC<{ call: any; responsePart: any; status: 'invoking' | 'success' | 'error' }> = ({
  call,
  responsePart,
  status,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const argsStr = JSON.stringify(call.args, null, 2);
  const truncated = argsStr.length > MAX_ARG_VALUE_LENGTH ? argsStr.slice(0, MAX_ARG_VALUE_LENGTH) + '…' : argsStr;
  return (
    <div className="rounded-lg border bg-[var(--theme-bg-secondary)] my-2">
      <button onClick={() => setExpanded((v) => !v)} className="flex w-full items-center justify-between px-3 py-2 text-sm">
        <span className="font-mono text-xs truncate">{call.name}</span>
        <span className="flex items-center gap-2">
          {status === 'invoking' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : status === 'success' ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          )}
        </span>
      </button>
      {expanded && (
        <div className="border-t px-3 py-2 text-xs">
          <pre className="overflow-auto max-h-[300px] whitespace-pre-wrap">{truncated}</pre>
          {argsStr.length > MAX_ARG_VALUE_LENGTH && <div className="text-[11px] text-muted">Truncated</div>}
          <pre className="mt-2 overflow-auto max-h-[300px]">
            {JSON.stringify(responsePart?.functionResponse?.response ?? {}, null, 2).slice(0, 4000)}
          </pre>
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
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
};

void ShieldCheck;

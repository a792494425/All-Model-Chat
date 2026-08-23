import React, { useCallback, useEffect, useState } from 'react';
import { Copy, RefreshCw } from 'lucide-react';
import { fetchMcpLogs, type McpLogEntry } from '@/services/api/mcpApi';
import type { McpServerConfig } from '@/types';

interface McpLogsTabProps {
  server: McpServerConfig;
  t: (key: string) => string;
}

export const McpLogsTab: React.FC<McpLogsTabProps> = ({ server }) => {
  const [logs, setLogs] = useState<McpLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchMcpLogs(server);
      setLogs(result.logs);
    } catch {
      // keep previous logs on error
    } finally {
      setLoading(false);
    }
  }, [server]);

  useEffect(() => {
    void load();
    const intervalId = window.setInterval(() => {
      if (!document.hidden) {
        void load();
      }
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, [load]);

  const handleCopy = useCallback(() => {
    const text = logs.map((entry) => `[${entry.level}] ${entry.message}`).join('\n');
    void navigator.clipboard.writeText(text);
  }, [logs]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
          <RefreshCw size={12} className={loading ? 'animate-spin' : undefined} />
          Refresh
        </button>
        <button type="button" onClick={handleCopy} className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
          <Copy size={12} />
          Copy
        </button>
      </div>
      <div className="max-h-[200px] overflow-auto font-mono text-xs divide-y rounded border">
        {logs.length === 0 ? (
          <div className="px-2 py-6 text-center text-[var(--theme-text-tertiary)]">No logs</div>
        ) : (
          logs.map((entry, index) => (
            <div key={`${entry.timestamp}-${index}`} className="px-2 py-1">
              <span
                className={`px-1 rounded text-[10px] ${entry.level === 'error' ? 'bg-red-500/10 text-red-600' : entry.level === 'warn' ? 'bg-amber-500/10 text-amber-700' : 'bg-zinc-100 text-zinc-600'}`}
              >
                {entry.level}
              </span>{' '}
              {entry.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

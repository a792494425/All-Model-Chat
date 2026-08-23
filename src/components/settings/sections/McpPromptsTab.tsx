import React from 'react';
import type { McpPromptDefinition } from '@/services/api/mcpApi';

export const McpPromptsTab: React.FC<{
  prompts: McpPromptDefinition[];
  t: (key: string) => string;
}> = ({ prompts, t }) => {
  if (!prompts.length)
    return (
      <div className="p-4 text-sm text-[var(--theme-text-secondary)]">{t('settingsMcpEmptyPrompts')}</div>
    );
  return (
    <div className="divide-y">
      {prompts.map((p) => (
        <div key={p.name} className="px-3 py-2">
          <div className="text-sm font-medium">{p.name}</div>
          <div className="text-xs text-[var(--theme-text-secondary)]">{p.description}</div>
          {p.arguments?.length ? (
            <div className="text-xs font-mono">args: {p.arguments.map((a) => a.name).join(', ')}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
};

import React from 'react';
import type { McpResourceDefinition, McpResourceTemplateDefinition } from '@/services/api/mcpApi';

interface McpResourcesTabProps {
  resources: McpResourceDefinition[];
  templates: McpResourceTemplateDefinition[];
  t: (key: string) => string;
}

export const McpResourcesTab: React.FC<McpResourcesTabProps> = ({ resources, templates, t }) => {
  const all = [...resources, ...templates];
  if (!all.length)
    return (
      <div className="p-4 text-sm text-[var(--theme-text-secondary)]">{t('settingsMcpEmptyResources')}</div>
    );
  return (
    <div className="divide-y">
      {all.map((r, index) => {
        const key = (r as { uri?: string; uriTemplate?: string; name: string }).uri
          ?? (r as { uriTemplate?: string }).uriTemplate
          ?? `${r.name}-${index}`;
        return (
          <div key={key} className="px-3 py-2">
            <div className="text-sm font-mono truncate">{(r as { uri?: string; uriTemplate?: string }).uri ?? (r as { uriTemplate?: string }).uriTemplate ?? r.name}</div>
            <div className="text-xs">
              {r.name} {r.mimeType}
            </div>
          </div>
        );
      })}
    </div>
  );
};

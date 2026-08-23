import React from 'react';

export const McpResourcesTab: React.FC<{ resources: any[]; templates: any[]; t: any }> = ({
  resources,
  templates,
  t,
}) => {
  const all = [...resources, ...templates];
  if (!all.length)
    return (
      <div className="p-4 text-sm text-[var(--theme-text-secondary)]">{t('settingsMcpEmptyResources')}</div>
    );
  return (
    <div className="divide-y">
      {all.map((r) => (
        <div key={r.uri || r.uriTemplate || r.name} className="px-3 py-2">
          <div className="text-sm font-mono truncate">{r.uri || r.uriTemplate || r.name}</div>
          <div className="text-xs">
            {r.name} {r.mimeType}
          </div>
        </div>
      ))}
    </div>
  );
};

import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { Select } from '@/components/shared/Select';
import { SETTINGS_INPUT_CLASS } from '@/constants/formClasses';
import { MCP_INPUT_BASE_CLASSES, type ServerFilter } from './mcpSectionShared';

interface McpFilterSearchBarProps {
  filter: ServerFilter;
  onFilterChange: (filter: ServerFilter) => void;
  search: string;
  onSearchChange: (search: string) => void;
}

export const McpFilterSearchBar: React.FC<McpFilterSearchBarProps> = ({
  filter,
  onFilterChange,
  search,
  onSearchChange,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex gap-2">
      <Select
        id="mcp-filter-select"
        label={t('settingsMcpFilterAria')}
        hideLabel
        value={filter}
        onChange={(event) => onFilterChange(event.target.value as ServerFilter)}
        wrapperClassName="w-36 shrink-0 sm:w-40"
      >
        <option value="all">{t('settingsMcpFilterAll')}</option>
        <option value="enabled">{t('settingsMcpFilterEnabled')}</option>
        <option value="disabled">{t('settingsMcpFilterDisabled')}</option>
        <option value="http">{t('settingsMcpFilterHttp')}</option>
        <option value="sse">{t('settingsMcpFilterSse')}</option>
        <option value="stdio">{t('settingsMcpFilterStdio')}</option>
      </Select>
      <input
        placeholder={t('settingsMcpSearchPlaceholder')}
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        className={`${MCP_INPUT_BASE_CLASSES} ${SETTINGS_INPUT_CLASS}`}
      />
    </div>
  );
};

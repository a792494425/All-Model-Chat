import React from 'react';
import { ChevronDown, ChevronUp, Store } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { SETTINGS_OUTLINE_BUTTON_CLASS, SETTINGS_SECONDARY_ACTION_BUTTON_CLASS } from '@/constants/buttonClasses';
import { SETTINGS_SECTION_CARD_CLASS } from '@/constants/designTokens';
import { SETTINGS_INPUT_CLASS } from '@/constants/formClasses';
import { MCP_INPUT_BASE_CLASSES } from './mcpSectionShared';
import { McpMarketplaceGrid } from './McpMarketplaceGrid';

interface McpImportAndMarketplaceBarProps {
  showImport: boolean;
  setShowImport: React.Dispatch<React.SetStateAction<boolean>>;
  showMarketplaces: boolean;
  setShowMarketplaces: React.Dispatch<React.SetStateAction<boolean>>;
  importJson: string;
  setImportJson: (value: string) => void;
  importError: string | null;
  setImportError: (error: string | null) => void;
  onImportConfirm: () => void;
}

export const McpImportAndMarketplaceBar: React.FC<McpImportAndMarketplaceBarProps> = ({
  showImport,
  setShowImport,
  showMarketplaces,
  setShowMarketplaces,
  importJson,
  setImportJson,
  importError,
  setImportError,
  onImportConfirm,
}) => {
  const { t } = useI18n();

  return (
    <div className={`${SETTINGS_SECTION_CARD_CLASS} space-y-3`}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowImport((prev) => !prev)}
          aria-expanded={showImport}
          title={t('settingsMcpImportHint')}
          className={`${SETTINGS_OUTLINE_BUTTON_CLASS} ${showImport ? 'bg-[var(--theme-bg-tertiary)]' : ''}`}
        >
          {t('settingsMcpImportJson')}
          {showImport ? (
            <ChevronUp size={14} strokeWidth={1.7} className="text-[var(--theme-text-tertiary)]" aria-hidden />
          ) : (
            <ChevronDown size={14} strokeWidth={1.7} className="text-[var(--theme-text-tertiary)]" aria-hidden />
          )}
        </button>
        <button
          type="button"
          onClick={() => setShowMarketplaces((prev) => !prev)}
          className={SETTINGS_OUTLINE_BUTTON_CLASS}
          aria-expanded={showMarketplaces}
        >
          <Store size={13} strokeWidth={1.7} />
          {t('settingsMcpMarketplaces')}
        </button>
      </div>
      {showImport && (
        <div className="space-y-2">
          <textarea
            value={importJson}
            onChange={(event) => setImportJson(event.target.value)}
            placeholder={`{\n  "mcpServers": {\n    "my-server": { "url": "https://example.com/mcp" }\n  }\n}`}
            className={`${MCP_INPUT_BASE_CLASSES} ${SETTINGS_INPUT_CLASS} min-h-[140px] resize-y font-mono text-xs`}
            spellCheck={false}
          />
          {importError && <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-600">{importError}</div>}
          <div className="flex gap-2">
            <button type="button" onClick={onImportConfirm} className={SETTINGS_SECONDARY_ACTION_BUTTON_CLASS}>
              {t('settingsMcpImportConfirm')}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowImport(false);
                setImportError(null);
              }}
              className={SETTINGS_OUTLINE_BUTTON_CLASS}
            >
              {t('settingsMcpImportCancel')}
            </button>
          </div>
        </div>
      )}
      {showMarketplaces && <McpMarketplaceGrid />}
    </div>
  );
};

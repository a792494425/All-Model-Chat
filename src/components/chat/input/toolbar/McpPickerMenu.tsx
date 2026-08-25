import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Check, Plug, PlugZap } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { CHAT_INPUT_BUTTON_CLASS } from '@/constants/buttonClasses';
import { usePortaledMenu } from '@/hooks/ui/usePortaledMenu';
import { selectServersForTurn, useMcpRuntimeStore } from '@/stores/mcpRuntimeStore';
import { useSettingsStore } from '@/stores/settingsStore';

/**
 * Composer-level MCP control: master on/off plus per-server narrowing for the
 * next message. Session-scoped (not persisted) so a forgotten selection can
 * never silently disable tools across restarts.
 */
export const McpPickerMenu: React.FC<{ disabled?: boolean }> = ({ disabled }) => {
  const { t } = useI18n();
  const { isOpen, menuPosition, containerRef, buttonRef, menuRef, targetWindow, toggleMenu } =
    usePortaledMenu({ menuWidth: 260 });   const mcpServers = useSettingsStore((state) => state.appSettings.mcpServers);
  const enabledServers = useMemo(() => (mcpServers ?? []).filter((server) => server.enabled), [mcpServers]);
  const masterEnabled = useMcpRuntimeStore((state) => state.masterEnabled);
  const selectedServerIds = useMcpRuntimeStore((state) => state.selectedServerIds);
  const toggleMaster = useMcpRuntimeStore((state) => state.toggleMaster);
  const toggleServer = useMcpRuntimeStore((state) => state.toggleServer);

  if (enabledServers.length === 0) return null;

  const activeCount = selectServersForTurn(enabledServers, { masterEnabled, selectedServerIds }).length;
  const allOn = selectedServerIds === null && masterEnabled;

  return (
    <div className="flex items-center">
      <div className="relative" ref={containerRef}>
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleMenu}
          disabled={disabled}
          className={`${CHAT_INPUT_BUTTON_CLASS} ${
            isOpen || !allOn
              ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]'
              : 'bg-transparent text-[var(--theme-icon-attach)] hover:bg-[var(--theme-bg-tertiary)]'
          }`}
          aria-label={t('mcpPickerTitle')}
          title={t('mcpPickerTitle')}
          aria-haspopup="true"
          aria-expanded={isOpen}
          data-testid="mcp-picker-button"
        >
          {masterEnabled ? <PlugZap size={20} strokeWidth={2} /> : <Plug size={20} strokeWidth={2} />}
          {!allOn && activeCount > 0 && (
            <span
              data-testid="mcp-picker-count"
              className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--theme-bg-accent)] px-1 text-[9px] font-semibold text-white"
            >
              {activeCount}
            </span>
          )}
          {!masterEnabled && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--theme-icon-error)]" />
          )}
        </button>
        {isOpen &&
          targetWindow &&
          createPortal(
            <div
              ref={menuRef}
              className="fixed w-64 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-xl shadow-premium py-1.5 custom-scrollbar"
              style={menuPosition}
              role="menu"
            >
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={masterEnabled}
                data-testid="mcp-picker-master"
                onClick={() => toggleMaster()}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--theme-bg-tertiary)] flex items-center justify-between transition-colors"
              >
                <span className="font-medium">{t('mcpPickerMaster')}</span>
                {masterEnabled && <Check size={16} className="text-[var(--theme-text-link)]" strokeWidth={2} />}
              </button>
              <div className="my-1 h-px bg-[var(--theme-border-secondary)]" />
              {enabledServers.map((server) => {
                const checked =
                  masterEnabled && (selectedServerIds === null || selectedServerIds.includes(server.id));
                return (
                  <button
                    key={server.id}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={checked}
                    data-testid={`mcp-picker-server-${server.id}`}
                    onClick={() => toggleServer(server.id, enabledServers.map((entry) => entry.id))}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--theme-bg-tertiary)] flex items-center justify-between transition-colors ${masterEnabled ? '' : 'opacity-50'}`}
                  >
                    <span className="min-w-0 truncate">
                      <span className="text-[11px] font-mono text-[var(--theme-text-secondary)] mr-2">MCP</span>
                      {server.name}
                    </span>
                    {checked && <Check size={16} className="text-[var(--theme-text-link)]" strokeWidth={2} />}
                  </button>
                );
              })}
            </div>,
            targetWindow.document.body,
          )}
      </div>
    </div>
  );
};

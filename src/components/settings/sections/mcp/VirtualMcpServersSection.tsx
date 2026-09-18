import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import type { VirtualMcpServer } from '@/features/mcp/virtualMcpRegistry';
import { VirtualMcpServerCard } from './VirtualMcpServerCard';

interface VirtualMcpServersSectionProps {
  virtualServers: VirtualMcpServer[];
  expandedCards: Set<string>;
  onToggleExpanded: (key: string) => void;
  isVirtualServerEnabled: (id: string) => boolean;
  onToggleEnabled: (id: string, enabled: boolean) => void;
}

export const VirtualMcpServersSection: React.FC<VirtualMcpServersSectionProps> = ({
  virtualServers,
  expandedCards,
  onToggleExpanded,
  isVirtualServerEnabled,
  onToggleEnabled,
}) => {
  const { t } = useI18n();

  if (virtualServers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3" data-testid="virtual-mcp-section">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)]">
          {t('settingsMcpVirtualSectionTitle')}
        </span>
      </div>
      {virtualServers.map((virtualServer) => (
        <VirtualMcpServerCard
          key={virtualServer.id}
          server={virtualServer}
          isExpanded={expandedCards.has(`virtual-${virtualServer.id}`)}
          isEnabled={isVirtualServerEnabled(virtualServer.id)}
          onToggleExpanded={() => onToggleExpanded(`virtual-${virtualServer.id}`)}
          onToggleEnabled={(enabled) => onToggleEnabled(virtualServer.id, enabled)}
          t={t}
        />
      ))}
    </div>
  );
};

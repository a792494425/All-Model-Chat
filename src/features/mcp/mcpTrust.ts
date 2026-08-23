import type { McpServerConfig } from '../../../shared/mcpServerConfig';

export const isTrustedServer = (s: McpServerConfig): boolean => s.isTrusted === true;

export const needsApproval = (s: McpServerConfig, toolName: string): boolean => {
  if (!s.isTrusted) return true;
  return (s.disabledAutoApproveTools ?? []).includes(toolName);
};

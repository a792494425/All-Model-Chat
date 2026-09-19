/**
 * Resolves a localized display name for a virtual MCP server.
 * Falls back to the server's declared name if no translation key matches or for external servers.
 */
export const getVirtualMcpServerDisplayName = (
  server: { id: string; name: string },
  t: (key: string) => string,
): string => {
  if (!server?.id) return server?.name || '';
  const key = `mcpVirtualServer_${server.id}_name`;
  const translated = t(key);
  if (!translated || translated === key) {
    return server.name;
  }
  return translated;
};

/**
 * Resolves a localized description for a virtual MCP server.
 * Falls back to the server's declared description if no translation key matches.
 */
export const getVirtualMcpServerDisplayDescription = (
  server: { id: string; description?: string },
  t: (key: string) => string,
): string => {
  if (!server?.id) return server?.description || '';
  const key = `mcpVirtualServer_${server.id}_desc`;
  const translated = t(key);
  if (!translated || translated === key) {
    return server.description || '';
  }
  return translated;
};

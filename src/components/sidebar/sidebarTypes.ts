import type { SidebarItemContextValue } from './SidebarItemContext';

/**
 * Everything SessionItem accepts beyond the session itself.
 * Historically forwarded down 5 component layers; now provided via SidebarItemContext
 * and retained here for backward compatibility with callers and unit tests.
 */
export type SessionItemPassedProps = Partial<SidebarItemContextValue>;

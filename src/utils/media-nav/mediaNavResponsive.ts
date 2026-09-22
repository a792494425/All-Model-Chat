import { NARROW_SCREEN_MEDIA_NAV_COLLAPSE_THRESHOLD_PX } from '@/constants/layout';
import { useUIStore } from '@/stores/uiStore';

export { NARROW_SCREEN_MEDIA_NAV_COLLAPSE_THRESHOLD_PX };

/**
 * Tracks whether the history sidebar was automatically collapsed due to
 * opening the media navigation panel on a narrow screen.
 */
let autoCollapsedByMediaNav = false;
let isProgrammaticSidebarChange = false;
let lastSidebarOpenState = typeof useUIStore !== 'undefined' ? useUIStore.getState().isHistorySidebarOpen : false;

// Listen to UI store changes. If the user manually toggles the sidebar
// (e.g. clicks the sidebar expand/collapse button) while media navigation is open,
// clear the auto-collapsed flag so we do not override their explicit action upon closing.
if (typeof useUIStore !== 'undefined' && typeof useUIStore.subscribe === 'function') {
  useUIStore.subscribe((state) => {
    const currentOpen = state.isHistorySidebarOpen;
    if (currentOpen === lastSidebarOpenState) {
      return;
    }
    lastSidebarOpenState = currentOpen;

    if (isProgrammaticSidebarChange) {
      return;
    }

    if (autoCollapsedByMediaNav) {
      autoCollapsedByMediaNav = false;
    }
  });
}

/**
 * Determines whether the current window viewport is considered "narrow" for media navigation.
 */
export const isNarrowScreenForMediaNav = (
  targetWindow: Window = typeof window !== 'undefined' ? window : ({} as Window),
): boolean => {
  if (!targetWindow || typeof targetWindow.innerWidth !== 'number') {
    return false;
  }
  return targetWindow.innerWidth <= NARROW_SCREEN_MEDIA_NAV_COLLAPSE_THRESHOLD_PX;
};

/**
 * Collapses the history sidebar when opening media navigation on a narrow screen.
 * Saves an auto-collapse memory flag so it can be restored when the panel is dismissed.
 */
export const collapseSidebarIfNarrowScreen = (
  targetWindow: Window = typeof window !== 'undefined' ? window : ({} as Window),
): boolean => {
  if (!isNarrowScreenForMediaNav(targetWindow)) {
    return false;
  }

  const uiStore = useUIStore.getState();
  if (uiStore.isHistorySidebarOpen) {
    try {
      isProgrammaticSidebarChange = true;
      autoCollapsedByMediaNav = true;
      uiStore.setIsHistorySidebarOpen(false);
      lastSidebarOpenState = false;
    } finally {
      isProgrammaticSidebarChange = false;
    }
    return true;
  }

  return false;
};

/**
 * Restores the history sidebar to its open state if it was automatically collapsed
 * by media navigation, and the user has not manually changed its state since.
 */
export const restoreSidebarIfAutoCollapsed = (): boolean => {
  if (!autoCollapsedByMediaNav) {
    return false;
  }

  const uiStore = useUIStore.getState();
  try {
    isProgrammaticSidebarChange = true;
    autoCollapsedByMediaNav = false;
    if (!uiStore.isHistorySidebarOpen) {
      uiStore.setIsHistorySidebarOpen(true);
      lastSidebarOpenState = true;
      return true;
    }
  } finally {
    isProgrammaticSidebarChange = false;
  }

  return false;
};

/**
 * Returns whether the sidebar is currently marked as auto-collapsed by media nav.
 */
export const isSidebarAutoCollapsedByMediaNav = (): boolean => autoCollapsedByMediaNav;

/**
 * Resets the internal responsive state (useful for tests).
 */
export const resetMediaNavResponsiveState = (): void => {
  autoCollapsedByMediaNav = false;
  isProgrammaticSidebarChange = false;
  lastSidebarOpenState = typeof useUIStore !== 'undefined' ? useUIStore.getState().isHistorySidebarOpen : false;
};

export const mediaNavResponsive = {
  isNarrowScreenForMediaNav,
  collapseSidebarIfNarrowScreen,
  restoreSidebarIfAutoCollapsed,
  isSidebarAutoCollapsedByMediaNav,
  resetMediaNavResponsiveState,
};

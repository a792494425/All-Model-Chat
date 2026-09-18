import React from 'react';

const DEFAULT_SIDEBAR_WIDTH = 259;
export const MIN_SIDEBAR_WIDTH = 220;
export const MAX_SIDEBAR_WIDTH = 520;
const SIDEBAR_STORAGE_KEY = 'amc-history-sidebar-width';

const getInitialSidebarWidth = (): number => {
  if (typeof window === 'undefined') return DEFAULT_SIDEBAR_WIDTH;
  try {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (Number.isFinite(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage errors
  }
  return DEFAULT_SIDEBAR_WIDTH;
};

export function useSidebarResize() {
  const [sidebarWidth, setSidebarWidth] = React.useState<number>(getInitialSidebarWidth);
  const [isResizingSidebar, setIsResizingSidebar] = React.useState(false);
  const isResizingSidebarRef = React.useRef(false);

  const startSidebarResize = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
    isResizingSidebarRef.current = true;
  }, []);

  const stopSidebarResize = React.useCallback(() => {
    setIsResizingSidebar(false);
    isResizingSidebarRef.current = false;
  }, []);

  const handleSidebarResize = React.useCallback((e: MouseEvent) => {
    if (!isResizingSidebarRef.current) return;
    const newWidth = Math.min(
      Math.max(e.clientX, MIN_SIDEBAR_WIDTH),
      Math.min(MAX_SIDEBAR_WIDTH, window.innerWidth * 0.5),
    );
    setSidebarWidth(newWidth);
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(Math.round(newWidth)));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const resetSidebarWidth = React.useCallback(() => {
    setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
    try {
      localStorage.removeItem(SIDEBAR_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSidebarWidth((w) => {
          const next = Math.min(w + 10, MAX_SIDEBAR_WIDTH);
          try {
            localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
          } catch {
            // Ignore storage errors
          }
          return next;
        });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSidebarWidth((w) => {
          const next = Math.max(w - 10, MIN_SIDEBAR_WIDTH);
          try {
            localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
          } catch {
            // Ignore storage errors
          }
          return next;
        });
      } else if (e.key === 'Home') {
        e.preventDefault();
        resetSidebarWidth();
      }
    },
    [resetSidebarWidth],
  );

  React.useEffect(() => {
    if (isResizingSidebar) {
      window.addEventListener('mousemove', handleSidebarResize);
      window.addEventListener('mouseup', stopSidebarResize);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      window.removeEventListener('mousemove', handleSidebarResize);
      window.removeEventListener('mouseup', stopSidebarResize);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      window.removeEventListener('mousemove', handleSidebarResize);
      window.removeEventListener('mouseup', stopSidebarResize);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingSidebar, handleSidebarResize, stopSidebarResize]);

  return {
    sidebarWidth,
    setSidebarWidth,
    isResizingSidebar,
    startSidebarResize,
    stopSidebarResize,
    resetSidebarWidth,
    handleKeyDown,
  };
}

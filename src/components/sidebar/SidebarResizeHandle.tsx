import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH } from './useSidebarResize';

interface SidebarResizeHandleProps {
  isOpen: boolean;
  sidebarWidth: number;
  isResizingSidebar: boolean;
  startSidebarResize: (event: React.MouseEvent) => void;
  resetSidebarWidth: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
}

export const SidebarResizeHandle: React.FC<SidebarResizeHandleProps> = ({
  isOpen,
  sidebarWidth,
  isResizingSidebar,
  startSidebarResize,
  resetSidebarWidth,
  onKeyDown,
}) => {
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <>
      <div
        data-testid="sidebar-resize-handle"
        role="separator"
        aria-label={t('sidePanelDragResize')}
        aria-orientation="vertical"
        aria-valuenow={sidebarWidth}
        aria-valuemin={MIN_SIDEBAR_WIDTH}
        aria-valuemax={MAX_SIDEBAR_WIDTH}
        tabIndex={0}
        onMouseDown={startSidebarResize}
        onDoubleClick={resetSidebarWidth}
        onKeyDown={onKeyDown}
        title={t('sidePanelDragResize')}
        className={`hidden md:flex absolute right-0 top-0 bottom-0 w-2 -mr-1 z-50 cursor-col-resize items-center justify-center group select-none transition-colors hover:bg-[var(--theme-bg-accent)]/20 active:bg-[var(--theme-bg-accent)]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-border-focus)] ${
          isResizingSidebar ? 'bg-[var(--theme-bg-accent)]/30' : ''
        }`}
      >
        <div className="z-10 h-8 w-1 rounded-full bg-[var(--theme-border-secondary)] transition-all group-hover:scale-y-110 group-hover:bg-[var(--theme-bg-accent)]" />
      </div>

      {isResizingSidebar && (
        <div
          className="fixed inset-0 z-[9999] bg-transparent cursor-col-resize select-none"
          style={{ touchAction: 'none' }}
        />
      )}
    </>
  );
};

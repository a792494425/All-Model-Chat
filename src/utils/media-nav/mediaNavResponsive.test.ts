import { beforeEach, describe, expect, it } from 'vitest';
import { useUIStore } from '@/stores/uiStore';
import { useMediaNavStore } from '@/stores/mediaNavStore';
import {
  NARROW_SCREEN_MEDIA_NAV_COLLAPSE_THRESHOLD_PX,
  isNarrowScreenForMediaNav,
  collapseSidebarIfNarrowScreen,
  restoreSidebarIfAutoCollapsed,
  isSidebarAutoCollapsedByMediaNav,
  resetMediaNavResponsiveState,
  mediaNavResponsive,
} from './mediaNavResponsive';

describe('mediaNavResponsive', () => {
  beforeEach(() => {
    // Reset UI store sidebar state
    useUIStore.setState({
      isHistorySidebarOpen: true,
      desktopHistorySidebarOpen: true,
      mobileHistorySidebarOpen: false,
    });
    useMediaNavStore.setState({
      isOpen: false,
      openKind: null,
    });
    resetMediaNavResponsiveState();
  });

  describe('isNarrowScreenForMediaNav', () => {
    it('identifies viewports <= 1536px as narrow screens', () => {
      expect(isNarrowScreenForMediaNav({ innerWidth: 1024 } as Window)).toBe(true);
      expect(isNarrowScreenForMediaNav({ innerWidth: 768 } as Window)).toBe(true);
      expect(isNarrowScreenForMediaNav({ innerWidth: 1200 } as Window)).toBe(true);
      expect(isNarrowScreenForMediaNav({ innerWidth: 1280 } as Window)).toBe(true);
      expect(isNarrowScreenForMediaNav({ innerWidth: 1357 } as Window)).toBe(true);
      expect(isNarrowScreenForMediaNav({ innerWidth: 1440 } as Window)).toBe(true);
      expect(isNarrowScreenForMediaNav({ innerWidth: 1536 } as Window)).toBe(true);
    });

    it('identifies viewports > 1536px as wide screens', () => {
      expect(isNarrowScreenForMediaNav({ innerWidth: 1537 } as Window)).toBe(false);
      expect(isNarrowScreenForMediaNav({ innerWidth: 1920 } as Window)).toBe(false);
      expect(isNarrowScreenForMediaNav({ innerWidth: 2560 } as Window)).toBe(false);
    });

    it('matches the threshold constant NARROW_SCREEN_MEDIA_NAV_COLLAPSE_THRESHOLD_PX', () => {
      expect(NARROW_SCREEN_MEDIA_NAV_COLLAPSE_THRESHOLD_PX).toBe(1536);
    });
  });

  describe('collapseSidebarIfNarrowScreen', () => {
    it('collapses the history sidebar when screen is narrow and sidebar is open', () => {
      const mockWin = { innerWidth: 1357 } as Window;
      expect(useUIStore.getState().isHistorySidebarOpen).toBe(true);

      const collapsed = collapseSidebarIfNarrowScreen(mockWin);

      expect(collapsed).toBe(true);
      expect(useUIStore.getState().isHistorySidebarOpen).toBe(false);
      expect(isSidebarAutoCollapsedByMediaNav()).toBe(true);
    });

    it('returns false when screen is narrow but sidebar is already collapsed', () => {
      useUIStore.setState({ isHistorySidebarOpen: false });
      resetMediaNavResponsiveState();
      const mockWin = { innerWidth: 1024 } as Window;

      const collapsed = collapseSidebarIfNarrowScreen(mockWin);

      expect(collapsed).toBe(false);
      expect(useUIStore.getState().isHistorySidebarOpen).toBe(false);
      expect(isSidebarAutoCollapsedByMediaNav()).toBe(false);
    });

    it('does not collapse sidebar when screen is wide (e.g. 1920px)', () => {
      const mockWin = { innerWidth: 1920 } as Window;
      expect(useUIStore.getState().isHistorySidebarOpen).toBe(true);

      const collapsed = collapseSidebarIfNarrowScreen(mockWin);

      expect(collapsed).toBe(false);
      expect(useUIStore.getState().isHistorySidebarOpen).toBe(true);
      expect(isSidebarAutoCollapsedByMediaNav()).toBe(false);
    });
  });

  describe('restoreSidebarIfAutoCollapsed (Smart Memory Restore)', () => {
    it('restores the sidebar when it was auto-collapsed and panel is closed', () => {
      const mockWin = { innerWidth: 1357 } as Window;
      collapseSidebarIfNarrowScreen(mockWin);
      expect(useUIStore.getState().isHistorySidebarOpen).toBe(false);
      expect(isSidebarAutoCollapsedByMediaNav()).toBe(true);

      const restored = restoreSidebarIfAutoCollapsed();

      expect(restored).toBe(true);
      expect(useUIStore.getState().isHistorySidebarOpen).toBe(true);
      expect(isSidebarAutoCollapsedByMediaNav()).toBe(false);
    });

    it('does not restore sidebar if it was NOT auto-collapsed', () => {
      useUIStore.setState({ isHistorySidebarOpen: false });
      resetMediaNavResponsiveState();

      const restored = restoreSidebarIfAutoCollapsed();

      expect(restored).toBe(false);
      expect(useUIStore.getState().isHistorySidebarOpen).toBe(false);
    });

    it('does not override user intent if user manually opened the sidebar during media nav', () => {
      const mockWin = { innerWidth: 1357 } as Window;
      collapseSidebarIfNarrowScreen(mockWin);
      expect(isSidebarAutoCollapsedByMediaNav()).toBe(true);

      // User manually expands the sidebar
      useUIStore.getState().setIsHistorySidebarOpen(true);
      expect(isSidebarAutoCollapsedByMediaNav()).toBe(false);

      const restored = restoreSidebarIfAutoCollapsed();
      expect(restored).toBe(false);
      expect(useUIStore.getState().isHistorySidebarOpen).toBe(true);
    });

    it('does not override user intent if user manually opened and then collapsed the sidebar', () => {
      const mockWin = { innerWidth: 1357 } as Window;
      collapseSidebarIfNarrowScreen(mockWin);
      expect(isSidebarAutoCollapsedByMediaNav()).toBe(true);

      // User manually expands then collapses the sidebar
      useUIStore.getState().setIsHistorySidebarOpen(true);
      expect(isSidebarAutoCollapsedByMediaNav()).toBe(false);
      useUIStore.getState().setIsHistorySidebarOpen(false);

      const restored = restoreSidebarIfAutoCollapsed();
      expect(restored).toBe(false);
      expect(useUIStore.getState().isHistorySidebarOpen).toBe(false);
    });

    it('is idempotent when called multiple times', () => {
      const mockWin = { innerWidth: 1357 } as Window;
      collapseSidebarIfNarrowScreen(mockWin);

      expect(restoreSidebarIfAutoCollapsed()).toBe(true);
      expect(restoreSidebarIfAutoCollapsed()).toBe(false);
    });
  });

  describe('mediaNavStore.close() integration', () => {
    it('automatically restores the sidebar when mediaNavStore.close() is invoked', () => {
      const mockWin = { innerWidth: 1357 } as Window;
      useMediaNavStore.getState().openAs('image');
      collapseSidebarIfNarrowScreen(mockWin);
      expect(useUIStore.getState().isHistorySidebarOpen).toBe(false);

      useMediaNavStore.getState().close();

      expect(useMediaNavStore.getState().isOpen).toBe(false);
      expect(useUIStore.getState().isHistorySidebarOpen).toBe(true);
    });
  });

  describe('mediaNavResponsive container object', () => {
    it('exports all utility functions on the mediaNavResponsive object', () => {
      expect(mediaNavResponsive.isNarrowScreenForMediaNav).toBe(isNarrowScreenForMediaNav);
      expect(mediaNavResponsive.collapseSidebarIfNarrowScreen).toBe(collapseSidebarIfNarrowScreen);
      expect(mediaNavResponsive.restoreSidebarIfAutoCollapsed).toBe(restoreSidebarIfAutoCollapsed);
      expect(mediaNavResponsive.isSidebarAutoCollapsedByMediaNav).toBe(isSidebarAutoCollapsedByMediaNav);
      expect(mediaNavResponsive.resetMediaNavResponsiveState).toBe(resetMediaNavResponsiveState);
    });
  });
});

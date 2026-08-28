import { beforeEach, describe, expect, it } from 'vitest';
import { PDF_NAV_MAX_WIDTH, PDF_NAV_MIN_WIDTH, usePdfNavStore } from './pdfNavStore';

const resetStore = () => {
  usePdfNavStore.setState({
    isOpen: false,
    activeFileId: null,
    targetPage: null,
    currentPage: 1,
    highlight: null,
    width: 480,
  });
};

describe('pdfNavStore', () => {
  beforeEach(resetStore);

  it('opens and closes the panel', () => {
    usePdfNavStore.getState().open();
    expect(usePdfNavStore.getState().isOpen).toBe(true);
    usePdfNavStore.getState().close();
    expect(usePdfNavStore.getState().isOpen).toBe(false);
  });

  it('clears highlight and jump target when switching documents', () => {
    const store = usePdfNavStore.getState();
    store.setActiveFile('a');
    store.setHighlight({ pageNumber: 3, box2d: [1, 2, 3, 4] });
    store.jumpToPage(3);
    expect(usePdfNavStore.getState().targetPage).toBe(3);
    expect(usePdfNavStore.getState().highlight?.pageNumber).toBe(3);

    store.setActiveFile('b');
    expect(usePdfNavStore.getState().activeFileId).toBe('b');
    expect(usePdfNavStore.getState().highlight).toBeNull();
    expect(usePdfNavStore.getState().targetPage).toBeNull();
  });

  it('consumes the jump target after the viewer scrolled', () => {
    usePdfNavStore.getState().jumpToPage(9);
    usePdfNavStore.getState().consumeTargetPage();
    expect(usePdfNavStore.getState().targetPage).toBeNull();
  });

  it('clamps the panel width to the allowed range', () => {
    usePdfNavStore.getState().setWidth(10);
    expect(usePdfNavStore.getState().width).toBe(PDF_NAV_MIN_WIDTH);
    usePdfNavStore.getState().setWidth(99999);
    expect(usePdfNavStore.getState().width).toBe(PDF_NAV_MAX_WIDTH);
    usePdfNavStore.getState().setWidth(513.6);
    expect(usePdfNavStore.getState().width).toBe(514);
  });
});

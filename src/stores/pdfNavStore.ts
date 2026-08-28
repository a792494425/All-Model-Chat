import { create } from 'zustand';

export interface PdfNavHighlight {
  messageId?: string;
  docName?: string;
  pageNumber: number;
  /** [ymin, xmin, ymax, xmax] normalized to a 0-1000 scale, origin at top-left. */
  box2d?: [number, number, number, number];
  snippet?: string;
}

interface PdfNavState {
  isOpen: boolean;
  activeFileId: string | null;
  /** Page requested by an external jump (locate chip); consumed by the panel viewer. */
  targetPage: number | null;
  /** Page the viewer is currently displaying (synced back from scroll tracking). */
  currentPage: number;
  highlight: PdfNavHighlight | null;
  width: number;
  open: () => void;
  close: () => void;
  setActiveFile: (fileId: string | null) => void;
  /** Queue an external jump to a page (from locate chips or page pickers). */
  jumpToPage: (page: number) => void;
  /** Consume the queued jump target after the viewer has scrolled to it. */
  consumeTargetPage: () => void;
  setPage: (page: number) => void;
  setHighlight: (highlight: PdfNavHighlight | null) => void;
  clearHighlight: () => void;
  setWidth: (width: number) => void;
}

export const PDF_NAV_MIN_WIDTH = 320;
export const PDF_NAV_MAX_WIDTH = 720;
const PDF_NAV_DEFAULT_WIDTH = 480;

export const usePdfNavStore = create<PdfNavState>((set) => ({
  isOpen: false,
  activeFileId: null,
  targetPage: null,
  currentPage: 1,
  highlight: null,
  width: PDF_NAV_DEFAULT_WIDTH,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setActiveFile: (fileId) => set({ activeFileId: fileId, targetPage: null, highlight: null }),
  jumpToPage: (page) => set({ targetPage: page }),
  consumeTargetPage: () => set({ targetPage: null }),
  setPage: (page) => set({ currentPage: page }),
  setHighlight: (highlight) => set({ highlight }),
  clearHighlight: () => set({ highlight: null }),
  setWidth: (width) => set({ width: Math.min(PDF_NAV_MAX_WIDTH, Math.max(PDF_NAV_MIN_WIDTH, Math.round(width))) }),
}));

/** Imperative helpers for callers outside React trees (toggle button, locate chips). */
export const openPdfNavPanel = () => usePdfNavStore.getState().open();
export const closePdfNavPanel = () => usePdfNavStore.getState().close();

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  MultimodalIndexProgress,
  MultimodalMediaCategory,
  MultimodalSearchResult,
} from '@/services/embedding/embeddingTypes';
import {
  indexAllHistoricalItems,
  searchMultimodalByImage,
  searchMultimodalByText,
} from '@/services/embedding/multimodalSearchEngine';
import { getStoredEmbeddingCount } from '@/services/embedding/multimodalIndexStore';
import { autoIndexingQueue } from '@/services/embedding/autoIndexingQueue';

export interface MultimodalSearchState {
  isOpen: boolean;
  searchQuery: string;
  searchImage: Blob | null;
  searchImagePreviewUrl: string | null;
  categoryFilter: MultimodalMediaCategory | 'all';
  isSearching: boolean;
  isIndexing: boolean;
  isAutoIndexEnabled: boolean;
  indexedCount: number;
  indexProgress: MultimodalIndexProgress | null;
  results: MultimodalSearchResult[];
  selectedResult: MultimodalSearchResult | null;
  searchError: string | null;
}

export interface MultimodalSearchActions {
  openModal: (initialQuery?: string) => void;
  closeModal: () => void;
  setSearchQuery: (query: string) => void;
  setSearchImage: (blob: Blob | null, previewUrl?: string | null) => void;
  clearSearchImage: () => void;
  setCategoryFilter: (category: MultimodalMediaCategory | 'all') => void;
  setIsAutoIndexEnabled: (enabled: boolean) => void;
  executeSearch: () => Promise<void>;
  triggerIndexing: (options?: { forceReindex?: boolean }) => Promise<void>;
  refreshIndexStats: () => Promise<void>;
  setSelectedResult: (result: MultimodalSearchResult | null) => void;
  reset: () => void;
}

const initialState: MultimodalSearchState = {
  isOpen: false,
  searchQuery: '',
  searchImage: null,
  searchImagePreviewUrl: null,
  categoryFilter: 'all',
  isSearching: false,
  isIndexing: false,
  isAutoIndexEnabled: true,
  indexedCount: 0,
  indexProgress: null,
  results: [],
  selectedResult: null,
  searchError: null,
};

export const useMultimodalSearchStore = create<MultimodalSearchState & MultimodalSearchActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      openModal: (initialQuery = '') => {
        set({
          isOpen: true,
          searchQuery: initialQuery,
          searchError: null,
        });
        void get().refreshIndexStats();
        if (initialQuery.trim()) {
          void get().executeSearch();
        }
      },

      closeModal: () => {
        const { searchImagePreviewUrl } = get();
        if (searchImagePreviewUrl?.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(searchImagePreviewUrl);
          } catch {
            // ignore
          }
        }
        set({
          isOpen: false,
          searchError: null,
        });
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      setSearchImage: (blob, previewUrl = null) => {
        const prevUrl = get().searchImagePreviewUrl;
        if (prevUrl && prevUrl.startsWith('blob:') && prevUrl !== previewUrl) {
          try {
            URL.revokeObjectURL(prevUrl);
          } catch {
            // ignore
          }
        }
        set({
          searchImage: blob,
          searchImagePreviewUrl: previewUrl,
          searchError: null,
        });
      },

      clearSearchImage: () => {
        const { searchImagePreviewUrl } = get();
        if (searchImagePreviewUrl?.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(searchImagePreviewUrl);
          } catch {
            // ignore
          }
        }
        set({
          searchImage: null,
          searchImagePreviewUrl: null,
        });
      },

      setCategoryFilter: (category) => {
        set({ categoryFilter: category });
        const { searchQuery, searchImage } = get();
        if (searchQuery.trim() || searchImage) {
          void get().executeSearch();
        }
      },

      executeSearch: async () => {
        const { searchQuery, searchImage, categoryFilter } = get();
        if (!searchQuery.trim() && !searchImage) {
          set({ results: [], searchError: null });
          return;
        }

        set({ isSearching: true, searchError: null });

        try {
          let results: MultimodalSearchResult[] = [];
          if (searchImage) {
            results = await searchMultimodalByImage(searchImage, {
              category: categoryFilter,
            });
          } else {
            results = await searchMultimodalByText(searchQuery.trim(), {
              category: categoryFilter,
            });
          }
          set({ results, isSearching: false });
        } catch (error: any) {
          set({
            isSearching: false,
            searchError: error?.message || 'Search failed. Please verify your Gemini API key.',
          });
        }
      },

      triggerIndexing: async (options = {}) => {
        set({ isIndexing: true, searchError: null });
        try {
          await indexAllHistoricalItems((progress) => {
            set({ indexProgress: progress });
          }, options);
          const count = await getStoredEmbeddingCount();
          set({
            isIndexing: false,
            indexedCount: count,
          });
        } catch (error: any) {
          set({
            isIndexing: false,
            searchError: error?.message || 'Indexing failed.',
          });
        }
      },

      refreshIndexStats: async () => {
        try {
          const count = await getStoredEmbeddingCount();
          set({ indexedCount: count });
        } catch {
          // ignore
        }
      },

      setIsAutoIndexEnabled: (enabled) => {
        set({ isAutoIndexEnabled: enabled });
        if (!enabled) {
          autoIndexingQueue.clear();
        } else {
          autoIndexingQueue.startIdleCatchup(1000);
        }
      },

      setSelectedResult: (result) => {
        set({ selectedResult: result });
      },

      reset: () => {
        const { searchImagePreviewUrl, isAutoIndexEnabled } = get();
        if (searchImagePreviewUrl?.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(searchImagePreviewUrl);
          } catch {
            // ignore
          }
        }
        set({ ...initialState, isAutoIndexEnabled });
      },
    }),
    {
      name: 'amc_multimodal_search_preferences',
      partialize: (state) => ({
        isAutoIndexEnabled: state.isAutoIndexEnabled,
      }),
    },
  ),
);

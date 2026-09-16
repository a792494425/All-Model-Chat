import { act } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/render/providerRenderer';
import { MultimodalSearchModal } from './MultimodalSearchModal';
import { useMultimodalSearchStore } from '@/stores/multimodalSearchStore';
import { useChatStore } from '@/stores/chatStore';
import { useUIStore } from '@/stores/uiStore';
import { dbService } from '@/services/db/dbService';

describe('MultimodalSearchModal', () => {
  const renderer = setupTestRenderer({ providers: { language: 'en' } });

  beforeEach(() => {
    vi.clearAllMocks();
    useMultimodalSearchStore.getState().reset();
    useChatStore.setState({ selectedFiles: [] });
  });

  const renderModal = async () => {
    await act(async () => {
      renderer.root.render(<MultimodalSearchModal />);
    });
  };

  it('does not render dialog content when isOpen is false', async () => {
    await renderModal();
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeNull();
  });

  it('renders modal with search input and category pills when isOpen is true', async () => {
    useMultimodalSearchStore.setState({ isOpen: true, searchQuery: 'ocean sunset' });
    await renderModal();

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();

    const input = document.querySelector<HTMLInputElement>('input[type="text"]');
    expect(input).not.toBeNull();
    expect(input?.value).toBe('ocean sunset');
  });

  it('calls closeModal when close button is clicked', async () => {
    useMultimodalSearchStore.setState({ isOpen: true });
    await renderModal();

    const closeButton = document.querySelector<HTMLButtonElement>('button[aria-label="Close"]');
    expect(closeButton).not.toBeNull();

    await act(async () => {
      closeButton?.click();
    });

    expect(useMultimodalSearchStore.getState().isOpen).toBe(false);
  });

  it('renders auto-index toggle and toggles isAutoIndexEnabled when clicked', async () => {
    useMultimodalSearchStore.setState({ isOpen: true });
    await renderModal();

    expect(useMultimodalSearchStore.getState().isAutoIndexEnabled).toBe(false);

    const toggleInput = document.querySelector<HTMLInputElement>('#multimodal-auto-index-toggle');
    expect(toggleInput).not.toBeNull();
    expect(toggleInput?.checked).toBe(false);

    await act(async () => {
      toggleInput?.click();
    });

    expect(useMultimodalSearchStore.getState().isAutoIndexEnabled).toBe(true);
  });

  it('renders combined search badge when both query image and text are present', async () => {
    useMultimodalSearchStore.setState({ isOpen: true, searchQuery: 'sketch of cat' });
    const dummyBlob = new Blob(['cat'], { type: 'image/png' });
    useMultimodalSearchStore.getState().setSearchImage(dummyBlob, 'blob:cat-preview');
    await renderModal();

    expect(document.body.textContent).toContain('Combined Image & Text Search');

    await act(async () => {
      useMultimodalSearchStore.getState().setSearchQuery('');
    });
    await renderModal();

    expect(document.body.textContent).toContain('Search by Image');
  });

  it('inserts single item into chat and closes modal', async () => {
    const dummyBlob = new Blob(['sample-content'], { type: 'image/png' });
    vi.spyOn(dbService, 'fetchLibraryFileBlob').mockResolvedValue(dummyBlob);

    useMultimodalSearchStore.setState({
      isOpen: true,
      results: [
        {
          item: {
            id: 'item-abc',
            name: 'diagram.png',
            type: 'image/png',
            size: 1024,
            category: 'image',
            embedding: [0.1],
            updatedAt: 1000,
          },
          similarity: 0.95,
        },
      ],
    });

    await renderModal();

    const insertBtn = document.querySelector<HTMLButtonElement>('button[title="Insert into Chat"]');
    expect(insertBtn).not.toBeNull();

    await act(async () => {
      insertBtn?.click();
    });

    expect(useChatStore.getState().selectedFiles).toHaveLength(1);
    expect(useChatStore.getState().selectedFiles[0].name).toBe('diagram.png');
    expect(useUIStore.getState().activeView).toBe('chat');
    expect(useMultimodalSearchStore.getState().isOpen).toBe(false);
  });

  it('avoids duplicating item if already present in chat selectedFiles', async () => {
    const dummyBlob = new Blob(['sample-content'], { type: 'image/png' });
    vi.spyOn(dbService, 'fetchLibraryFileBlob').mockResolvedValue(dummyBlob);

    useChatStore.setState({
      selectedFiles: [
        {
          id: 'existing-1',
          name: 'diagram.png',
          size: 1024,
          type: 'image/png',
          dataUrl: 'data:image/png;base64,abc',
        } as any,
      ],
    });

    useMultimodalSearchStore.setState({
      isOpen: true,
      results: [
        {
          item: {
            id: 'item-abc',
            name: 'diagram.png',
            type: 'image/png',
            size: 1024,
            category: 'image',
            embedding: [0.1],
            updatedAt: 1000,
          },
          similarity: 0.95,
        },
      ],
    });

    await renderModal();

    const insertBtn = document.querySelector<HTMLButtonElement>('button[title="Insert into Chat"]');
    await act(async () => {
      insertBtn?.click();
    });

    expect(useChatStore.getState().selectedFiles).toHaveLength(1);
  });

  it('supports selecting multiple items and batch inserting them into chat', async () => {
    const dummyBlob1 = new Blob(['data-1'], { type: 'image/png' });
    const dummyBlob2 = new Blob(['data-2'], { type: 'application/pdf' });
    vi.spyOn(dbService, 'fetchLibraryFileBlob').mockImplementation(async (item) => {
      if (item.id === 'item-1') return dummyBlob1;
      return dummyBlob2;
    });

    useMultimodalSearchStore.setState({
      isOpen: true,
      results: [
        {
          item: {
            id: 'item-1',
            name: 'image1.png',
            type: 'image/png',
            size: 500,
            category: 'image',
            embedding: [0.1],
            updatedAt: 1000,
          },
          similarity: 0.9,
        },
        {
          item: {
            id: 'item-2',
            name: 'doc2.pdf',
            type: 'application/pdf',
            size: 800,
            category: 'document',
            embedding: [0.2],
            updatedAt: 1000,
          },
          similarity: 0.85,
        },
      ],
    });

    await renderModal();

    const checkboxes = document.querySelectorAll<HTMLButtonElement>('button[aria-label="Select all"]');
    expect(checkboxes.length).toBe(2);

    await act(async () => {
      checkboxes[0].click();
    });
    await renderModal();

    expect(document.body.textContent).toContain('1 item(s) selected');

    const nextCheckboxes = document.querySelectorAll<HTMLButtonElement>('button[aria-label="Select all"]');
    await act(async () => {
      nextCheckboxes[0].click();
    });
    await renderModal();

    expect(document.body.textContent).toContain('2 item(s) selected');

    const batchInsertBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('Insert into Chat (2)'),
    );
    expect(batchInsertBtn).toBeDefined();

    await act(async () => {
      batchInsertBtn?.click();
    });

    expect(useChatStore.getState().selectedFiles).toHaveLength(2);
    expect(useChatStore.getState().selectedFiles.map((f) => f.name)).toEqual(['image1.png', 'doc2.pdf']);
    expect(useUIStore.getState().activeView).toBe('chat');
    expect(useMultimodalSearchStore.getState().isOpen).toBe(false);
  });

  it('handles select all and deselect all toggle in the bottom action bar', async () => {
    useMultimodalSearchStore.setState({
      isOpen: true,
      results: [
        {
          item: {
            id: 'item-1',
            name: 'image1.png',
            type: 'image/png',
            size: 500,
            category: 'image',
            embedding: [0.1],
            updatedAt: 1000,
          },
          similarity: 0.9,
        },
        {
          item: {
            id: 'item-2',
            name: 'doc2.pdf',
            type: 'application/pdf',
            size: 800,
            category: 'document',
            embedding: [0.2],
            updatedAt: 1000,
          },
          similarity: 0.85,
        },
      ],
    });

    await renderModal();

    // Select first item to show bottom bar
    const checkboxes = document.querySelectorAll<HTMLButtonElement>('button[aria-label="Select all"]');
    await act(async () => {
      checkboxes[0].click();
    });
    await renderModal();

    expect(document.body.textContent).toContain('1 item(s) selected');

    // Click "Select all" in bottom bar
    const selectAllBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === 'Select all',
    );
    expect(selectAllBtn).toBeDefined();

    await act(async () => {
      selectAllBtn?.click();
    });
    await renderModal();

    expect(document.body.textContent).toContain('2 item(s) selected');

    // Now click "Deselect all" in bottom bar
    const deselectAllBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === 'Deselect all',
    );
    expect(deselectAllBtn).toBeDefined();

    await act(async () => {
      deselectAllBtn?.click();
    });
    await renderModal();

    // Bottom bar should disappear when 0 selected
    expect(document.body.textContent).not.toContain('item(s) selected');
  });
});

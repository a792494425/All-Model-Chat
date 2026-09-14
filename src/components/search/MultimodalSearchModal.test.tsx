import { act } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/render/providerRenderer';
import { MultimodalSearchModal } from './MultimodalSearchModal';
import { useMultimodalSearchStore } from '@/stores/multimodalSearchStore';

describe('MultimodalSearchModal', () => {
  const renderer = setupTestRenderer({ providers: { language: 'en' } });

  beforeEach(() => {
    vi.clearAllMocks();
    useMultimodalSearchStore.getState().reset();
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
    useMultimodalSearchStore.getState().openModal('ocean sunset');
    await renderModal();

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();

    const input = document.querySelector<HTMLInputElement>('input[type="text"]');
    expect(input).not.toBeNull();
    expect(input?.value).toBe('ocean sunset');
  });

  it('calls closeModal when close button is clicked', async () => {
    useMultimodalSearchStore.getState().openModal();
    await renderModal();

    const closeButton = document.querySelector<HTMLButtonElement>('button[aria-label="Close"]');
    expect(closeButton).not.toBeNull();

    await act(async () => {
      closeButton?.click();
    });

    expect(useMultimodalSearchStore.getState().isOpen).toBe(false);
  });

  it('renders auto-index toggle and toggles isAutoIndexEnabled when clicked', async () => {
    useMultimodalSearchStore.getState().openModal();
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
});

import { act } from 'react';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/render/providerRenderer';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { setupStoreStateReset } from '@/test/stores/reset';
import { useChatStore } from '@/stores/chatStore';
import { LibraryPickerModal } from './LibraryPickerModal';
import { dbService } from '@/services/db/dbService';
import type { LibraryItem } from '@/types';

describe('LibraryPickerModal', () => {
  const renderer = setupTestRenderer({ providers: { language: 'zh' } });
  setupStoreStateReset();

  const mockItems: LibraryItem[] = [
    {
      id: 'item-1',
      name: 'diagram.png',
      type: 'image/png',
      size: 1024,
      timestamp: 1700000000000,
      source: 'uploaded',
      isStandalone: true,
    },
    {
      id: 'item-2',
      name: 'notes.pdf',
      type: 'application/pdf',
      size: 2048,
      timestamp: 1700000001000,
      source: 'uploaded',
      isStandalone: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(dbService, 'getStandaloneLibraryFiles').mockResolvedValue(mockItems);
    vi.spyOn(dbService, 'getAllHistoricalSessionFiles').mockResolvedValue([]);
    vi.spyOn(dbService, 'fetchLibraryFileBlob').mockResolvedValue(new Blob(['test']));
    useChatStore.setState({ savedSessions: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders modal header, search input, and library items', async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    await act(async () => {
      renderer.root.render(<LibraryPickerModal isOpen onClose={onClose} onConfirm={onConfirm} />);
      await Promise.resolve();
    });

    const searchInput = document.body.querySelector('input[type="text"]');
    expect(searchInput).not.toBeNull();

    expect(document.body.textContent).toContain('diagram.png');
    expect(document.body.textContent).toContain('notes.pdf');
  });

  it('filters items by category tab', async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    await act(async () => {
      renderer.root.render(<LibraryPickerModal isOpen onClose={onClose} onConfirm={onConfirm} />);
      await Promise.resolve();
    });

    expect(document.body.textContent).toContain('diagram.png');
    expect(document.body.textContent).toContain('notes.pdf');

    // Click images tab
    const buttons = Array.from(document.body.querySelectorAll('button'));
    const imagesTab = buttons.find((b) => b.textContent?.includes('图片') || b.textContent?.includes('Images'));
    expect(imagesTab).toBeDefined();

    await act(async () => {
      imagesTab!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(document.body.textContent).toContain('diagram.png');
    expect(document.body.textContent).not.toContain('notes.pdf');
  });

  it('selects item and confirms import', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    await act(async () => {
      renderer.root.render(<LibraryPickerModal isOpen onClose={onClose} onConfirm={onConfirm} />);
      await Promise.resolve();
    });

    // Click on the first item to select it
    const card = Array.from(document.body.querySelectorAll('div')).find(
      (el) => el.textContent?.includes('diagram.png') && el.classList.contains('cursor-pointer'),
    );
    expect(card).toBeDefined();

    await act(async () => {
      card!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    // Find and click the confirm button
    const confirmButton = Array.from(document.body.querySelectorAll('button')).find(
      (b) =>
        (b.textContent?.includes('添加') || b.textContent?.toLowerCase().includes('add')) &&
        !b.hasAttribute('disabled'),
    );
    expect(confirmButton).toBeDefined();

    await act(async () => {
      confirmButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onConfirm).toHaveBeenCalledWith([mockItems[0]]);
    expect(onClose).toHaveBeenCalled();
  });

  it('double clicking an item triggers instant import', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    await act(async () => {
      renderer.root.render(<LibraryPickerModal isOpen onClose={onClose} onConfirm={onConfirm} />);
      await Promise.resolve();
    });

    const card = Array.from(document.body.querySelectorAll('div')).find(
      (el) => el.textContent?.includes('notes.pdf') && el.classList.contains('cursor-pointer'),
    );
    expect(card).toBeDefined();

    await act(async () => {
      card!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onConfirm).toHaveBeenCalledWith([mockItems[1]]);
    expect(onClose).toHaveBeenCalled();
  });
});

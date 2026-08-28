import { act } from 'react';
import { setupProviderTestRenderer } from '@/test/render/providerRenderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePdfNavStore } from '@/stores/pdfNavStore';
import { useChatStore } from '@/stores/chatStore';
import type { ChatMessage, UploadedFile } from '@/types';

import { PdfNavChip } from './PdfNavChip';

const makePdf = (id: string): UploadedFile => ({
  id,
  name: `${id}.pdf`,
  type: 'application/pdf',
  size: 10,
});

const resetStores = () => {
  usePdfNavStore.setState({ isOpen: false, activeFileId: null, targetPage: null, currentPage: 1, highlight: null });
  useChatStore.setState({ selectedFiles: [], activeMessages: [] });
};

describe('PdfNavChip', () => {
  const renderer = setupProviderTestRenderer({ providers: { language: 'en' } });
  beforeEach(resetStores);

  const renderChip = (isPdfNavEnabled: boolean, onToggle = vi.fn()) => {
    act(() => {
      renderer.root.render(<PdfNavChip isPdfNavEnabled={isPdfNavEnabled} onToggle={onToggle} />);
    });
    return renderer.container.querySelector<HTMLButtonElement>('[data-testid="pdf-nav-chip"]');
  };

  it('renders a pressed toggle chip with the PDF navigation label', () => {
    const chip = renderChip(true);
    expect(chip).not.toBeNull();
    expect(chip?.getAttribute('aria-pressed')).toBe('true');
    expect(chip?.textContent).toContain('PDF Navigation');
    expect(chip?.getAttribute('title')).toContain('PDF Navigation');
  });

  it('notifies the toggle handler on click', () => {
    const onToggle = vi.fn();
    const chip = renderChip(false, onToggle);
    act(() => {
      chip?.click();
    });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('hints at a missing PDF when the session has none', () => {
    const chip = renderChip(false);
    expect(chip?.getAttribute('title')).toContain('No PDF in this chat yet');
  });

  it('drops the no-PDF hint once a PDF is attached in the session', () => {
    const message: ChatMessage = {
      id: 'm1',
      role: 'user',
      content: '',
      timestamp: new Date(),
      files: [makePdf('report')],
    };
    useChatStore.setState({ activeMessages: [message] });
    const chip = renderChip(false);
    expect(chip?.getAttribute('title')).not.toContain('No PDF in this chat yet');
  });
});

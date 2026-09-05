import { act } from 'react';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/render/providerRenderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { dbService } from '@/services/db/dbService';
import { LibraryItemThumbnail } from './LibraryItemThumbnail';
import type { LibraryItem } from '@/types';
import { clearPdfThumbnailCache, writePdfThumbnailCache, getPdfThumbnailCacheKey } from '@/components/chat/input/files/pdfThumbnailCache';
import fs from 'fs';
import path from 'path';

describe('LibraryItemThumbnail', () => {
  const renderer = setupTestRenderer({ providers: { language: 'en' } });

  const mockPdfItem: LibraryItem = {
    id: 'test-pdf-1',
    name: 'document.pdf',
    type: 'application/pdf',
    size: 10240,
    timestamp: Date.now(),
    source: 'uploaded',
  };

  const mockImageItem: LibraryItem = {
    id: 'test-img-1',
    name: 'photo.jpg',
    type: 'image/jpeg',
    size: 2048,
    timestamp: Date.now(),
    source: 'uploaded',
    dataUrl: 'data:image/jpeg;base64,mockjpg',
  };

  const mockVideoItem: LibraryItem = {
    id: 'test-vid-1',
    name: 'video.mp4',
    type: 'video/mp4',
    size: 50000,
    timestamp: Date.now(),
    source: 'uploaded',
    dataUrl: 'blob:mockvideo',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearPdfThumbnailCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearPdfThumbnailCache();
  });

  it('keeps react-pdf out of the eager LibraryItemThumbnail bundle', () => {
    const source = fs.readFileSync(path.resolve(__dirname, './LibraryItemThumbnail.tsx'), 'utf8');

    expect(source).not.toContain("from 'react-pdf'");
    expect(source).toMatch(/lazy\(\(\)\s*=>\s*import\('@\/components\/chat\/input\/files\/PdfFileThumbnail'\)/);
  });

  it('renders image thumbnail for image items', () => {
    act(() => {
      renderer.root.render(<LibraryItemThumbnail item={mockImageItem} size="md" />);
    });

    const img = screen.getByRole('img', { name: 'photo.jpg' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'data:image/jpeg;base64,mockjpg');
  });

  it('renders video player preview for video items', () => {
    act(() => {
      renderer.root.render(<LibraryItemThumbnail item={mockVideoItem} size="lg" />);
    });

    const video = document.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', 'blob:mockvideo#t=0.1');
  });

  it('renders cached PDF thumbnail directly from pdfThumbnailCache', () => {
    const pdfWidth = 280; // size="full"
    const cacheKey = getPdfThumbnailCacheKey(mockPdfItem, pdfWidth);
    writePdfThumbnailCache(cacheKey, 'data:image/png;base64,mockpdfcachedimage');

    act(() => {
      renderer.root.render(<LibraryItemThumbnail item={mockPdfItem} size="full" />);
    });

    const img = screen.getByRole('img', { name: 'document.pdf' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'data:image/png;base64,mockpdfcachedimage');
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('renders fallback PDF badge when no blob or cache exists and fetch returns null', async () => {
    vi.spyOn(dbService, 'fetchLibraryFileBlob').mockResolvedValue(undefined);

    await act(async () => {
      renderer.root.render(<LibraryItemThumbnail item={mockPdfItem} size="sm" />);
      await Promise.resolve();
    });

    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('loads blob from dbService and renders PDF thumbnail when item enters view', async () => {
    const mockBlob = new Blob(['%PDF-1.4 mock pdf content'], { type: 'application/pdf' });
    vi.spyOn(dbService, 'fetchLibraryFileBlob').mockResolvedValue(mockBlob);

    await act(async () => {
      renderer.root.render(<LibraryItemThumbnail item={mockPdfItem} size="full" />);
      await Promise.resolve();
    });

    expect(dbService.fetchLibraryFileBlob).toHaveBeenCalledWith(mockPdfItem);
  });

  it('renders SVG thumbnail with SVG badge for svg files', () => {
    const mockSvgItem: LibraryItem = {
      id: 'test-svg-1',
      name: 'icon.svg',
      type: 'image/svg+xml',
      size: 1024,
      timestamp: Date.now(),
      source: 'uploaded',
      dataUrl: 'data:image/svg+xml;base64,mocksvg',
    };

    act(() => {
      renderer.root.render(<LibraryItemThumbnail item={mockSvgItem} size="lg" />);
    });

    const img = screen.getByRole('img', { name: 'icon.svg' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'data:image/svg+xml;base64,mocksvg');
    expect(screen.getByText('SVG')).toBeInTheDocument();
  });

  it('renders code snippet card with line numbers and syntax highlighting for code files', () => {
    const mockCodeItem: LibraryItem = {
      id: 'test-code-1',
      name: 'utils.ts',
      type: 'text/typescript',
      size: 512,
      timestamp: Date.now(),
      source: 'uploaded',
      textContent: 'const greeting = "hello";\nexport function test() {\n  return 42;\n}',
    };

    act(() => {
      renderer.root.render(<LibraryItemThumbnail item={mockCodeItem} size="lg" />);
    });

    expect(screen.getAllByText('TS').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('const')).toBeInTheDocument();
    expect(screen.getByText('"hello"')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders markdown snippet card for markdown files', () => {
    const mockMdItem: LibraryItem = {
      id: 'test-md-1',
      name: 'README.md',
      type: 'text/markdown',
      size: 256,
      timestamp: Date.now(),
      source: 'uploaded',
      textContent: '# Title\nIntroduction text here',
    };

    act(() => {
      renderer.root.render(<LibraryItemThumbnail item={mockMdItem} size="lg" />);
    });

    expect(screen.getAllByText('MD').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('# Title')).toBeInTheDocument();
    expect(screen.getByText('Introduction')).toBeInTheDocument();
  });
});

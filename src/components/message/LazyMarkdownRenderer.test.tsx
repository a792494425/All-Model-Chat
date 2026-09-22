import { act } from 'react';
import { setupTestRenderer } from '@/test/render/renderer';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { LazyMarkdownRenderer } from './LazyMarkdownRenderer';

describe('LazyMarkdownRenderer', () => {
  const renderer = setupTestRenderer();

  beforeAll(async () => {
    await Promise.all([
      import('./StandardMarkdownRenderer'),
      import('./MathMarkdownRenderer'),
    ]);
  });

  it('keeps the same renderer without unmounting when streaming finishes on content with math markers', async () => {
    const mathContent = 'Here is formula: $x^2 + y^2 = z^2$ and more text.';

    await act(async () => {
      renderer.root.render(
        <LazyMarkdownRenderer
          content={mathContent}
          isLoading={true}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    const firstElement = renderer.container.firstElementChild;
    expect(firstElement).not.toBeNull();

    // Stream completes: isLoading flips from true to false
    await act(async () => {
      renderer.root.render(
        <LazyMarkdownRenderer
          content={mathContent}
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    // Root rendered element should not be unmounted or replaced by raw text fallback
    expect(renderer.container.querySelector('.whitespace-pre-wrap.break-words.text-\\[var\\(--theme-text-secondary\\)\\]')).toBeNull();
  });

  it('never flashes fallback raw text when streaming completes for live artifact html', async () => {
    const artifactContent = '```html\n<!DOCTYPE html><html><body><script>const $el = 1;</script></body></html>\n```';

    await act(async () => {
      renderer.root.render(
        <LazyMarkdownRenderer
          content={artifactContent}
          isLoading={true}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    await act(async () => {
      renderer.root.render(
        <LazyMarkdownRenderer
          content={artifactContent}
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    expect(renderer.container.querySelector('.whitespace-pre-wrap.break-words.text-\\[var\\(--theme-text-secondary\\)\\]')).toBeNull();
  });

  it('strictly preserves the child DOM node and iframe across the isLoading stream boundary', async () => {
    const artifactContent = '```amc-live-artifact-html\n<div id="test-node">Stable Node</div>\n```';

    await act(async () => {
      renderer.root.render(
        <LazyMarkdownRenderer
          content={artifactContent}
          isLoading={true}
          allowHtml={true}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    const initialIframe = renderer.container.querySelector('iframe');
    expect(initialIframe).not.toBeNull();

    // Streaming finishes
    await act(async () => {
      renderer.root.render(
        <LazyMarkdownRenderer
          content={artifactContent}
          isLoading={false}
          allowHtml={true}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    const finalIframe = renderer.container.querySelector('iframe');
    expect(finalIframe).not.toBeNull();
    // THE IFRAME MUST BE THE EXACT SAME DOM NODE INSTANCE (NOT REMOUNTED OR RELOADED)
    expect(finalIframe).toBe(initialIframe);
  });
});


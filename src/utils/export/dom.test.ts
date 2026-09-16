import { describe, expect, it, vi } from 'vitest';
import { sanitizeCssColorFunctionsForPngExport, sanitizeDocumentStylesForPngExport } from './cssColorSanitizer';
import { wrapGetComputedStyleWithColorSanitizer } from './image';
import { prepareElementForExport } from './dom';

describe('sanitizeCssColorFunctionsForPngExport', () => {
  it('converts Tailwind oklch palette variables into rgba', () => {
    const css = `
      :root {
        --color-blue-500: oklch(62.3% .214 259.815);
      }

      .text-blue-500 {
        color: var(--color-blue-500);
      }
    `;

    const sanitized = sanitizeCssColorFunctionsForPngExport(css);

    expect(sanitized).not.toContain('oklch');
    expect(sanitized).toContain('--color-blue-500: rgba(43, 127, 255, 1)');
  });

  it('converts Tailwind color-mix oklab theme opacity colors into rgba', () => {
    const css = `
      .bg-quiet {
        background-color: color-mix(in oklab, var(--theme-bg-tertiary) 20%, transparent);
        border-color: color-mix(in oklab, transparent 40%, var(--theme-border-secondary));
      }
    `;

    const sanitized = sanitizeCssColorFunctionsForPngExport(css, {
      resolveCssVariable: (name) =>
        ({
          '--theme-bg-tertiary': '#18181b',
          '--theme-border-secondary': '#27272a',
        })[name] ?? '',
    });

    expect(sanitized).not.toContain('oklab');
    expect(sanitized).not.toContain('color-mix');
    expect(sanitized).toContain('rgba(24, 24, 27, 0.2)');
    expect(sanitized).toContain('rgba(39, 39, 42, 0.6)');
  });

  it('converts color(srgb ...) and color(display-p3 ...) functions into rgba', () => {
    const css = `
      .card {
        color: color(srgb 1 0.5 0 / 0.8);
        background: color(display-p3 1 0 0);
        border-color: color(srgb 0.2 0.4 0.6);
      }
    `;

    const sanitized = sanitizeCssColorFunctionsForPngExport(css);

    expect(sanitized).not.toContain('color(srgb');
    expect(sanitized).not.toContain('color(display-p3');
    expect(sanitized).toContain('color: rgba(255, 128, 0, 0.8)');
    expect(sanitized).toContain('background: rgba(255, 0, 0, 1)');
    expect(sanitized).toContain('border-color: rgba(51, 102, 153, 1)');
  });

  it('converts oklab and hwb color functions into rgba', () => {
    const css = `
      .tag {
        color: oklab(0.6 0.1 -0.1 / 0.9);
        background: hwb(0 0% 0%);
      }
    `;

    const sanitized = sanitizeCssColorFunctionsForPngExport(css);

    expect(sanitized).not.toContain('oklab(');
    expect(sanitized).not.toContain('hwb(');
    expect(sanitized).toContain('background: rgba(255, 0, 0, 1)');
    expect(sanitized).toMatch(/color:\s*rgba\(\d+,\s*\d+,\s*\d+,\s*0\.9\)/);
  });

  it('preserves property names ending in color: without treating them as functions', () => {
    const css = `
      .box {
        border-color: #ff0000;
        outline-color: #00ff00;
        background: color(srgb 0 0 1);
      }
    `;

    const sanitized = sanitizeCssColorFunctionsForPngExport(css);

    expect(sanitized).toContain('border-color: #ff0000;');
    expect(sanitized).toContain('outline-color: #00ff00;');
    expect(sanitized).toContain('background: rgba(0, 0, 255, 1);');
  });
});

describe('sanitizeDocumentStylesForPngExport', () => {
  it('sanitizes style elements, inline style attributes, and SVG presentation attributes', () => {
    const doc = document.implementation.createHTMLDocument('test');
    const styleEl = doc.createElement('style');
    styleEl.textContent = '.bg { background-color: color(display-p3 1 0 0); }';
    doc.head.appendChild(styleEl);

    const div = doc.createElement('div');
    div.setAttribute('style', 'color: color(srgb 0 1 0); border-color: oklch(62.3% .214 259.815);');
    doc.body.appendChild(div);

    const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'color(srgb 0 0 1)');
    path.setAttribute('stroke', 'oklab(0.5 0.1 0.1)');
    svg.appendChild(path);
    doc.body.appendChild(svg);

    sanitizeDocumentStylesForPngExport(doc);

    expect(styleEl.textContent).not.toContain('color(display-p3');
    expect(styleEl.textContent).toContain('rgba(255, 0, 0, 1)');

    expect(div.getAttribute('style')).not.toContain('color(srgb');
    expect(div.getAttribute('style')).not.toContain('oklch');
    expect(div.getAttribute('style')).toContain('rgba(0, 255, 0, 1)');

    expect(path.getAttribute('fill')).toBe('rgba(0, 0, 255, 1)');
    expect(path.getAttribute('stroke')).not.toContain('oklab');
    expect(path.getAttribute('stroke')).toMatch(/^rgba\(/);
  });
});

describe('wrapGetComputedStyleWithColorSanitizer', () => {
  it('intercepts getComputedStyle and converts modern color functions to rgba', () => {
    const original = window.getComputedStyle;
    const dummyDeclaration = {
      color: 'color(display-p3 1 0 0)',
      backgroundColor: 'oklch(62.3% .214 259.815)',
      fontSize: '16px',
      getPropertyValue: (prop: string) => {
        if (prop === 'color') return 'color(display-p3 1 0 0)';
        if (prop === 'background-color') return 'oklch(62.3% .214 259.815)';
        if (prop === 'font-size') return '16px';
        return '';
      },
    };

    const mockGetComputedStyle = vi.fn().mockReturnValue(dummyDeclaration) as any;
    window.getComputedStyle = mockGetComputedStyle;

    const restore = wrapGetComputedStyleWithColorSanitizer(window);

    try {
      const computed = window.getComputedStyle(document.body);
      expect(computed.color).toBe('rgba(255, 0, 0, 1)');
      expect(computed.getPropertyValue('color')).toBe('rgba(255, 0, 0, 1)');
      expect(computed.getPropertyValue('background-color')).toContain('rgba(43, 127, 255, 1)');
      expect(computed.fontSize).toBe('16px');
      expect(computed.getPropertyValue('font-size')).toBe('16px');
    } finally {
      restore();
      expect(window.getComputedStyle).toBe(mockGetComputedStyle);
      window.getComputedStyle = original;
    }
  });
});

describe('prepareElementForExport', () => {
  // Builds a Live Artifact frame the same way React renders <div data-artifact-source={html}>:
  // the attribute is set via setAttribute (properly escaped), not parsed from an innerHTML string,
  // so the raw HTML source survives getAttribute() round-trips.
  const buildArtifactFrame = (html: string, height = '200px'): HTMLElement => {
    const frame = document.createElement('div');
    frame.setAttribute('data-live-artifact-frame', 'true');
    frame.setAttribute('data-artifact-source', html);

    const viewport = document.createElement('div');
    viewport.setAttribute('data-live-artifact-viewport', 'true');
    viewport.style.height = height;

    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-modals allow-downloads');
    iframe.setAttribute('srcdoc', '<div>Artifact</div>');
    viewport.appendChild(iframe);
    frame.appendChild(viewport);
    return frame;
  };

  it('replaces iframe srcdoc with static snapshot when forPng=false (HTML export path)', async () => {
    const container = document.createElement('div');
    container.appendChild(buildArtifactFrame('<div>Hello HTML Export</div>'));

    const clone = await prepareElementForExport(container, {
      expandDetails: false,
      forPng: false,
    });

    const iframe = clone.querySelector('iframe');
    expect(iframe).toBeNull();

    const snapshotContainer = clone.querySelector('.is-exporting-png');
    expect(snapshotContainer).not.toBeNull();
    expect(snapshotContainer?.textContent).toContain('Hello HTML Export');
  });

  it('replaces iframe srcdoc with static snapshot when forPng=true (PNG export path)', async () => {
    const container = document.createElement('div');
    container.appendChild(buildArtifactFrame('<div>Hello Artifact</div>'));

    const clone = await prepareElementForExport(container, {
      expandDetails: false,
      forPng: true,
    });

    const iframe = clone.querySelector('iframe');
    expect(iframe).toBeNull();

    const snapshotContainer = clone.querySelector('.is-exporting-png');
    expect(snapshotContainer).not.toBeNull();
    expect(snapshotContainer?.textContent).toContain('Hello Artifact');
  });

  it('skips iframe replacement when data-artifact-source is missing', async () => {
    const container = document.createElement('div');
    const frame = buildArtifactFrame('<div>With Source</div>');
    frame.removeAttribute('data-artifact-source');
    container.appendChild(frame);

    const clone = await prepareElementForExport(container, {
      expandDetails: false,
      forPng: true,
    });

    const iframe = clone.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute('srcdoc')).toContain('Artifact');
  });

  it('hydrates chart and graphviz declarations in the static snapshot container for HTML export', async () => {
    const artifactSource = `
      <div data-amc-chart='{"xAxis":{"type":"category","data":["A","B"]},"yAxis":{"type":"value"},"series":[{"type":"bar","data":[1,2]}]}' style="height:250px;"></div>
      <div data-amc-graphviz='digraph { a -> b; }'></div>
    `;
    const container = document.createElement('div');
    container.appendChild(buildArtifactFrame(artifactSource));

    const clone = await prepareElementForExport(container, {
      expandDetails: false,
      forPng: false,
    });

    expect(clone.querySelector('iframe')).toBeNull();
    const snapshotContainer = clone.querySelector('.is-exporting-png') as HTMLElement;
    expect(snapshotContainer).not.toBeNull();
    expect(snapshotContainer?.querySelectorAll('svg').length).toBeGreaterThanOrEqual(1);
    expect(snapshotContainer?.style.background).toBe('transparent');
    expect(snapshotContainer?.style.height).toBe('auto');
    expect(snapshotContainer?.style.overflow).toBe('visible');
  });

  it('expands code blocks and removes overlays even when expandDetails is false', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="code-block-container">
        <pre style="max-height: 320px; overflow: hidden; height: 320px;"><code>const code = true;</code></pre>
        <div class="code-block-expand-overlay"><button>Show more</button></div>
      </div>
    `;

    const clone = await prepareElementForExport(container, {
      expandDetails: false,
      forPng: false,
    });

    expect(clone.querySelector('.code-block-expand-overlay')).toBeNull();
    const pre = clone.querySelector('pre');
    expect(pre?.style.maxHeight).toBe('none');
    expect(pre?.style.height).toBe('auto');
    expect(pre?.style.overflow).toBe('visible');
  });

  it('un-collapses user messages in export snapshots', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div data-user-message-collapsed="true">
        <div id="msg-1-message-text" class="overflow-hidden" style="max-height: 211.2px;">
          <p>Long user prompt here...</p>
        </div>
        <button type="button">Expand</button>
      </div>
    `;

    const clone = await prepareElementForExport(container, {
      expandDetails: false,
      forPng: false,
    });

    expect(clone.querySelector('[data-user-message-collapsed]')).toBeNull();
    expect(clone.querySelector('button')).toBeNull();
    const inner = clone.querySelector<HTMLElement>('#msg-1-message-text');
    expect(inner?.classList.contains('overflow-hidden')).toBe(false);
    expect(inner?.style.maxHeight).toBe('none');
    expect(inner?.style.height).toBe('auto');
  });

  it('strips thinking records and chain of thought by default', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="message-thoughts-block">
        <div class="group rounded-xl">
          <div class="thinking-header-row" role="button">
            <span>Thinking Process</span>
          </div>
          <div class="thought-process-accordion">
            <div class="thought-process-inner">
              <p>Step-by-step reasoning</p>
            </div>
          </div>
        </div>
      </div>
      <div class="message-content">Actual Answer</div>
    `;

    const clone = await prepareElementForExport(container, {
      expandDetails: false,
      forPng: false,
    });

    expect(clone.querySelector('.message-thoughts-block')).toBeNull();
    expect(clone.querySelector('.thought-process-accordion')).toBeNull();
    expect(clone.querySelector('details')).toBeNull();
    expect(clone.textContent).toContain('Actual Answer');
    expect(clone.textContent).not.toContain('Step-by-step reasoning');
  });

  it('transforms thought-process-accordion into native details/summary for HTML export when includeThoughts is true', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="message-thoughts-block">
        <div class="group rounded-xl">
          <div class="thinking-header-row" role="button">
            <span>Thinking Process</span>
            <svg class="transition-transform rotate-180"></svg>
          </div>
          <div class="thought-process-accordion">
            <div class="thought-process-inner">
              <p>Step-by-step reasoning</p>
            </div>
          </div>
        </div>
      </div>
    `;

    const clone = await prepareElementForExport(container, {
      expandDetails: false,
      forPng: false,
      includeThoughts: true,
    });

    const details = clone.querySelector('details');
    expect(details).not.toBeNull();
    expect(details?.getAttribute('open')).toBeNull();
    const summary = details?.querySelector('summary');
    expect(summary?.textContent).toContain('Thinking Process');
    expect(details?.textContent).toContain('Step-by-step reasoning');
  });

  it('embeds audio elements with data URIs for offline self-contained HTML', async () => {
    const originalFetch = global.fetch;
    const dummyBlob = new Blob(['dummy audio'], { type: 'audio/mp3' });
    global.fetch = vi.fn().mockResolvedValue({
      blob: async () => dummyBlob,
    } as any);

    try {
      const container = document.createElement('div');
      container.innerHTML = `
        <audio src="blob:http://localhost:3000/audio-uuid"></audio>
      `;

      const clone = await prepareElementForExport(container, {
        expandDetails: false,
        forPng: false,
      });

      const audio = clone.querySelector('audio');
      expect(audio?.getAttribute('src')).toMatch(/^data:audio\/mp3;/);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

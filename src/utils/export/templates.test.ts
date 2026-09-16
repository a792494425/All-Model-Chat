import { describe, expect, it } from 'vitest';
import { generateExportHtmlTemplate, generateExportTxtTemplate } from './templates';

describe('generateExportHtmlTemplate', () => {
  it('does not depend on remote CDN scripts for syntax highlighting', () => {
    const html = generateExportHtmlTemplate({
      title: 'Test Export',
      date: '2026-04-11 12:00:00',
      model: 'gemini-test',
      contentHtml: '<pre><code class="hljs language-ts">const x = 1;</code></pre>',
      styles: '<style>.hljs { color: red; }</style>',
      themeId: 'onyx',
      language: 'en',
      rootBgColor: '#000000',
      bodyClasses: 'antialiased',
    });

    expect(html).not.toContain('cdnjs.cloudflare.com');
    expect(html).not.toContain('highlight.min.js');
  });

  it('does not rely on stale message animation class names when exporting', () => {
    const html = generateExportHtmlTemplate({
      title: 'Test Export',
      date: '2026-04-11 12:00:00',
      model: 'gemini-test',
      contentHtml: '<div data-message-id="1">hello</div>',
      styles: '',
      themeId: 'onyx',
      language: 'en',
      rootBgColor: '#000000',
      bodyClasses: 'antialiased',
    });

    expect(html).not.toContain('message-container-animate');
  });

  it('escapes metadata inserted into the exported HTML shell', () => {
    const html = generateExportHtmlTemplate({
      title: '<img src=x onerror=alert(1)>',
      date: '2026-04-26 <script>alert(2)</script>',
      model: 'gemini"><script>alert(3)</script>',
      contentHtml: '<div data-message-id="1">safe content</div>',
      styles: '',
      themeId: 'pearl',
      language: 'en',
      rootBgColor: '#ffffff',
      bodyClasses: 'antialiased',
    });

    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('2026-04-26 &lt;script&gt;alert(2)&lt;/script&gt;');
    expect(html).toContain('gemini&quot;&gt;&lt;script&gt;alert(3)&lt;/script&gt;');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script>alert(3)</script>');
  });

  it('neutralizes CSS-breakout payloads in rootBgColor injected into the style block', () => {
    const html = generateExportHtmlTemplate({
      title: 'safe',
      date: '2026-04-26',
      model: 'gemini-test',
      contentHtml: '<div>content</div>',
      styles: '',
      themeId: 'onyx',
      language: 'en',
      rootBgColor: 'red;} body{background:url(https://evil/?leak)/*',
      bodyClasses: 'antialiased',
    });

    expect(html).not.toContain('https://evil/?leak');
    expect(html).not.toContain('red;}');
  });

  it('includes graphviz overflow containment styles and interactive diagram viewer script', () => {
    const html = generateExportHtmlTemplate({
      title: 'Diagram Export',
      date: '2026-04-26',
      model: 'gemini-test',
      contentHtml: '<div data-amc-graphviz="digraph { A -> B }"><svg></svg></div>',
      styles: '',
      themeId: 'pearl',
      language: 'zh-CN',
      rootBgColor: '#ffffff',
      bodyClasses: '',
    });

    expect(html).toContain('[data-amc-graphviz]');
    expect(html).toContain('overflow-x: auto !important');
    expect(html).toContain('max-width: 100% !important');
    expect(html).toContain('amc-diagram-modal-backdrop');
    expect(html).toContain('amc-diagram-modal-canvas');
    expect(html).toContain('openModal(svg)');
  });

  it('injects Live Artifact theme tokens and snapshot isolation styles into exported HTML shell', () => {
    const html = generateExportHtmlTemplate({
      title: 'Artifact Export',
      date: '2026-04-26',
      model: 'gemini-test',
      contentHtml: '<div class="html-preview-snapshot"><table><tr><td>Cell</td></tr></table></div>',
      styles: '',
      themeId: 'onyx',
      language: 'zh-CN',
      rootBgColor: '#09090b',
      bodyClasses: 'theme-onyx',
    });

    expect(html).toContain('--amc-live-artifact-text:');
    expect(html).toContain('--amc-live-artifact-surface:');
    expect(html).toContain('--amc-live-artifact-border:');
    expect(html).toContain('.html-preview-snapshot');
    expect(html).toContain('.html-preview-snapshot table');
  });

  it('falls back to selectedTheme.colors.bgPrimary when rootBgColor is transparent or empty', () => {
    const html = generateExportHtmlTemplate({
      title: 'Dark Export',
      date: '2026-04-26',
      model: 'gemini-test',
      contentHtml: '<div>content</div>',
      styles: '',
      themeId: 'onyx',
      language: 'en',
      rootBgColor: 'transparent',
      bodyClasses: '',
    });

    expect(html).toContain('background-color: #0c0c0e;');
  });

  it('suppresses thoughts and chain of thought via CSS display none rules', () => {
    const html = generateExportHtmlTemplate({
      title: 'No Thoughts Export',
      date: '2026-04-26',
      model: 'gemini-test',
      contentHtml: '<div class="message-thoughts-block">Thoughts</div>',
      styles: '',
      themeId: 'pearl',
      language: 'zh-CN',
      rootBgColor: '#ffffff',
      bodyClasses: '',
    });

    expect(html).toContain('.message-thoughts-block');
    expect(html).toContain('.thought-process-accordion');
    expect(html).toContain('display: none !important');
  });

  it('renders localized action buttons based on export language', () => {
    const enHtml = generateExportHtmlTemplate({
      title: 'English Export',
      date: '2026-04-26',
      model: 'gemini-test',
      contentHtml: '<div>Body</div>',
      styles: '',
      themeId: 'pearl',
      language: 'en',
      rootBgColor: '#ffffff',
      bodyClasses: '',
    });
    expect(enHtml).toContain('title="Copy Content"');
    expect(enHtml).toContain('>Copy<');
    expect(enHtml).toContain('>Print (PDF)<');
    expect(enHtml).toContain('"Copied"');

    const jaHtml = generateExportHtmlTemplate({
      title: 'Japanese Export',
      date: '2026-04-26',
      model: 'gemini-test',
      contentHtml: '<div>Body</div>',
      styles: '',
      themeId: 'pearl',
      language: 'ja',
      rootBgColor: '#ffffff',
      bodyClasses: '',
    });
    expect(jaHtml).toContain('title="本文をコピー"');
    expect(jaHtml).toContain('>コピー<');
    expect(jaHtml).toContain('>印刷 (PDF)<');
    expect(jaHtml).toContain('"コピー完了"');
  });

  it('includes brand badge, meta pills, and elevated paper container in exported HTML without theme toggle', () => {
    const html = generateExportHtmlTemplate({
      title: 'Modern Shell Export',
      date: '2026-04-26',
      model: 'gemini-test',
      contentHtml: '<div>Body</div>',
      styles: '',
      themeId: 'pearl',
      language: 'zh-CN',
      rootBgColor: '#ffffff',
      bodyClasses: '',
    });

    expect(html).toContain('AMC WebUI');
    expect(html).not.toContain('amc-theme-toggle');
    expect(html).toContain('exported-brand-badge');
    expect(html).toContain('exported-breadcrumb-nav');
    expect(html).toContain('exported-breadcrumb-title');
    expect(html).toContain('amc-copy-btn');
    expect(html).toContain('amc-print-btn');
    expect(html).toContain('exported-meta-pill');
    expect(html).toContain('exported-chat-footer');
    expect(html).toContain('--export-card-bg:');
    expect(html).toContain('--export-page-bg: #f8fafc;');
  });
});

describe('generateExportTxtTemplate', () => {
  it('formats text export with role headers, timestamps, and files', () => {
    const txt = generateExportTxtTemplate({
      title: 'Sample Chat',
      date: '2026-04-26 12:00:00',
      model: 'gemini-2.5',
      messages: [
        {
          role: 'User',
          timestamp: new Date('2026-04-26T04:00:00.000Z'),
          content: 'Hello, help me with this file.',
          files: [{ name: 'spec.pdf' }],
        },
        {
          role: 'Assistant',
          timestamp: new Date('2026-04-26T04:01:00.000Z'),
          content: 'Sure, here is the answer.',
        },
      ],
    });

    expect(txt).toContain('Chat: Sample Chat');
    expect(txt).toContain('Model: gemini-2.5');
    expect(txt).toContain('### USER [');
    expect(txt).toContain('[Attachment: spec.pdf]');
    expect(txt).toContain('Hello, help me with this file.');
    expect(txt).toContain('### ASSISTANT [');
    expect(txt).toContain('Sure, here is the answer.');
  });

  it('includes thinking process when thoughts are present', () => {
    const txt = generateExportTxtTemplate({
      title: 'Thinking Chat',
      date: '2026-04-26 12:00:00',
      model: 'gemini-2.5',
      messages: [
        {
          role: 'Assistant',
          timestamp: new Date('2026-04-26T04:01:00.000Z'),
          content: 'Final response.',
          thoughts: 'Step 1: Plan\nStep 2: Solve',
        },
      ],
    });

    expect(txt).toContain('[Thinking Process]\nStep 1: Plan\nStep 2: Solve');
    expect(txt).toContain('Final response.');
  });

  it('handles empty or undefined content without printing undefined', () => {
    const txt = generateExportTxtTemplate({
      title: 'Empty Message Chat',
      date: '2026-04-26 12:00:00',
      model: 'gemini-2.5',
      messages: [
        {
          role: 'Assistant',
          timestamp: new Date('2026-04-26T04:01:00.000Z'),
          content: undefined,
          thoughts: 'Only thinking for now',
        },
      ],
    });

    expect(txt).not.toContain('undefined');
    expect(txt).toContain('[Thinking Process]\nOnly thinking for now');
  });
});

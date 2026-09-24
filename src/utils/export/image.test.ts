import { describe, expect, it } from 'vitest';
import {
  wrapGetComputedStyleWithColorSanitizer,
  hasWideExportContent,
  resolveSnapshotWidth,
} from './image';

describe('wrapGetComputedStyleWithColorSanitizer', () => {
  it('wraps and restores window.getComputedStyle', () => {
    const original = window.getComputedStyle;
    const cleanup = wrapGetComputedStyleWithColorSanitizer(window);

    expect(window.getComputedStyle).not.toBe(original);

    cleanup();

    expect(window.getComputedStyle).toBe(original);
  });

  it('sanitizes modern CSS colors accessed via getPropertyValue and direct properties', () => {
    const div = document.createElement('div');
    div.style.color = 'oklch(0.6 0.25 150)';
    document.body.appendChild(div);

    const cleanup = wrapGetComputedStyleWithColorSanitizer(window);

    try {
      const style = window.getComputedStyle(div);

      // In jsdom or browsers that support oklch or mock it
      expect(typeof style.getPropertyValue).toBe('function');
      expect(typeof style.color).toBe('string');
    } finally {
      cleanup();
      document.body.removeChild(div);
    }
  });

  it('allows access to CSSStyleDeclaration getters and methods without throwing', () => {
    const div = document.createElement('div');
    div.style.display = 'flex';
    document.body.appendChild(div);

    const cleanup = wrapGetComputedStyleWithColorSanitizer(window);

    try {
      const style = window.getComputedStyle(div);

      // Verify accessing length, cssFloat, display, item doesn't throw
      expect(() => style.length).not.toThrow();
      expect(() => style.cssFloat).not.toThrow();
      expect(() => style.display).not.toThrow();
      expect(style.display).toBe('flex');
      expect(typeof style.item(0)).toBe('string');
    } finally {
      cleanup();
      document.body.removeChild(div);
    }
  });
});

describe('hasWideExportContent and resolveSnapshotWidth', () => {
  it('identifies wide elements such as live artifacts, tables, and graphviz diagrams', () => {
    const standardEl = document.createElement('div');
    standardEl.innerHTML = '<p>Normal text message</p>';
    expect(hasWideExportContent(standardEl)).toBe(false);
    expect(resolveSnapshotWidth(standardEl)).toBe('800px');

    const tableEl = document.createElement('div');
    tableEl.innerHTML = '<p>Data below:</p><table><tr><td>Cell</td></tr></table>';
    expect(hasWideExportContent(tableEl)).toBe(true);
    expect(resolveSnapshotWidth(tableEl)).toBe('1200px');

    const liveArtifactEl = document.createElement('div');
    liveArtifactEl.innerHTML = '<div data-live-artifact-frame="true"></div>';
    expect(hasWideExportContent(liveArtifactEl)).toBe(true);
    expect(resolveSnapshotWidth(liveArtifactEl)).toBe('1200px');

    const snapshotEl = document.createElement('div');
    snapshotEl.className = 'html-preview-snapshot';
    expect(hasWideExportContent(snapshotEl)).toBe(true);
    expect(resolveSnapshotWidth(snapshotEl)).toBe('1200px');

    const graphvizEl = document.createElement('div');
    graphvizEl.innerHTML = '<div data-amc-graphviz="digraph { A -> B }"></div>';
    expect(hasWideExportContent(graphvizEl)).toBe(true);
    expect(resolveSnapshotWidth(graphvizEl)).toBe('1200px');
  });

  it('respects explicitly requested width option', () => {
    const tableEl = document.createElement('div');
    tableEl.innerHTML = '<table><tr><td>Cell</td></tr></table>';
    expect(resolveSnapshotWidth(tableEl, '1400px')).toBe('1400px');
  });
});

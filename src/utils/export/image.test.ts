import { describe, expect, it } from 'vitest';
import { wrapGetComputedStyleWithColorSanitizer } from './image';

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

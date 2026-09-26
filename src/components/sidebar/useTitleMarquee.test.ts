import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTitleMarquee, MIN_TITLE_REVEAL_PX } from './useTitleMarquee';

describe('useTitleMarquee', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not scroll if range is <= MIN_TITLE_REVEAL_PX', () => {
    const el = document.createElement('span');
    Object.defineProperty(el, 'clientWidth', { value: 100, configurable: true });
    Object.defineProperty(el, 'scrollWidth', { value: 100 + MIN_TITLE_REVEAL_PX, configurable: true });
    const ref = { current: el };

    const { result } = renderHook(() => useTitleMarquee(ref));
    act(() => {
      result.current.onPointerEnter();
    });

    expect(el.hasAttribute('data-scrolled')).toBe(false);
  });

  it('jumps directly to range if prefers-reduced-motion is true', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const el = document.createElement('span');
    Object.defineProperty(el, 'clientWidth', { value: 100, configurable: true });
    Object.defineProperty(el, 'scrollWidth', { value: 200, configurable: true });
    const ref = { current: el };

    const { result } = renderHook(() => useTitleMarquee(ref));
    act(() => {
      result.current.onPointerEnter();
    });

    expect(el.scrollLeft).toBe(100);
    expect(el.hasAttribute('data-scrolled')).toBe(true);
    expect(el.hasAttribute('data-clipped')).toBe(false);

    window.matchMedia = originalMatchMedia;
  });

  it('resets immediately on pointer leave', () => {
    const el = document.createElement('span');
    Object.defineProperty(el, 'clientWidth', { value: 100, configurable: true });
    Object.defineProperty(el, 'scrollWidth', { value: 200, configurable: true });
    const ref = { current: el };

    const { result } = renderHook(() => useTitleMarquee(ref));
    act(() => {
      result.current.onPointerEnter();
    });

    act(() => {
      result.current.onPointerLeave();
    });

    expect(el.scrollLeft).toBe(0);
    expect(el.hasAttribute('data-scrolled')).toBe(false);
    expect(el.hasAttribute('data-clipped')).toBe(false);
  });
});

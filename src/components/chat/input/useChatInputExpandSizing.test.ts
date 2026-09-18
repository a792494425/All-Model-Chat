import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useChatInputExpandSizing } from './useChatInputExpandSizing';

describe('useChatInputExpandSizing cherry parity', () => {
  it('exposes restoreDefaultHeight and compact styles', () => {
    const { result } = renderHook(() =>
      useChatInputExpandSizing({
        fontSize: 14,
        isExpanded: false,
        onExpandedChange: vi.fn(),
        focusEditor: vi.fn(),
        minHeight: 46,
      }),
    );
    expect(result.current.restoreDefaultHeight).toBeDefined();
    expect(result.current.compactFrameStyle).toBeDefined();
    expect(result.current.editorContentStyle).toBeDefined();
    expect(result.current.editorElementStyle).toContain('var(--composer-editor-max-height)');
  });
  it('Home/End/Arrow handle', () => {
    const onExpandedChange = vi.fn();
    const { result } = renderHook(() =>
      useChatInputExpandSizing({
        fontSize: 14,
        isExpanded: true,
        onExpandedChange,
        focusEditor: vi.fn(),
        minHeight: 46,
      }),
    );
    act(() => result.current.handleResizeKeyDown({ key: 'Home', preventDefault: vi.fn() } as any));
    expect(onExpandedChange).toHaveBeenCalledWith(false);
  });

  it('resets manual height when dragged or keyed down to near minHeight to restore auto-sizing', () => {
    const onExpandedChange = vi.fn();
    const { result } = renderHook(() =>
      useChatInputExpandSizing({
        fontSize: 14,
        isExpanded: false,
        onExpandedChange,
        focusEditor: vi.fn(),
        minHeight: 46,
      }),
    );

    // Increase height via ArrowUp
    act(() => result.current.handleResizeKeyDown({ key: 'ArrowUp', preventDefault: vi.fn() } as any));
    expect(result.current.hasCustomHeight).toBe(true);

    // Press Home to jump to minHeight - should clear custom height lock
    act(() => result.current.handleResizeKeyDown({ key: 'Home', preventDefault: vi.fn() } as any));
    expect(result.current.hasCustomHeight).toBe(false);
  });

  it('updates maxHeight dynamically when window is resized', () => {
    const { result } = renderHook(() =>
      useChatInputExpandSizing({
        fontSize: 14,
        isExpanded: false,
        onExpandedChange: vi.fn(),
        focusEditor: vi.fn(),
        minHeight: 46,
      }),
    );

    const initialMax = result.current.maxHeight;
    act(() => {
      window.innerHeight = 1400;
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.maxHeight).toBeGreaterThan(initialMax);
  });
});

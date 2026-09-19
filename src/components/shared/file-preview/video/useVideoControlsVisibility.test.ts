import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { renderHook } from '@/test/render/renderer';
import { useVideoControlsVisibility } from './useVideoControlsVisibility';

describe('useVideoControlsVisibility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with controls visible', () => {
    const { result } = renderHook(() => useVideoControlsVisibility({ isPlaying: false }));
    expect(result.current.controlsVisible).toBe(true);
  });

  it('auto-hides controls after 2.5s when playing starts', () => {
    let isPlaying = false;
    const { result, rerender } = renderHook(() => useVideoControlsVisibility({ isPlaying }));

    expect(result.current.controlsVisible).toBe(true);

    // Start playing
    isPlaying = true;
    rerender();

    expect(result.current.controlsVisible).toBe(true);

    // Advance time by 2.5s
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(result.current.controlsVisible).toBe(false);
  });

  it('restores controls immediately when video pauses', () => {
    let isPlaying = true;
    const { result, rerender } = renderHook(() => useVideoControlsVisibility({ isPlaying }));

    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(result.current.controlsVisible).toBe(false);

    // Pause video
    isPlaying = false;
    rerender();

    expect(result.current.controlsVisible).toBe(true);

    // Ensure it stays visible while paused
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.controlsVisible).toBe(true);
  });

  it('wakes controls on mouse move and schedules auto-hide', () => {
    const { result } = renderHook(() => useVideoControlsVisibility({ isPlaying: true }));

    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(result.current.controlsVisible).toBe(false);

    // Wake controls
    act(() => {
      result.current.wakeControls();
    });
    expect(result.current.controlsVisible).toBe(true);

    // Auto-hides again after 2.5s
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(result.current.controlsVisible).toBe(false);
  });

  it('hides controls immediately on handleMouseLeave while playing', () => {
    const { result } = renderHook(() => useVideoControlsVisibility({ isPlaying: true }));

    expect(result.current.controlsVisible).toBe(true);

    act(() => {
      result.current.handleMouseLeave();
    });

    expect(result.current.controlsVisible).toBe(false);
  });

  it('calls onControlsVisibilityChange callback when visibility changes', () => {
    const onVisibilityChange = vi.fn();
    const { result } = renderHook(() =>
      useVideoControlsVisibility({ isPlaying: true, onControlsVisibilityChange: onVisibilityChange }),
    );

    expect(onVisibilityChange).toHaveBeenCalledWith(true);

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(result.current.controlsVisible).toBe(false);
    expect(onVisibilityChange).toHaveBeenCalledWith(false);
  });
});

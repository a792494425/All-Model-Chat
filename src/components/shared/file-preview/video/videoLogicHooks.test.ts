import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@/test/render/renderer';
import { useVideoVolumeStore } from '@/stores/videoVolumeStore';
import { useVideoVolumeSync } from './useVideoVolumeSync';
import { useVideoFullscreenAndPip } from './useVideoFullscreenAndPip';
import { useVideoPlayback, PLAYBACK_RATES, FRAME_STEP_SECONDS } from './useVideoPlayback';
import { useVideoAnnotationState } from './useVideoAnnotationState';

describe('videoLogicHooks', () => {
  let mockVideo: HTMLVideoElement;
  let mockContainer: HTMLDivElement;

  beforeEach(() => {
    mockVideo = document.createElement('video');
    mockContainer = document.createElement('div');
    useVideoVolumeStore.setState({ volume: 0.8, isMuted: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useVideoVolumeSync', () => {
    it('syncs volume and mute state with video element', () => {
      const videoRef = { current: mockVideo };
      const { result } = renderHook(() => useVideoVolumeSync({ videoRef }));

      expect(result.current.volume).toBe(0.8);
      expect(result.current.isMuted).toBe(false);
      expect(mockVideo.volume).toBe(0.8);
      expect(mockVideo.muted).toBe(false);

      act(() => {
        result.current.handleVolumeChange(0.4);
      });

      expect(useVideoVolumeStore.getState().volume).toBe(0.4);
      expect(mockVideo.volume).toBe(0.4);

      act(() => {
        result.current.toggleMute();
      });

      expect(useVideoVolumeStore.getState().isMuted).toBe(true);
      expect(mockVideo.muted).toBe(true);
    });
  });

  describe('useVideoFullscreenAndPip', () => {
    it('handles fullscreen toggling', async () => {
      const containerRef = { current: mockContainer };
      const videoRef = { current: mockVideo };
      mockContainer.requestFullscreen = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() => useVideoFullscreenAndPip({ containerRef, videoRef }));

      expect(result.current.isFullscreen).toBe(false);

      await act(async () => {
        await result.current.toggleFullscreen();
      });

      expect(mockContainer.requestFullscreen).toHaveBeenCalled();
    });

    it('listens to picture-in-picture lifecycle events', () => {
      const containerRef = { current: mockContainer };
      const videoRef = { current: mockVideo };

      const { result } = renderHook(() => useVideoFullscreenAndPip({ containerRef, videoRef }));

      expect(result.current.isPictureInPicture).toBe(false);

      act(() => {
        mockVideo.dispatchEvent(new Event('enterpictureinpicture'));
      });
      expect(result.current.isPictureInPicture).toBe(true);

      act(() => {
        mockVideo.dispatchEvent(new Event('leavepictureinpicture'));
      });
      expect(result.current.isPictureInPicture).toBe(false);
    });
  });

  describe('useVideoPlayback', () => {
    it('handles seekTo and clamps within duration bounds', () => {
      const videoRef = { current: mockVideo };
      Object.defineProperty(mockVideo, 'duration', { value: 100, configurable: true });
      mockVideo.play = vi.fn().mockResolvedValue(undefined);
      mockVideo.pause = vi.fn();

      const activeSegmentRef = { current: null };
      const isSegmentLoopEnabledRef = { current: true };
      const updateSegment = vi.fn();
      const updateAnnotationVisibility = vi.fn();
      const onResetSrc = vi.fn();
      const onApplyVolume = vi.fn();
      const onUpdateDisplayRect = vi.fn();
      const onToggleFullscreen = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useVideoPlayback({
          src: 'test.mp4',
          videoRef,
          activeSegmentRef,
          isSegmentLoopEnabledRef,
          updateSegment,
          updateAnnotationVisibility,
          onResetSrc,
          onApplyVolume,
          onUpdateDisplayRect,
          onToggleFullscreen,
        }),
      );

      act(() => {
        result.current.seekTo(50, false);
      });

      expect(mockVideo.currentTime).toBe(50);
      expect(result.current.currentTime).toBe(50);
      expect(mockVideo.pause).toHaveBeenCalled();
    });

    it('cycles playback rates and steps frames', () => {
      const videoRef = { current: mockVideo };
      Object.defineProperty(mockVideo, 'duration', { value: 10, configurable: true });
      mockVideo.pause = vi.fn();

      const activeSegmentRef = { current: null };
      const isSegmentLoopEnabledRef = { current: false };
      const updateSegment = vi.fn();
      const updateAnnotationVisibility = vi.fn();
      const onResetSrc = vi.fn();
      const onApplyVolume = vi.fn();
      const onUpdateDisplayRect = vi.fn();
      const onToggleFullscreen = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useVideoPlayback({
          src: 'test.mp4',
          videoRef,
          activeSegmentRef,
          isSegmentLoopEnabledRef,
          updateSegment,
          updateAnnotationVisibility,
          onResetSrc,
          onApplyVolume,
          onUpdateDisplayRect,
          onToggleFullscreen,
        }),
      );

      expect(result.current.playbackRate).toBe(1);
      act(() => {
        result.current.cyclePlaybackRate();
      });
      expect(result.current.playbackRate).toBe(PLAYBACK_RATES[2]); // 1.5
      expect(mockVideo.playbackRate).toBe(PLAYBACK_RATES[2]);

      mockVideo.currentTime = 5;
      act(() => {
        result.current.stepFrame('forward');
      });
      expect(mockVideo.currentTime).toBeCloseTo(5 + FRAME_STEP_SECONDS);

      act(() => {
        result.current.stepFrame('back');
      });
      expect(mockVideo.currentTime).toBeCloseTo(5);
    });
  });

  describe('useVideoAnnotationState', () => {
    it('triggers onAnnotationDismiss and hides annotation when closed', () => {
      const onAnnotationDismiss = vi.fn();
      const onAnnotationVisibilityChange = vi.fn();

      const { result } = renderHook(() =>
        useVideoAnnotationState({
          annotation: { box2d: [0, 0, 100, 100], snippet: 'Test' },
          annotationTargetTime: 5,
          isAnnotationVisible: true,
          onAnnotationVisibilityChange,
          onAnnotationDismiss,
        }),
      );

      expect(result.current.effectiveAnnotationVisible).toBe(true);

      act(() => {
        result.current.handleCloseAnnotation();
      });

      expect(onAnnotationDismiss).toHaveBeenCalledTimes(1);
      expect(onAnnotationVisibilityChange).toHaveBeenCalledWith(false);
    });
  });
});

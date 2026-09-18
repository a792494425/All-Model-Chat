import {
  useRef,
  useMemo,
  useImperativeHandle,
  useCallback,
  type ForwardedRef,
  type CSSProperties,
  type SyntheticEvent,
} from 'react';
import type { UploadedFile } from '@/types';
import type { VideoAnnotation } from '@/components/media-nav/VideoHighlightOverlay';
import type { TimelineMarker } from '@/utils/media-nav/timelineMarkers';
import { useVideoGeometry } from './useVideoGeometry';
import { useVideoHotkeys } from './useVideoHotkeys';
import { useVideoSegment } from './useVideoSegment';
import { useVideoAnnotationState } from './useVideoAnnotationState';
import { useVideoControlsVisibility } from './useVideoControlsVisibility';
import { useVideoVolumeSync } from './useVideoVolumeSync';
import { useVideoFullscreenAndPip } from './useVideoFullscreenAndPip';
import { useVideoPlayback } from './useVideoPlayback';

export interface VideoPlayerHandle {
  seekTo: (seconds: number, autoplay?: boolean, manual?: boolean) => void;
  stepFrame: (direction: 'back' | 'forward') => void;
  togglePlay: () => void;
  toggleFullscreen: () => Promise<void>;
  togglePictureInPicture?: () => Promise<void>;
  toggleMute: () => void;
  getVideoElement: () => HTMLVideoElement | null;
  getCurrentTime: () => number;
  getDuration: () => number;
  wakeControls?: () => void;
}

export interface UseVideoPlayerLogicProps {
  src: string;
  file?: UploadedFile;
  allowHotkeys?: boolean;
  defaultSegment?: { start: number; end: number } | null;
  segment?: { start: number; end: number } | null;
  onSegmentChange?: (segment: { start: number; end: number } | null) => void;
  isSegmentLoopEnabled?: boolean;
  onSegmentLoopChange?: (enabled: boolean) => void;
  onControlsVisibilityChange?: (visible: boolean) => void;
  annotation?: VideoAnnotation | null;
  annotationTargetTime?: number | null;
  isAnnotationVisible?: boolean;
  onAnnotationVisibilityChange?: (visible: boolean) => void;
  timelineMarkers?: TimelineMarker[];
  onLoadedMetadata?: (event: SyntheticEvent<HTMLVideoElement, Event>) => void;
  onTimeUpdate?: (currentTime: number) => void;
  onSeeking?: (event: SyntheticEvent<HTMLVideoElement, Event>) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

export function useVideoPlayerLogic(props: UseVideoPlayerLogicProps, ref: ForwardedRef<VideoPlayerHandle>) {
  const {
    src,
    allowHotkeys = true,
    defaultSegment = null,
    segment: controlledSegment,
    onSegmentChange,
    isSegmentLoopEnabled: controlledIsSegmentLoopEnabled,
    onSegmentLoopChange,
    onControlsVisibilityChange,
    annotation = null,
    annotationTargetTime = null,
    isAnnotationVisible: controlledIsAnnotationVisible,
    onAnnotationVisibilityChange,
    onLoadedMetadata,
    onTimeUpdate,
    onSeeking,
    onPlay,
    onPause,
    onEnded,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const {
    activeSegment,
    activeSegmentRef,
    updateSegment,
    isSegmentLoopEnabled,
    isSegmentLoopEnabledRef,
    toggleSegmentLoop,
    resetSegment,
  } = useVideoSegment({
    defaultSegment,
    segment: controlledSegment,
    onSegmentChange,
    isSegmentLoopEnabled: controlledIsSegmentLoopEnabled,
    onSegmentLoopChange,
  });

  const { effectiveAnnotationVisible, handleCloseAnnotation, updateAnnotationVisibility, resetAnnotation } =
    useVideoAnnotationState({
      annotation,
      annotationTargetTime,
      isAnnotationVisible: controlledIsAnnotationVisible,
      onAnnotationVisibilityChange,
    });

  const { volume, isMuted, toggleMute, handleVolumeChange, applyVolumeToVideo } = useVideoVolumeSync({
    videoRef,
  });

  const { isFullscreen, setIsFullscreen, isPictureInPicture, toggleFullscreen, togglePictureInPicture } =
    useVideoFullscreenAndPip({
      containerRef,
      videoRef,
    });

  const { displayRect, updateDisplayRect } = useVideoGeometry({
    containerRef,
    videoRef,
    onFullscreenChange: setIsFullscreen,
  });

  const handleResetSrc = useCallback(() => {
    resetSegment(defaultSegment ?? null);
    resetAnnotation();
  }, [defaultSegment, resetAnnotation, resetSegment]);

  const {
    isPlaying,
    setIsPlaying,
    currentTime,
    duration,
    playbackRate,
    seekTo,
    stepFrame,
    togglePlay,
    cyclePlaybackRate,
    handleLoadedMetadata,
    handleSeeking,
    handleTimeUpdateInternal,
    handlePlay,
    handlePause,
    handleEnded,
    handleVideoClick,
  } = useVideoPlayback({
    src,
    videoRef,
    activeSegmentRef,
    isSegmentLoopEnabledRef,
    updateSegment,
    updateAnnotationVisibility,
    onResetSrc: handleResetSrc,
    onApplyVolume: applyVolumeToVideo,
    onUpdateDisplayRect: updateDisplayRect,
    onToggleFullscreen: toggleFullscreen,
    onLoadedMetadata,
    onTimeUpdate,
    onSeeking,
    onPlay,
    onPause,
    onEnded,
  });

  const { controlsVisible, setControlsVisible, wakeControls, handleMouseLeave } = useVideoControlsVisibility({
    isPlaying,
    onControlsVisibilityChange,
  });

  useVideoHotkeys({
    enabled: allowHotkeys,
    containerRef,
    videoRef,
    currentTime,
    duration,
    isPlaying,
    volume,
    isMuted,
    onTogglePlay: togglePlay,
    onSeek: seekTo,
    onStepFrame: stepFrame,
    onToggleFullscreen: toggleFullscreen,
    onToggleMute: toggleMute,
    onVolumeChange: handleVolumeChange,
    onTogglePictureInPicture: togglePictureInPicture,
    wakeControls,
  });

  useImperativeHandle(
    ref,
    () => ({
      seekTo,
      stepFrame,
      togglePlay,
      toggleFullscreen,
      togglePictureInPicture,
      toggleMute,
      getVideoElement: () => videoRef.current,
      getCurrentTime: () => videoRef.current?.currentTime ?? currentTime,
      getDuration: () => videoRef.current?.duration ?? duration,
      wakeControls,
    }),
    [
      currentTime,
      duration,
      seekTo,
      stepFrame,
      toggleFullscreen,
      togglePictureInPicture,
      toggleMute,
      togglePlay,
      wakeControls,
    ],
  );

  const controlsStyle = useMemo<CSSProperties>(() => {
    if (!displayRect || displayRect.width <= 0) {
      return {};
    }
    const containerHeight = containerRef.current?.clientHeight ?? 0;
    const bottomOffset = Math.max(0, containerHeight - (displayRect.top + displayRect.height));
    return {
      left: `${displayRect.left}px`,
      width: `${displayRect.width}px`,
      bottom: `${bottomOffset}px`,
    };
  }, [displayRect]);

  return {
    containerRef,
    videoRef,
    isPlaying,
    setIsPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    isMuted,
    isFullscreen,
    isPictureInPicture,
    controlsVisible,
    setControlsVisible,
    displayRect,
    controlsStyle,
    activeSegment,
    isSegmentLoopEnabled,
    effectiveAnnotationVisible,
    seekTo,
    stepFrame,
    togglePlay,
    cyclePlaybackRate,
    toggleMute,
    handleVolumeChange,
    toggleFullscreen,
    togglePictureInPicture,
    wakeControls,
    handleMouseLeave,
    handleLoadedMetadata,
    handleSeeking,
    handleTimeUpdateInternal,
    handlePlay,
    handlePause,
    handleEnded,
    handleCloseAnnotation,
    handleVideoClick,
    toggleSegmentLoop,
    updateSegment,
  };
}

import { useState, useRef, useCallback, useEffect, type RefObject, type SyntheticEvent } from 'react';

export const PLAYBACK_RATES = [0.5, 1, 1.5, 2] as const;
export const FRAME_STEP_SECONDS = 0.04;

interface UseVideoPlaybackProps {
  src: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  activeSegmentRef: { current: { start: number; end: number } | null };
  isSegmentLoopEnabledRef: { current: boolean };
  updateSegment: (segment: { start: number; end: number } | null) => void;
  updateAnnotationVisibility: (currentTime: number) => void;
  onResetSrc: () => void;
  onApplyVolume: () => void;
  onUpdateDisplayRect: () => void;
  onToggleFullscreen: () => Promise<void>;
  onLoadedMetadata?: (event: SyntheticEvent<HTMLVideoElement, Event>) => void;
  onTimeUpdate?: (currentTime: number) => void;
  onSeeking?: (event: SyntheticEvent<HTMLVideoElement, Event>) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

export function useVideoPlayback({
  src,
  videoRef,
  activeSegmentRef,
  isSegmentLoopEnabledRef,
  updateSegment,
  updateAnnotationVisibility,
  onResetSrc,
  onApplyVolume,
  onUpdateDisplayRect,
  onToggleFullscreen,
  onLoadedMetadata,
  onTimeUpdate,
  onSeeking,
  onPlay,
  onPause,
  onEnded,
}: UseVideoPlaybackProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  const isProgrammaticSeekRef = useRef(false);
  const clickTimerRef = useRef<number | null>(null);
  const prevSrcRef = useRef(src);

  useEffect(() => {
    if (prevSrcRef.current !== src) {
      prevSrcRef.current = src;
      onResetSrc();
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
    }
  }, [src, onResetSrc]);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current !== null) {
        window.clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  const seekTo = useCallback(
    (seconds: number, autoplay = true, manual = false) => {
      const video = videoRef.current;
      if (!video) return;

      const targetSeconds =
        Number.isFinite(video.duration) && video.duration > 0
          ? Math.max(0, Math.min(seconds, video.duration - 0.05))
          : Math.max(0, seconds);
      isProgrammaticSeekRef.current = true;

      if (manual && activeSegmentRef.current) {
        const currentSegment = activeSegmentRef.current;
        if (targetSeconds < currentSegment.start - 0.5 || targetSeconds > currentSegment.end + 0.5) {
          updateSegment(null);
        }
      }

      video.currentTime = targetSeconds;
      setCurrentTime(targetSeconds);

      if (autoplay) {
        try {
          const playPromise = video.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
          }
        } catch {
          // Fallback for mock environments
        }
      } else {
        try {
          video.pause();
        } catch {
          // Fallback for mock environments
        }
      }
    },
    [activeSegmentRef, updateSegment, videoRef],
  );

  const stepFrame = useCallback(
    (direction: 'back' | 'forward') => {
      const video = videoRef.current;
      if (!video) return;
      try {
        video.pause();
      } catch {
        // Fallback for mock environments
      }
      const delta = direction === 'forward' ? FRAME_STEP_SECONDS : -FRAME_STEP_SECONDS;
      const target = Math.max(0, Math.min(video.duration || 0, video.currentTime + delta));
      isProgrammaticSeekRef.current = true;
      video.currentTime = target;
      setCurrentTime(target);
    },
    [videoRef],
  );

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {});
        }
      } catch {
        // Fallback for mock environments
      }
    } else {
      try {
        video.pause();
      } catch {
        // Fallback for mock environments
      }
    }
  }, [videoRef]);

  const cyclePlaybackRate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate as (typeof PLAYBACK_RATES)[number]);
    const nextRate = PLAYBACK_RATES[(currentIndex + 1) % PLAYBACK_RATES.length];
    video.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  }, [playbackRate, videoRef]);

  const handleLoadedMetadata = useCallback(
    (event: SyntheticEvent<HTMLVideoElement, Event>) => {
      const video = videoRef.current;
      if (video) {
        onApplyVolume();
        if (Number.isFinite(video.duration)) {
          setDuration(video.duration);
        }
      }
      onUpdateDisplayRect();
      onLoadedMetadata?.(event);
    },
    [videoRef, onApplyVolume, onUpdateDisplayRect, onLoadedMetadata],
  );

  const handleSeeking = useCallback(
    (event: SyntheticEvent<HTMLVideoElement, Event>) => {
      onSeeking?.(event);
      if (isProgrammaticSeekRef.current) {
        isProgrammaticSeekRef.current = false;
        return;
      }
      const video = videoRef.current;
      const currentSegment = activeSegmentRef.current;
      if (!video || !currentSegment) return;

      const isOutsideSegment =
        video.currentTime < currentSegment.start - 0.5 || video.currentTime > currentSegment.end + 0.5;
      if (isOutsideSegment) {
        updateSegment(null);
      }
    },
    [activeSegmentRef, onSeeking, updateSegment, videoRef],
  );

  const handleTimeUpdateInternal = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setCurrentTime(video.currentTime);

    const currentSegment = activeSegmentRef.current;
    if (currentSegment) {
      if (isSegmentLoopEnabledRef.current) {
        if (video.currentTime >= currentSegment.end - 0.05) {
          isProgrammaticSeekRef.current = true;
          video.currentTime = currentSegment.start;
        }
      } else if (video.currentTime >= currentSegment.end) {
        try {
          video.pause();
          setIsPlaying(false);
          onPause?.();
        } catch {
          // Fallback for mock environments
        }
      }
    }

    updateAnnotationVisibility(video.currentTime);
    onTimeUpdate?.(video.currentTime);
  }, [activeSegmentRef, isSegmentLoopEnabledRef, onPause, onTimeUpdate, updateAnnotationVisibility, videoRef]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    onPlay?.();
  }, [onPlay]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    onPause?.();
  }, [onPause]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    onEnded?.();
  }, [onEnded]);

  const handleVideoClick = useCallback(() => {
    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      void onToggleFullscreen();
    } else {
      clickTimerRef.current = window.setTimeout(() => {
        clickTimerRef.current = null;
        togglePlay();
      }, 220);
    }
  }, [onToggleFullscreen, togglePlay]);

  return {
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
  };
}

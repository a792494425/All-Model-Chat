import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Maximize, Minimize, Pause, Play, Repeat, StepBack, StepForward, Volume2, VolumeX, X } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import type { UploadedFile } from '@/types';
import { formatTimestamp } from '@/utils/media-nav/timestamp';
import { computeContainedVideoRect, type VideoDisplayRect } from '@/utils/media-nav/videoGeometry';
import { VideoHighlightOverlay, type VideoAnnotation } from '@/components/media-nav/VideoHighlightOverlay';

export interface VideoPlayerHandle {
  seekTo: (seconds: number, autoplay?: boolean, manual?: boolean) => void;
  stepFrame: (direction: 'back' | 'forward') => void;
  togglePlay: () => void;
  toggleFullscreen: () => Promise<void>;
  toggleMute: () => void;
  getVideoElement: () => HTMLVideoElement | null;
  getCurrentTime: () => number;
  getDuration: () => number;
}

export interface VideoPlayerProps {
  src: string;
  file?: UploadedFile;
  className?: string;
  videoClassName?: string;
  testId?: string;
  autoPlay?: boolean;
  loop?: boolean;
  allowHotkeys?: boolean;
  showControls?: boolean;
  showSegmentBar?: boolean;
  defaultSegment?: { start: number; end: number } | null;
  segment?: { start: number; end: number } | null;
  onSegmentChange?: (segment: { start: number; end: number } | null) => void;
  isSegmentLoopEnabled?: boolean;
  onSegmentLoopChange?: (enabled: boolean) => void;
  annotation?: VideoAnnotation | null;
  annotationTargetTime?: number | null;
  isAnnotationVisible?: boolean;
  onAnnotationDismiss?: () => void;
  onLoadedMetadata?: (e: React.SyntheticEvent<HTMLVideoElement, Event>) => void;
  onTimeUpdate?: (currentTime: number) => void;
  onSeeking?: (e: React.SyntheticEvent<HTMLVideoElement, Event>) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

const PLAYBACK_RATES = [0.5, 1, 1.5, 2] as const;
const FRAME_STEP_SECONDS = 0.04; // ~25-30fps precision

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer(
  {
    src,
    file: _file,
    className = 'relative w-full h-full max-w-full max-h-full flex items-center justify-center bg-black focus:outline-none group overflow-hidden',
    videoClassName = 'w-full h-full max-w-full max-h-full object-contain outline-none block cursor-pointer',
    testId = 'media-nav-video',
    autoPlay = false,
    loop = false,
    allowHotkeys = true,
    showControls = true,
    showSegmentBar = true,
    defaultSegment = null,
    segment: controlledSegment,
    onSegmentChange,
    isSegmentLoopEnabled: controlledIsSegmentLoopEnabled,
    onSegmentLoopChange,
    annotation = null,
    annotationTargetTime = null,
    isAnnotationVisible: controlledIsAnnotationVisible,
    onAnnotationDismiss,
    onLoadedMetadata,
    onTimeUpdate,
    onSeeking,
    onPlay,
    onPause,
    onEnded,
  },
  ref,
) {
  const { t } = useI18n();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  // Geometry display rect
  const [displayRect, setDisplayRect] = useState<VideoDisplayRect | null>(null);

  // Segment state (controlled or uncontrolled)
  const isControlledSegment = controlledSegment !== undefined;
  const [internalSegment, setInternalSegment] = useState<{ start: number; end: number } | null>(defaultSegment);
  const activeSegment = isControlledSegment ? controlledSegment : internalSegment;
  const activeSegmentRef = useRef(activeSegment);
  activeSegmentRef.current = activeSegment;

  const updateSegment = useCallback(
    (newSegment: { start: number; end: number } | null) => {
      if (!isControlledSegment) {
        setInternalSegment(newSegment);
      }
      onSegmentChange?.(newSegment);
    },
    [isControlledSegment, onSegmentChange],
  );

  // Segment loop state (controlled or uncontrolled)
  const isControlledLoop = controlledIsSegmentLoopEnabled !== undefined;
  const [internalLoop, setInternalLoop] = useState(true);
  const isSegmentLoopEnabled = isControlledLoop ? controlledIsSegmentLoopEnabled : internalLoop;
  const isSegmentLoopEnabledRef = useRef(isSegmentLoopEnabled);
  isSegmentLoopEnabledRef.current = isSegmentLoopEnabled;

  const toggleSegmentLoop = useCallback(() => {
    const nextVal = !isSegmentLoopEnabled;
    if (!isControlledLoop) {
      setInternalLoop(nextVal);
    }
    onSegmentLoopChange?.(nextVal);
  }, [isControlledLoop, isSegmentLoopEnabled, onSegmentLoopChange]);

  // Annotation visibility state
  const isControlledAnnotationVis = controlledIsAnnotationVisible !== undefined;
  const [internalAnnotationVisible, setInternalAnnotationVisible] = useState(false);
  const [isAnnotationDismissed, setIsAnnotationDismissed] = useState(false);
  const isAnnotationDismissedRef = useRef(isAnnotationDismissed);
  isAnnotationDismissedRef.current = isAnnotationDismissed;

  const effectiveAnnotationVisible = isControlledAnnotationVis
    ? controlledIsAnnotationVisible
    : !isAnnotationDismissed && internalAnnotationVisible;

  const isProgrammaticSeekRef = useRef(false);
  const isScrubbingRef = useRef(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Measure and compute the exact contained video rectangle
  const updateDisplayRect = useCallback(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const cWidth = container.clientWidth;
    const cHeight = container.clientHeight;
    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;

    if (cWidth > 0 && cHeight > 0 && vWidth > 0 && vHeight > 0) {
      const rect = computeContainedVideoRect(cWidth, cHeight, vWidth, vHeight);
      setDisplayRect(rect);
    }
  }, []);

  // Update rect on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      updateDisplayRect();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [updateDisplayRect]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = document.fullscreenElement === containerRef.current;
      setIsFullscreen(isNowFullscreen);
      setTimeout(updateDisplayRect, 50);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [updateDisplayRect]);

  // Seek function
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
        const seg = activeSegmentRef.current;
        if (targetSeconds < seg.start - 0.5 || targetSeconds > seg.end + 0.5) {
          updateSegment(null);
        }
      }

      video.currentTime = targetSeconds;
      setCurrentTime(targetSeconds);

      if (autoplay) {
        try {
          const playPromise = video.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
              // Autoplay may be blocked by browser policy
            });
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
    [updateSegment],
  );

  // Reset states on src change (only when src actually changes, not on initial mount)
  const prevSrcRef = useRef(src);
  useEffect(() => {
    if (prevSrcRef.current !== src) {
      prevSrcRef.current = src;
      if (!isControlledSegment) {
        setInternalSegment(defaultSegment ?? null);
      }
      setIsAnnotationDismissed(false);
      setInternalAnnotationVisible(false);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
    }
  }, [src, defaultSegment, isControlledSegment]);

  // Frame stepping
  const stepFrame = useCallback((direction: 'back' | 'forward') => {
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
  }, []);

  // Play/pause toggle
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {
            // Autoplay may be blocked by browser policy
          });
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
  }, []);

  // Playback rate cycle
  const cyclePlaybackRate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate as (typeof PLAYBACK_RATES)[number]);
    const nextRate = PLAYBACK_RATES[(currentIndex + 1) % PLAYBACK_RATES.length];
    video.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  }, [playbackRate]);

  // Volume & Mute
  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseFloat(e.target.value);
    const video = videoRef.current;
    if (video) {
      video.volume = val;
      video.muted = val === 0;
    }
    setVolume(val);
    setIsMuted(val === 0);
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      try {
        await container.requestFullscreen();
      } catch {
        // Fallback gracefully if fullscreen permissions denied
      }
    } else if (document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {
        // Fallback for mock environments
      }
    }
  }, []);

  // Expose imperative handle
  useImperativeHandle(
    ref,
    () => ({
      seekTo,
      stepFrame,
      togglePlay,
      toggleFullscreen,
      toggleMute,
      getVideoElement: () => videoRef.current,
      getCurrentTime: () => videoRef.current?.currentTime ?? currentTime,
      getDuration: () => videoRef.current?.duration ?? duration,
    }),
    [currentTime, duration, seekTo, stepFrame, toggleFullscreen, toggleMute, togglePlay],
  );

  // Controls auto-hide
  const wakeControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 2500);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      setControlsVisible(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    }
  }, [isPlaying]);

  // Video event handlers
  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = videoRef.current;
    if (video && Number.isFinite(video.duration)) {
      setDuration(video.duration);
    }
    updateDisplayRect();
    onLoadedMetadata?.(e);
  };

  const handleSeeking = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    onSeeking?.(e);
    if (isProgrammaticSeekRef.current) {
      isProgrammaticSeekRef.current = false;
      return;
    }
    const video = videoRef.current;
    const seg = activeSegmentRef.current;
    if (!video || !seg) return;

    const isOutsideSegment = video.currentTime < seg.start - 0.5 || video.currentTime > seg.end + 0.5;
    if (isOutsideSegment) {
      updateSegment(null);
    }
  };

  const handleTimeUpdateInternal = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!isScrubbingRef.current) {
      setCurrentTime(video.currentTime);
    }

    const seg = activeSegmentRef.current;
    if (seg && isSegmentLoopEnabledRef.current) {
      if (video.currentTime >= seg.end - 0.05) {
        isProgrammaticSeekRef.current = true;
        video.currentTime = seg.start;
      }
    }

    if (annotation && !isAnnotationDismissedRef.current) {
      if (seg) {
        const inSeg = video.currentTime >= seg.start - 0.2 && video.currentTime <= seg.end + 0.2;
        setInternalAnnotationVisible(inSeg);
      } else if (annotationTargetTime !== null) {
        const inRange = Math.abs(video.currentTime - annotationTargetTime) <= 3.0;
        setInternalAnnotationVisible(inRange);
      }
    }

    onTimeUpdate?.(video.currentTime);
  };

  const handleCloseAnnotation = useCallback(() => {
    setIsAnnotationDismissed(true);
    setInternalAnnotationVisible(false);
    onAnnotationDismiss?.();
  }, [onAnnotationDismiss]);

  // Hotkeys
  useEffect(() => {
    if (!allowHotkeys) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
      if (
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if (!containerRef.current) return;
      const isTargeted = containerRef.current.contains(document.activeElement) || isFullscreen;
      if (!isTargeted && !containerRef.current.matches(':hover')) return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (e.shiftKey) {
          stepFrame('back');
        } else {
          const video = videoRef.current;
          const cur = video?.currentTime ?? currentTime;
          seekTo(Math.max(0, cur - 5), isPlaying, true);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (e.shiftKey) {
          stepFrame('forward');
        } else {
          const video = videoRef.current;
          const cur = video?.currentTime ?? currentTime;
          const dur = Number.isFinite(video?.duration) && video!.duration > 0 ? video!.duration : duration;
          seekTo(Math.min(dur, cur + 5), isPlaying, true);
        }
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        void toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    allowHotkeys,
    currentTime,
    duration,
    isFullscreen,
    isPlaying,
    seekTo,
    stepFrame,
    toggleFullscreen,
    toggleMute,
    togglePlay,
  ]);

  const controlsStyle = useMemo<React.CSSProperties>(() => {
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

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const volumePercent = isMuted ? 0 : Math.min(100, Math.max(0, volume * 100));

  return (
    <div className="h-full w-full flex flex-col bg-black select-none relative">
      {showSegmentBar && activeSegment && (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-[#101113] border-b border-white/10 text-xs text-white/90 flex-shrink-0 z-30">
          <span className="font-mono">
            {t('videoLocateSegment')
              .replace('{start}', formatTimestamp(activeSegment.start))
              .replace('{end}', formatTimestamp(activeSegment.end))}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleSegmentLoop}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isSegmentLoopEnabled ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'
              }`}
              aria-pressed={isSegmentLoopEnabled}
              aria-label={t('videoSegmentLoop')}
              title={t('videoSegmentLoop')}
              data-testid="media-segment-loop"
            >
              <Repeat size={14} />
            </button>
            <button
              type="button"
              onClick={() => updateSegment(null)}
              className="p-1.5 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              aria-label={t('videoSegmentExit')}
              title={t('videoSegmentExit')}
              data-testid="media-segment-exit"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="flex-grow min-h-0 flex items-center justify-center relative overflow-hidden">
        <div
          ref={containerRef}
          tabIndex={0}
          onMouseMove={wakeControls}
          onMouseLeave={() => isPlaying && setControlsVisible(false)}
          className={className}
          style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <video
            ref={videoRef}
            src={src}
            autoPlay={autoPlay}
            loop={loop}
            playsInline
            onClick={togglePlay}
            onSeeking={handleSeeking}
            onTimeUpdate={handleTimeUpdateInternal}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => {
              setIsPlaying(true);
              onPlay?.();
            }}
            onPause={() => {
              setIsPlaying(false);
              onPause?.();
            }}
            onEnded={() => {
              setIsPlaying(false);
              onEnded?.();
            }}
            className={videoClassName}
            data-testid={testId}
          />

          <VideoHighlightOverlay
            annotation={annotation}
            visible={effectiveAnnotationVisible}
            displayRect={displayRect}
            onClose={handleCloseAnnotation}
          />

          {showControls && (
            <div
              className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-3 sm:px-4 py-2.5 pt-8 flex flex-col gap-2 transition-opacity duration-300 z-30 pointer-events-auto rounded-b-xl ${
                controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              style={controlsStyle}
            >
              <div className="relative w-full flex items-center group/timeline py-1.5 cursor-pointer">
                <div className="absolute inset-x-0 h-1 group-hover/timeline:h-1.5 bg-white/25 rounded-full overflow-hidden transition-all pointer-events-none">
                  <div
                    className="h-full bg-white transition-[width] duration-75"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {activeSegment && duration > 0 && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-emerald-400/80 rounded-full pointer-events-none border border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.6)] z-10"
                    style={{
                      left: `${Math.max(0, Math.min(100, (activeSegment.start / duration) * 100))}%`,
                      width: `${Math.max(0.5, Math.min(100, ((activeSegment.end - activeSegment.start) / duration) * 100))}%`,
                    }}
                  />
                )}

                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.05}
                  value={currentTime}
                  onPointerDown={() => {
                    isScrubbingRef.current = true;
                  }}
                  onPointerUp={() => {
                    isScrubbingRef.current = false;
                  }}
                  onChange={(e) => {
                    seekTo(Number.parseFloat(e.target.value), false, true);
                  }}
                  className="relative z-20 w-full h-1 group-hover/timeline:h-1.5 appearance-none bg-transparent outline-none cursor-pointer accent-white transition-all"
                  aria-label="Seek timeline"
                />
              </div>

              <div className="flex items-center justify-between text-white/95 text-xs select-none">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="p-1.5 rounded-lg hover:bg-white/20 active:bg-white/30 text-white transition-all active:scale-95 cursor-pointer"
                    aria-label={isPlaying ? t('videoPause') : t('videoPlay')}
                    title={isPlaying ? t('videoPause') : t('videoPlay')}
                  >
                    {isPlaying ? <Pause size={17} className="fill-current" /> : <Play size={17} className="fill-current ml-0.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => stepFrame('back')}
                    className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 active:bg-white/25 transition-all active:scale-95 cursor-pointer"
                    aria-label={t('videoStepBack')}
                    title={t('videoStepBack')}
                  >
                    <StepBack size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => stepFrame('forward')}
                    className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 active:bg-white/25 transition-all active:scale-95 cursor-pointer"
                    aria-label={t('videoStepForward')}
                    title={t('videoStepForward')}
                  >
                    <StepForward size={14} />
                  </button>

                  <div className="ml-1.5 font-mono text-xs tabular-nums text-white/90 select-none tracking-tight">
                    <span>{formatTimestamp(currentTime)}</span>
                    <span className="opacity-40 mx-1">/</span>
                    <span className="opacity-70">{formatTimestamp(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    onClick={cyclePlaybackRate}
                    className="px-2 py-0.5 rounded font-mono text-xs font-medium bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-all active:scale-95 cursor-pointer shadow-sm"
                    aria-label={t('videoSpeed')}
                    title={t('videoSpeed')}
                  >
                    {playbackRate}x
                  </button>

                  <div className="flex items-center gap-1.5 group/volume relative">
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="p-1.5 rounded-lg hover:bg-white/20 active:bg-white/30 text-white transition-all active:scale-95 cursor-pointer"
                      aria-label={isMuted ? t('videoUnmute') : t('videoMute')}
                      title={isMuted ? t('videoUnmute') : t('videoMute')}
                    >
                      {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                    <div className="relative w-14 sm:w-16 hidden sm:flex items-center py-1 cursor-pointer">
                      <div className="absolute inset-x-0 h-1 bg-white/25 rounded-full overflow-hidden pointer-events-none">
                        <div className="h-full bg-white transition-[width] duration-75" style={{ width: `${volumePercent}%` }} />
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="relative z-10 w-full h-1 appearance-none bg-transparent accent-white cursor-pointer"
                        aria-label="Volume"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void toggleFullscreen()}
                    className="p-1.5 rounded-lg hover:bg-white/20 active:bg-white/30 text-white transition-all active:scale-95 cursor-pointer"
                    aria-label={isFullscreen ? t('videoExitFullscreen') : t('videoFullscreen')}
                    title={isFullscreen ? t('videoExitFullscreen') : t('videoFullscreen')}
                  >
                    {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

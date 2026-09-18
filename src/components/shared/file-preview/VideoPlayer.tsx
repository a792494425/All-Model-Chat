import { forwardRef } from 'react';
import { VideoHighlightOverlay } from '@/components/media-nav/VideoHighlightOverlay';
import { VideoSegmentBar } from './video/VideoSegmentBar';
import { VideoControls } from './video/VideoControls';
import {
  useVideoPlayerLogic,
  type VideoPlayerHandle,
  type UseVideoPlayerLogicProps,
} from './video/useVideoPlayerLogic';

export type { VideoPlayerHandle };

export interface VideoPlayerProps extends UseVideoPlayerLogicProps {
  className?: string;
  videoClassName?: string;
  testId?: string;
  autoPlay?: boolean;
  loop?: boolean;
  showControls?: boolean;
  showSegmentBar?: boolean;
  onAnnotationDismiss?: () => void;
  subtitlesSrc?: string;
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer(props, ref) {
  const {
    src,
    className = 'relative w-full h-full max-w-full max-h-full flex items-center justify-center bg-black focus:outline-none group overflow-hidden',
    videoClassName = 'w-full h-full max-w-full max-h-full object-contain outline-none block cursor-pointer',
    testId = 'media-nav-video',
    autoPlay = false,
    loop = false,
    showControls = true,
    showSegmentBar = true,
    annotation = null,
    timelineMarkers,
    subtitlesSrc,
  } = props;

  const logic = useVideoPlayerLogic(props, ref);

  return (
    <div className="h-full w-full flex flex-col bg-black select-none relative">
      {showSegmentBar && logic.activeSegment && (
        <VideoSegmentBar
          segment={logic.activeSegment}
          isLoopEnabled={logic.isSegmentLoopEnabled}
          onToggleLoop={logic.toggleSegmentLoop}
          onExit={() => logic.updateSegment(null)}
        />
      )}

      <div className="flex-grow min-h-0 flex items-center justify-center relative overflow-hidden">
        <div
          ref={logic.containerRef}
          tabIndex={0}
          onMouseMove={logic.wakeControls}
          onMouseLeave={logic.handleMouseLeave}
          className={`${className} ${logic.isPlaying && !logic.controlsVisible ? '!cursor-none' : ''}`}
          style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <video
            ref={(el) => {
              logic.videoRef.current = el;
              if (el) {
                try {
                  el.volume = logic.volume;
                  el.muted = logic.isMuted;
                } catch {
                  // Fallback for environments where volume assignment is restricted
                }
              }
            }}
            src={src}
            autoPlay={autoPlay}
            loop={loop}
            muted={logic.isMuted}
            playsInline
            onClick={logic.handleVideoClick}
            onSeeking={logic.handleSeeking}
            onTimeUpdate={logic.handleTimeUpdateInternal}
            onLoadedMetadata={logic.handleLoadedMetadata}
            onPlay={logic.handlePlay}
            onPause={logic.handlePause}
            onEnded={logic.handleEnded}
            className={`${videoClassName} ${logic.isPlaying && !logic.controlsVisible ? '!cursor-none' : ''}`}
            data-testid={testId}
          >
            {subtitlesSrc && <track kind="subtitles" src={subtitlesSrc} srcLang="auto" label="Subtitles" default />}
          </video>

          <VideoHighlightOverlay
            annotation={annotation}
            visible={logic.effectiveAnnotationVisible}
            displayRect={logic.displayRect}
            isPlaying={logic.isPlaying}
            onClose={logic.handleCloseAnnotation}
          />

          {showControls && (
            <VideoControls
              visible={logic.controlsVisible}
              style={logic.controlsStyle}
              currentTime={logic.currentTime}
              duration={logic.duration}
              isPlaying={logic.isPlaying}
              playbackRate={logic.playbackRate}
              volume={logic.volume}
              isMuted={logic.isMuted}
              isFullscreen={logic.isFullscreen}
              isPictureInPicture={logic.isPictureInPicture}
              activeSegment={logic.activeSegment}
              timelineMarkers={timelineMarkers}
              onTogglePlay={logic.togglePlay}
              onStepFrame={logic.stepFrame}
              onCyclePlaybackRate={logic.cyclePlaybackRate}
              onToggleMute={logic.toggleMute}
              onVolumeChange={logic.handleVolumeChange}
              onToggleFullscreen={logic.toggleFullscreen}
              onTogglePictureInPicture={logic.togglePictureInPicture}
              onSeek={(seconds) => logic.seekTo(seconds, false, true)}
            />
          )}
        </div>
      </div>
    </div>
  );
});

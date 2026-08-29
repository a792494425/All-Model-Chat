import React, { useEffect, useRef, useState } from 'react';
import { Repeat, X } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import type { UploadedFile } from '@/types';
import { useMediaNavStore } from '@/stores/mediaNavStore';
import { formatTimestamp } from '@/utils/media-nav/timestamp';

interface VideoNavViewProps {
  file: UploadedFile;
}

/**
 * Video player inside the media navigation panel. Honors store-driven seeks
 * (locate chips) and keeps a segment looping until the user exits the segment.
 */
const VideoNavViewComponent: React.FC<VideoNavViewProps> = ({ file }) => {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMetadataReady, setIsMetadataReady] = useState(false);
  const [isSegmentLoopEnabled, setIsSegmentLoopEnabled] = useState(true);

  const videoTarget = useMediaNavStore((state) => state.videoTarget);
  const consumeTarget = useMediaNavStore((state) => state.consumeVideoTarget);

  // Segment state mirrors videoTarget for as long as the segment is playing.
  const [segment, setSegment] = useState<{ start: number; end: number } | null>(null);
  const segmentRef = useRef<{ start: number; end: number } | null>(null);
  segmentRef.current = segment;
  const isSegmentLoopEnabledRef = useRef(isSegmentLoopEnabled);
  isSegmentLoopEnabledRef.current = isSegmentLoopEnabled;

  const seekTo = (seconds: number, autoplay = true) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = seconds;
    if (autoplay) {
      void video.play().catch(() => {
        // Autoplay can be rejected; the user can press play manually.
      });
    }
  };

  // Apply incoming seek requests; keep the target queued until metadata exists.
  useEffect(() => {
    if (!videoTarget) return;
    if (!isMetadataReady) return;

    seekTo(videoTarget.seconds);
    setSegment(videoTarget.end !== undefined ? { start: videoTarget.seconds, end: videoTarget.end } : null);
    setIsSegmentLoopEnabled(true);
    consumeTarget();
  }, [videoTarget, isMetadataReady, consumeTarget]);

  // A seek may arrive before the video metadata is available; retry on load.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleLoadedMetadata = () => {
      setIsMetadataReady(true);
    };
    if (video.readyState >= 1) {
      setIsMetadataReady(true);
    }
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [file.id]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    const activeSegment = segmentRef.current;
    if (!video || !activeSegment || !isSegmentLoopEnabledRef.current) return;
    if (video.currentTime >= activeSegment.end - 0.05) {
      video.currentTime = activeSegment.start;
    }
  };

  const exitSegment = () => {
    setSegment(null);
    useMediaNavStore.getState().consumeVideoTarget();
  };

  return (
    <div className="h-full w-full flex flex-col bg-black">
      {segment && (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-[#101113] border-b border-white/10 text-xs text-white/90 flex-shrink-0">
          <span className="font-mono">
            {t('videoLocateSegment')
              .replace('{start}', formatTimestamp(segment.start))
              .replace('{end}', formatTimestamp(segment.end))}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsSegmentLoopEnabled((enabled) => !enabled)}
              className={`p-1.5 rounded-lg transition-colors ${
                isSegmentLoopEnabled ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'
              }`}
              aria-pressed={isSegmentLoopEnabled}
              aria-label={t('videoSegmentLoop')}
              title={t('videoSegmentLoop')}
              data-testid="video-segment-loop"
            >
              <Repeat size={14} />
            </button>
            <button
              type="button"
              onClick={exitSegment}
              className="p-1.5 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              aria-label={t('videoSegmentExit')}
              title={t('videoSegmentExit')}
              data-testid="video-segment-exit"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="flex-grow min-h-0 flex items-center justify-center">
        <video
          ref={videoRef}
          key={file.id}
          src={file.dataUrl}
          controls
          playsInline
          onTimeUpdate={handleTimeUpdate}
          className="max-w-full max-h-full outline-none"
          data-testid="media-nav-video"
        />
      </div>
    </div>
  );
};

export const VideoNavView = React.memo(VideoNavViewComponent);

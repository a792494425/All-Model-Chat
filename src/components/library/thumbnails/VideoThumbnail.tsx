import React, { useState } from 'react';
import { Video } from 'lucide-react';
import type { LibraryItem } from '@/types';
import { readThumbnailBlobCache, writeThumbnailBlobCache } from '@/utils/library/thumbnailCaches';

interface VideoThumbnailProps {
  item: LibraryItem;
  size?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
  blobUrl: string;
  containerRef?: React.Ref<HTMLDivElement>;
  onVideoError: () => void;
}

export const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
  item,
  size = 'sm',
  className = '',
  blobUrl,
  containerRef,
  onVideoError,
}) => {
  const [videoPoster, setVideoPoster] = useState<string | null>(
    () => readThumbnailBlobCache(`poster:${item.id}`) ?? null,
  );

  const videoSizeClasses =
    size === 'sm'
      ? 'w-10 h-10 rounded-lg'
      : size === 'md'
        ? 'w-16 h-16 rounded-xl'
        : size === 'lg'
          ? 'w-full h-40 rounded-t-2xl'
          : 'w-full h-full';

  const containerClassName = className.replace(/\bobject-(contain|cover|fill|none|scale-down)\b/g, '').trim();

  if (videoPoster) {
    return (
      <div
        ref={containerRef}
        className={`relative ${videoSizeClasses} overflow-hidden bg-black/90 flex-shrink-0 flex items-center justify-center border border-[var(--theme-border-secondary)] ${containerClassName}`}
      >
        <img
          src={videoPoster}
          alt={item.name}
          className={`w-full h-full object-cover pointer-events-none ${className}`}
          loading="lazy"
        />
        <div
          className={`absolute ${
            size === 'sm' ? 'bottom-0.5 left-0.5 p-0.5' : 'bottom-2 left-2 px-1.5 py-0.5'
          } rounded bg-black/60 backdrop-blur-xs flex items-center gap-1 pointer-events-none text-white shadow-xs`}
        >
          <Video size={size === 'sm' ? 9 : 12} strokeWidth={2} />
        </div>
      </div>
    );
  }

  if (size === 'sm') {
    return (
      <div
        ref={containerRef}
        className={`relative ${videoSizeClasses} overflow-hidden bg-black/80 flex-shrink-0 flex items-center justify-center border border-[var(--theme-border-secondary)] ${containerClassName}`}
      >
        <Video size={16} className="text-white/80" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative ${videoSizeClasses} overflow-hidden bg-black/90 flex-shrink-0 flex items-center justify-center border border-[var(--theme-border-secondary)] ${containerClassName}`}
    >
      <video
        src={blobUrl.includes('#') ? blobUrl : `${blobUrl}#t=0.1`}
        onError={onVideoError}
        onLoadedData={(e) => {
          const video = e.currentTarget;
          try {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              const canvas = document.createElement('canvas');
              canvas.width = Math.min(video.videoWidth, 320);
              canvas.height = Math.round((canvas.width / video.videoWidth) * video.videoHeight);
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                writeThumbnailBlobCache(`poster:${item.id}`, dataUrl);
                setVideoPoster(dataUrl);
              }
            }
          } catch {
            // ignore
          }
        }}
        onLoadedMetadata={(e) => {
          try {
            const dur = e.currentTarget.duration;
            e.currentTarget.currentTime = dur && dur > 0 ? Math.min(0.1, dur) : 0.1;
          } catch {
            // ignore
          }
        }}
        className={`w-full h-full object-cover pointer-events-none ${className}`}
        muted
        playsInline
        preload="metadata"
        aria-label={item.name}
      />
      <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs flex items-center gap-1 pointer-events-none text-white shadow-xs">
        <Video size={12} strokeWidth={2} />
      </div>
    </div>
  );
};

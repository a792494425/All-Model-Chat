import React from 'react';
import { Play } from 'lucide-react';
import type { LibraryItem } from '@/types';

interface YoutubeThumbnailProps {
  item: LibraryItem;
  size?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
  youtubeVideoId: string;
  containerRef?: React.Ref<HTMLDivElement>;
  onError: () => void;
}

export const YoutubeThumbnail: React.FC<YoutubeThumbnailProps> = ({
  item,
  size = 'sm',
  className = '',
  youtubeVideoId,
  containerRef,
  onError,
}) => {
  const ytSizeClasses =
    size === 'sm'
      ? 'w-10 h-10 rounded-lg'
      : size === 'md'
        ? 'w-16 h-16 rounded-xl'
        : size === 'lg'
          ? 'w-full h-40 rounded-t-2xl'
          : 'w-full h-full';

  const containerClassName = className.replace(/\bobject-(contain|cover|fill|none|scale-down)\b/g, '').trim();
  const thumbnailUrl =
    size === 'sm'
      ? `https://img.youtube.com/vi/${youtubeVideoId}/mqdefault.jpg`
      : `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`;

  return (
    <div
      ref={containerRef}
      data-thumbnail-kind="youtube"
      className={`relative ${ytSizeClasses} overflow-hidden bg-black flex-shrink-0 flex items-center justify-center border border-[var(--theme-border-secondary)] ${containerClassName}`}
    >
      <img
        src={thumbnailUrl}
        alt={item.name}
        onError={onError}
        className={`w-full h-full object-cover pointer-events-none ${className}`}
        loading="lazy"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none">
        <div
          className={`flex items-center justify-center rounded-full bg-red-600 text-white shadow-md transition-transform group-hover:scale-110 duration-200 ${
            size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-6 h-6' : 'w-10 h-10'
          }`}
        >
          <Play size={size === 'sm' ? 8 : size === 'md' ? 12 : 20} fill="currentColor" className="ml-0.5" />
        </div>
      </div>
      {size !== 'sm' && (
        <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-red-600/85 backdrop-blur-xs flex items-center gap-1 pointer-events-none text-white text-[10px] font-bold tracking-wider shadow-xs">
          YOUTUBE
        </div>
      )}
    </div>
  );
};

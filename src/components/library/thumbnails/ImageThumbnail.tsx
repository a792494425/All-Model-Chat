import React from 'react';
import type { LibraryItem } from '@/types';

interface ImageThumbnailProps {
  item: LibraryItem;
  size?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
  blobUrl: string;
  isSvg: boolean;
  onImageError: () => void;
}

export const ImageThumbnail: React.FC<ImageThumbnailProps> = ({
  item,
  size = 'sm',
  className = '',
  blobUrl,
  isSvg,
  onImageError,
}) => {
  const imgSizeClasses =
    size === 'sm'
      ? 'w-10 h-10 rounded-lg'
      : size === 'md'
        ? 'w-16 h-16 rounded-xl'
        : size === 'lg'
          ? 'w-full h-40 rounded-t-2xl'
          : 'w-full h-full';

  const containerClassName = className.replace(/\bobject-(contain|cover|fill|none|scale-down)\b/g, '').trim();

  if (isSvg && size !== 'sm') {
    return (
      <div
        className={`relative ${imgSizeClasses} overflow-hidden border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-tertiary)] flex-shrink-0 flex items-center justify-center p-2.5 ${containerClassName}`}
      >
        <img
          src={blobUrl}
          alt={item.name}
          onError={onImageError}
          className="w-full h-full object-contain pointer-events-none"
          loading="lazy"
        />
        <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-emerald-600/80 backdrop-blur-xs flex items-center gap-1 pointer-events-none text-white text-[10px] font-bold tracking-wider shadow-xs">
          SVG
        </div>
      </div>
    );
  }

  return (
    <img
      src={blobUrl}
      alt={item.name}
      onError={onImageError}
      className={`${imgSizeClasses} object-cover border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-tertiary)] flex-shrink-0 ${className}`}
      loading="lazy"
    />
  );
};

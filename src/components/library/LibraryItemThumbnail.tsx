import React, { useEffect, useState } from 'react';
import { FileText, FileSpreadsheet, Presentation, Music, Video, Image as ImageIcon } from 'lucide-react';
import type { LibraryItem } from '@/types';
import { isImageFileType, isVideoFileType, getLibraryFileType } from '@/utils/library/libraryFiles';
import { fileToBlobUrl, cleanupFilePreviewUrl } from '@/utils/file/filePreviewUrls';
import { dbService } from '@/services/db/dbService';

interface LibraryItemThumbnailProps {
  item: LibraryItem;
  size?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

export const LibraryItemThumbnail: React.FC<LibraryItemThumbnailProps> = ({ item, size = 'sm', className = '' }) => {
  const isImage = isImageFileType(item.type, item.name);
  const isVideo = isVideoFileType(item.type, item.name);
  const canPreview = isImage || isVideo;
  const [blobUrl, setBlobUrl] = useState<string | null>(item.dataUrl ?? null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!canPreview) return;
    if (item.dataUrl) {
      setBlobUrl(item.dataUrl);
      return;
    }

    let active = true;
    let createdUrl: string | null = null;

    const loadBlob = async () => {
      try {
        let blob = item.rawFile;
        if (!blob) {
          blob = await dbService.fetchLibraryFileBlob(item);
        }
        if (active && blob) {
          createdUrl = fileToBlobUrl(blob);
          setBlobUrl(createdUrl);
        }
      } catch {
        if (active) setHasError(true);
      }
    };

    void loadBlob();

    return () => {
      active = false;
      if (createdUrl) {
        cleanupFilePreviewUrl({ dataUrl: createdUrl });
      }
    };
  }, [item, canPreview]);

  if (isImage && blobUrl && !hasError) {
    const imgSizeClasses =
      size === 'sm'
        ? 'w-10 h-10 rounded-lg'
        : size === 'md'
          ? 'w-16 h-16 rounded-xl'
          : size === 'lg'
            ? 'w-full h-40 rounded-t-2xl'
            : 'w-full h-full';

    return (
      <img
        src={blobUrl}
        alt={item.name}
        onError={() => setHasError(true)}
        className={`${imgSizeClasses} object-cover border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-tertiary)] flex-shrink-0 ${className}`}
        loading="lazy"
      />
    );
  }

  if (isVideo && blobUrl && !hasError) {
    const videoSizeClasses =
      size === 'sm'
        ? 'w-10 h-10 rounded-lg'
        : size === 'md'
          ? 'w-16 h-16 rounded-xl'
          : size === 'lg'
            ? 'w-full h-40 rounded-t-2xl'
            : 'w-full h-full';

    const containerClassName = className.replace(/\bobject-(contain|cover|fill|none|scale-down)\b/g, '').trim();

    return (
      <div
        className={`relative ${videoSizeClasses} overflow-hidden bg-black/90 flex-shrink-0 flex items-center justify-center border border-[var(--theme-border-secondary)] ${containerClassName}`}
      >
        <video
          src={`${blobUrl}#t=0.1`}
          onError={() => setHasError(true)}
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

  const fileType = getLibraryFileType(item.type, item.name);
  const ext = item.name.includes('.') ? item.name.slice(item.name.lastIndexOf('.') + 1).toUpperCase() : '';

  const sizeContainerClasses =
    size === 'sm'
      ? 'w-10 h-10 rounded-lg text-xs'
      : size === 'md'
        ? 'w-16 h-16 rounded-xl text-sm'
        : size === 'lg'
          ? 'w-full h-40 rounded-t-2xl text-base'
          : 'w-full h-full text-base';

  if (fileType === 'pdf') {
    return (
      <div
        className={`${sizeContainerClasses} flex flex-col items-center justify-center bg-red-500/10 text-red-500 border border-red-500/20 font-semibold flex-shrink-0 ${className}`}
      >
        <span className="text-[10px] font-bold tracking-wider leading-none">PDF</span>
      </div>
    );
  }

  if (fileType === 'spreadsheet') {
    return (
      <div
        className={`${sizeContainerClasses} flex flex-col items-center justify-center bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-semibold flex-shrink-0 ${className}`}
      >
        <FileSpreadsheet size={size === 'sm' ? 18 : 26} strokeWidth={2} />
      </div>
    );
  }

  if (fileType === 'presentation') {
    return (
      <div
        className={`${sizeContainerClasses} flex flex-col items-center justify-center bg-amber-500/10 text-amber-600 border border-amber-500/20 font-semibold flex-shrink-0 ${className}`}
      >
        <Presentation size={size === 'sm' ? 18 : 26} strokeWidth={2} />
      </div>
    );
  }

  if (isVideo || item.type.startsWith('video/')) {
    return (
      <div
        className={`${sizeContainerClasses} flex flex-col items-center justify-center bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-semibold flex-shrink-0 ${className}`}
      >
        <Video size={size === 'sm' ? 18 : 26} strokeWidth={2} />
      </div>
    );
  }

  if (item.type.startsWith('audio/')) {
    return (
      <div
        className={`${sizeContainerClasses} flex flex-col items-center justify-center bg-purple-500/10 text-purple-500 border border-purple-500/20 font-semibold flex-shrink-0 ${className}`}
      >
        <Music size={size === 'sm' ? 18 : 26} strokeWidth={2} />
      </div>
    );
  }

  if (isImage) {
    return (
      <div
        className={`${sizeContainerClasses} flex flex-col items-center justify-center bg-blue-500/10 text-blue-500 border border-blue-500/20 font-semibold flex-shrink-0 ${className}`}
      >
        <ImageIcon size={size === 'sm' ? 18 : 26} strokeWidth={2} />
      </div>
    );
  }

  return (
    <div
      className={`${sizeContainerClasses} flex flex-col items-center justify-center bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] border border-[var(--theme-border-secondary)] font-semibold flex-shrink-0 ${className}`}
    >
      {ext && ext.length <= 4 ? (
        <span className="text-[10px] font-bold tracking-wider leading-none uppercase">{ext}</span>
      ) : (
        <FileText size={size === 'sm' ? 18 : 26} strokeWidth={2} />
      )}
    </div>
  );
};

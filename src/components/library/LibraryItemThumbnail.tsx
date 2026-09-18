import React, { lazy, useEffect, useMemo, useState } from 'react';
import { Presentation, Video, Image as ImageIcon } from 'lucide-react';
import type { LibraryItem } from '@/types';
import { useVisibleThumbnailGate } from '@/hooks/ui/useVisibleThumbnailGate';
import { isImageFileType, isVideoFileType, isAudioFileType, getLibraryFileType } from '@/utils/library/libraryFiles';
import { getFileDisplayMeta } from '@/utils/file/fileDisplayStyles';
import { readPdfThumbnailCache, getPdfThumbnailCacheKey } from '@/components/chat/input/files/pdfThumbnailCache';
import { extractYoutubeVideoId } from '@/utils/file/youtubeUrl';
import { isTextSnippetCandidate } from '@/utils/library/codeSnippetHighlight';
import { useLibraryThumbnailLoaders } from './useLibraryThumbnailLoaders';
import { ImageThumbnail } from './thumbnails/ImageThumbnail';
import { YoutubeThumbnail } from './thumbnails/YoutubeThumbnail';
import { VideoThumbnail } from './thumbnails/VideoThumbnail';
import { PdfThumbnail } from './thumbnails/PdfThumbnail';
import { TextSnippetThumbnail } from './thumbnails/TextSnippetThumbnail';
import { SpreadsheetThumbnail } from './thumbnails/SpreadsheetThumbnail';
import { AudioThumbnail } from './thumbnails/AudioThumbnail';

const LazyPdfFileThumbnail = lazy(() =>
  import('@/components/chat/input/files/PdfFileThumbnail').then((module) => ({
    default: module.PdfFileThumbnail,
  })),
);

interface LibraryItemThumbnailProps {
  item: LibraryItem;
  size?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

const LibraryItemThumbnailComponent: React.FC<LibraryItemThumbnailProps> = ({ item, size = 'sm', className = '' }) => {
  const isImage = isImageFileType(item.type, item.name);
  const isVideo = isVideoFileType(item.type, item.name);
  const isAudio = isAudioFileType(item.type, item.name);
  const fileType = getLibraryFileType(item.type, item.name);
  const isPdf = fileType === 'pdf';
  const isSpreadsheet = fileType === 'spreadsheet';
  const isSvg = item.name.toLowerCase().endsWith('.svg') || item.type === 'image/svg+xml';
  const isTextCandidate = isTextSnippetCandidate(item);
  const canPreview = isImage || isVideo || isPdf;

  const pdfWidth = size === 'sm' ? 92 : size === 'md' ? 128 : 280;
  const pdfCacheKey = useMemo(() => (isPdf ? getPdfThumbnailCacheKey(item, pdfWidth) : ''), [isPdf, item, pdfWidth]);
  const [cachedPdfImage, setCachedPdfImage] = useState(() =>
    pdfCacheKey ? readPdfThumbnailCache(pdfCacheKey) : undefined,
  );

  useEffect(() => {
    if (pdfCacheKey) {
      setCachedPdfImage(readPdfThumbnailCache(pdfCacheKey));
    }
  }, [pdfCacheKey]);

  const youtubeVideoId = useMemo(() => {
    return (
      extractYoutubeVideoId(item.fileUri) ||
      extractYoutubeVideoId(item.name) ||
      (item.dataUrl ? extractYoutubeVideoId(item.dataUrl) : null)
    );
  }, [item.fileUri, item.name, item.dataUrl]);
  const [youtubeError, setYoutubeError] = useState(false);

  const hasCachedPdf = !!cachedPdfImage;

  // Derive needsGate tentatively with initial synchronous cache presence
  const initialNeedsGate =
    (isPdf && !hasCachedPdf) ||
    (isImage && !item.dataUrl) ||
    (isVideo && !item.dataUrl && !youtubeVideoId) ||
    (isTextCandidate && !item.textContent) ||
    isSpreadsheet ||
    isAudio;

  const { containerRef, isVisible } = useVisibleThumbnailGate(initialNeedsGate);

  const { blobUrl, hasError, handleImageError, handleVideoError, textLines, waveformBars, spreadsheetRows } =
    useLibraryThumbnailLoaders({
      item,
      isTextCandidate,
      canPreview,
      isPdf,
      cachedPdfImage,
      isSvg,
      isAudio,
      isSpreadsheet,
      isVisible,
    });

  const ext = item.name.includes('.') ? item.name.slice(item.name.lastIndexOf('.') + 1).toUpperCase() : '';

  const sizeContainerClasses =
    size === 'sm'
      ? 'w-10 h-10 rounded-lg text-xs'
      : size === 'md'
        ? 'w-16 h-16 rounded-xl text-sm'
        : size === 'lg'
          ? 'w-full h-40 rounded-t-2xl text-base'
          : 'w-full h-full text-base';

  if (isImage && blobUrl && !hasError) {
    return (
      <ImageThumbnail
        item={item}
        size={size}
        className={className}
        blobUrl={blobUrl}
        isSvg={isSvg}
        onImageError={handleImageError}
      />
    );
  }

  if (youtubeVideoId && !youtubeError) {
    return (
      <YoutubeThumbnail
        item={item}
        size={size}
        className={className}
        youtubeVideoId={youtubeVideoId}
        containerRef={containerRef}
        onError={() => setYoutubeError(true)}
      />
    );
  }

  if (isVideo && blobUrl && !hasError) {
    return (
      <VideoThumbnail
        item={item}
        size={size}
        className={className}
        blobUrl={blobUrl}
        containerRef={containerRef}
        onVideoError={handleVideoError}
      />
    );
  }

  if (isPdf && (cachedPdfImage || (blobUrl && isVisible && !hasError))) {
    return (
      <PdfThumbnail
        item={item}
        size={size}
        className={className}
        cachedPdfImage={cachedPdfImage}
        blobUrl={blobUrl}
        pdfWidth={pdfWidth}
        LazyPdfFileThumbnail={LazyPdfFileThumbnail}
      />
    );
  }

  if (isTextCandidate && textLines.length > 0) {
    return <TextSnippetThumbnail item={item} size={size} className={className} textLines={textLines} ext={ext} />;
  }

  if (fileType === 'pdf') {
    return (
      <div
        ref={containerRef}
        className={`${sizeContainerClasses} flex flex-col items-center justify-center bg-red-500/10 text-red-500 border border-red-500/20 font-semibold flex-shrink-0 ${className}`}
      >
        <span className="text-[10px] font-bold tracking-wider leading-none">PDF</span>
      </div>
    );
  }

  if (isSpreadsheet) {
    return (
      <SpreadsheetThumbnail
        item={item}
        size={size}
        className={className}
        spreadsheetRows={spreadsheetRows}
        ext={ext}
        containerRef={containerRef}
      />
    );
  }

  if (fileType === 'presentation') {
    return (
      <div
        ref={containerRef}
        className={`${sizeContainerClasses} flex flex-col items-center justify-center bg-amber-500/10 text-amber-600 border border-amber-500/20 font-semibold flex-shrink-0 ${className}`}
      >
        <Presentation size={size === 'sm' ? 18 : 26} strokeWidth={2} />
      </div>
    );
  }

  if (isVideo) {
    return (
      <div
        ref={containerRef}
        className={`${sizeContainerClasses} flex flex-col items-center justify-center bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-semibold flex-shrink-0 ${className}`}
      >
        <Video size={size === 'sm' ? 18 : 26} strokeWidth={2} />
      </div>
    );
  }

  if (isAudio) {
    return (
      <AudioThumbnail
        item={item}
        size={size}
        className={className}
        waveformBars={waveformBars}
        ext={ext}
        containerRef={containerRef}
      />
    );
  }

  if (isImage) {
    return (
      <div
        ref={containerRef}
        className={`${sizeContainerClasses} flex flex-col items-center justify-center bg-blue-500/10 text-blue-500 border border-blue-500/20 font-semibold flex-shrink-0 ${className}`}
      >
        <ImageIcon size={size === 'sm' ? 18 : 26} strokeWidth={2} />
      </div>
    );
  }

  const { Icon: FallbackIcon, colorClass, bgClass } = getFileDisplayMeta({ name: item.name, type: item.type });
  const isYoutubeCategory = Boolean(youtubeVideoId) || item.type === 'video/youtube-link';

  return (
    <div
      ref={containerRef}
      className={`${sizeContainerClasses} flex flex-col items-center justify-center ${bgClass} ${colorClass} border border-current/20 font-semibold flex-shrink-0 ${className}`}
    >
      {!isYoutubeCategory && ext && ext.length <= 4 ? (
        <span className="text-[10px] font-bold tracking-wider leading-none uppercase">{ext}</span>
      ) : (
        <FallbackIcon size={size === 'sm' ? 18 : 26} strokeWidth={2} />
      )}
    </div>
  );
};

export const LibraryItemThumbnail = React.memo<LibraryItemThumbnailProps>(
  LibraryItemThumbnailComponent,
  (prev, next) =>
    prev.size === next.size &&
    prev.className === next.className &&
    prev.item.id === next.item.id &&
    prev.item.name === next.item.name &&
    prev.item.type === next.item.type &&
    prev.item.size === next.item.size &&
    prev.item.dataUrl === next.item.dataUrl &&
    prev.item.fileUri === next.item.fileUri &&
    prev.item.rawFile === next.item.rawFile &&
    prev.item.sessionId === next.item.sessionId &&
    prev.item.textContent === next.item.textContent,
);

import React, { Suspense } from 'react';
import type { LibraryItem } from '@/types';

interface PdfThumbnailProps {
  item: LibraryItem;
  size?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
  cachedPdfImage?: string;
  blobUrl: string | null;
  pdfWidth: number;
  LazyPdfFileThumbnail: React.ComponentType<{
    file: LibraryItem & { dataUrl?: string };
    fallback: React.ReactNode;
    width: number;
    className?: string;
  }>;
}

export const PdfThumbnail: React.FC<PdfThumbnailProps> = ({
  item,
  size = 'sm',
  className = '',
  cachedPdfImage,
  blobUrl,
  pdfWidth,
  LazyPdfFileThumbnail,
}) => {
  const pdfSizeClasses =
    size === 'sm'
      ? 'w-10 h-10 rounded-lg'
      : size === 'md'
        ? 'w-16 h-16 rounded-xl'
        : size === 'lg'
          ? 'w-full h-40 rounded-t-2xl'
          : 'w-full h-full';

  const containerClassName = className.replace(/\bobject-(contain|cover|fill|none|scale-down)\b/g, '').trim();
  const objectFitClass = className.match(/\bobject-(contain|cover|fill|none|scale-down)\b/)?.[0] ?? 'object-cover';

  const innerFallback = (
    <div className="w-full h-full flex flex-col items-center justify-center bg-red-500/10 text-red-500 font-semibold">
      <span className="text-[10px] font-bold tracking-wider leading-none">PDF</span>
    </div>
  );

  return (
    <div
      className={`relative ${pdfSizeClasses} overflow-hidden bg-white dark:bg-[var(--theme-bg-secondary)] flex-shrink-0 flex items-center justify-center border border-[var(--theme-border-secondary)] ${containerClassName}`}
    >
      {cachedPdfImage ? (
        <img src={cachedPdfImage} alt={item.name} className={`w-full h-full ${objectFitClass}`} />
      ) : (
        <Suspense fallback={innerFallback}>
          <LazyPdfFileThumbnail
            file={{ ...item, dataUrl: blobUrl ?? undefined }}
            fallback={innerFallback}
            width={pdfWidth}
            className={className}
          />
        </Suspense>
      )}
      {size !== 'sm' && (
        <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-red-600/80 backdrop-blur-xs flex items-center gap-1 pointer-events-none text-white text-[10px] font-bold tracking-wider shadow-xs">
          PDF
        </div>
      )}
    </div>
  );
};

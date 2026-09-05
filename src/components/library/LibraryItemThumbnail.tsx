import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { FileText, FileSpreadsheet, Presentation, Music, Video, Image as ImageIcon, FileCode } from 'lucide-react';
import type { LibraryItem } from '@/types';
import { isImageFileType, isVideoFileType, isAudioFileType, getLibraryFileType } from '@/utils/library/libraryFiles';
import { isTextFile, isMarkdownFile } from '@/utils/file/fileTypeClassification';
import { fileToBlobUrl, cleanupFilePreviewUrl } from '@/utils/file/filePreviewUrls';
import { dbService } from '@/services/db/dbService';
import { readPdfThumbnailCache, getPdfThumbnailCacheKey } from '@/components/chat/input/files/pdfThumbnailCache';

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

// Bounded LRU cache for extracted text snippet lines
const TEXT_SNIPPET_CACHE_LIMIT = 256;
const textSnippetCache = new Map<string, string[]>();

const readSnippetCache = (id: string): string[] | undefined => {
  const cached = textSnippetCache.get(id);
  if (!cached) return undefined;
  textSnippetCache.delete(id);
  textSnippetCache.set(id, cached);
  return cached;
};

const writeSnippetCache = (id: string, lines: string[]) => {
  textSnippetCache.delete(id);
  textSnippetCache.set(id, lines);
  while (textSnippetCache.size > TEXT_SNIPPET_CACHE_LIMIT) {
    const oldestKey = textSnippetCache.keys().next().value;
    if (oldestKey === undefined) break;
    textSnippetCache.delete(oldestKey);
  }
};

// Bounded LRU cache for created thumbnail blob URLs across view-mode toggles
const THUMBNAIL_BLOB_CACHE_LIMIT = 64;
const thumbnailBlobUrlCache = new Map<string, string>();

const readThumbnailBlobCache = (id: string): string | undefined => {
  const cached = thumbnailBlobUrlCache.get(id);
  if (!cached) return undefined;
  thumbnailBlobUrlCache.delete(id);
  thumbnailBlobUrlCache.set(id, cached);
  return cached;
};

const writeThumbnailBlobCache = (id: string, url: string) => {
  thumbnailBlobUrlCache.delete(id);
  thumbnailBlobUrlCache.set(id, url);
  while (thumbnailBlobUrlCache.size > THUMBNAIL_BLOB_CACHE_LIMIT) {
    const oldestKey = thumbnailBlobUrlCache.keys().next().value;
    if (oldestKey === undefined) break;
    const oldestUrl = thumbnailBlobUrlCache.get(oldestKey);
    thumbnailBlobUrlCache.delete(oldestKey);
    if (oldestUrl) {
      cleanupFilePreviewUrl({ dataUrl: oldestUrl });
    }
  }
};


const isTextSnippetCandidate = (item: LibraryItem): boolean => {
  if (isImageFileType(item.type, item.name)) return false;
  if (isVideoFileType(item.type, item.name)) return false;
  if (isAudioFileType(item.type, item.name)) return false;
  const kind = getLibraryFileType(item.type, item.name);
  if (kind === 'pdf' || kind === 'spreadsheet' || kind === 'presentation') return false;

  return isTextFile({ name: item.name, type: item.type }) || isMarkdownFile({ name: item.name, type: item.type });
};

const extractSnippetLines = (content: string): string[] => {
  return content
    .slice(0, 2048)
    .split(/\r?\n/)
    .slice(0, 6)
    .map((l) => (l.length > 80 ? l.slice(0, 80) + '…' : l));
};

const CODE_KEYWORDS = new Set([
  'import', 'export', 'from', 'default', 'const', 'let', 'var', 'function',
  'return', 'if', 'else', 'for', 'while', 'class', 'extends', 'interface',
  'type', 'async', 'await', 'def', 'self', 'public', 'private', 'static',
  'new', 'try', 'catch', 'throw', 'package', 'use', 'fn', 'mut', 'struct',
  'true', 'false', 'null', 'undefined', 'nil', 'None', 'True', 'False',
  'select', 'where', 'insert', 'update', 'delete',
]);

const renderHighlightedCodeLine = (text: string, ext: string) => {
  const trimmed = text.trim();
  if (!trimmed) {
    return <span className="inline-block">&nbsp;</span>;
  }
  if ((ext === 'MD' || ext === 'MARKDOWN') && trimmed.startsWith('#')) {
    return <span className="text-[#89b4fa] font-bold">{text}</span>;
  }
  if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) {
    return <span className="text-[#6c7086] italic">{text}</span>;
  }
  if (ext === 'JSON' && trimmed.startsWith('"')) {
    const colonIdx = text.indexOf(':');
    if (colonIdx !== -1) {
      const key = text.slice(0, colonIdx);
      const rest = text.slice(colonIdx);
      return (
        <>
          <span className="text-[#89b4fa]">{key}</span>
          <span className="text-[#cdd6f4]">{rest}</span>
        </>
      );
    }
  }

  const tokens = text.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`|\b[a-zA-Z_$][a-zA-Z0-9_$]*\b|[^\w\s"'`]+|\s+)/g).filter(Boolean);
  return (
    <>
      {tokens.map((tok, i) => {
        if (tok.startsWith('"') || tok.startsWith("'") || tok.startsWith('`')) {
          return <span key={i} className="text-[#a6e3a1]">{tok}</span>;
        }
        if (CODE_KEYWORDS.has(tok)) {
          return <span key={i} className="text-[#cba6f7] font-medium">{tok}</span>;
        }
        if (/^\d+(\.\d+)?$/.test(tok)) {
          return <span key={i} className="text-[#fab387]">{tok}</span>;
        }
        if (tok === '=' || tok === '=>' || tok === '==' || tok === '===' || tok === ':' || tok === '+' || tok === '-') {
          return <span key={i} className="text-[#89dceb]">{tok}</span>;
        }
        return <span key={i}>{tok}</span>;
      })}
    </>
  );
};

const useVisibleThumbnailGate = (enabled: boolean) => {
  const containerRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(() => !enabled || typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (!enabled || isVisible) {
      return undefined;
    }

    const element = containerRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      queueMicrotask(() => setIsVisible(true));
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '120px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled, isVisible]);

  return { containerRef, isVisible };
};

const LibraryItemThumbnailComponent: React.FC<LibraryItemThumbnailProps> = ({ item, size = 'sm', className = '' }) => {
  const isImage = isImageFileType(item.type, item.name);
  const isVideo = isVideoFileType(item.type, item.name);
  const isAudio = isAudioFileType(item.type, item.name);
  const fileType = getLibraryFileType(item.type, item.name);
  const isPdf = fileType === 'pdf';
  const isSvg = item.name.toLowerCase().endsWith('.svg') || item.type === 'image/svg+xml';
  const isTextCandidate = isTextSnippetCandidate(item);
  const canPreview = isImage || isVideo || isPdf;

  const pdfWidth = size === 'sm' ? 92 : size === 'md' ? 128 : 280;
  const pdfCacheKey = useMemo(() => (isPdf ? getPdfThumbnailCacheKey(item, pdfWidth) : ''), [isPdf, item, pdfWidth]);
  const [cachedPdfImage, setCachedPdfImage] = useState(() => (pdfCacheKey ? readPdfThumbnailCache(pdfCacheKey) : undefined));

  useEffect(() => {
    if (pdfCacheKey) {
      setCachedPdfImage(readPdfThumbnailCache(pdfCacheKey));
    }
  }, [pdfCacheKey]);

  const hasCachedPdf = !!cachedPdfImage;
  const cachedBlob = readThumbnailBlobCache(item.id);
  const initialBlobUrl = item.dataUrl
    ? (isSvg && item.dataUrl.startsWith('data:') && !item.dataUrl.startsWith('data:image/svg+xml')
        ? item.dataUrl.replace(/^data:[^;]+;/, 'data:image/svg+xml;')
        : item.dataUrl)
    : (cachedBlob ?? null);

  const [blobUrl, setBlobUrl] = useState<string | null>(initialBlobUrl);
  const [hasError, setHasError] = useState(false);

  const [textLines, setTextLines] = useState<string[]>(() => {
    const cached = readSnippetCache(item.id);
    if (cached) return cached;
    if (item.textContent) {
      const lines = extractSnippetLines(item.textContent);
      writeSnippetCache(item.id, lines);
      return lines;
    }
    return [];
  });

  const hasImmediateSnippet = textLines.length > 0;
  const hasImmediateBlob = !!blobUrl;

  // Viewport gating: only gate items that require async I/O
  const needsGate =
    (isPdf && !hasCachedPdf) ||
    (isImage && !hasImmediateBlob) ||
    (isVideo && !hasImmediateBlob) ||
    (isTextCandidate && !hasImmediateSnippet);

  const { containerRef, isVisible } = useVisibleThumbnailGate(needsGate);

  // Text snippet loader: only runs when in viewport
  useEffect(() => {
    if (!isTextCandidate || !isVisible) return;
    const cached = readSnippetCache(item.id);
    if (cached) {
      setTextLines(cached);
      return;
    }
    if (item.textContent) {
      const lines = extractSnippetLines(item.textContent);
      writeSnippetCache(item.id, lines);
      setTextLines(lines);
      return;
    }

    let active = true;
    const loadText = async () => {
      try {
        let blob = item.rawFile;
        if (!blob) {
          blob = await dbService.fetchLibraryFileBlob(item);
        }
        if (active && blob) {
          const text = await blob.slice(0, 2048).text();
          const lines = extractSnippetLines(text);
          writeSnippetCache(item.id, lines);
          setTextLines(lines);
        }
      } catch {
        // ignore
      }
    };

    void loadText();
    return () => {
      active = false;
    };
  }, [item, isTextCandidate, isVisible]);

  // Media blob loader: only runs when in viewport
  useEffect(() => {
    if (!canPreview || !isVisible) return;
    if (isPdf && (cachedPdfImage || !isVisible)) return;
    if (item.dataUrl) {
      let finalUrl = item.dataUrl;
      if (isSvg && finalUrl.startsWith('data:') && !finalUrl.startsWith('data:image/svg+xml')) {
        finalUrl = finalUrl.replace(/^data:[^;]+;/, 'data:image/svg+xml;');
      }
      setBlobUrl(finalUrl);
      return;
    }

    const cached = readThumbnailBlobCache(item.id);
    if (cached) {
      setBlobUrl(cached);
      return;
    }

    let active = true;
    const loadBlob = async () => {
      try {
        let blob = item.rawFile;
        if (!blob) {
          blob = await dbService.fetchLibraryFileBlob(item);
        }
        if (active && blob) {
          if (isSvg && blob.type !== 'image/svg+xml') {
            blob = new Blob([blob], { type: 'image/svg+xml' });
          }
          const createdUrl = fileToBlobUrl(blob);
          writeThumbnailBlobCache(item.id, createdUrl);
          setBlobUrl(createdUrl);
        }
      } catch {
        if (active) setHasError(true);
      }
    };

    void loadBlob();
    return () => {
      active = false;
    };
  }, [item, canPreview, isPdf, isVisible, cachedPdfImage, isSvg]);

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
            onError={() => setHasError(true)}
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
        ref={containerRef as React.RefObject<HTMLDivElement>}
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

  if (isPdf && (cachedPdfImage || (blobUrl && isVisible && !hasError))) {
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
          <img
            src={cachedPdfImage}
            alt={item.name}
            className={`w-full h-full ${objectFitClass}`}
          />
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
          <div
            className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-red-600/80 backdrop-blur-xs flex items-center gap-1 pointer-events-none text-white text-[10px] font-bold tracking-wider shadow-xs"
          >
            PDF
          </div>
        )}
      </div>
    );
  }


  if (isTextCandidate && textLines.length > 0) {
    const textSnippetSizeClasses =
      size === 'sm'
        ? 'w-10 h-10 rounded-lg'
        : size === 'md'
          ? 'w-16 h-16 rounded-xl'
          : size === 'lg'
            ? 'w-full h-40 rounded-t-2xl'
            : 'w-full h-full';

    const containerClassName = className.replace(/\bobject-(contain|cover|fill|none|scale-down)\b/g, '').trim();
    const displayExt = ext || (item.name.startsWith('.') ? item.name.slice(1).toUpperCase() : 'TXT');

    if (size === 'full' || size === 'lg') {
      return (
        <div
          className={`relative ${textSnippetSizeClasses} overflow-hidden bg-[#181825] text-[#cdd6f4] flex-shrink-0 flex flex-col border border-[var(--theme-border-secondary)] font-mono select-none ${containerClassName}`}
        >
          {/* Editor Header Bar */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#11111b] border-b border-white/5 shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#f38ba8]/80" />
              <div className="w-2 h-2 rounded-full bg-[#f9e2af]/80" />
              <div className="w-2 h-2 rounded-full bg-[#a6e3a1]/80" />
            </div>
            <span className="font-semibold tracking-wider text-[9px] text-white/50 uppercase">
              {displayExt}
            </span>
          </div>

          {/* Snippet Lines */}
          <div className="p-2.5 sm:p-3 flex-1 overflow-hidden flex flex-col justify-start gap-1 font-mono text-[10px] leading-[1.55]">
            {textLines.map((line, idx) => (
              <div key={idx} className="flex items-start gap-2 min-w-0">
                <span className="text-white/20 select-none text-[9px] w-3 text-right shrink-0 pt-0.5">
                  {idx + 1}
                </span>
                <span className="truncate flex-1 text-white/85 font-mono">
                  {renderHighlightedCodeLine(line, displayExt)}
                </span>
              </div>
            ))}
          </div>

          {/* Language / format pill badge in bottom left */}
          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs flex items-center gap-1 pointer-events-none text-white/90 text-[10px] font-bold tracking-wider shadow-xs uppercase">
            {displayExt}
          </div>
        </div>
      );
    }

    if (size === 'md') {
      return (
        <div
          className={`relative ${textSnippetSizeClasses} overflow-hidden bg-[#181825] text-[#cdd6f4] flex-shrink-0 flex flex-col justify-between p-2 border border-[var(--theme-border-secondary)] font-mono select-none ${containerClassName}`}
        >
          <div className="flex flex-col gap-0.5 overflow-hidden text-[8px] leading-[1.3] text-white/70">
            {textLines.slice(0, 3).map((line, idx) => (
              <div key={idx} className="truncate">
                {line.trim() || ' '}
              </div>
            ))}
          </div>
          <span className="text-[9px] font-bold text-[#89dceb] tracking-wider uppercase">
            {displayExt.slice(0, 4)}
          </span>
        </div>
      );
    }

    if (size === 'sm') {
      return (
        <div
          className="w-10 h-10 rounded-lg flex flex-col items-center justify-center bg-[#181825] text-[#89dceb] border border-[var(--theme-border-secondary)] font-semibold flex-shrink-0 font-mono shadow-xs"
        >
          {displayExt && displayExt.length <= 4 ? (
            <span className="text-[10px] font-bold tracking-wider leading-none text-[#89dceb] uppercase font-mono">
              {displayExt}
            </span>
          ) : (
            <FileCode size={18} strokeWidth={2} className="text-[#89b4fa]" />
          )}
        </div>
      );
    }
  }

  if (fileType === 'pdf') {
    return (
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className={`${sizeContainerClasses} flex flex-col items-center justify-center bg-red-500/10 text-red-500 border border-red-500/20 font-semibold flex-shrink-0 ${className}`}
      >
        <span className="text-[10px] font-bold tracking-wider leading-none">PDF</span>
      </div>
    );
  }

  if (fileType === 'spreadsheet') {
    return (
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className={`${sizeContainerClasses} flex flex-col items-center justify-center bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-semibold flex-shrink-0 ${className}`}
      >
        <FileSpreadsheet size={size === 'sm' ? 18 : 26} strokeWidth={2} />
      </div>
    );
  }

  if (fileType === 'presentation') {
    return (
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className={`${sizeContainerClasses} flex flex-col items-center justify-center bg-amber-500/10 text-amber-600 border border-amber-500/20 font-semibold flex-shrink-0 ${className}`}
      >
        <Presentation size={size === 'sm' ? 18 : 26} strokeWidth={2} />
      </div>
    );
  }

  if (isVideo) {
    return (
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className={`${sizeContainerClasses} flex flex-col items-center justify-center bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-semibold flex-shrink-0 ${className}`}
      >
        <Video size={size === 'sm' ? 18 : 26} strokeWidth={2} />
      </div>
    );
  }

  if (isAudio) {
    return (
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className={`${sizeContainerClasses} flex flex-col items-center justify-center bg-purple-500/10 text-purple-500 border border-purple-500/20 font-semibold flex-shrink-0 ${className}`}
      >
        <Music size={size === 'sm' ? 18 : 26} strokeWidth={2} />
      </div>
    );
  }

  if (isImage) {
    return (
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className={`${sizeContainerClasses} flex flex-col items-center justify-center bg-blue-500/10 text-blue-500 border border-blue-500/20 font-semibold flex-shrink-0 ${className}`}
      >
        <ImageIcon size={size === 'sm' ? 18 : 26} strokeWidth={2} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
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
    prev.item.textContent === next.item.textContent,
);

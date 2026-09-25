import { useCallback, useEffect, useRef, useState } from 'react';
import type { LibraryItem } from '@/types';
import { dbService } from '@/services/db/dbService';
import { fileToBlobUrl } from '@/utils/file/filePreviewUrls';
import {
  readSnippetCache,
  writeSnippetCache,
  readThumbnailBlobCache,
  writeThumbnailBlobCache,
  readSpreadsheetCache,
  writeSpreadsheetCache,
} from '@/utils/library/thumbnailCaches';
import { parseDelimitedText, parseExcelBlob } from '@/utils/library/spreadsheetParser';
import { extractSnippetLines } from '@/utils/library/codeSnippetHighlight';
import {
  generateDeterministicWaveform as generateWaveform,
  decodeAudioWaveform as decodeWaveform,
  readAudioWaveformCache as readWaveformCache,
  writeAudioWaveformCache as writeWaveformCache,
} from '@/utils/media/audioWaveform';

interface UseLibraryThumbnailLoadersParams {
  item: LibraryItem;
  isTextCandidate: boolean;
  canPreview: boolean;
  isPdf: boolean;
  cachedPdfImage?: string;
  isSvg: boolean;
  isAudio: boolean;
  isSpreadsheet: boolean;
  isVisible: boolean;
}

export function useLibraryThumbnailLoaders({
  item,
  isTextCandidate,
  canPreview,
  isPdf,
  cachedPdfImage,
  isSvg,
  isAudio,
  isSpreadsheet,
  isVisible,
}: UseLibraryThumbnailLoadersParams) {
  const cachedBlob = readThumbnailBlobCache(item.id);
  const initialBlobUrl = item.dataUrl
    ? isSvg && item.dataUrl.startsWith('data:') && !item.dataUrl.startsWith('data:image/svg+xml')
      ? item.dataUrl.replace(/^data:[^;]+;/, 'data:image/svg+xml;')
      : item.dataUrl
    : (cachedBlob ?? null);

  const [blobUrl, setBlobUrl] = useState<string | null>(initialBlobUrl);
  const [hasError, setHasError] = useState(false);
  const recoveryAttemptedRef = useRef(false);

  const handleImageError = useCallback(async () => {
    if (!recoveryAttemptedRef.current) {
      recoveryAttemptedRef.current = true;
      try {
        const blob = await dbService.fetchLibraryFileBlob(item);
        if (blob) {
          let finalBlob = blob;
          if (isSvg && finalBlob.type !== 'image/svg+xml') {
            finalBlob = new Blob([finalBlob], { type: 'image/svg+xml' });
          }
          const createdUrl = fileToBlobUrl(finalBlob);
          writeThumbnailBlobCache(item.id, createdUrl);
          setBlobUrl(createdUrl);
          setHasError(false);
          return;
        }
      } catch {
        // ignore
      }
    }
    setHasError(true);
  }, [item, isSvg]);

  const handleVideoError = useCallback(async () => {
    if (!recoveryAttemptedRef.current) {
      recoveryAttemptedRef.current = true;
      try {
        const blob = await dbService.fetchLibraryFileBlob(item);
        if (blob) {
          const createdUrl = fileToBlobUrl(blob);
          writeThumbnailBlobCache(item.id, createdUrl);
          setBlobUrl(createdUrl);
          setHasError(false);
          return;
        }
      } catch {
        // ignore
      }
    }
    setHasError(true);
  }, [item]);

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

  const [waveformBars, setWaveformBars] = useState<number[]>(() => {
    if (!isAudio) return [];
    const cached = readWaveformCache(item.id);
    if (cached) return cached;
    const initial = generateWaveform(`${item.id}:${item.name}:${item.size}`);
    writeWaveformCache(item.id, initial);
    return initial;
  });

  const [spreadsheetRows, setSpreadsheetRows] = useState<string[][]>(() => {
    if (!isSpreadsheet) return [];
    const cached = readSpreadsheetCache(item.id);
    if (cached) return cached;
    if (item.textContent) {
      const parsed = parseDelimitedText(item.textContent, 5, 4);
      if (parsed.length > 0) {
        writeSpreadsheetCache(item.id, parsed);
        return parsed;
      }
    }
    return [];
  });

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

  // Audio waveform loader: attempts real decoding via Web Audio API when in viewport
  useEffect(() => {
    if (!isAudio || !isVisible) return;
    const cached = readWaveformCache(item.id);
    if (cached && cached.length > 0) {
      setWaveformBars(cached);
    }

    let active = true;
    const loadWaveform = async () => {
      try {
        let blob = item.rawFile;
        if (!blob && item.dataUrl?.startsWith('blob:')) {
          try {
            const response = await fetch(item.dataUrl);
            blob = await response.blob();
          } catch {
            // dead blob URL fallback
          }
        }
        if (!blob) {
          blob = await dbService.fetchLibraryFileBlob(item);
        }
        if (active && blob) {
          const peaks = await decodeWaveform(blob, 28);
          if (active && peaks && peaks.length > 0) {
            writeWaveformCache(item.id, peaks);
            setWaveformBars(peaks);
          }
        }
      } catch {
        // keep deterministic waveform
      }
    };

    void loadWaveform();
    return () => {
      active = false;
    };
  }, [item, isAudio, isVisible]);

  // Spreadsheet grid loader: parses CSV or Excel into mini matrix when in viewport
  useEffect(() => {
    if (!isSpreadsheet || !isVisible) return;
    const cached = readSpreadsheetCache(item.id);
    if (cached && cached.length > 0) {
      setSpreadsheetRows(cached);
      return;
    }
    if (item.textContent) {
      const parsed = parseDelimitedText(item.textContent, 5, 4);
      if (parsed.length > 0) {
        writeSpreadsheetCache(item.id, parsed);
        setSpreadsheetRows(parsed);
        return;
      }
    }

    let active = true;
    const loadSpreadsheet = async () => {
      try {
        let blob = item.rawFile;
        if (!blob && item.dataUrl?.startsWith('blob:')) {
          try {
            const response = await fetch(item.dataUrl);
            blob = await response.blob();
          } catch {
            // dead blob URL fallback
          }
        }
        if (!blob) {
          blob = await dbService.fetchLibraryFileBlob(item);
        }
        if (!active || !blob) return;

        const lowerName = item.name.toLowerCase();
        let rows: string[][] = [];
        if (lowerName.endsWith('.csv') || lowerName.endsWith('.tsv') || item.type.includes('csv')) {
          const text = await blob.slice(0, 4096).text();
          rows = parseDelimitedText(text, 5, 4);
        } else {
          rows = await parseExcelBlob(blob, 5, 4);
        }

        if (active && rows.length > 0) {
          writeSpreadsheetCache(item.id, rows);
          setSpreadsheetRows(rows);
        }
      } catch {
        // keep fallback
      }
    };

    void loadSpreadsheet();
    return () => {
      active = false;
    };
  }, [item, isSpreadsheet, isVisible]);

  return {
    blobUrl,
    hasError,
    handleImageError,
    handleVideoError,
    textLines,
    waveformBars,
    spreadsheetRows,
    hasImmediateSnippet: textLines.length > 0,
    hasImmediateBlob: !!blobUrl,
    hasImmediateSpreadsheet: spreadsheetRows.length > 0,
    hasImmediateWaveform: waveformBars.length > 0,
  };
}

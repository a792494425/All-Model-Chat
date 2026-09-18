import { cleanupFilePreviewUrl } from '@/utils/file/filePreviewUrls';

// Bounded LRU cache for extracted text snippet lines
const TEXT_SNIPPET_CACHE_LIMIT = 256;
const textSnippetCache = new Map<string, string[]>();

export const readSnippetCache = (id: string): string[] | undefined => {
  const cached = textSnippetCache.get(id);
  if (!cached) return undefined;
  textSnippetCache.delete(id);
  textSnippetCache.set(id, cached);
  return cached;
};

export const writeSnippetCache = (id: string, lines: string[]): void => {
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

export const readThumbnailBlobCache = (id: string): string | undefined => {
  const cached = thumbnailBlobUrlCache.get(id);
  if (!cached) return undefined;
  thumbnailBlobUrlCache.delete(id);
  thumbnailBlobUrlCache.set(id, cached);
  return cached;
};

export const writeThumbnailBlobCache = (id: string, url: string): void => {
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

// Bounded LRU cache for extracted spreadsheet grid cells
const SPREADSHEET_GRID_CACHE_LIMIT = 128;
const spreadsheetGridCache = new Map<string, string[][]>();

export const readSpreadsheetCache = (id: string): string[][] | undefined => {
  const cached = spreadsheetGridCache.get(id);
  if (!cached) return undefined;
  spreadsheetGridCache.delete(id);
  spreadsheetGridCache.set(id, cached);
  return cached;
};

export const writeSpreadsheetCache = (id: string, rows: string[][]): void => {
  spreadsheetGridCache.delete(id);
  spreadsheetGridCache.set(id, rows);
  while (spreadsheetGridCache.size > SPREADSHEET_GRID_CACHE_LIMIT) {
    const oldestKey = spreadsheetGridCache.keys().next().value;
    if (oldestKey === undefined) break;
    spreadsheetGridCache.delete(oldestKey);
  }
};

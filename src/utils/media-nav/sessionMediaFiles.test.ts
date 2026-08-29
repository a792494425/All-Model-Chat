import { describe, expect, it } from 'vitest';
import type { ChatMessage, UploadedFile } from '@/types';
import {
  collectSessionMediaFiles,
  collectSessionVideoFiles,
  isPdfFile,
  isVideoFile,
  partsContainPdf,
  partsContainVideo,
  sessionHasMediaFiles,
} from './sessionMediaFiles';

const makeFile = (overrides: Partial<UploadedFile> = {}): UploadedFile => ({
  id: 'f1',
  name: 'doc.pdf',
  type: 'application/pdf',
  size: 10,
  ...overrides,
});

const makeMessage = (files?: UploadedFile[]): ChatMessage => ({
  id: 'm1',
  role: 'user',
  content: '',
  timestamp: new Date(),
  files,
});

describe('file kind detection', () => {
  it('detects pdfs by mime type or extension', () => {
    expect(isPdfFile(makeFile())).toBe(true);
    expect(isPdfFile(makeFile({ type: '', name: 'x.PDF' }))).toBe(true);
    expect(isPdfFile(makeFile({ type: 'image/png', name: 'x.png' }))).toBe(false);
  });

  it('detects videos by mime type', () => {
    expect(isVideoFile(makeFile({ type: 'video/mp4', name: 'clip' }))).toBe(true);
    expect(isVideoFile(makeFile({ type: 'application/pdf' }))).toBe(false);
  });
});

describe('collectSessionMediaFiles', () => {
  it('dedupes by id with selected files first, split by kind', () => {
    const draftPdf = makeFile({ id: 'a', name: 'draft.pdf' });
    const historyPdf = makeFile({ id: 'b', name: 'history.pdf' });
    const video = makeFile({ id: 'v', name: 'clip.mp4', type: 'video/mp4' });
    const image = makeFile({ id: 'c', name: 'pic.png', type: 'image/png' });
    const messages = [makeMessage([historyPdf, draftPdf, video, image])];
    const { pdfs, videos } = collectSessionMediaFiles([draftPdf], messages);
    expect(pdfs.map((file) => file.id)).toEqual(['a', 'b']);
    expect(videos.map((file) => file.id)).toEqual(['v']);
    expect(collectSessionVideoFiles([], messages)).toHaveLength(1);
  });

  it('returns empty for a session without media', () => {
    expect(collectSessionMediaFiles([], [makeMessage([])])).toEqual({ pdfs: [], videos: [] });
    expect(sessionHasMediaFiles([], [])).toBe(false);
  });

  it('reports media presence when only a video exists', () => {
    const video = makeFile({ id: 'v', name: 'clip.mp4', type: 'video/mp4' });
    expect(sessionHasMediaFiles([video], [])).toBe(true);
  });
});

describe('partsContain', () => {
  it('detects inline and file-data PDF parts', () => {
    expect(partsContainPdf([{ inlineData: { mimeType: 'application/pdf', data: 'x' } }])).toBe(true);
    expect(partsContainPdf([{ fileData: { mimeType: 'application/pdf', fileUri: 'uri' } } as never])).toBe(true);
    expect(partsContainPdf([{ inlineData: { mimeType: 'image/png', data: 'x' } }])).toBe(false);
    expect(partsContainPdf(undefined)).toBe(false);
  });

  it('detects video parts', () => {
    expect(partsContainVideo([{ inlineData: { mimeType: 'video/mp4', data: 'x' } }])).toBe(true);
    expect(partsContainVideo([{ fileData: { mimeType: 'video/webm', fileUri: 'uri' } } as never])).toBe(true);
    expect(partsContainVideo([{ inlineData: { mimeType: 'application/pdf', data: 'x' } }])).toBe(false);
    expect(partsContainVideo(undefined)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import type { ChatMessage, UploadedFile } from '@/types';
import { collectSessionPdfFiles, isPdfFile, partsContainPdf, sessionHasPdfFiles } from './sessionPdfFiles';

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

describe('isPdfFile', () => {
  it('detects by mime type or extension', () => {
    expect(isPdfFile(makeFile())).toBe(true);
    expect(isPdfFile(makeFile({ type: '', name: 'x.PDF' }))).toBe(true);
    expect(isPdfFile(makeFile({ type: 'image/png', name: 'x.png' }))).toBe(false);
  });
});

describe('collectSessionPdfFiles', () => {
  it('dedupes by id with selected files first', () => {
    const draft = makeFile({ id: 'a', name: 'draft.pdf' });
    const history = makeFile({ id: 'b', name: 'history.pdf' });
    const image = makeFile({ id: 'c', name: 'pic.png', type: 'image/png' });
    const messages = [makeMessage([history, draft, image])];
    const result = collectSessionPdfFiles([draft], messages);
    expect(result.map((file) => file.id)).toEqual(['a', 'b']);
  });

  it('returns empty for a session without PDFs', () => {
    expect(collectSessionPdfFiles([], [makeMessage([])])).toEqual([]);
    expect(sessionHasPdfFiles([], [])).toBe(false);
  });
});

describe('partsContainPdf', () => {
  it('detects inline and file-data PDF parts', () => {
    expect(partsContainPdf([{ inlineData: { mimeType: 'application/pdf', data: 'x' } }])).toBe(true);
    expect(partsContainPdf([{ fileData: { mimeType: 'application/pdf', fileUri: 'uri' } } as never])).toBe(true);
    expect(partsContainPdf([{ inlineData: { mimeType: 'image/png', data: 'x' } }])).toBe(false);
    expect(partsContainPdf(undefined)).toBe(false);
  });
});

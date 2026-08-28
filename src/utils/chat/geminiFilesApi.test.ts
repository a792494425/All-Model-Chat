import { describe, expect, it } from 'vitest';
import { createChatMessage, createUploadedFile } from '@/test/data/factories';
import {
  formatGeminiFileApiProcessingError,
  formatHistoryFileApiUnavailablePartText,
  getApiKeyFingerprint,
  getGeminiFilesApiName,
  getGeminiFilesApiNameFromUri,
  isFileApiKeyMismatch,
  isGeminiFilesApiReferenceStillValid,
  sessionHasGeminiFilesApiReferences,
  shouldRefreshGeminiFilesApiReferenceFromExpiration,
  usesGeminiFilesApiReference,
} from './geminiFilesApi';

describe('getGeminiFilesApiNameFromUri', () => {
  it('extracts files/ names from short ids and Gemini file URIs', () => {
    expect(getGeminiFilesApiNameFromUri('files/abc')).toBe('files/abc');
    expect(getGeminiFilesApiNameFromUri('https://generativelanguage.googleapis.com/v1beta/files/abc')).toBe(
      'files/abc',
    );
  });

  it('ignores YouTube URLs even when they contain a files path', () => {
    expect(getGeminiFilesApiNameFromUri('https://youtube.com/watch?v=abc')).toBeNull();
    expect(getGeminiFilesApiNameFromUri('https://youtu.be/abc')).toBeNull();
  });
});

describe('usesGeminiFilesApiReference', () => {
  it('treats Files API ids as Gemini remote references and YouTube as not', () => {
    expect(
      usesGeminiFilesApiReference(
        createUploadedFile({ fileApiName: 'files/abc', fileUri: 'https://files/abc', transferStrategy: 'files-api' }),
      ),
    ).toBe(true);

    expect(
      usesGeminiFilesApiReference(
        createUploadedFile({
          fileUri: 'https://youtube.com/watch?v=abc',
          transferStrategy: 'files-api',
        }),
      ),
    ).toBe(false);
  });
});

describe('sessionHasGeminiFilesApiReferences', () => {
  it('detects Files API names on message files and fileData parts', () => {
    expect(
      sessionHasGeminiFilesApiReferences([
        createChatMessage({
          files: [createUploadedFile({ fileApiName: 'files/abc', fileUri: 'https://files/abc' })],
        }),
      ]),
    ).toBe(true);

    expect(
      sessionHasGeminiFilesApiReferences([
        createChatMessage({
          apiParts: [{ fileData: { mimeType: 'application/pdf', fileUri: 'files/from-parts' } }],
        }),
      ]),
    ).toBe(true);
  });

  it('ignores YouTube links, inline attachments, and omitted history files', () => {
    expect(
      sessionHasGeminiFilesApiReferences([
        createChatMessage({
          files: [
            createUploadedFile({
              fileUri: 'https://youtube.com/watch?v=abc',
              transferStrategy: 'files-api',
            }),
            createUploadedFile({
              rawFile: new Blob(['img'], { type: 'image/png' }),
              transferStrategy: 'inline',
            }),
            createUploadedFile({
              uploadState: 'failed',
              omittedFromApiHistory: true,
              transferStrategy: 'inline',
            }),
          ],
        }),
      ]),
    ).toBe(false);
  });
});

describe('expiration cache', () => {
  it('treats a far-future expiration as still valid and not due for refresh', () => {
    const file = createUploadedFile({
      fileApiExpirationTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    expect(isGeminiFilesApiReferenceStillValid(file)).toBe(true);
    expect(shouldRefreshGeminiFilesApiReferenceFromExpiration(file)).toBe(false);
  });

  it('treats a missing or past expiration as not still-valid', () => {
    expect(isGeminiFilesApiReferenceStillValid(createUploadedFile())).toBe(false);
    expect(
      shouldRefreshGeminiFilesApiReferenceFromExpiration(
        createUploadedFile({ fileApiExpirationTime: new Date(Date.now() - 1000).toISOString() }),
      ),
    ).toBe(true);
  });
});

describe('formatGeminiFileApiProcessingError', () => {
  it('prefers the File.error message from google.rpc.Status', () => {
    expect(
      formatGeminiFileApiProcessingError(
        { error: { code: 3, message: 'Video codec is not supported.' } },
        'File API processing failed',
        'File API processing failed: {message}',
      ),
    ).toBe('File API processing failed: Video codec is not supported.');
  });

  it('returns the backend message when no localized template is provided', () => {
    expect(
      formatGeminiFileApiProcessingError(
        { error: { message: 'Unsupported container format.' } },
        'File API processing failed',
      ),
    ).toBe('Unsupported container format.');
  });

  it('falls back when File.error is missing or blank', () => {
    expect(formatGeminiFileApiProcessingError({ state: 'FAILED' }, 'File API processing failed')).toBe(
      'File API processing failed',
    );
    expect(formatGeminiFileApiProcessingError({ error: { message: '   ' } }, 'Backend processing failed.')).toBe(
      'Backend processing failed.',
    );
    expect(formatGeminiFileApiProcessingError(null, 'File API processing failed')).toBe('File API processing failed');
  });
});

describe('formatHistoryFileApiUnavailablePartText', () => {
  it('builds a protocol-only omission note', () => {
    expect(formatHistoryFileApiUnavailablePartText('deck.pdf')).toContain('deck.pdf');
  });
});

describe('getGeminiFilesApiName', () => {
  it('prefers fileApiName over fileUri', () => {
    expect(
      getGeminiFilesApiName(
        createUploadedFile({
          fileApiName: 'files/from-name',
          fileUri: 'https://generativelanguage.googleapis.com/v1beta/files/from-uri',
        }),
      ),
    ).toBe('files/from-name');
  });
});

describe('getApiKeyFingerprint', () => {
  it('is deterministic per key and distinguishes different keys', () => {
    expect(getApiKeyFingerprint('api-key')).toBe(getApiKeyFingerprint('api-key'));
    expect(getApiKeyFingerprint('api-key')).not.toBe(getApiKeyFingerprint('other-key'));
  });

  it('stamps fingerprint state used for key-mismatch detection', () => {
    const file = createUploadedFile({ fileApiKeyFingerprint: getApiKeyFingerprint('key-a') });
    expect(isFileApiKeyMismatch(file, 'key-a')).toBe(false);
    expect(isFileApiKeyMismatch(file, 'key-b')).toBe(true);
  });

  it('treats legacy files without a fingerprint as unchanged', () => {
    expect(isFileApiKeyMismatch(createUploadedFile({}), 'any-key')).toBe(false);
  });
});

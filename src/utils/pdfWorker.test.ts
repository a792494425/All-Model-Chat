import { describe, expect, it } from 'vitest';
import { configurePdfWorker, getPdfWorkerSrc } from './pdfWorker';

describe('pdfWorker', () => {
  it('returns a worker source based on BASE_URL', () => {
    const src = getPdfWorkerSrc();
    expect(src).toMatch(/pdf\.worker\.min\.mjs$/);
  });

  it('configures GlobalWorkerOptions.workerSrc on targetPdfjs', () => {
    const dummyPdfjs = {
      GlobalWorkerOptions: {
        workerSrc: '',
      },
    };

    configurePdfWorker(dummyPdfjs as unknown as Parameters<typeof configurePdfWorker>[0]);
    expect(dummyPdfjs.GlobalWorkerOptions.workerSrc).toBe(getPdfWorkerSrc());
  });
});

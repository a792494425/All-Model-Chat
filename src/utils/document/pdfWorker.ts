import type { pdfjs } from 'react-pdf';

export const getPdfWorkerSrc = (): string => {
  const base = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
  return `${base}/pdf.worker.min.mjs`;
};

export const configurePdfWorker = (targetPdfjs: Pick<typeof pdfjs, 'GlobalWorkerOptions'>) => {
  targetPdfjs.GlobalWorkerOptions.workerSrc = getPdfWorkerSrc();
};

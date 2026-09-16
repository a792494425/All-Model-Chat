import { decodeBase64ToArrayBuffer } from './fileEncoding';
import { logService } from '@/services/logService';

export interface PdfInspectionResult {
  numPages: number;
  text: string;
}

export interface PdfInspectionOptions {
  /** Maximum number of pages to inspect for text extraction. Defaults to 50. */
  maxPages?: number;
  /** Maximum total characters of text to extract before terminating extraction. Defaults to 64,000. */
  maxChars?: number;
}

const DEFAULT_MAX_PAGES = 50;
const DEFAULT_MAX_CHARS = 64_000;

/**
 * Extracts plain text and page count from raw PDF binary data using pdfjs-dist.
 * Works across both browser and Node.js environments.
 */
const inspectPdfData = async (
  data: Uint8Array | ArrayBuffer,
  options: PdfInspectionOptions = {},
): Promise<PdfInspectionResult> => {
  try {
    const pdfjs = await import('pdfjs-dist');
    const loadingTask = pdfjs.getDocument({
      data: data instanceof Uint8Array ? data : new Uint8Array(data),
      isEvalSupported: false,
      useSystemFonts: true,
    });
    try {
      const pdfDoc = await loadingTask.promise;
      try {
        const pageTexts: string[] = [];
        const pageLimit = Math.min(pdfDoc.numPages, options.maxPages ?? DEFAULT_MAX_PAGES);
        const charLimit = options.maxChars ?? DEFAULT_MAX_CHARS;
        let accumulatedChars = 0;

        for (let pageNum = 1; pageNum <= pageLimit; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          const content = await page.getTextContent();
          const pageText = content.items
            .map((item) => ('str' in item ? item.str : ''))
            .filter(Boolean)
            .join(' ')
            .trim();

          if (pageText) {
            pageTexts.push(pdfDoc.numPages > 1 ? `[Page ${pageNum}]\n${pageText}` : pageText);
            accumulatedChars += pageText.length;
            if (accumulatedChars >= charLimit) {
              break;
            }
          }
        }

        return {
          numPages: pdfDoc.numPages,
          text: pageTexts.join('\n\n'),
        };
      } finally {
        try {
          await pdfDoc.destroy();
        } catch {
          // ignore
        }
      }
    } finally {
      try {
        await loadingTask.destroy();
      } catch {
        // ignore
      }
    }
  } catch (error) {
    logService.warn('Failed to inspect PDF data', { error });
    return { numPages: 1, text: '' };
  }
};

/**
 * Decodes a base64-encoded PDF and extracts its plain text content.
 */
export const extractPdfTextFromBase64 = async (base64: string, options: PdfInspectionOptions = {}): Promise<string> => {
  try {
    const uint8Array = decodeBase64ToArrayBuffer(base64);
    const { text } = await inspectPdfData(uint8Array, options);
    return text;
  } catch (error) {
    logService.warn('Failed to decode base64 for PDF text extraction', { error });
    return '';
  }
};

/**
 * Inspects a PDF Blob to get its total page count and extracted text.
 */
export const inspectPdfBlob = async (blob: Blob, options: PdfInspectionOptions = {}): Promise<PdfInspectionResult> => {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    return await inspectPdfData(arrayBuffer, options);
  } catch (error) {
    logService.warn('Failed to inspect PDF blob', { error });
    return { numPages: 1, text: '' };
  }
};

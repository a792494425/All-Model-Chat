import { decodeBase64ToArrayBuffer } from './fileEncoding';
import { logService } from '@/services/logService';

/**
 * Extracts plain text from raw PDF binary data using pdfjs-dist.
 * Works across both browser and Node.js environments.
 */
const extractTextFromPdfData = async (data: Uint8Array | ArrayBuffer): Promise<string> => {
  try {
    const pdfjs = await import('pdfjs-dist');
    const loadingTask = pdfjs.getDocument({
      data: data instanceof Uint8Array ? data : new Uint8Array(data),
      isEvalSupported: false,
      useSystemFonts: true,
    });
    const pdfDoc = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .filter(Boolean)
        .join(' ')
        .trim();

      if (pageText) {
        pageTexts.push(pdfDoc.numPages > 1 ? `[Page ${pageNum}]\n${pageText}` : pageText);
      }
    }

    return pageTexts.join('\n\n');
  } catch (error) {
    logService.warn('Failed to extract text from PDF data', { error });
    return '';
  }
};

/**
 * Decodes a base64-encoded PDF and extracts its plain text content.
 */
export const extractPdfTextFromBase64 = async (base64: string): Promise<string> => {
  try {
    const uint8Array = decodeBase64ToArrayBuffer(base64);
    return await extractTextFromPdfData(uint8Array);
  } catch (error) {
    logService.warn('Failed to decode base64 for PDF text extraction', { error });
    return '';
  }
};

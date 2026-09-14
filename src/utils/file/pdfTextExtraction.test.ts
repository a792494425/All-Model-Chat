import { describe, expect, it } from 'vitest';
import { jsPDF } from 'jspdf';
import { arrayBufferToBase64 } from './fileEncoding';
import { extractPdfTextFromBase64 } from './pdfTextExtraction';

describe('extractPdfTextFromBase64', () => {
  it('extracts text from a single-page PDF', async () => {
    const doc = new jsPDF();
    doc.text('Hello AMC WebUI PDF extraction!', 10, 10);
    const arrayBuffer = doc.output('arraybuffer');
    const base64 = arrayBufferToBase64(arrayBuffer);

    const extracted = await extractPdfTextFromBase64(base64);
    expect(extracted).toContain('Hello AMC WebUI PDF extraction!');
  });

  it('extracts text from a multi-page PDF with page separators', async () => {
    const doc = new jsPDF();
    doc.text('Page 1 content', 10, 10);
    doc.addPage();
    doc.text('Page 2 content', 10, 10);
    const arrayBuffer = doc.output('arraybuffer');
    const base64 = arrayBufferToBase64(arrayBuffer);

    const extracted = await extractPdfTextFromBase64(base64);
    expect(extracted).toContain('Page 1');
    expect(extracted).toContain('Page 1 content');
    expect(extracted).toContain('Page 2');
    expect(extracted).toContain('Page 2 content');
  });

  it('handles invalid base64 or corrupt PDF gracefully by returning empty string', async () => {
    const invalidBase64 = btoa('not a real pdf');
    const extracted = await extractPdfTextFromBase64(invalidBase64);
    expect(extracted).toBe('');
  });
});

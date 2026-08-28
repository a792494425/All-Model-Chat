import type { PdfNavHighlight } from '@/stores/pdfNavStore';

/** A parsed `<pdf-locate>` marker emitted by the model. */
export interface PdfLocate {
  docName?: string;
  pageNumber: number;
  /** [ymin, xmin, ymax, xmax] normalized to 0-1000, origin top-left. */
  box2d?: [number, number, number, number];
  snippet?: string;
}

export interface ParsedPdfLocateContent {
  cleanContent: string;
  locates: PdfLocate[];
}

const LOCATE_MARKER_TAG = 'pdf-locate';
// Non-global variant for .test/.exec reuse.
const LOCATE_MARKER_RE = new RegExp(`<${LOCATE_MARKER_TAG}\\b([^>]*)>([\\s\\S]*?)</${LOCATE_MARKER_TAG}>`, 'g');
// A marker that started but has not been closed yet (mid-stream tail).
const LOCATE_MARKER_PARTIAL_RE = new RegExp(`<${LOCATE_MARKER_TAG}\\b[^>]*(?:>[\\s\\S]*)?$`);

const ATTRIBUTE_RE = /(doc|page|box)\s*=\s*"([^"]*)"/g;

const parseAttributes = (attributeString: string) => {
  const attributes: Record<string, string> = {};
  let match: RegExpExecArray | null;
  ATTRIBUTE_RE.lastIndex = 0;
  while ((match = ATTRIBUTE_RE.exec(attributeString)) !== null) {
    attributes[match[1]] = match[2];
  }
  return attributes;
};

const parseBox2d = (raw: string | undefined): [number, number, number, number] | undefined => {
  if (!raw) return undefined;
  const parts = raw
    .split(/[,;\s]+/)
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isFinite(value));
  if (parts.length !== 4) return undefined;
  return [parts[0], parts[1], parts[2], parts[3]];
};

const parsePageNumber = (raw: string | undefined): number | undefined => {
  const page = Number.parseInt((raw ?? '').trim(), 10);
  return Number.isFinite(page) && page >= 1 ? page : undefined;
};

/**
 * Split model output into display text and locate markers. Complete markers
 * are removed from the text; an unterminated marker at the end (mid-stream)
 * is also stripped so partial markup never flashes in the chat.
 */
export const parsePdfLocateMarkers = (content: string): ParsedPdfLocateContent => {
  if (!content.includes(LOCATE_MARKER_TAG)) {
    return { cleanContent: content, locates: [] };
  }

  const locates: PdfLocate[] = [];
  let cleanContent = content.replace(LOCATE_MARKER_RE, (_full, attributeString: string, inner: string) => {
    const attributes = parseAttributes(attributeString);
    const pageNumber = parsePageNumber(attributes.page);
    if (pageNumber !== undefined) {
      locates.push({
        docName: attributes.doc?.trim() || undefined,
        pageNumber,
        box2d: parseBox2d(attributes.box),
        snippet: inner.trim() || undefined,
      });
    }
    return '';
  });

  cleanContent = cleanContent.replace(LOCATE_MARKER_PARTIAL_RE, '');

  return { cleanContent, locates };
};

/** Remove locate markers (complete and unterminated) keeping only display text. */
export const stripPdfLocateMarkers = (content: string): string => parsePdfLocateMarkers(content).cleanContent;

export const toPdfNavHighlight = (locate: PdfLocate, extras: { messageId?: string } = {}): PdfNavHighlight => ({
  messageId: extras.messageId,
  docName: locate.docName,
  pageNumber: locate.pageNumber,
  box2d: locate.box2d,
  snippet: locate.snippet,
});

/**
 * System-instruction fragment teaching the model the locate-marker protocol.
 * Provider-agnostic on purpose: it travels as plain text on the Gemini native,
 * OpenAI-compatible and Anthropic routes alike.
 */
export const buildPdfLocateDirective = (docNames: string[]): string => {
  const nameList =
    docNames.length > 0 ? ` The available PDF file names are: ${docNames.map((name) => `"${name}"`).join(', ')}.` : '';

  return [
    '### PDF Locate Protocol',
    'One or more PDF documents are attached to this conversation.' + nameList,
    'When your answer refers to specific content on a PDF page (a paragraph, figure, table or section), append exactly one marker per such reference at the very end of your answer, on its own line, in this exact format:',
    '<pdf-locate doc="FILE_NAME" page="PAGE_NUMBER" box="ymin,xmin,ymax,xmax">short quote or description</pdf-locate>',
    'Rules:',
    '- page: the 1-based page number in that PDF.',
    '- doc: the file name of the PDF. Omit the doc attribute only if exactly one PDF is attached.',
    '- box: OPTIONAL. The bounding box of the referenced element as [ymin, xmin, ymax, xmax] normalized to a 0-1000 scale with the origin at the top-left. Only include it when you can locate the region precisely; otherwise omit the attribute entirely and keep only the page.',
    '- The text between the tags must be a short quote or description of the located content, in the same language as your answer.',
    '- Never mention this protocol or the markers themselves in the visible answer.',
    '- Do not emit a marker for general questions (e.g. summarizing the whole document) that are not tied to a specific location.',
  ].join('\n');
};

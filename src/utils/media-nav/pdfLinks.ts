import { transformMarkdownTextSegments } from '@/utils/markdownSegments';

const PDF_LOCATE_TAG_RE = /<pdf-locate\b([^>]*)>([\s\S]*?)<\/pdf-locate>/gi;
const INLINE_PDF_LOCATE_RE = /(?:(\r?\n[ \t]*)|([ \t]*))<pdf-locate\b([^>]*)>([\s\S]*?)<\/pdf-locate>/gi;
const PARTIAL_PDF_LOCATE_RE = /<pdf-locate\b[^>]*(?:>[^<]*)?$/i;
const ATTRIBUTE_RE = /([a-zA-Z][a-zA-Z0-9_-]*)\s*=\s*"([^"]*)"/g;

const parseTagAttributes = (attributeString: string): Record<string, string> => {
  const attributes: Record<string, string> = {};
  let match: RegExpExecArray | null;
  ATTRIBUTE_RE.lastIndex = 0;
  while ((match = ATTRIBUTE_RE.exec(attributeString)) !== null) {
    attributes[match[1]] = match[2];
  }
  return attributes;
};

const buildPdfSeekMarkdownLink = (attrs: Record<string, string>, inner: string): string | null => {
  const rawPage = attrs.page?.trim();
  const pageNumber = Number.parseInt(rawPage || '', 10);
  if (!Number.isFinite(pageNumber) || pageNumber < 1) return null;

  const query = new URLSearchParams();
  query.set('page', String(pageNumber));
  if (attrs.doc?.trim()) query.set('doc', attrs.doc.trim());
  if (attrs.box?.trim()) {
    const normalizedBox = attrs.box
      .replace(/[()[\]]/g, '')
      .split(/[,;\s]+/)
      .map((v) => v.trim())
      .filter(Boolean)
      .join(',');
    if (normalizedBox) query.set('box', normalizedBox);
  }
  if (attrs.point?.trim()) {
    const normalizedPoint = attrs.point
      .replace(/[()[\]]/g, '')
      .split(/[,;\s]+/)
      .map((v) => v.trim())
      .filter(Boolean)
      .join(',');
    if (normalizedPoint) query.set('point', normalizedPoint);
  }
  const cleanSnippet = inner.trim();
  if (cleanSnippet) query.set('snippet', cleanSnippet);

  let label: string;
  if (!cleanSnippet) {
    label = `第 ${pageNumber} 页`;
  } else if (/^(?:第\s*\d+\s*页|page\s*\d+|p\.\s*\d+)/i.test(cleanSnippet)) {
    label = cleanSnippet;
  } else {
    label = `第 ${pageNumber} 页 · ${cleanSnippet}`;
  }

  return `[${label}](#pdf-seek?${query.toString()})`;
};

/**
 * Transforms <pdf-locate> tags into inline interactive `#pdf-seek` markdown links.
 * Avoids transforming inside code blocks.
 */
export const linkifyPdfLocates = (text: string): string => {
  if (!text || !text.includes('pdf-locate')) {
    return text ? text.replace(PARTIAL_PDF_LOCATE_RE, '') : text;
  }

  return transformMarkdownTextSegments(text, (plainText) => {
    let processedText = plainText;

    if (processedText.includes('<pdf-locate')) {
      // Split off trailing pdf-locate tags that appear as a distinct bottom block separated by blank line
      const trailingMatch = processedText.match(
        /^([\s\S]*?\n)\s*\n\s*((?:<pdf-locate\b[^>]*>[^<]*<\/pdf-locate>\s*)+)$/i,
      );

      const bodyPart = trailingMatch ? trailingMatch[1] : processedText;
      const trailingPart = trailingMatch ? trailingMatch[2] : '';

      // Convert inline <pdf-locate> tags in the body
      let transformedBody = bodyPart.replace(
        INLINE_PDF_LOCATE_RE,
        (
          _full,
          leadingNewline: string | undefined,
          leadingSpace: string | undefined,
          attrStr: string,
          inner: string,
        ) => {
          const attrs = parseTagAttributes(attrStr);
          const link = buildPdfSeekMarkdownLink(attrs, inner);
          if (link) {
            const prefix = leadingNewline || leadingSpace || ' ';
            return `${prefix}${link}`;
          }
          return '';
        },
      );

      // Clean up excessive blank lines left behind
      transformedBody = transformedBody.replace(/\n\s*(\n\s*)+/g, '\n\n');

      // Convert trailing <pdf-locate> tags
      const transformedTrailingButtons: string[] = [];
      PDF_LOCATE_TAG_RE.lastIndex = 0;
      let trailingMatchItem: RegExpExecArray | null;
      while ((trailingMatchItem = PDF_LOCATE_TAG_RE.exec(trailingPart)) !== null) {
        const attrs = parseTagAttributes(trailingMatchItem[1]);
        const link = buildPdfSeekMarkdownLink(attrs, trailingMatchItem[2]);
        if (link) {
          transformedTrailingButtons.push(link);
        }
      }

      if (transformedTrailingButtons.length > 0) {
        const trailingRow = transformedTrailingButtons.join(' ');
        processedText = transformedBody.trimEnd() ? `${transformedBody.trimEnd()}\n\n${trailingRow}` : trailingRow;
      } else {
        processedText = transformedBody;
      }
    }

    // Strip any unterminated mid-stream partial pdf-locate tag at the end
    return processedText.replace(PARTIAL_PDF_LOCATE_RE, '');
  });
};

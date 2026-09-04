import { transformMarkdownTextSegments } from '@/utils/markdownSegments';

const IMAGE_LOCATE_TAG_RE = /<image-locate\b([^>]*)>([\s\S]*?)<\/image-locate>/gi;
const INLINE_IMAGE_LOCATE_RE = /(?:(\r?\n[ \t]*)|([ \t]*))<image-locate\b([^>]*)>([\s\S]*?)<\/image-locate>/gi;
const PARTIAL_IMAGE_LOCATE_RE = /<image-locate\b[^>]*(?:>[^<]*)?$/i;
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

const buildImageSeekMarkdownLink = (attrs: Record<string, string>, inner: string): string | null => {
  const fileName = attrs.file?.trim() || attrs.image?.trim() || attrs.doc?.trim();
  const rawBox = attrs.box?.trim() || attrs.box2d?.trim() || attrs.box_2d?.trim();
  const rawPoint = attrs.point?.trim();
  if (!rawBox && !rawPoint) return null;

  const query = new URLSearchParams();
  if (fileName) query.set('file', fileName);

  if (rawBox) {
    const normalizedBox = rawBox
      .replace(/[()[\]]/g, '')
      .split(/[,;\s]+/)
      .map((v) => v.trim())
      .filter(Boolean)
      .join(',');
    if (normalizedBox) query.set('box', normalizedBox);
  }

  if (rawPoint) {
    const normalizedPoint = rawPoint
      .replace(/[()[\]]/g, '')
      .split(/[,;\s]+/)
      .map((v) => v.trim())
      .filter(Boolean)
      .join(',');
    if (normalizedPoint) query.set('point', normalizedPoint);
  }

  if (attrs.arrow?.trim()) {
    query.set('arrow', attrs.arrow.trim());
  }

  const rawLabel = attrs.label?.trim();
  if (rawLabel) {
    query.set('label', rawLabel);
  }

  const cleanSnippet = inner.trim();
  if (cleanSnippet) {
    query.set('snippet', cleanSnippet);
  }

  let label: string;
  if (rawLabel && cleanSnippet && rawLabel !== cleanSnippet) {
    label = `${rawLabel} · ${cleanSnippet}`;
  } else if (rawLabel) {
    label = rawLabel;
  } else if (cleanSnippet) {
    label = cleanSnippet;
  } else if (rawBox) {
    label = '目标框选';
  } else {
    label = '目标定位';
  }

  return `[${label}](#image-seek?${query.toString()})`;
};

/**
 * Transforms <image-locate> tags into inline interactive `#image-seek` markdown links.
 * Avoids transforming inside code blocks.
 */
export const linkifyImageLocates = (text: string): string => {
  if (!text || !text.includes('image-locate')) {
    return text ? text.replace(PARTIAL_IMAGE_LOCATE_RE, '') : text;
  }

  return transformMarkdownTextSegments(text, (plainText) => {
    let processedText = plainText;

    if (processedText.includes('<image-locate')) {
      const trailingMatch = processedText.match(
        /^([\s\S]*?\n)\s*\n\s*((?:<image-locate\b[^>]*>[^<]*<\/image-locate>\s*)+)$/i,
      );

      const bodyPart = trailingMatch ? trailingMatch[1] : processedText;
      const trailingPart = trailingMatch ? trailingMatch[2] : '';

      let transformedBody = bodyPart.replace(
        INLINE_IMAGE_LOCATE_RE,
        (
          _full,
          leadingNewline: string | undefined,
          leadingSpace: string | undefined,
          attrStr: string,
          inner: string,
        ) => {
          const attrs = parseTagAttributes(attrStr);
          const link = buildImageSeekMarkdownLink(attrs, inner);
          if (link) {
            const prefix = leadingNewline || leadingSpace || ' ';
            return `${prefix}${link}`;
          }
          return '';
        },
      );

      transformedBody = transformedBody.replace(/\n\s*(\n\s*)+/g, '\n\n');

      const transformedTrailingButtons: string[] = [];
      IMAGE_LOCATE_TAG_RE.lastIndex = 0;
      let trailingMatchItem: RegExpExecArray | null;
      while ((trailingMatchItem = IMAGE_LOCATE_TAG_RE.exec(trailingPart)) !== null) {
        const attrs = parseTagAttributes(trailingMatchItem[1]);
        const link = buildImageSeekMarkdownLink(attrs, trailingMatchItem[2]);
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

    return processedText.replace(PARTIAL_IMAGE_LOCATE_RE, '');
  });
};

export interface MarkdownTocItem {
  id: string;
  text: string;
  level: number;
  line: number;
  index: number;
}

/** Matches Markdown ATX headings (# through ######). */
const HEADING_REGEX = /^(#{1,6})\s+(.+)$/;

/**
 * Strips inline formatting syntax (links, inline code, bold, italic,
 * strikethrough, HTML tags) to produce plain text for TOC display.
 */
const cleanHeadingText = (raw: string): string => {
  return raw
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link text](url) -> link text
    .replace(/(`+)(.*?)\1/g, '$2') // `code` -> code
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // **bold** -> bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // *italic* -> italic
    .replace(/~~(.*?)~~/g, '$1') // ~~strikethrough~~ -> strikethrough
    .replace(/<[^>]+>/g, '') // <tag> -> strip HTML tags
    .trim();
};

/**
 * Converts heading text to an anchor slug, preserving ASCII letters, digits,
 * and Chinese/CJK ideographs while converting spaces to hyphens.
 */
const slugifyHeading = (text: string, index: number): string => {
  const slug = text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

  return slug || `heading-${index}`;
};

export const extractMarkdownToc = (content: string): MarkdownTocItem[] => {
  if (!content) return [];

  const lines = content.split(/\r\n|\r|\n/);
  const items: MarkdownTocItem[] = [];
  let inCodeBlock = false;
  let codeFenceChar = '';

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    const fenceMatch = line.match(/^(\s*)(`{3,}|~{3,})/);
    if (fenceMatch) {
      const fenceChar = fenceMatch[2][0];
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeFenceChar = fenceChar;
      } else if (fenceChar === codeFenceChar) {
        inCodeBlock = false;
        codeFenceChar = '';
      }
      continue;
    }

    if (inCodeBlock) continue;

    const match = line.match(HEADING_REGEX);
    if (!match) continue;

    const level = match[1].length;
    const rawText = match[2].replace(/\s+#+\s*$/, '').trim();
    if (!rawText) continue;

    const cleanText = cleanHeadingText(rawText);
    const displayText = cleanText || rawText;

    items.push({
      id: slugifyHeading(displayText, items.length),
      text: displayText,
      level,
      line: lineIndex,
      index: items.length,
    });
  }

  return items;
};

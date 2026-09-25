const INLINE_IMAGE_DATA_URL_PATTERN = /!\[([^\]]*)\]\((data:image\/[^)]+)\)/g;
const INLINE_IMAGE_PLACEHOLDER_PATTERN = /!\[([^\]]*)\]\((内嵌图片-\d+)\)/g;

export interface ExtractedInlineImages {
  editorContent: string;
  placeholders: Map<string, string>;
  nextIndex: number;
}

/** Generates a human-readable placeholder token for inline images. */
export const createInlineImagePlaceholder = (index: number): string => `内嵌图片-${index}`;

/**
 * Replaces large data:image URLs in markdown with lightweight human-readable placeholder tags
 * to keep the markdown editor responsive and readable.
 */
export const extractInlineImagePlaceholders = (content: string, startIndex = 1): ExtractedInlineImages => {
  const placeholders = new Map<string, string>();
  let nextIndex = startIndex;

  const editorContent = content.replace(INLINE_IMAGE_DATA_URL_PATTERN, (_match, alt: string, dataUrl: string) => {
    const placeholder = createInlineImagePlaceholder(nextIndex++);
    placeholders.set(placeholder, dataUrl);
    return `![${alt}](${placeholder})`;
  });

  return {
    editorContent,
    placeholders,
    nextIndex,
  };
};

/** Restores original data URLs from placeholder tags prior to saving or submitting. */
export const resolveInlineImagePlaceholders = (content: string, placeholders: Map<string, string>): string =>
  content.replace(INLINE_IMAGE_PLACEHOLDER_PATTERN, (match, alt: string, placeholder: string) => {
    const dataUrl = placeholders.get(placeholder);
    if (!dataUrl) {
      return match;
    }

    return `![${alt}](${dataUrl})`;
  });

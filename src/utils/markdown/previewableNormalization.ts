import { extractArtifactSegment, findBareArtifactRegion } from './bareLiveUiRegions';
import {
  FENCED_CODE_BLOCK_REGEX,
  getPreviewMarkupType,
  HTML_STRUCTURAL_BLANK_LINE_REGEX,
  isLikelyLiveArtifactInteractionJson,
  isLikelyStreamingLiveArtifactInteractionJson,
  isLikelyStreamingStandaloneHtmlFragment,
  isStandaloneHtmlFragment,
  LIVE_ARTIFACT_HTML_LANGUAGE,
  LIVE_ARTIFACT_INTERACTION_LANGUAGE,
  MISLABELED_HTML_FRAGMENT_LANGUAGES,
  normalizeLanguage,
  OPEN_FENCED_CODE_BLOCK_AT_END_REGEX,
  shouldUnwrapMislabeledHtmlFence,
  TOOL_RESULT_FRAGMENT_REGEX,
} from './previewMarkupPatterns';

export interface NormalizePreviewableMarkdownOptions {
  isStreaming?: boolean;
  /**
   * 是否把语言误标为 css/text/txt/markdown/md、内容却像完整 HTML 文档或含
   * Live Artifacts 协议标记的代码块解包为实时预览。默认 true(向后兼容);
   * 关闭后此类代码块一律按源码显示。
   */
  unwrapMislabeledHtmlBlocks?: boolean;
}

const wrapBarePreviewableArtifact = (
  markdownContent: string,
  options: NormalizePreviewableMarkdownOptions = {},
): string => {
  const content = markdownContent.trim();

  if (TOOL_RESULT_FRAGMENT_REGEX.test(content)) {
    return markdownContent;
  }

  const segment = extractArtifactSegment(content, options.isStreaming ?? false);

  if (segment) {
    const artifactLanguage = segment.markupType === 'html' ? LIVE_ARTIFACT_HTML_LANGUAGE : segment.markupType;
    const fence = `\`\`\`${artifactLanguage}\n${segment.html}\n\`\`\``;
    const suffix = segment.suffix ? `\n\n${segment.suffix}` : '';
    return `${fence}${suffix}`;
  }

  // Prose-wrapped artifacts: loop to wrap ALL bare artifact regions in the content.
  let remaining = content;
  const parts: string[] = [];

  while (remaining) {
    const region = findBareArtifactRegion(remaining, options.isStreaming ?? false);
    if (!region) {
      parts.push(remaining);
      break;
    }

    const artifact = remaining.slice(region.start, region.end).trim();
    const markupType = getPreviewMarkupType(artifact) || (options.isStreaming ? 'html' : null);
    if (!markupType) {
      parts.push(remaining);
      break;
    }

    const artifactLanguage = markupType === 'html' ? LIVE_ARTIFACT_HTML_LANGUAGE : markupType;
    const before = remaining.slice(0, region.start).trimEnd();
    if (before) {
      parts.push(before);
    }
    parts.push(`\`\`\`${artifactLanguage}\n${artifact}\n\`\`\``);
    remaining = remaining.slice(region.end).trimStart();
  }

  return parts.filter(Boolean).join('\n\n');
};

const wrapBareLiveArtifactInteraction = (
  markdownContent: string,
  options: NormalizePreviewableMarkdownOptions = {},
): string => {
  const content = markdownContent.trim();

  if (
    !isLikelyLiveArtifactInteractionJson(content) &&
    !(options.isStreaming && isLikelyStreamingLiveArtifactInteractionJson(content))
  ) {
    return markdownContent;
  }

  return `\`\`\`${LIVE_ARTIFACT_INTERACTION_LANGUAGE}\n${content}\n\`\`\``;
};

const unwrapMislabeledHtmlFragmentCodeBlocks = (
  markdownContent: string,
  options: NormalizePreviewableMarkdownOptions = {},
): string => {
  if (!markdownContent || options.unwrapMislabeledHtmlBlocks === false) {
    return markdownContent;
  }

  const normalizedClosedFences = markdownContent.replace(
    FENCED_CODE_BLOCK_REGEX,
    (match, rawLanguage: string = '', rawContent: string = '') => {
      const normalizedLanguage = normalizeLanguage(rawLanguage);
      const content = rawContent.trim();

      if (MISLABELED_HTML_FRAGMENT_LANGUAGES.has(normalizedLanguage) && shouldUnwrapMislabeledHtmlFence(content)) {
        return content;
      }

      return match;
    },
  );

  return normalizedClosedFences.replace(
    OPEN_FENCED_CODE_BLOCK_AT_END_REGEX,
    (match, rawLanguage: string = '', rawContent: string = '') => {
      const normalizedLanguage = normalizeLanguage(rawLanguage);
      const content = rawContent.trim();

      if (MISLABELED_HTML_FRAGMENT_LANGUAGES.has(normalizedLanguage) && shouldUnwrapMislabeledHtmlFence(content)) {
        return content;
      }

      return match;
    },
  );
};

const normalizeStandaloneRawHtmlFragment = (markdownContent: string): string => {
  const content = markdownContent.trim();

  if (!isStandaloneHtmlFragment(content) && !isLikelyStreamingStandaloneHtmlFragment(content)) {
    return markdownContent;
  }

  return content.replace(HTML_STRUCTURAL_BLANK_LINE_REGEX, '\n');
};

export const normalizePreviewableMarkdownContent = (
  markdownContent: string,
  options: NormalizePreviewableMarkdownOptions = {},
): string => {
  return wrapBareLiveArtifactInteraction(
    wrapBarePreviewableArtifact(
      normalizeStandaloneRawHtmlFragment(unwrapMislabeledHtmlFragmentCodeBlocks(markdownContent, options)),
      options,
    ),
    options,
  );
};

import {
  FENCED_CODE_BLOCK_REGEX,
  getAutoPreviewType,
  getCodeBlockPreviewType,
  getPreviewMarkupType,
  getStandaloneDocumentPreviewType,
  hasStreamingLiveArtifactFence,
  isLikelyHtml,
  isLikelyStreamingHtmlArtifact,
  isLikelyStreamingLiveArtifactInteractionJson,
  isLiveArtifactInteractionLanguage,
  isLiveArtifactLanguage,
  LIVE_ARTIFACT_HTML_LANGUAGE,
  LIVE_ARTIFACT_INTERACTION_LANGUAGE,
  type PreviewMarkupType,
} from './previewMarkupPatterns';
import { normalizePreviewableMarkdownContent } from './previewableNormalization';

export type { PreviewMarkupType };

export {
  LIVE_ARTIFACT_HTML_LANGUAGE,
  LIVE_ARTIFACT_INTERACTION_LANGUAGE,
  isLiveArtifactLanguage,
  isLiveArtifactInteractionLanguage,
  isLikelyStreamingHtmlArtifact,
  isLikelyStreamingLiveArtifactInteractionJson,
  hasStreamingLiveArtifactFence,
  getCodeBlockPreviewType,
  getAutoPreviewType,
  getPreviewMarkupType,
  normalizePreviewableMarkdownContent,
  isLikelyHtml,
};

/**
 * Strict variant of extractPreviewableCodeBlock for the automatic preview-open
 * path: fenced blocks are classified with getAutoPreviewType (no sniffing of
 * mislabeled languages), and a fallback to the whole document only fires for a
 * complete unlabeled HTML/SVG document — never for a bare fragment.
 */
export const extractAutoPreviewableBlock = (
  markdownContent: string,
): { content: string; markupType: PreviewMarkupType } | null => {
  if (!markdownContent) return null;

  for (const match of markdownContent.matchAll(FENCED_CODE_BLOCK_REGEX)) {
    const rawLanguage = match[1] ?? '';
    const rawContent = match[2] ?? '';
    const content = rawContent.trim();
    const markupType = getAutoPreviewType(content, rawLanguage);

    if (markupType) {
      return { content, markupType };
    }
  }

  const standaloneDocumentType = getStandaloneDocumentPreviewType(markdownContent);
  if (standaloneDocumentType) {
    return { content: markdownContent.trim(), markupType: standaloneDocumentType };
  }

  return null;
};

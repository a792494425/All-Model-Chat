import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { extractTextFromNode } from '@/utils/reactNodeText';
import { getCodeBlockPreviewType } from '@/utils/previewableMarkdown';
import { createManagedObjectUrl } from '@/services/objectUrlManager';
import { triggerDownload } from '@/utils/export/core';
import {
  LANGUAGE_EXTENSION_MAP,
  detectSnippetFilename,
  getSnippetMimeType,
  repairIncompleteSvg,
} from '@/utils/codeSnippet';
import { type SideViewContent } from '@/types';
import { type OpenHtmlPreviewHandler } from '@/utils/html-preview/previewPrivilege';
import { useI18n } from '@/contexts/I18nContext';

const COLLAPSE_THRESHOLD_PX = 320;
const DOWNLOAD_FEEDBACK_MS = 2000;

interface UseCodeBlockProps {
  children: React.ReactNode;
  className?: string;
  expandCodeBlocksByDefault: boolean;
  onOpenHtmlPreview: OpenHtmlPreviewHandler;
  onOpenSidePanel: (content: SideViewContent) => void;
}

type CodeElementProps = {
  className?: string;
  children?: React.ReactNode;
};

export const useCodeBlock = ({
  children,
  className,
  expandCodeBlocksByDefault,
  onOpenHtmlPreview,
  onOpenSidePanel,
}: UseCodeBlockProps) => {
  const { t } = useI18n();
  const preRef = useRef<HTMLPreElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [expandedOverride, setExpandedOverride] = useState<boolean | null>(null);

  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const [isDownloaded, setIsDownloaded] = useState(false);
  const downloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (downloadTimerRef.current) {
        clearTimeout(downloadTimerRef.current);
      }
    };
  }, []);

  // Tracks the length from the previous layout pass. A code block only auto-follows
  // to its bottom while its text is actively growing (i.e. streaming). Static blocks
  // — historical sessions, finished messages — are left pinned to the top.
  const prevTextLength = useRef(0);

  const codeElement = React.Children.toArray(children).find(
    (child): child is React.ReactElement<CodeElementProps> =>
      React.isValidElement<CodeElementProps>(child) &&
      (child.type === 'code' || Boolean(child.props.className?.includes('language-'))),
  );

  const resolvedCodeText = codeElement
    ? extractTextFromNode(codeElement.props.children)
    : extractTextFromNode(children);
  const isExpanded = expandedOverride ?? expandCodeBlocksByDefault;

  // Collapsed blocks hide overflow (overflow-y: hidden) so the user can never scroll
  // them manually — there is no "user scrolled up" state to honor. Auto-follow is
  // driven purely by text growth below.

  // Pin a growing block to its tail. Declared FIRST so it runs before the measure
  // effect below (effects run in declaration order), letting it read the previous
  // commit's length. The write is deferred to a frame callback: reading scrollHeight
  // already forced layout, and writing scrollTop in the same pass would force a
  // second one. The browser runs the callback before painting, so follow still lands
  // without a visible flash.
  useLayoutEffect(() => {
    if (isExpanded || !isOverflowing) return;
    const el = preRef.current;
    if (!el) return;
    const currentLength = resolvedCodeText.length;
    // prevTextLength starts at 0 on mount: a long static block (history) must stay
    // pinned to the top, only actively growing streams auto-follow to the bottom.
    if (prevTextLength.current <= 0 || currentLength <= prevTextLength.current) return;
    const raf = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(raf);
  }, [resolvedCodeText, isExpanded, isOverflowing]);

  // Measure only when the block's text actually changed. `resolvedCodeText` is a
  // plain string, so finished blocks (already-closed code in a streaming message,
  // history) compare equal across the per-chunk React re-render and skip all layout
  // work — re-parsing markdown each chunk must not cost N forced layouts for N blocks.
  // Runs after the follow effect above so growth detection sees the pre-flip length.
  useLayoutEffect(() => {
    const el = preRef.current;
    if (!el) return;
    const overflowing = el.scrollHeight > COLLAPSE_THRESHOLD_PX;
    if (overflowing !== isOverflowing) {
      // Threshold-crossing commit: leave prevTextLength untouched so the follow
      // effect in the synced commit still sees this chunk as growth.
      setIsOverflowing(overflowing);
      return;
    }
    prevTextLength.current = resolvedCodeText.length;
  }, [resolvedCodeText, isOverflowing]);

  const handleToggleExpand = () => {
    setExpandedOverride((prev) => !(prev ?? expandCodeBlocksByDefault));
  };

  const handleCopy = () => {
    if (resolvedCodeText && !isCopied) {
      copyToClipboard(resolvedCodeText);
    }
  };

  const langMatch = className?.match(/language-(\S+)/);
  let rawLang = langMatch ? langMatch[1] : 'txt';
  let fenceFilename: string | undefined;

  const colonIdx = rawLang.indexOf(':');
  if (colonIdx > 0) {
    fenceFilename = rawLang.slice(colonIdx + 1);
    rawLang = rawLang.slice(0, colonIdx);
  }

  const language = rawLang.toLowerCase();

  const previewMarkupType = getCodeBlockPreviewType(resolvedCodeText, language);

  let finalLanguage = language;
  if (previewMarkupType === 'html') finalLanguage = 'html';
  else if (previewMarkupType === 'svg') finalLanguage = 'svg';

  const showPreview = previewMarkupType !== null;
  const downloadMimeType = getSnippetMimeType(finalLanguage, previewMarkupType);

  const handleOpenSide = () => {
    let displayTitle = t('htmlPreviewTitle');
    if (finalLanguage === 'html' || finalLanguage === 'svg') {
      const ext = LANGUAGE_EXTENSION_MAP[finalLanguage.toLowerCase()] || finalLanguage;
      const detected = detectSnippetFilename(resolvedCodeText, finalLanguage, ext, fenceFilename);
      if (detected) {
        displayTitle = detected.replace(/\.[^.]+$/, '');
      }
    }

    let contentToPreview = resolvedCodeText;
    if (finalLanguage === 'svg') {
      contentToPreview = repairIncompleteSvg(contentToPreview);
    }

    onOpenSidePanel({
      type: 'html',
      content: contentToPreview,
      language: finalLanguage,
      title: displayTitle,
    });
  };

  const handleOpenPreview = () => {
    let contentToPreview = resolvedCodeText;
    if (finalLanguage === 'svg') {
      contentToPreview = repairIncompleteSvg(contentToPreview);
    }
    onOpenHtmlPreview(contentToPreview, { privilege: 'unrestricted' });
  };

  const handleDownload = () => {
    const ext = LANGUAGE_EXTENSION_MAP[finalLanguage.toLowerCase()] || finalLanguage;
    const filename = detectSnippetFilename(resolvedCodeText, finalLanguage, ext, fenceFilename);

    let codeToDownload = resolvedCodeText;
    if (finalLanguage === 'svg' || ext === 'svg') {
      codeToDownload = repairIncompleteSvg(codeToDownload);
    }

    const blob = new Blob([codeToDownload], { type: downloadMimeType });
    const url = createManagedObjectUrl(blob);
    triggerDownload(url, filename);

    setIsDownloaded(true);
    if (downloadTimerRef.current) {
      clearTimeout(downloadTimerRef.current);
    }
    downloadTimerRef.current = setTimeout(() => {
      setIsDownloaded(false);
    }, DOWNLOAD_FEEDBACK_MS);
  };

  return {
    preRef,
    isExpanded,
    isOverflowing,
    isCopied,
    isDownloaded,
    sourceLanguage: language,
    finalLanguage,
    showPreview,
    handleToggleExpand,
    handleCopy,
    handleOpenSide,
    handleOpenPreview,
    handleDownload,
    codeElement,
    resolvedCodeText,
    previewMarkupType,
    COLLAPSE_THRESHOLD_PX,
  };
};

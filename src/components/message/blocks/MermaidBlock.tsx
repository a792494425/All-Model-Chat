import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';
import { type SideViewContent, type UploadedFile } from '@/types';
import { DiagramWrapper } from './parts/DiagramWrapper';
import { useI18n } from '@/contexts/I18nContext';
import { isDarkThemeId } from '@/utils/theme/themeMode';
import { svgToUploadedFile } from '@/utils/export/svgToUploadedFile';
import { useDebouncedDiagramRender } from '@/hooks/diagram/useDebouncedDiagramRender';
import { useDiagramExport } from '@/hooks/diagram/useDiagramExport';
import { getErrorMessage } from '@/utils/errorMessage';

import { hashString } from '@/utils/format/stringHash';

// Strip script tags and event handlers from mermaid-rendered SVG before injection.
// With securityLevel 'strict', mermaid already escapes HTML labels; this is a
// defense-in-depth guard against any residual script/foreignObject injection.
const sanitizeMermaidSvg = (svg: string): string =>
  DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['foreignObject'],
    FORBID_TAGS: ['script'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });

const mermaidBlockSvgCache = new Map<string, string>();

const getMermaidBlockCacheKey = (code: string, themeId: string) =>
  `${themeId}:${code.length}:${hashString(code)}`;

interface MermaidBlockProps {
  code: string;
  onImageClick: (file: UploadedFile) => void;
  isLoading: boolean;
  themeId: string;
  onOpenSidePanel: (content: SideViewContent) => void;
  renderDelayMs?: number;
}

export const MermaidBlock: React.FC<MermaidBlockProps> = ({
  code,
  onImageClick,
  isLoading: isMessageLoading,
  themeId,
  onOpenSidePanel,
  renderDelayMs = 500,
}) => {
  const { t } = useI18n();

  const isMessageLoadingRef = useRef(isMessageLoading);
  useEffect(() => {
    isMessageLoadingRef.current = isMessageLoading;
  }, [isMessageLoading]);

  const blockCacheKey = useMemo(
    () => getMermaidBlockCacheKey(code, themeId),
    [code, themeId],
  );

  const initialCachedSvg = useMemo(() => mermaidBlockSvgCache.get(blockCacheKey) ?? '', [blockCacheKey]);

  const [svg, setSvg] = useState(initialCachedSvg);
  const [error, setError] = useState('');
  const [isRendering, setIsRendering] = useState(!initialCachedSvg);
  const [diagramFile, setDiagramFile] = useState<UploadedFile | null>(() =>
    initialCachedSvg
      ? svgToUploadedFile(initialCachedSvg, {
          id: `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`,
          name: 'mermaid-diagram.svg',
          size: initialCachedSvg.length,
        })
      : null,
  );
  const [showSource, setShowSource] = useState(false);
  const diagramContainerRef = useRef<HTMLDivElement>(null);

  const renderMermaid = useCallback(
    async (isMounted: () => boolean) => {
      if (!code) {
        setSvg('');
        setError('');
        setIsRendering(false);
        return;
      }

      const cached = mermaidBlockSvgCache.get(blockCacheKey);
      if (cached) {
        setSvg(cached);
        setDiagramFile(
          svgToUploadedFile(cached, {
            id: `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`,
            name: 'mermaid-diagram.svg',
            size: cached.length,
          }),
        );
        setError('');
        setIsRendering(false);
        return;
      }

      if (!svg) {
        setIsRendering(true);
      }

      try {
        const id = `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`;

        mermaid.initialize({
          startOnLoad: false,
          theme: isDarkThemeId(themeId) ? 'dark' : 'default',
          securityLevel: 'strict',
          fontFamily: 'inherit',
        });

        const { svg: renderedSvg } = await mermaid.render(id, code);

        if (!isMounted()) return;

        const sanitizedSvg = sanitizeMermaidSvg(renderedSvg);
        mermaidBlockSvgCache.set(blockCacheKey, sanitizedSvg);
        setSvg(sanitizedSvg);

        setDiagramFile(
          // Size intentionally mirrors the raw render output (pre-sanitization).
          svgToUploadedFile(sanitizedSvg, { id, name: 'mermaid-diagram.svg', size: renderedSvg.length }),
        );
        setError('');
        setIsRendering(false);
      } catch (error) {
        if (!isMounted()) return;

        if (isMessageLoadingRef.current) {
          setIsRendering(true);
        } else {
          const errorMessage = getErrorMessage(error, t('diagramRenderMermaidFailed'));
          setError(errorMessage.replace(/.*error:\s*/, ''));
          setSvg('');
          setIsRendering(false);
        }
      }
    },
    [blockCacheKey, code, svg, themeId, t],
  );

  useDebouncedDiagramRender(renderMermaid, renderDelayMs);

  const { isDownloading, handleDownloadJpg } = useDiagramExport({
    svg,
    filenamePrefix: 'mermaid',
    scale: 3,
    onError: setError,
    fallbackErrorMessage: t('diagramExportJpgFailed'),
  });

  return (
    <DiagramWrapper
      title="Mermaid"
      code={code}
      error={error}
      isRendering={isRendering}
      isDownloading={isDownloading}
      diagramFile={diagramFile}
      showSource={showSource}
      setShowSource={setShowSource}
      onImageClick={onImageClick}
      onDownloadJpg={handleDownloadJpg}
      onOpenSidePanel={() => onOpenSidePanel({ type: 'mermaid', content: code, title: t('diagramMermaidTitle') })}
      themeId={themeId}
      containerRef={diagramContainerRef}
    >
      <div dangerouslySetInnerHTML={{ __html: svg }} />
    </DiagramWrapper>
  );
};

import React, { useMemo, useEffect } from 'react';
import type { SideViewContent, UploadedFile } from '@/types';
import type { OpenHtmlPreviewHandler } from '@/utils/html-preview/previewPrivilege';
import { useCodeBlock } from '@/hooks/ui/useCodeBlock';
import { CodeHeader } from './parts/CodeHeader';
import { ArtifactFrame } from './ArtifactFrame';
import { useI18n } from '@/contexts/I18nContext';
import { logService } from '@/services/logService';
import {
  isLikelyStreamingLiveArtifactInteractionJson,
  isLiveArtifactInteractionLanguage,
  isLiveArtifactLanguage,
} from '@/utils/previewableMarkdown';
import type { LiveArtifactFollowupPayload } from '@/utils/live-artifacts/liveArtifactFollowup';
import {
  diagnoseLiveArtifactInteraction,
  hasLiveArtifactInteractionShape,
} from '@/utils/live-artifacts/liveArtifactInteraction';
import { LiveArtifactInteractionFrame } from './LiveArtifactInteractionFrame';
import { LiveArtifactInteractionDiagnostic } from './LiveArtifactInteractionDiagnostic';
import { LiveArtifactInteractionPendingFrame } from './parts/LiveArtifactInteractionPendingFrame';
import { useCodeGutterSelection } from './parts/useCodeGutterSelection';
import { useCodeBlockPyodide } from './parts/useCodeBlockPyodide';
import { CodeBlockConsoleOutput } from './parts/CodeBlockConsoleOutput';
import { CodeBlockExpandOverlay } from './parts/CodeBlockExpandOverlay';
import { CodeBlockPre } from './parts/CodeBlockPre';

interface CodeBlockProps {
  children: React.ReactNode;
  cacheKey?: string;
  className?: string;
  onOpenHtmlPreview: OpenHtmlPreviewHandler;
  expandCodeBlocksByDefault: boolean;
  onOpenSidePanel: (content: SideViewContent) => void;
  showPreviewControls?: boolean;
  isLoading?: boolean;
  liveArtifactFontSize?: number;
  themeId?: string;
  onLiveArtifactFollowUp?: (payload: LiveArtifactFollowupPayload) => void;
  liveArtifactsMode?: boolean;
  disableRun?: boolean;
  files?: UploadedFile[];
  messageId?: string;
  onImageClick?: (file: UploadedFile) => void;
}

export const CodeBlock: React.FC<CodeBlockProps> = (props) => {
  const { t } = useI18n();
  const {
    preRef,
    isExpanded,
    isOverflowing,
    isCopied,
    isDownloaded,
    isWrapped,
    sourceLanguage,
    finalLanguage,
    fenceFilename,
    lineCount,
    showPreview,
    handleToggleWrap,
    handleToggleExpand,
    handleCopy,
    handleOpenSide,
    handleOpenPreview,
    handleDownload,
    codeElement,
    resolvedCodeText,
    previewMarkupType,
    COLLAPSE_THRESHOLD_PX,
  } = useCodeBlock(props);

  const {
    canRun,
    isRunning,
    hasRun,
    output,
    error,
    generatedFiles,
    displayInlineImage,
    handleRun,
    clearOutput,
    resetState,
  } = useCodeBlockPyodide({
    finalLanguage,
    codeElement,
    children: props.children,
    cacheKey: props.cacheKey,
    messageId: props.messageId,
    files: props.files,
    disableRun: props.disableRun,
  });

  const isInteractive = props.showPreviewControls ?? true;
  const showPreviewControls = isInteractive && showPreview;
  const isInteractionFence = isLiveArtifactInteractionLanguage(sourceLanguage);
  const isLikelyJsonShape = isInteractionFence || hasLiveArtifactInteractionShape(resolvedCodeText);
  const shouldDiagnoseInteraction = isLikelyJsonShape && (isInteractionFence || props.liveArtifactsMode);

  const diagnosis = useMemo(() => {
    if (!shouldDiagnoseInteraction || !resolvedCodeText) return null;
    return diagnoseLiveArtifactInteraction(resolvedCodeText);
  }, [resolvedCodeText, shouldDiagnoseInteraction]);

  const interactionSpec = diagnosis?.spec ?? null;

  useEffect(() => {
    if (diagnosis && diagnosis.errors.length > 0 && props.cacheKey) {
      logService.warn('Live Artifact interaction spec rejected', {
        cacheKey: props.cacheKey,
        codes: diagnosis.errors.map((e) => e.code),
        fenceLanguage: isInteractionFence ? 'amc-live-artifact-interaction' : 'json',
      });
    }
  }, [diagnosis, props.cacheKey, isInteractionFence]);

  const isStreamingInteractionCandidate =
    isInteractionFence && Boolean(props.isLoading) && isLikelyStreamingLiveArtifactInteractionJson(resolvedCodeText);

  const showInlineHtmlPreview =
    showPreviewControls &&
    isLiveArtifactLanguage(sourceLanguage) &&
    previewMarkupType === 'html' &&
    (resolvedCodeText.trim().length > 0 || Boolean(props.isLoading));

  const { lineNumbers, handleLineMouseDown, handleLineMouseEnter } = useCodeGutterSelection({
    lineCount,
    preRef,
  });

  if (isInteractive && isStreamingInteractionCandidate) {
    return <LiveArtifactInteractionPendingFrame label={t('thinkingText')} baseFontSize={props.liveArtifactFontSize} />;
  }

  if (isInteractive && diagnosis && diagnosis.errors.length > 0 && (isInteractionFence || props.liveArtifactsMode)) {
    return (
      <LiveArtifactInteractionDiagnostic
        diagnosis={diagnosis}
        rawJson={resolvedCodeText}
        baseFontSize={props.liveArtifactFontSize}
        onFollowUp={props.onLiveArtifactFollowUp}
      />
    );
  }

  if (isInteractive && interactionSpec && (isInteractionFence || props.liveArtifactsMode)) {
    return (
      <LiveArtifactInteractionFrame
        spec={interactionSpec}
        baseFontSize={props.liveArtifactFontSize}
        onFollowUp={props.onLiveArtifactFollowUp}
      />
    );
  }

  if (showInlineHtmlPreview) {
    return (
      <ArtifactFrame
        html={resolvedCodeText}
        cacheKey={props.cacheKey}
        isLoading={props.isLoading}
        baseFontSize={props.liveArtifactFontSize}
        themeId={props.themeId}
        onFollowUp={props.onLiveArtifactFollowUp}
        onImageClick={props.onImageClick}
        onOpenPreview={() =>
          props.onOpenHtmlPreview(resolvedCodeText, {
            privilege: 'sanitized',
            themeId: props.themeId,
            baseFontSize: props.liveArtifactFontSize,
          })
        }
      />
    );
  }

  const bottomPaddingClass = isOverflowing ? (isExpanded ? '!pb-10' : '!pb-14') : '';
  const bottomPaddingPlainClass = isOverflowing ? (isExpanded ? 'pb-10' : 'pb-14') : '';

  return (
    <div className="group relative my-3 rounded-lg border border-[var(--theme-border-primary)] bg-[var(--theme-bg-code-block)] shadow-sm">
      <CodeHeader
        language={finalLanguage}
        filename={fenceFilename}
        lineCount={lineCount}
        showPreview={showPreviewControls}
        isOverflowing={isOverflowing}
        isExpanded={isExpanded}
        isCopied={isCopied}
        isDownloaded={isDownloaded}
        isWrapped={isWrapped}
        onToggleWrap={handleToggleWrap}
        onToggleExpand={handleToggleExpand}
        onCopy={handleCopy}
        onDownload={handleDownload}
        onOpenSide={handleOpenSide}
        onOpenPreview={handleOpenPreview}
        canRun={canRun}
        isRunning={isRunning}
        onRun={handleRun}
      />

      <div className="relative">
        <CodeBlockPre
          preRef={preRef}
          className={props.className}
          isWrapped={isWrapped}
          isExpanded={isExpanded}
          isOverflowing={isOverflowing}
          lineCount={lineCount}
          lineNumbers={lineNumbers}
          bottomPaddingClass={bottomPaddingClass}
          bottomPaddingPlainClass={bottomPaddingPlainClass}
          collapseThresholdPx={COLLAPSE_THRESHOLD_PX}
          codeElement={codeElement}
          onLineMouseDown={handleLineMouseDown}
          onLineMouseEnter={handleLineMouseEnter}
        >
          {props.children}
        </CodeBlockPre>

        <CodeBlockExpandOverlay
          isOverflowing={isOverflowing}
          isExpanded={isExpanded}
          onToggleExpand={handleToggleExpand}
        />
      </div>

      <CodeBlockConsoleOutput
        hasRun={hasRun}
        isRunning={isRunning}
        output={output}
        error={error}
        displayInlineImage={displayInlineImage}
        generatedFiles={generatedFiles}
        onReset={resetState}
        onClear={clearOutput}
      />
    </div>
  );
};

import React from 'react';
import { InlineTimestampSeekButton } from '@/components/media-nav/InlineTimestampSeekButton';
import { InlinePdfLocateButton } from '@/components/media-nav/InlinePdfLocateButton';
import { InlineImageLocateButton } from '@/components/media-nav/InlineImageLocateButton';
import { normalizeBoxCoordinates, normalizePointCoordinates } from '@/utils/media-nav/coordinateSniffer';
import type { MarkdownAnchorProps } from './markdownTypes';

interface MarkdownAnchorElementProps extends MarkdownAnchorProps {
  messageId?: string;
}

export const MarkdownAnchorElement: React.FC<MarkdownAnchorElementProps> = ({ href, children, messageId, ...rest }) => {
  if (href?.startsWith('#video-seek') || href?.startsWith('#audio-seek') || href?.startsWith('#time-seek')) {
    const queryIndex = href.indexOf('?');
    const queryStr = queryIndex !== -1 ? href.slice(queryIndex + 1) : '';
    const searchParams = new URLSearchParams(queryStr);
    const start = Number.parseFloat(searchParams.get('start') || '0');
    const endParam = searchParams.get('end');
    const end = endParam ? Number.parseFloat(endParam) : undefined;
    const pointParam = searchParams.get('point');
    const boxParam = searchParams.get('box');
    const kindParam = searchParams.get('kind');
    const videoParam = searchParams.get('video') || searchParams.get('audio') || undefined;
    const snippetParam = searchParams.get('snippet') || undefined;
    const mediaKind =
      kindParam === 'audio' || href.startsWith('#audio-seek')
        ? ('audio' as const)
        : kindParam === 'video'
          ? ('video' as const)
          : undefined;

    const box2d = normalizeBoxCoordinates(boxParam) ?? undefined;
    const point = normalizePointCoordinates(pointParam) ?? undefined;
    const annotation =
      point || box2d || snippetParam
        ? {
            point,
            box2d,
            snippet: snippetParam,
          }
        : undefined;

    return (
      <InlineTimestampSeekButton
        startSeconds={start}
        endSeconds={end}
        videoName={videoParam}
        mediaKind={mediaKind}
        annotation={annotation}
        messageId={messageId}
      >
        {children}
      </InlineTimestampSeekButton>
    );
  }

  if (href?.startsWith('#pdf-seek')) {
    const queryIndex = href.indexOf('?');
    const queryStr = queryIndex !== -1 ? href.slice(queryIndex + 1) : '';
    const searchParams = new URLSearchParams(queryStr);
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const docParam = searchParams.get('doc') || undefined;
    const boxParam = searchParams.get('box');
    const pointParam = searchParams.get('point');
    const snippetParam = searchParams.get('snippet') || undefined;

    const box2d = normalizeBoxCoordinates(boxParam) ?? undefined;
    const point = normalizePointCoordinates(pointParam) ?? undefined;

    return (
      <InlinePdfLocateButton
        pageNumber={page}
        docName={docParam}
        box2d={box2d}
        point={point}
        snippet={snippetParam}
        messageId={messageId}
      >
        {children}
      </InlinePdfLocateButton>
    );
  }

  if (href?.startsWith('#image-seek')) {
    const queryIndex = href.indexOf('?');
    const queryStr = queryIndex !== -1 ? href.slice(queryIndex + 1) : '';
    const searchParams = new URLSearchParams(queryStr);
    const fileParam = searchParams.get('file') || undefined;
    const boxParam = searchParams.get('box');
    const pointParam = searchParams.get('point');
    const arrowParam = searchParams.get('arrow') || undefined;
    const labelParam = searchParams.get('label') || undefined;
    const snippetParam = searchParams.get('snippet') || undefined;

    const box2d = normalizeBoxCoordinates(boxParam) ?? undefined;
    const point = normalizePointCoordinates(pointParam) ?? undefined;

    return (
      <InlineImageLocateButton
        fileName={fileParam}
        box2d={box2d}
        point={point}
        arrow={arrowParam}
        label={labelParam}
        snippet={snippetParam}
        messageId={messageId}
      >
        {children}
      </InlineImageLocateButton>
    );
  }

  const isInternal = href && (href.startsWith('#') || href.startsWith('/'));

  return (
    <a
      href={href}
      target={isInternal ? undefined : '_blank'}
      rel={isInternal ? undefined : 'noopener noreferrer'}
      {...rest}
    >
      {children}
    </a>
  );
};

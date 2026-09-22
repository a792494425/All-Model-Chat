import React, { useMemo } from 'react';
import { MarkdownRendererCore, type MarkdownRendererProps } from './MarkdownRendererCore';
import { baseRemarkPlugins, getBaseRehypePlugins } from '@/utils/markdown';

export const StandardMarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo((props) => {
  const rehypePlugins = useMemo(() => getBaseRehypePlugins(props.allowHtml ?? false), [props.allowHtml]);

  return <MarkdownRendererCore {...props} remarkPlugins={baseRemarkPlugins} rehypePlugins={rehypePlugins} />;
});

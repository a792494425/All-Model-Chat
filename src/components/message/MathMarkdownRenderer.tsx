import React, { useMemo } from 'react';
import { MarkdownRendererCore, type MarkdownRendererProps } from './MarkdownRendererCore';
import { baseRemarkPlugins, getBaseRehypePlugins } from '@/utils/markdownConfigBase';
import { mathRemarkPlugins, getMathRehypePlugins } from '@/utils/markdownMathPlugins';
import 'katex/dist/katex.min.css';

export const MathMarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo((props) => {
  const rehypePlugins = useMemo(
    () => [
      ...getBaseRehypePlugins(props.allowHtml ?? false, { syntaxHighlighting: !props.isLoading }),
      ...getMathRehypePlugins(),
    ],
    [props.allowHtml, props.isLoading],
  );

  const remarkPlugins = useMemo(() => [...mathRemarkPlugins, ...baseRemarkPlugins], []);

  return <MarkdownRendererCore {...props} remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} />;
});

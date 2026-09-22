import React, { useEffect, useRef, Suspense } from 'react';
import type { MarkdownRendererProps } from './MarkdownRendererCore';
import { lazyNamedComponent } from '@/utils/lazyNamedComponent';
import { hasLikelyTexMathMarkdown } from '@/utils/markdown';

const LazyStandardMarkdownRenderer = lazyNamedComponent(
  () => import('./StandardMarkdownRenderer'),
  'StandardMarkdownRenderer',
);
const LazyMathMarkdownRenderer = lazyNamedComponent(() => import('./MathMarkdownRenderer'), 'MathMarkdownRenderer');

let isMathRendererLoaded = false;
void import('./MathMarkdownRenderer')
  .then(() => {
    isMathRendererLoaded = true;
  })
  .catch(() => {});

interface LazyMarkdownRendererProps extends MarkdownRendererProps {
  fallbackMode?: 'raw' | 'none';
}

/**
 * Chooses between the standard and math-enabled markdown renderers.
 *
 * Once mounted, a message retains its chosen renderer throughout its entire lifecycle.
 * Switching renderers at stream completion tears down the rendered component subtree,
 * destroying Live Artifact iframes, resetting scroll positions, and causing visual flash.
 */
export const LazyMarkdownRenderer: React.FC<LazyMarkdownRendererProps> = ({
  content,
  isLoading,
  fallbackMode = 'raw',
  ...props
}) => {
  useEffect(() => {
    if (!isMathRendererLoaded && hasLikelyTexMathMarkdown(content)) {
      void import('./MathMarkdownRenderer')
        .then(() => {
          isMathRendererLoaded = true;
        })
        .catch(() => {});
    }
  }, [content]);

  // Lock in renderer choice on initial mount of this message.
  // We NEVER switch component types across the isLoading boundary.
  const chosenRendererRef = useRef<'math' | 'standard' | null>(null);
  if (chosenRendererRef.current === null) {
    chosenRendererRef.current = isMathRendererLoaded || hasLikelyTexMathMarkdown(content) ? 'math' : 'standard';
  }

  const fallback =
    fallbackMode === 'raw' ? (
      <div className="whitespace-pre-wrap break-words text-[var(--theme-text-secondary)]">{content}</div>
    ) : null;

  if (chosenRendererRef.current === 'standard') {
    return (
      <Suspense fallback={fallback}>
        <LazyStandardMarkdownRenderer {...props} content={content} isLoading={isLoading} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={fallback}>
      <LazyMathMarkdownRenderer content={content} {...props} isLoading={isLoading} />
    </Suspense>
  );
};

import { logService } from '@/services/logService';
import { sanitizeCssColorFunctionsForPngExport } from './cssColorSanitizer';
import { isDarkThemeId } from '@/utils/theme/themeMode';
import { createStaticPreviewSnapshotContainer } from '@/utils/html-preview/previewDocument';
import { blobToDataUrl } from '@/utils/file/fileEncoding';

const DEFAULT_EXPORT_WIDTH = '800px';

// SECURITY: values interpolated into the export snapshot's innerHTML / inline styles
// must be sanitized so a malicious theme CSS variable or body class name cannot break
// out of the style attribute or inject markup. Allow only CSS-color-ish tokens
// (hex, rgb/rgba/oklch/hsl, var(), named colors) and CSS-class-name characters.
const CSS_COLOR_PATTERN =
  /^(#[0-9a-fA-F]{3,8}|rgb\([^()]*\)|rgba\([^()]*\)|hsl\([^()]*\)|hsla\([^()]*\)|oklch\([^()]*\)|transparent|currentColor|[a-z]+)$/i;
const CSS_CLASS_PATTERN = /^[a-zA-Z0-9 _-]*$/;
const THEME_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

const sanitizeExportCssColor = (value: string): string => {
  const trimmed = value.trim();
  return CSS_COLOR_PATTERN.test(trimmed) ? trimmed : 'transparent';
};

const sanitizeExportClassNames = (value: string): string => {
  const trimmed = value.trim();
  return CSS_CLASS_PATTERN.test(trimmed) ? trimmed : '';
};

const sanitizeExportThemeId = (value: string): string => {
  const trimmed = value.trim();
  return THEME_ID_PATTERN.test(trimmed) ? trimmed : '';
};

const isExportableStylesheetContentType = (contentType: string): boolean =>
  contentType.includes('text/css') || contentType.includes('application/octet-stream');

/**
 * Gathers all style and link tags from the current document's head to be inlined.
 * @returns A promise that resolves to a string of HTML style and link tags.
 */
export const gatherPageStyles = async (): Promise<string> => {
  const stylePromises = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]')).map(
    async (element) => {
      if (element.tagName === 'STYLE') {
        return `<style>${sanitizeCssColorFunctionsForPngExport(element.innerHTML)}</style>`;
      }
      if (element.tagName === 'LINK' && (element as HTMLLinkElement).rel === 'stylesheet') {
        const href = (element as HTMLLinkElement).href;

        try {
          const response = await fetch(href);
          if (!response.ok) throw new Error(response.statusText);

          const contentType = response.headers.get('content-type');
          if (contentType && !isExportableStylesheetContentType(contentType)) {
            logService.warn(`Skipping stylesheet ${href} due to invalid MIME: ${contentType}`);
            return '';
          }

          const stylesheetCss = await response.text();
          return `<style>${sanitizeCssColorFunctionsForPngExport(stylesheetCss)}</style>`;
        } catch (stylesheetError) {
          logService.warn('Could not fetch stylesheet for export.', { href, error: stylesheetError });
          return '';
        }
      }
      return '';
    },
  );

  return (await Promise.all(stylePromises)).join('\n');
};

/**
 * Embeds media (images, audio, and source tags) in a cloned DOM element by converting
 * their sources to Base64 data URIs. This allows the HTML to be self-contained (offline-capable).
 * @param clone The cloned HTMLElement to process.
 */
const embedMediaInClone = async (clone: HTMLElement): Promise<void> => {
  const mediaElements = Array.from(
    clone.querySelectorAll<HTMLImageElement | HTMLAudioElement | HTMLSourceElement>('img, audio, source'),
  );
  await Promise.all(
    mediaElements.map(async (el) => {
      try {
        const src = el.getAttribute('src');
        if (!src || src.startsWith('data:')) return;

        const fullSrc = (el as HTMLImageElement | HTMLAudioElement).src || src;
        const response = await fetch(fullSrc);
        const blob = await response.blob();
        const dataUrl = await blobToDataUrl(blob);
        el.setAttribute('src', dataUrl);
        if ('src' in el) {
          (el as any).src = dataUrl;
        }
        el.removeAttribute('srcset');
        el.removeAttribute('loading');
      } catch (embedError) {
        logService.warn('Failed to embed media for export:', embedError);
      }
    }),
  );
};

/**
 * Replaces sandboxed Live Artifact iframes with same-origin static snapshots.
 *
 * Sandboxed iframes cannot load external vendor scripts (/vendor/echarts.min.js)
 * or receive parent window Graphviz postMessage relays when exported as standalone
 * HTML documents. In addition, html2canvas cannot render sandboxed iframe contents
 * for PNG export. We replace each frame with a same-origin static preview container
 * via `createStaticPreviewSnapshotContainer`, compiling ECharts and Graphviz diagrams
 * into self-contained inline vector SVGs.
 */
const replaceLiveArtifactIframes = async (
  clone: HTMLElement,
  targetDocument: Document,
  themeId?: string,
): Promise<void> => {
  const artifactFrames = Array.from(clone.querySelectorAll('[data-live-artifact-frame="true"]'));
  for (const frame of artifactFrames) {
    const html = frame.getAttribute('data-artifact-source') ?? '';
    if (!html.trim()) continue;

    // The frame carries the artifact font size it was rendered with, so an
    // exported transcript keeps charts and diagrams at the same scale.
    const frameFontSize = Number.parseFloat(frame.getAttribute('data-live-artifact-font-size') ?? '');
    const baseFontSize = Number.isFinite(frameFontSize) && frameFontSize > 0 ? frameFontSize : undefined;

    const { container } = await createStaticPreviewSnapshotContainer(html, targetDocument, {
      themeId,
      baseFontSize,
    });

    // The snapshot container is positioned off-screen with white background by default;
    // reset it so it flows inline within the exported transcript with theme transparency.
    Object.assign(container.style, {
      position: 'static',
      transform: 'none',
      left: 'auto',
      top: 'auto',
      width: '100%',
      maxWidth: '100%',
      pointerEvents: 'auto',
      zIndex: 'auto',
      background: 'transparent',
      overflow: 'visible',
      height: 'auto',
    });

    frame.replaceWith(container);
  }
};

/**
 * Creates an isolated DOM container for exporting, injecting current styles and theme.
 */
export const createSnapshotContainer = async (
  themeId: string,
  width: string = DEFAULT_EXPORT_WIDTH,
): Promise<{ container: HTMLElement; innerContent: HTMLElement; remove: () => void; rootBgColor: string }> => {
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.left = '-9999px';
  tempContainer.style.top = '0px';
  tempContainer.style.width = width;
  tempContainer.style.padding = '0';
  tempContainer.style.zIndex = '-1';
  tempContainer.style.boxSizing = 'border-box';

  const allStyles = await gatherPageStyles();
  const bodyClasses = sanitizeExportClassNames(document.body.className);

  let rootBgColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-bg-primary').trim();
  if (!rootBgColor) {
    rootBgColor = isDarkThemeId(themeId) ? '#09090b' : '#FFFFFF';
  }
  const safeBgColor = sanitizeExportCssColor(rootBgColor);
  const safeThemeId = sanitizeExportThemeId(themeId);

  tempContainer.innerHTML = `
        ${allStyles}
        <div class="theme-${safeThemeId} ${bodyClasses} is-exporting-png" style="background-color: ${safeBgColor}; color: var(--theme-text-primary); min-height: 100vh;">
            <div style="background-color: ${safeBgColor}; padding: 0;">
                <div class="exported-chat-container" style="width: 100%; max-width: 100%; margin: 0 auto;">
                </div>
            </div>
        </div>
    `;

  document.body.appendChild(tempContainer);

  const innerContent = tempContainer.querySelector('.exported-chat-container') as HTMLElement;
  const captureTarget = tempContainer.querySelector<HTMLElement>(':scope > div');

  if (!innerContent || !captureTarget) {
    document.body.removeChild(tempContainer);
    throw new Error('Failed to create snapshot container structure');
  }

  return {
    container: captureTarget,
    innerContent,
    remove: () => {
      if (document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }
    },
    rootBgColor: safeBgColor,
  };
};

/**
 * Creates a standard header DOM element for exported images.
 */
export const createExportDOMHeader = (title: string, metaLeft: string, metaRight: string): HTMLElement => {
  const headerDiv = document.createElement('div');
  headerDiv.style.padding = '2rem 2rem 1rem 2rem';
  headerDiv.style.borderBottom = '1px solid var(--theme-border-secondary)';
  headerDiv.style.marginBottom = '1rem';

  const titleEl = document.createElement('h1');
  titleEl.style.fontSize = '1.5rem';
  titleEl.style.fontWeight = 'bold';
  titleEl.style.color = 'var(--theme-text-primary)';
  titleEl.style.marginBottom = '0.5rem';
  titleEl.textContent = title;

  const metaDiv = document.createElement('div');
  metaDiv.style.fontSize = '0.875rem';
  metaDiv.style.color = 'var(--theme-text-tertiary)';
  metaDiv.style.display = 'flex';
  metaDiv.style.gap = '1rem';

  const leftSpan = document.createElement('span');
  leftSpan.textContent = metaLeft;
  const separatorSpan = document.createElement('span');
  separatorSpan.textContent = '•';
  const rightSpan = document.createElement('span');
  rightSpan.textContent = metaRight;

  headerDiv.appendChild(titleEl);
  metaDiv.appendChild(leftSpan);
  metaDiv.appendChild(separatorSpan);
  metaDiv.appendChild(rightSpan);
  headerDiv.appendChild(metaDiv);

  return headerDiv;
};

/**
 * Clones, cleans, and prepares a DOM element for export (HTML or PNG).
 * Handles removing interactive elements, expanding content, embedding images,
 * and normalizing layout artifacts from virtualization.
 *
 * @param sourceElement The live DOM element to prepare for export.
 * @param options.expandDetails Whether to expand collapsible sections (true for PNG).
 * @param options.forPng Whether this is a PNG export path (triggers iframe replacement).
 * @param options.themeId Theme id used to hydrate chart snapshots with matching colors.
 */
export const prepareElementForExport = async (
  sourceElement: HTMLElement,
  options: { expandDetails?: boolean; forPng?: boolean; themeId?: string; includeThoughts?: boolean } = {},
): Promise<HTMLElement> => {
  const { expandDetails = true, themeId, includeThoughts = false } = options;

  const clone = sourceElement.cloneNode(true) as HTMLElement;

  // Normalize virtualization offsets before snapshotting.
  clone.style.height = 'auto';
  clone.style.overflow = 'visible';
  clone.style.maxHeight = 'none';

  const potentialLists = Array.from(clone.children) as HTMLElement[];
  potentialLists.forEach((child) => {
    if (child.style.paddingTop) child.style.paddingTop = '0px';
    if (child.style.marginTop) child.style.marginTop = '0px';
    if (child.style.transform) child.style.transform = 'none';
    if (child.style.position === 'absolute') child.style.position = 'static';
  });

  const selectorsToRemove = [
    'button',
    '.message-actions',
    '.sticky',
    'input',
    'textarea',
    '.code-block-utility-button',
    '[role="tooltip"]',
    '.loading-dots-container',
  ];
  clone.querySelectorAll(selectorsToRemove.join(',')).forEach((element) => element.remove());

  clone.querySelectorAll('[data-message-id]').forEach((element) => {
    (element as HTMLElement).style.animation = 'none';
    (element as HTMLElement).style.opacity = '1';
    (element as HTMLElement).style.transform = 'none';
  });

  // In both HTML and PNG export, code blocks must be fully expanded
  // and the interactive expand overlay/gradient removed, as there are no
  // client-side React scripts to toggle them in static snapshots.
  clone.querySelectorAll('.code-block-expand-overlay').forEach((element) => element.remove());

  clone.querySelectorAll('pre').forEach((element) => {
    (element as HTMLElement).style.maxHeight = 'none';
    (element as HTMLElement).style.height = 'auto';
    (element as HTMLElement).style.overflow = 'visible';
  });

  // In exported snapshots (both PNG and HTML), collapsed user messages must be fully expanded.
  clone.querySelectorAll('[data-user-message-collapsed]').forEach((container) => {
    container.removeAttribute('data-user-message-collapsed');
  });
  clone.querySelectorAll<HTMLElement>('[id$="-message-text"]').forEach((element) => {
    element.classList.remove('overflow-hidden');
    element.style.maxHeight = 'none';
    element.style.height = 'auto';
    element.style.overflow = 'visible';
  });

  // Strip thinking records / chain of thought unless explicitly requested.
  if (!includeThoughts) {
    clone
      .querySelectorAll('.message-thoughts-block, .thought-process-accordion, [data-thoughts="true"]')
      .forEach((element) => {
        element.remove();
      });
  } else if (!expandDetails) {
    clone.querySelectorAll('.thought-process-accordion').forEach((accordion) => {
      const parent = accordion.parentElement;
      if (!parent) return;

      const header = parent.firstElementChild as HTMLElement;
      if (!header || header === accordion) return;

      const details = document.createElement('details');
      details.className = parent.className;

      const summary = document.createElement('summary');
      summary.className = header.className;
      summary.style.cursor = 'pointer';
      summary.style.listStyle = 'none';

      const style = document.createElement('style');
      style.textContent = 'summary::-webkit-details-marker { display: none; }';
      summary.appendChild(style);

      while (header.firstChild) {
        summary.appendChild(header.firstChild);
      }

      const svg = summary.querySelector('svg');
      if (svg && svg.classList.contains('transition-transform')) {
        svg.classList.remove('rotate-180');
        svg.classList.add('group-open:rotate-180');
      }

      const inner = accordion.querySelector('.thought-process-inner') || accordion;
      const contentWrapper = document.createElement('div');
      contentWrapper.className = inner.className;

      while (inner.firstChild) {
        contentWrapper.appendChild(inner.firstChild);
      }

      details.appendChild(summary);
      details.appendChild(contentWrapper);

      parent.replaceWith(details);
    });
  }

  if (expandDetails) {
    clone.querySelectorAll('details').forEach((element) => element.setAttribute('open', 'true'));
  } else {
    clone.querySelectorAll('details').forEach((element) => element.removeAttribute('open'));
  }

  // Replace sandboxed artifact iframes with same-origin static snapshots for both PNG and HTML export.
  // Sandboxed iframes cannot load external vendor scripts (/vendor/echarts.min.js) or receive
  // parent window Graphviz postMessage relays when exported as standalone HTML documents.
  await replaceLiveArtifactIframes(clone, sourceElement.ownerDocument, themeId);

  // Embed blob and remote media (images and audio) before the clone leaves the live document.
  await embedMediaInClone(clone);

  return clone;
};

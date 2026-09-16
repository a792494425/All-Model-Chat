import { escapeHtml } from '@/utils/escapeHtml';
import { AVAILABLE_THEMES, DEFAULT_THEME_ID } from '@/constants/themeRegistry';
import { buildLiveArtifactThemeVars } from '@/utils/live-artifacts/liveArtifactThemeTokens';
interface ExportHtmlLabels {
  copyText: string;
  copyTitle: string;
  copiedText: string;
  printText: string;
  printTitle: string;
}

export const EXPORT_HTML_LABELS: Record<string, ExportHtmlLabels> = {
  zh: {
    copyText: '复制',
    copyTitle: '复制正文',
    copiedText: '已复制',
    printText: '打印 (PDF)',
    printTitle: '打印 (PDF)',
  },
  en: {
    copyText: 'Copy',
    copyTitle: 'Copy Content',
    copiedText: 'Copied',
    printText: 'Print (PDF)',
    printTitle: 'Print (PDF)',
  },
  ja: {
    copyText: 'コピー',
    copyTitle: '本文をコピー',
    copiedText: 'コピー完了',
    printText: '印刷 (PDF)',
    printTitle: '印刷 (PDF)',
  },
  ko: {
    copyText: '복사',
    copyTitle: '본문 복사',
    copiedText: '복사됨',
    printText: '인쇄 (PDF)',
    printTitle: '인쇄 (PDF)',
  },
  es: {
    copyText: 'Copiar',
    copyTitle: 'Copiar contenido',
    copiedText: 'Copiado',
    printText: 'Imprimir (PDF)',
    printTitle: 'Imprimir (PDF)',
  },
  fr: {
    copyText: 'Copier',
    copyTitle: 'Copier le contenu',
    copiedText: 'Copié',
    printText: 'Imprimer (PDF)',
    printTitle: 'Imprimer (PDF)',
  },
  de: {
    copyText: 'Kopieren',
    copyTitle: 'Inhalt kopieren',
    copiedText: 'Kopiert',
    printText: 'Drucken (PDF)',
    printTitle: 'Drucken (PDF)',
  },
};

export const generateExportHtmlTemplate = ({
  title,
  date,
  model,
  contentHtml,
  styles,
  themeId,
  language,
  rootBgColor,
  bodyClasses,
}: {
  title: string;
  date: string;
  model: string;
  contentHtml: string;
  styles: string;
  themeId: string;
  language: string;
  rootBgColor: string;
  bodyClasses: string;
}) => {
  const safeTitle = escapeHtml(title);
  const safeDate = escapeHtml(date);
  const safeModel = escapeHtml(model);
  const safeLanguage = escapeHtml(language);
  const safeThemeId = escapeHtml(themeId);
  const safeBodyClasses = escapeHtml(bodyClasses);
  const selectedTheme =
    AVAILABLE_THEMES.find((t) => t.id === themeId) ??
    AVAILABLE_THEMES.find((t) => t.id === DEFAULT_THEME_ID) ??
    AVAILABLE_THEMES[0];
  const langKey = language?.toLowerCase().slice(0, 2) || 'en';
  const labels = EXPORT_HTML_LABELS[langKey] || EXPORT_HTML_LABELS.en;
  const safeCopyTitle = escapeHtml(labels.copyTitle);
  const safeCopyText = escapeHtml(labels.copyText);
  const safePrintTitle = escapeHtml(labels.printTitle);
  const safePrintText = escapeHtml(labels.printText);
  const jsonCopiedText = JSON.stringify(labels.copiedText);
  const liveArtifactThemeVars = buildLiveArtifactThemeVars(selectedTheme.colors);
  const fallbackBgColor = selectedTheme.colors.bgPrimary;
  const trimmedRootBgColor = rootBgColor?.trim() ?? '';
  const safeRootBgColor =
    /^(#[0-9a-fA-F]{3,8}|rgb\([^()]*\)|rgba\([^()]*\)|hsl\([^()]*\)|hsla\([^()]*\)|oklch\([^()]*\)|currentColor|[a-z]+)$/i.test(
      trimmedRootBgColor,
    ) && trimmedRootBgColor !== 'transparent'
      ? trimmedRootBgColor
      : fallbackBgColor;

  return `
        <!DOCTYPE html>
        <html lang="${safeLanguage}">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Chat Export: ${safeTitle}</title>
            ${styles}
            <style>
                /* Reset & Layout - Light Paper Theme */
                :root {
                    ${liveArtifactThemeVars};
                    --export-page-bg: #f8fafc;
                    --export-card-bg: #ffffff;
                    --export-card-border: rgba(0, 0, 0, 0.08);
                    --export-card-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02);
                    --export-table-border: rgba(0, 0, 0, 0.08);
                    --export-table-header-bg: #f8fafc;
                }
                html, body { height: auto !important; overflow: auto !important; min-height: 100vh; }
                body {
                    background-color: ${safeRootBgColor};
                    background-color: var(--export-page-bg, #f8fafc);
                    padding: 2.5rem 1.5rem; 
                    box-sizing: border-box; 
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    color: var(--theme-text-primary, #1e293b);
                    margin: 0;
                    line-height: 1.6;
                }
                
                /* Elevated Paper Document Card */
                .exported-chat-container {
                    width: 100%;
                    max-width: 960px;
                    margin: 0 auto;
                    background-color: var(--export-card-bg, #ffffff);
                    border-radius: 16px;
                    border: 1px solid var(--export-card-border, rgba(0, 0, 0, 0.08));
                    box-shadow: var(--export-card-shadow, 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02));
                    padding: 2.5rem 3rem;
                    box-sizing: border-box;
                }
                @media (max-width: 640px) {
                    body {
                        padding: 1rem 0.5rem;
                    }
                    .exported-chat-container {
                        padding: 1.5rem 1.25rem;
                        border-radius: 12px;
                    }
                }

                /* Completely hide thinking processes / chain-of-thought in export */
                .message-thoughts-block,
                .thought-process-accordion,
                .thought-process-content,
                [data-thoughts="true"] {
                    display: none !important;
                    visibility: hidden !important;
                    height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                }

                /* Live Artifact Snapshot Container */
                .html-preview-snapshot {
                    color: var(--amc-live-artifact-text, inherit);
                    width: 100%;
                    margin: 1rem 0;
                    position: relative;
                    overflow-wrap: anywhere;
                }
                .html-preview-snapshot :where(div,section,article,main,aside,header,footer,li,td,th,p,h1,h2,h3,h4,h5,h6,span,strong,em,small,code) {
                    min-width: 0;
                }
                .html-preview-snapshot table {
                    display: table !important;
                    width: 100% !important;
                    border-collapse: separate !important;
                    border-spacing: 0 !important;
                    border: 1px solid var(--amc-live-artifact-border, #e5e5e5) !important;
                    border-radius: 8px !important;
                    overflow: hidden !important;
                    margin: 0.75rem 0 !important;
                }
                .html-preview-snapshot th,
                .html-preview-snapshot td {
                    border: none !important;
                    border-bottom: 1px solid var(--amc-live-artifact-border, #e5e5e5) !important;
                    padding: 0.6rem 0.85rem !important;
                    vertical-align: top !important;
                }
                .html-preview-snapshot tr:last-child td {
                    border-bottom: none !important;
                }
                .html-preview-snapshot th {
                    background-color: var(--amc-live-artifact-surface-muted, rgba(0, 0, 0, 0.03)) !important;
                    font-weight: 600;
                }
                .html-preview-snapshot span[style*="border-radius"][style*="padding"] {
                    white-space: nowrap !important;
                    display: inline-block !important;
                }

                /* Header Styles - Minimalist Notion Topbar */
                .exported-chat-header { 
                    padding-bottom: 0.85rem; 
                    border-bottom: 1px solid var(--theme-border-primary, rgba(0, 0, 0, 0.06)); 
                    margin-bottom: 1.5rem; 
                }
                .exported-topbar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 0.75rem;
                    margin-bottom: 0.45rem;
                }
                .exported-breadcrumb-nav {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.45rem;
                    min-width: 0;
                    flex: 1 1 auto;
                }
                .exported-brand-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    font-size: 0.75rem;
                    font-weight: 600;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    color: var(--theme-bg-accent, #2563eb);
                    background: var(--theme-bg-info, rgba(37, 99, 235, 0.08));
                    padding: 0.25rem 0.55rem;
                    border-radius: 6px;
                    user-select: none;
                    flex-shrink: 0;
                }
                .exported-brand-icon {
                    flex-shrink: 0;
                }
                .exported-breadcrumb-sep {
                    color: #94a3b8;
                    font-size: 0.8rem;
                    user-select: none;
                    flex-shrink: 0;
                }
                .exported-breadcrumb-title { 
                    font-size: 0.925rem; 
                    font-weight: 600; 
                    color: #1e293b; 
                    margin: 0; 
                    padding: 0;
                    line-height: 1.3;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 560px;
                }
                .exported-topbar-actions {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.45rem;
                    flex-shrink: 0;
                }
                .exported-action-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    font-size: 0.75rem;
                    font-weight: 500;
                    color: #64748b;
                    background: #ffffff;
                    border: 1px solid rgba(0, 0, 0, 0.09);
                    border-radius: 6px;
                    padding: 0.25rem 0.55rem;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    user-select: none;
                    line-height: 1.2;
                }
                .exported-action-btn:hover {
                    color: #0f172a;
                    background: #f1f5f9;
                    border-color: rgba(0, 0, 0, 0.16);
                }
                .exported-action-btn.copied {
                    color: #059669;
                    background: #ecfdf5;
                    border-color: rgba(16, 185, 129, 0.35);
                }
                .exported-chat-meta { 
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.35rem 0.55rem;
                    align-items: center;
                    font-size: 0.75rem; 
                    color: #64748b; 
                }
                .exported-meta-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                }
                .exported-meta-dot {
                    width: 5px;
                    height: 5px;
                    border-radius: 50%;
                    background: #10b981;
                    display: inline-block;
                }
                .meta-dot-model {
                    background: var(--theme-bg-accent, #2563eb);
                }
                .exported-meta-divider {
                    color: #cbd5e1;
                    user-select: none;
                }
                .exported-meta-val {
                    font-weight: 500;
                    color: #64748b;
                }

                /* UI Cleanup - Hide interactive elements */
                .message-actions, 
                .code-block-utility-button, 
                button:not(.amc-diagram-btn):not(.exported-action-btn), 
                .sticky,
                [role="tooltip"],
                input,
                textarea { 
                    display: none !important; 
                }

                /* Message Layout Fixes */
                [data-message-id] {
                    break-inside: avoid;
                    margin-bottom: 1.5rem;
                }
                [data-message-id]:last-child {
                    margin-bottom: 0;
                }
                
                /* Links */
                a { color: var(--theme-text-link, #2563eb); text-decoration: none; }
                a:hover { text-decoration: underline; }

                /* Tables - Modern Clean Document Style */
                table { 
                    width: 100%; 
                    border-collapse: separate !important;
                    border-spacing: 0 !important;
                    margin: 1.25rem 0; 
                    border: 1px solid var(--export-table-border, #e2e8f0);
                    border-radius: 10px;
                    overflow: hidden;
                    font-size: 0.9em;
                }
                th, td { 
                    border: none !important;
                    border-bottom: 1px solid var(--export-table-border, #e2e8f0) !important;
                    padding: 0.75rem 1rem; 
                    text-align: left; 
                    vertical-align: top;
                }
                th { 
                    background-color: var(--export-table-header-bg, #f8fafc) !important; 
                    font-weight: 600; 
                    color: var(--theme-text-primary, #0f172a);
                    border-bottom: 2px solid var(--export-table-border, #e2e8f0) !important;
                }
                tr:last-child td {
                    border-bottom: none !important;
                }
                tbody tr:hover {
                    background-color: var(--theme-bg-surface-muted, rgba(0, 0, 0, 0.02));
                }

                /* Code Blocks */
                pre { 
                    background-color: var(--theme-bg-code-block, #f3f4f6); 
                    border-radius: 0.5rem; 
                    padding: 1rem; 
                    overflow-x: auto; 
                }

                /* Footer */
                .exported-chat-footer {
                    margin-top: 3.5rem;
                    padding-top: 1.5rem;
                    border-top: 1px solid var(--theme-border-primary, rgba(0, 0, 0, 0.08));
                    text-align: center;
                    font-size: 0.8rem;
                    color: var(--theme-text-tertiary, #94a3b8);
                    user-select: none;
                }
                .exported-footer-content {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.6rem;
                }

                @media print {
                    body {
                        background-color: #ffffff !important;
                        color: #000000 !important;
                        padding: 0 !important;
                    }
                    .exported-chat-container {
                        border: none !important;
                        box-shadow: none !important;
                        max-width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .exported-topbar-actions,
                    .exported-action-btn,
                    .amc-diagram-modal-backdrop {
                        display: none !important;
                    }
                    .exported-chat-header {
                        border-bottom: 1px solid #e2e8f0 !important;
                        margin-bottom: 1rem !important;
                        padding-bottom: 0.5rem !important;
                    }
                    pre, blockquote, table, figure, .html-preview-snapshot {
                        break-inside: avoid;
                    }
                }

                /* Graphviz and Interactive Diagrams */
                [data-amc-graphviz] {
                    overflow-x: auto !important;
                    max-width: 100% !important;
                    display: block !important;
                    cursor: zoom-in;
                    -webkit-overflow-scrolling: touch;
                }
                [data-amc-graphviz] svg {
                    max-width: none !important;
                    height: auto !important;
                    display: block;
                    margin: 0 auto;
                }
                [data-amc-graphviz]::-webkit-scrollbar {
                    height: 6px;
                }
                [data-amc-graphviz]::-webkit-scrollbar-track {
                    background: transparent;
                }
                [data-amc-graphviz]::-webkit-scrollbar-thumb {
                    background: var(--theme-scrollbar-thumb, rgba(150, 150, 150, 0.4));
                    border-radius: 9999px;
                }
                [data-amc-graphviz]::-webkit-scrollbar-thumb:hover {
                    background: var(--theme-scrollbar-thumb-hover, rgba(150, 150, 150, 0.7));
                }

                /* Diagram Lightbox Modal */
                .amc-diagram-modal-backdrop {
                    position: fixed;
                    inset: 0;
                    z-index: 99999;
                    background: rgba(15, 23, 42, 0.92);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    display: none;
                    flex-direction: column;
                }
                .amc-diagram-modal-backdrop.active {
                    display: flex !important;
                }
                .amc-diagram-modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.75rem 1.25rem;
                    color: #f8fafc;
                    background: rgba(15, 23, 42, 0.98);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
                    user-select: none;
                    height: 56px;
                    box-sizing: border-box;
                }
                .amc-diagram-modal-title {
                    font-size: 0.95rem;
                    font-weight: 600;
                    letter-spacing: 0.025em;
                }
                .amc-diagram-modal-actions {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .amc-diagram-modal-backdrop .amc-diagram-btn {
                    display: inline-flex !important;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.12);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: #f8fafc;
                    border-radius: 0.375rem;
                    padding: 0.35rem 0.65rem;
                    font-size: 0.85rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background 0.15s, border-color 0.15s;
                    user-select: none;
                }
                .amc-diagram-modal-backdrop .amc-diagram-btn:hover {
                    background: rgba(255, 255, 255, 0.25);
                    border-color: rgba(255, 255, 255, 0.35);
                }
                .amc-diagram-modal-hint {
                    font-size: 0.75rem;
                    color: rgba(255, 255, 255, 0.5);
                    margin-right: 0.5rem;
                }
                .amc-diagram-modal-viewport {
                    flex: 1;
                    width: 100%;
                    height: calc(100% - 56px);
                    overflow: hidden;
                    position: relative;
                    cursor: grab;
                }
                .amc-diagram-modal-viewport:active {
                    cursor: grabbing;
                }
                .amc-diagram-modal-canvas {
                    position: absolute;
                    left: 0;
                    top: 0;
                    transform-origin: 0 0;
                    will-change: transform;
                    pointer-events: none;
                }
                .amc-diagram-modal-canvas svg {
                    max-width: none !important;
                    height: auto !important;
                    display: block;
                }
            </style>
        </head>
        <body class="${safeBodyClasses} theme-${safeThemeId} is-exporting-png">
            <div class="exported-chat-container">
                <header class="exported-chat-header">
                    <div class="exported-topbar">
                        <div class="exported-breadcrumb-nav">
                            <div class="exported-brand-badge">
                                <svg class="exported-brand-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                                    <polyline points="2 17 12 22 22 17"></polyline>
                                    <polyline points="2 12 12 17 22 12"></polyline>
                                </svg>
                                <span>AMC WebUI</span>
                            </div>
                            <span class="exported-breadcrumb-sep">/</span>
                            <h1 class="exported-breadcrumb-title" title="${safeTitle}">${safeTitle}</h1>
                        </div>
                        <div class="exported-topbar-actions">
                            <button type="button" class="exported-action-btn" id="amc-copy-btn" title="${safeCopyTitle}" aria-label="${safeCopyTitle}">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                <span id="amc-copy-text">${safeCopyText}</span>
                            </button>
                            <button type="button" class="exported-action-btn" id="amc-print-btn" onclick="window.print()" title="${safePrintTitle}" aria-label="${safePrintTitle}">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                <span>${safePrintText}</span>
                            </button>
                        </div>
                    </div>
                    <div class="exported-chat-meta">
                        <div class="exported-meta-pill">
                            <span class="exported-meta-dot"></span>
                            <span class="exported-meta-val">${safeDate}</span>
                        </div>
                        <span class="exported-meta-divider">•</span>
                        <div class="exported-meta-pill">
                            <span class="exported-meta-dot meta-dot-model"></span>
                            <span class="exported-meta-val">${safeModel}</span>
                        </div>
                    </div>
                </header>
                <div class="exported-chat-content">
                    ${contentHtml}
                </div>
                <footer class="exported-chat-footer">
                    <div class="exported-footer-content">
                        <span>Generated by <strong>AMC WebUI</strong></span>
                        <span>•</span>
                        <span>${safeDate}</span>
                    </div>
                </footer>
            </div>
            <script>
            (function() {
                var backdrop = document.createElement('div');
                backdrop.className = 'amc-diagram-modal-backdrop';
                backdrop.innerHTML = '<div class="amc-diagram-modal-header">' +
                    '<div class="amc-diagram-modal-title">逻辑拓扑图 / Diagram Viewer</div>' +
                    '<div class="amc-diagram-modal-actions">' +
                        '<span class="amc-diagram-modal-hint">滚轮缩放 • 拖拽平移 • 双击重置</span>' +
                        '<span role="button" class="amc-diagram-btn" id="amc-zoom-in" title="放大 / Zoom In">+</span>' +
                        '<span role="button" class="amc-diagram-btn" id="amc-zoom-out" title="缩小 / Zoom Out">-</span>' +
                        '<span role="button" class="amc-diagram-btn" id="amc-zoom-reset" title="重置 / Reset">1:1</span>' +
                        '<span role="button" class="amc-diagram-btn" id="amc-zoom-fit" title="适应屏幕 / Fit">适应</span>' +
                        '<span role="button" class="amc-diagram-btn" id="amc-modal-close" title="关闭 / Close (Esc)">✕</span>' +
                    '</div>' +
                '</div>' +
                '<div class="amc-diagram-modal-viewport">' +
                    '<div class="amc-diagram-modal-canvas"></div>' +
                '</div>';
                document.body.appendChild(backdrop);

                var canvas = backdrop.querySelector('.amc-diagram-modal-canvas');
                var viewport = backdrop.querySelector('.amc-diagram-modal-viewport');
                var scale = 1;
                var translateX = 0;
                var translateY = 0;
                var isDragging = false;
                var startX = 0;
                var startY = 0;
                var initialSvgWidth = 0;
                var initialSvgHeight = 0;

                function updateTransform() {
                    canvas.style.transform = 'translate(' + translateX + 'px, ' + translateY + 'px) scale(' + scale + ')';
                }

                function fitToViewport() {
                    if (!initialSvgWidth || !initialSvgHeight) return;
                    var vpRect = viewport.getBoundingClientRect();
                    var padding = 40;
                    var availW = Math.max(100, vpRect.width - padding);
                    var availH = Math.max(100, vpRect.height - padding);
                    var sW = availW / initialSvgWidth;
                    var sH = availH / initialSvgHeight;
                    scale = Math.min(sW, sH, 2.5);
                    translateX = (vpRect.width - initialSvgWidth * scale) / 2;
                    translateY = (vpRect.height - initialSvgHeight * scale) / 2;
                    updateTransform();
                }

                function reset1to1() {
                    var vpRect = viewport.getBoundingClientRect();
                    scale = 1;
                    translateX = (vpRect.width - initialSvgWidth) / 2;
                    translateY = (vpRect.height - initialSvgHeight) / 2;
                    updateTransform();
                }

                function closeModal() {
                    backdrop.classList.remove('active');
                    canvas.innerHTML = '';
                }

                function openModal(svgEl) {
                    canvas.innerHTML = '';
                    var clone = svgEl.cloneNode(true);
                    clone.style.maxWidth = 'none';
                    clone.style.margin = '0';
                    clone.style.display = 'block';

                    var vb = clone.viewBox && clone.viewBox.baseVal;
                    if (vb && vb.width && vb.height) {
                        initialSvgWidth = vb.width;
                        initialSvgHeight = vb.height;
                    } else {
                        initialSvgWidth = parseFloat(clone.getAttribute('width')) || clone.clientWidth || 800;
                        initialSvgHeight = parseFloat(clone.getAttribute('height')) || clone.clientHeight || 600;
                    }
                    clone.setAttribute('width', initialSvgWidth + 'px');
                    clone.setAttribute('height', initialSvgHeight + 'px');
                    canvas.style.width = initialSvgWidth + 'px';
                    canvas.style.height = initialSvgHeight + 'px';
                    canvas.appendChild(clone);

                    backdrop.classList.add('active');
                    fitToViewport();
                }

                backdrop.querySelector('#amc-modal-close').addEventListener('click', closeModal);
                backdrop.querySelector('#amc-zoom-in').addEventListener('click', function(e) {
                    e.stopPropagation();
                    var vpRect = viewport.getBoundingClientRect();
                    var cx = vpRect.width / 2;
                    var cy = vpRect.height / 2;
                    var newScale = Math.min(scale * 1.3, 10);
                    translateX = cx - (cx - translateX) * (newScale / scale);
                    translateY = cy - (cy - translateY) * (newScale / scale);
                    scale = newScale;
                    updateTransform();
                });
                backdrop.querySelector('#amc-zoom-out').addEventListener('click', function(e) {
                    e.stopPropagation();
                    var vpRect = viewport.getBoundingClientRect();
                    var cx = vpRect.width / 2;
                    var cy = vpRect.height / 2;
                    var newScale = Math.max(scale / 1.3, 0.1);
                    translateX = cx - (cx - translateX) * (newScale / scale);
                    translateY = cy - (cy - translateY) * (newScale / scale);
                    scale = newScale;
                    updateTransform();
                });
                backdrop.querySelector('#amc-zoom-reset').addEventListener('click', function(e) {
                    e.stopPropagation();
                    reset1to1();
                });
                backdrop.querySelector('#amc-zoom-fit').addEventListener('click', function(e) {
                    e.stopPropagation();
                    fitToViewport();
                });

                viewport.addEventListener('wheel', function(e) {
                    e.preventDefault();
                    var delta = e.deltaY < 0 ? 1.15 : 0.87;
                    var newScale = Math.min(Math.max(scale * delta, 0.1), 15);
                    var rect = viewport.getBoundingClientRect();
                    var mouseX = e.clientX - rect.left;
                    var mouseY = e.clientY - rect.top;
                    translateX = mouseX - (mouseX - translateX) * (newScale / scale);
                    translateY = mouseY - (mouseY - translateY) * (newScale / scale);
                    scale = newScale;
                    updateTransform();
                }, { passive: false });

                viewport.addEventListener('mousedown', function(e) {
                    if (e.target.closest('.amc-diagram-btn')) return;
                    isDragging = true;
                    startX = e.clientX - translateX;
                    startY = e.clientY - translateY;
                });
                window.addEventListener('mousemove', function(e) {
                    if (!isDragging) return;
                    translateX = e.clientX - startX;
                    translateY = e.clientY - startY;
                    updateTransform();
                });
                window.addEventListener('mouseup', function() {
                    isDragging = false;
                });

                var touchStartDist = 0;
                var touchStartScale = 1;
                viewport.addEventListener('touchstart', function(e) {
                    if (e.touches.length === 1) {
                        isDragging = true;
                        startX = e.touches[0].clientX - translateX;
                        startY = e.touches[0].clientY - translateY;
                    } else if (e.touches.length === 2) {
                        isDragging = false;
                        var dx = e.touches[0].clientX - e.touches[1].clientX;
                        var dy = e.touches[0].clientY - e.touches[1].clientY;
                        touchStartDist = Math.sqrt(dx * dx + dy * dy);
                        touchStartScale = scale;
                    }
                }, { passive: true });
                viewport.addEventListener('touchmove', function(e) {
                    if (e.touches.length === 1 && isDragging) {
                        translateX = e.touches[0].clientX - startX;
                        translateY = e.touches[0].clientY - startY;
                        updateTransform();
                    } else if (e.touches.length === 2 && touchStartDist > 0) {
                        var dx = e.touches[0].clientX - e.touches[1].clientX;
                        var dy = e.touches[0].clientY - e.touches[1].clientY;
                        var dist = Math.sqrt(dx * dx + dy * dy);
                        var newScale = Math.min(Math.max(touchStartScale * (dist / touchStartDist), 0.1), 15);
                        scale = newScale;
                        updateTransform();
                    }
                }, { passive: true });
                viewport.addEventListener('touchend', function() {
                    isDragging = false;
                    touchStartDist = 0;
                });

                viewport.addEventListener('dblclick', function(e) {
                    if (e.target.closest('.amc-diagram-btn')) return;
                    if (Math.abs(scale - 1) < 0.1) {
                        fitToViewport();
                    } else {
                        reset1to1();
                    }
                });

                window.addEventListener('keydown', function(e) {
                    if (e.key === 'Escape' && backdrop.classList.contains('active')) {
                        closeModal();
                    }
                });

                document.addEventListener('click', function(e) {
                    var sel = window.getSelection();
                    if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) return;
                    var target = e.target;
                    if (!(target instanceof Element)) return;
                    var container = target.closest('[data-amc-graphviz]');
                    if (!container) return;
                    if (target.closest('a, button, input, select, textarea')) return;
                    var svg = container.querySelector('svg');
                    if (!svg) return;
                    e.preventDefault();
                    e.stopPropagation();
                    openModal(svg);
                });
            })();

            (function() {
                var copyBtn = document.getElementById('amc-copy-btn');
                var copyText = document.getElementById('amc-copy-text');
                if (!copyBtn || !copyText) return;
                copyBtn.addEventListener('click', function() {
                    var content = document.querySelector('.exported-chat-content');
                    if (!content) return;
                    var text = content.innerText || content.textContent || '';
                    function onCopied() {
                        var orig = copyText.textContent;
                        copyText.textContent = ${jsonCopiedText};
                        copyBtn.classList.add('copied');
                        setTimeout(function() {
                            copyText.textContent = orig;
                            copyBtn.classList.remove('copied');
                        }, 1800);
                    }
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(text).then(onCopied).catch(function(copyClipboardError) {
                            fallbackCopy(text, onCopied);
                        });
                    } else {
                        fallbackCopy(text, onCopied);
                    }
                });
                function fallbackCopy(text, cb) {
                    var ta = document.createElement('textarea');
                    ta.value = text;
                    ta.style.position = 'fixed';
                    ta.style.opacity = '0';
                    document.body.appendChild(ta);
                    ta.select();
                    try {
                        document.execCommand('copy');
                        cb();
                    } catch (execCopyError) {}
                    document.body.removeChild(ta);
                }
            })();
            </script>
        </body>
        </html>
    `;
};

export const generateExportTxtTemplate = ({
  title,
  date,
  model,
  messages,
}: {
  title: string;
  date: string;
  model: string;
  messages: Array<{
    role: string;
    timestamp: Date | number | string;
    content?: string;
    thoughts?: string;
    files?: Array<{ name: string }>;
  }>;
}) => {
  const separator = '-'.repeat(40);

  const header = [`Chat: ${title}`, `Date: ${date}`, `Model: ${model}`, '='.repeat(40), ''].join('\n');

  const body = messages
    .map((message) => {
      const roleTitle = message.role.toUpperCase();
      const timestampDate = message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp);
      const timestampText = Number.isNaN(timestampDate.getTime()) ? '' : ` [${timestampDate.toLocaleString()}]`;
      let text = `### ${roleTitle}${timestampText}\n`;

      if (message.files && message.files.length > 0) {
        message.files.forEach((file) => {
          text += `[Attachment: ${file.name}]\n`;
        });
      }

      if (message.thoughts && message.thoughts.trim()) {
        text += `[Thinking Process]\n${message.thoughts.trim()}\n\n`;
      }

      text += message.content || '';
      return text;
    })
    .join(`\n\n${separator}\n\n`);

  return header + body;
};

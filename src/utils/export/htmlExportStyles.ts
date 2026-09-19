interface HtmlExportStylesParams {
  liveArtifactThemeVars: string;
  safeRootBgColor: string;
}

export const buildHtmlExportStyles = ({
  liveArtifactThemeVars,
  safeRootBgColor,
}: HtmlExportStylesParams): string => `
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
`;

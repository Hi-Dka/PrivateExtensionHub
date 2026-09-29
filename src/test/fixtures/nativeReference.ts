/**
 * Machine-readable reference values and parity audit checklist for the
 * systematic native-UI port. Every value traces to the pinned VS Code 1.139.1
 * build or tag (see docs/native-reference-1.139.1.md).
 */

export const REFERENCE_VERSION = '1.139.1';

/** Relative to the repository root; the build is gitignored and may be absent. */
export const REFERENCE_CSS_RELATIVE_PATH = [
    '.vscode-test',
    'vscode-linux-x64-1.139.1',
    'resources',
    'app',
    'out',
    'vs',
    'workbench',
    'workbench.desktop.main.css',
].join('/');

export interface ReferenceValue {
    id: string;
    value: string;
    /** Where the value comes from (selector/source with the pinned reference). */
    provenance: string;
}

export const referenceValues: ReferenceValue[] = [
    // Foundation
    { id: 'row-height', value: '72px', provenance: 'extensionsList.ts EXTENSION_LIST_ELEMENT_HEIGHT' },
    { id: 'base-typography', value: '13px / 1.4em', provenance: '.monaco-workbench' },
    { id: 'action-label', value: '11px, 3px padding, --vscode-cornerRadius-medium', provenance: '.monaco-action-bar .action-label' },
    { id: 'shadow-sm', value: '0 0 4px rgba(0,0,0,.08)', provenance: '.monaco-workbench --vscode-shadow-sm' },
    { id: 'shadow-md', value: '0 0 6px rgba(0,0,0,.08)', provenance: '.monaco-workbench --vscode-shadow-md' },
    { id: 'viewlet-header', value: '41px, padding 5px 12px 6px 20px', provenance: '.extensions-viewlet>.header' },
    { id: 'viewlet-searchbox', value: '28px, padding 4px', provenance: '.extensions-search-container>.search-box' },
    { id: 'viewlet-list-height', value: 'calc(100% - 41px)', provenance: '.extensions-viewlet>.extensions' },
    { id: 'spacing-160', value: '16px', provenance: 'size registry spacing.size160' },
    { id: 'radius-small', value: '4px', provenance: 'size registry cornerRadius.small' },
    { id: 'radius-xsmall', value: '2px', provenance: 'size registry cornerRadius.xSmall' },
    { id: 'weight-semibold', value: '600', provenance: 'size registry fontWeight.semiBold' },

    // Sidebar list item
    { id: 'item-padding-left', value: 'var(--vscode-spacing-size160)', provenance: 'extension.css .extension-list-item' },
    { id: 'icon-size', value: '36px', provenance: 'extension.css .extension-icon .icon' },
    { id: 'icon-margin', value: '16px', provenance: 'extension.css .extension-icon .icon' },
    { id: 'icon-radius', value: '2px', provenance: 'extension.css .extension-icon .icon' },
    { id: 'header-row', value: '20px, padding-right 10px', provenance: 'extension.css .header-container' },
    { id: 'install-count', value: '11px, margin 0 6px 0 auto; hidden when installed', provenance: 'extensionsWidgets.ts InstallCountWidget' },
    { id: 'install-format', value: '>1,000,000 M; >1,000 K', provenance: 'extensionsWidgets.ts getInstallLabel' },
    { id: 'rating-format', value: 'Math.round(r*2)/2; hidden without ratingCount', provenance: 'extensionsWidgets.ts RatingsWidget' },
    { id: 'footer-row', value: '24px, padding-top 2px', provenance: 'extension.css .footer' },
    { id: 'publisher-name', value: '11px, semibold, descriptionForeground', provenance: 'extension.css .publisher-name' },
    { id: 'action-classes', value: 'extension-action label install prominent / update / uninstall', provenance: 'extensionsActions.ts' },
    { id: 'narrow-threshold', value: '<=250px, icon 24px', provenance: 'extensionsViewlet.ts layout(); extension.css .narrow' },

    // Editor
    { id: 'editor-width', value: 'max-width:95%, margin:0 auto', provenance: '.extension-editor' },
    { id: 'editor-header-padding', value: '20px top, 12px bottom, 20px left', provenance: '.extension-editor>.header' },
    { id: 'editor-icon', value: '128px', provenance: '.extension-editor .extension-icon .icon' },
    { id: 'editor-title', value: '26px / 30px, weight 600', provenance: '.title>.name' },
    { id: 'subtitle-separator', value: 'border-right:1px solid rgba(128,128,128,.7), 14px', provenance: '.subtitle-entry' },
    { id: 'editor-navbar', value: '36px + 1px panelSection border', provenance: '.body>.navbar' },
    { id: 'editor-content-height', value: 'calc(100% - 37px)', provenance: '.body>.content' },
    { id: 'editor-content-container', value: 'max-width:75%, margin:0 auto', provenance: '.content-container' },
    { id: 'editor-additional-width', value: '25%, min-width:175px', provenance: '.additional-details-container' },
    { id: 'editor-narrow-threshold', value: 'width < 500px hides additional details', provenance: 'extensionEditor.ts open() layout()' },
    { id: 'info-grid', value: '40% / 60%, gap 6px, 90%', provenance: '.more-info-entry' },
    { id: 'info-zebra', value: '#8282820a odd rows', provenance: '.more-info-entry:nth-child(odd)' },
    { id: 'markdown-padding', value: '0 26px; padding-top 1em', provenance: 'markdown preview html, body' },
    { id: 'markdown-font', value: '14px / 22px', provenance: 'markdown preview --markdown-font-size/-line-height' },
];

export interface AuditChecklistItem {
    id: string;
    surface: 'foundation' | 'sidebar' | 'editor';
    requirement: string;
}

/**
 * In-scope checklist used to compute the parity score. Items listed in
 * `knownDeviations` are excluded from the denominator.
 */
export const auditChecklist: AuditChecklistItem[] = [
    // Foundation
    { id: 'f-ref-governance', surface: 'foundation', requirement: 'Reference paths and values are documented and traced' },
    { id: 'f-base-typography', surface: 'foundation', requirement: 'Body renders at 13px / 1.4em with vscode font variables' },
    { id: 'f-shadows', surface: 'foundation', requirement: 'Workbench shadow variables are re-declared in the webview' },
    { id: 'f-list-states', surface: 'foundation', requirement: 'List hover/selected/focused rules use --vscode-list-* variables' },
    { id: 'f-actionbar', surface: 'foundation', requirement: 'Action-bar base metrics match the reference' },
    { id: 'f-scrollbar', surface: 'foundation', requirement: 'Scrollbars are styled with --vscode-scrollbarSlider-* (approximation)' },
    { id: 'f-viewlet-header', surface: 'foundation', requirement: 'Viewlet header is 41px with reference padding' },
    { id: 'f-viewlet-search', surface: 'foundation', requirement: 'Search box is 28px with reference padding' },
    { id: 'f-inplace-updates', surface: 'foundation', requirement: 'State updates patch the DOM instead of reloading the document' },
    { id: 'f-preserve-scroll', surface: 'foundation', requirement: 'Scroll offset survives state updates' },
    { id: 'f-preserve-focus-input', surface: 'foundation', requirement: 'Focus, input value, and caret survive state updates' },
    { id: 'f-debounce', surface: 'foundation', requirement: 'Search dispatches after 500ms of inactivity' },
    { id: 'f-no-transitions', surface: 'foundation', requirement: 'No non-native CSS transitions animate list states' },
    { id: 'f-hover', surface: 'foundation', requirement: 'Hover uses the managed hover widget' },
    { id: 'f-search-suggestions', surface: 'foundation', requirement: 'Search offers Monaco-style suggestions' },
    { id: 'f-parity-score', surface: 'foundation', requirement: 'Audit score >=98% with documented deviations' },

    // Sidebar
    { id: 's-row-height', surface: 'sidebar', requirement: 'Rows are 72px tall' },
    { id: 's-item-padding', surface: 'sidebar', requirement: 'Item uses 16px left padding token' },
    { id: 's-icon', surface: 'sidebar', requirement: 'Icon is 36px with 16px margin and 2px radius in .extension-icon' },
    { id: 's-icon-fallback', surface: 'sidebar', requirement: 'Default codicon fallback uses the reference structure' },
    { id: 's-header-row', surface: 'sidebar', requirement: 'Header row is 20px with 10px right padding' },
    { id: 's-name-weight', surface: 'sidebar', requirement: 'Name uses the semibold font-weight token' },
    { id: 's-install-hidden', surface: 'sidebar', requirement: 'Install count is hidden for installed extensions' },
    { id: 's-install-format', surface: 'sidebar', requirement: 'Install count uses the reference M/K thresholds' },
    { id: 's-ratings-count', surface: 'sidebar', requirement: 'Ratings hidden without a rating count' },
    { id: 's-ratings-rounding', surface: 'sidebar', requirement: 'Ratings round to halves and render as native values' },
    { id: 's-footer-row', surface: 'sidebar', requirement: 'Footer is 24px with reference padding' },
    { id: 's-publisher', surface: 'sidebar', requirement: 'Publisher uses .publisher-name.ellipsis' },
    { id: 's-slots', surface: 'sidebar', requirement: 'Static widget slots exist (bookmarks, restart, sync, kind, status)' },
    { id: 's-actions-anchor', surface: 'sidebar', requirement: 'Actions are action-bar anchors with reference classes' },
    { id: 's-action-tokens', surface: 'sidebar', requirement: 'Actions use --vscode-extensionButton-* tokens' },
    { id: 's-single-list', surface: 'sidebar', requirement: 'Single list with inline updates and no section headers' },
    { id: 's-loading', surface: 'sidebar', requirement: 'Loading uses native placeholder rows with loading assets' },
    { id: 's-empty', surface: 'sidebar', requirement: 'Empty state uses the reference message container' },
    { id: 's-narrow', surface: 'sidebar', requirement: '<=250px uses 24px icons' },
    { id: 's-wording', surface: 'sidebar', requirement: 'Action and message wording matches the reference' },
    { id: 's-placeholder', surface: 'sidebar', requirement: 'Search placeholder uses the approved registry substitution' },
    { id: 's-context-menu', surface: 'sidebar', requirement: 'Right-click uses the native context menu' },
    { id: 's-grid', surface: 'sidebar', requirement: 'Grid layout is available' },
    { id: 's-marketplace-fields', surface: 'sidebar', requirement: 'Marketplace-only fields (verified publisher, pre-release) render' },
    { id: 's-loading-count', surface: 'sidebar', requirement: 'Loading placeholder rows are sized to the viewport' },

    // Editor
    { id: 'e-tab-labels', surface: 'editor', requirement: 'Tab labels are reference source text, uppercased by CSS' },
    { id: 'e-action-wording', surface: 'editor', requirement: 'Install/Update/Uninstall wording matches the reference' },
    { id: 'e-status', surface: 'editor', requirement: 'Status uses the reference presentation, not custom badges' },
    { id: 'e-header-metrics', surface: 'editor', requirement: 'Header padding/icon/title metrics match the reference' },
    { id: 'e-subtitle-nesting', surface: 'editor', requirement: 'Subtitle entries use reference nesting; identifier moved out' },
    { id: 'e-navbar', surface: 'editor', requirement: 'Navbar is 36px + 1px with reference tab styling' },
    { id: 'e-content-height', surface: 'editor', requirement: 'Content height is calc(100% - 37px)' },
    { id: 'e-content-container', surface: 'editor', requirement: 'Content container is centered with max-width 75%' },
    { id: 'e-additional-width', surface: 'editor', requirement: 'Additional details is 25% with 175px minimum' },
    { id: 'e-additional-narrow', surface: 'editor', requirement: 'Below 500px the additional details column is hidden' },
    { id: 'e-additional-content', surface: 'editor', requirement: 'Sections use 120% titles and 16px spacing with separators' },
    { id: 'e-categories', surface: 'editor', requirement: 'Categories render as reference chips' },
    { id: 'e-info-grid', surface: 'editor', requirement: 'Info entries use the 40/60 grid with zebra rows' },
    { id: 'e-action-tokens', surface: 'editor', requirement: 'Editor actions use extensionButton tokens and anchor classes' },
    { id: 'e-markdown', surface: 'editor', requirement: 'Markdown follows the reference typography and padding' },
    { id: 'e-additional-scope', surface: 'editor', requirement: 'Additional details column renders on every tab' },
    { id: 'e-pre-release', surface: 'editor', requirement: 'Pre-release indicator renders in the title' },
];

export interface KnownDeviation {
    id: string;
    rationale: string;
}

export const knownDeviations: KnownDeviation[] = [
    { id: 'f-hover', rationale: 'title attributes instead of the managed hover widget' },
    { id: 'f-search-suggestions', rationale: 'Monaco SuggestEnabledInput suggestions are not reproducible 1:1' },
    { id: 's-context-menu', rationale: 'In-webview menu approximation; no public API for native menus (audit-and-align-native-ui)' },
    { id: 's-grid', rationale: 'Only the list layout is in scope' },
    { id: 's-marketplace-fields', rationale: 'Open VSX does not expose verified publisher / pre-release / sponsor fields' },
    { id: 's-loading-count', rationale: 'Fixed placeholder count (8) instead of viewport-sized placeholders' },
    { id: 'e-additional-scope', rationale: 'Column scoped to Details tab by audit-and-align-native-ui; native renders it on all tabs' },
    { id: 'e-pre-release', rationale: 'No pre-release flag available in the current data model' },
];

export const PARITY_THRESHOLD = 0.98;

export interface ParityScore {
    passed: number;
    total: number;
    /** passed / total, or 1 when there are no in-scope items. */
    score: number;
    ok: boolean;
}

/**
 * Computes the parity score over in-scope checklist items. Items present in
 * `knownDeviations` are excluded from the denominator; missing results count
 * as failures.
 */
export function computeParityScore(results: Record<string, boolean>): ParityScore {
    const deviationIds = new Set(knownDeviations.map((d) => d.id));
    const inScope = auditChecklist.filter((item) => !deviationIds.has(item.id));
    const passed = inScope.filter((item) => results[item.id] === true).length;
    const total = inScope.length;
    const score = total === 0 ? 1 : passed / total;
    return { passed, total, score, ok: score >= PARITY_THRESHOLD };
}

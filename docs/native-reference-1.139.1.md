# Native UI Reference — VS Code 1.139.1

This document is the source of truth for the systematic native-parity port
(change `systematic-native-ui-parity`). Every in-scope DOM structure, style
value, design token, and user-visible string must trace to one of the pinned
sources below, or be recorded as a known deviation with a rationale.

## Pinned sources

| Source | Path |
|---|---|
| Compiled workbench CSS | `.vscode-test/vscode-linux-x64-1.139.1/resources/app/out/vs/workbench/workbench.desktop.main.css` |
| Compiled workbench JS (runtime rules, size registry) | `.vscode-test/vscode-linux-x64-1.139.1/resources/app/out/vs/workbench/workbench.desktop.main.js` |
| Extension DOM sources | `microsoft/vscode` tag `1.139.1`: `src/vs/workbench/contrib/extensions/browser/extensionsList.ts`, `extensionsWidgets.ts`, `extensionsActions.ts`, `extensionEditor.ts`, `extensionsViewlet.ts` |
| Extension CSS sources | same tag: `media/extension.css`, `media/extensionEditor.css` |
| Markdown preview CSS | `.vscode-test/vscode-linux-x64-1.139.1/resources/app/extensions/markdown-language-features/media/markdown.css` |
| Loading assets | `.vscode-test/vscode-linux-x64-1.139.1/resources/app/out/media/loading{,-dark,-hc}.svg` |

The compiled CSS is minified into few lines. Extract blocks by splitting on
`}` and filtering, for example:

```bash
node -e '
const fs=require("fs");
const css=fs.readFileSync(process.argv[1],"utf8");
for (const b of css.split("}")) if (b.includes(".extension-list-item")) console.log(b+"}");
' .vscode-test/vscode-linux-x64-1.139.1/resources/app/out/vs/workbench/workbench.desktop.main.css
```

## Design tokens (injected into webviews)

The webview theme layer injects every registered theme color plus every
registered size token (`.vscode-test/.../workbench.desktop.main.js`). Webviews
can rely on:

| Token | Value | Source |
|---|---|---|
| `--vscode-spacing-size100` | 10px | size registry |
| `--vscode-spacing-size160` | 16px | size registry |
| `--vscode-cornerRadius-xSmall` | 2px | size registry |
| `--vscode-cornerRadius-small` | 4px | size registry |
| `--vscode-cornerRadius-medium` | 6px | size registry |
| `--vscode-fontWeight-semiBold` | 600 | size registry |

Workbench-local variables are **not** injected and must be re-declared in the
webview stylesheet (`media/native-base.css`), copied from the `.monaco-workbench`
rule: `--vscode-shadow-sm: 0 0 4px rgba(0,0,0,.08)`,
`--vscode-shadow-md: 0 0 6px rgba(0,0,0,.08)`,
`--vscode-shadow-lg: 0 0 12px rgba(0,0,0,.14)`.

## Audited values

### Foundation

| Value | Reference |
|---|---|
| Base typography 13px / 1.4em | `.monaco-workbench{font-size:13px;line-height:1.4em}` |
| Action label: 11px, 3px padding, `--vscode-cornerRadius-medium` | `.monaco-action-bar .action-label` |
| List interaction rules generated at runtime from `--vscode-list-*` | workbench JS (`monaco-list-row:hover:not(.selected):not(.focused)`) |
| List row: `position:absolute; box-sizing:border-box; width:100%` | `.monaco-list-row` base list CSS |
| Viewlet header: 41px, padding `5px 12px 6px 20px` | `.extensions-viewlet>.header` |
| Search box: 28px, padding 4px | `.extensions-search-container>.search-box` |
| List area height `calc(100% - 41px)` | `.extensions-viewlet>.extensions` |
| List item shadow: `--vscode-shadow-sm`, hover `--vscode-shadow-md` | `.extensions-viewlet>.extensions .extension-list-item` |

### Sidebar list item

| Value | Reference |
|---|---|
| Row height 72px | `EXTENSION_LIST_ELEMENT_HEIGHT = 72`, `extensionsList.ts` |
| `.extension-list-item`: `height:100%`, `padding-left:var(--vscode-spacing-size160)` | `extension.css` |
| Icon: 36px, `margin-right:16px`, `border-radius:var(--vscode-cornerRadius-xSmall,2px)` | `.extension-icon .icon` |
| Header row 20px, `padding-right:10px` | `.extension-list-item>.details>.header-container` |
| Name: `var(--vscode-fontWeight-semiBold)`, overflow ellipsis | `extension.css` |
| Install count: 11px, `margin:0 6px 0 auto`, hidden when installed, `M` above 1,000,000 / `K` above 1,000 (strict) | `InstallCountWidget`, `extensionsWidgets.ts` |
| Ratings small: hidden when installed or without `ratingCount`, value `Math.round(r*2)/2`, `span.codicon` + `span.count` | `RatingsWidget`, `extensionsWidgets.ts` |
| Footer 24px, `padding-top:2px`, `padding-right:2px` | `extension.css` |
| Publisher name 11px, semibold, `--vscode-descriptionForeground` | `extension.css` |
| Actions: `a.action-label.extension-action.label` with `install prominent` / `update` / `uninstall`; manage is `extension-action icon manage codicon-gear` | `extensionsActions.ts` |
| Action color tokens: `extensionButton.background/foreground/hoverBackground` derive from `buttonSecondaryBackground/SecondaryForeground/SecondaryHoverBackground`; `extensionButton.prominent*` derives from `button*` | `extensionsActions.ts` (`registerColor`) |
| Action colors `--vscode-extensionButton-*`, radius `--vscode-cornerRadius-small` | compiled CSS (`.action-label.extension-action.label`) |
| Narrow ≤250px: icon 24px, icon container `padding-top:10px` | `extensionsViewlet.ts:740`, `extension.css` |
| Loading: `.extension-list-item.loading` background `loading.svg` (dark/hc variants), icon container hidden | `.extensions-viewlet>.extensions .extension-list-item.loading` |

### Extension editor

| Value | Reference |
|---|---|
| Editor `max-width:95%`, `margin:0 auto` | `.extension-editor` |
| Header padding-top 20px, padding-bottom 12px, padding-left 20px; font-size 14px | `.extension-editor>.header` |
| Icon 128px (image and codicon) | `.extension-editor>.header>.icon-container .extension-icon .icon` |
| Title name 26px/30px, weight 600 | `.title>.name` |
| Title version element renders `pre-release` only for pre-release extensions; no version number in the title | `extensionEditor.ts` (`VersionWidget`), CSS |
| Subtitle padding-top 6px, line-height 20px; entries separated by `border-right:1px solid rgba(128,128,128,.7)`, margin/padding 14px | `.details>.subtitle`, `.subtitle>.subtitle-entry` |
| Subtitle install widget `span.install > span.codicon + span.count` (count `toLocaleString`); ratings widget renders 5 stars plus count | `extensionsWidgets.ts` |
| Description `margin-top:10px`; actions/status `margin-top:10px` | `.details>.description`, `.actions-status-container` |
| Navbar 36px, font 700 14px, line-height 36px, padding-left 20px, `border-bottom:1px solid var(--vscode-panelSection-border)` | `.body>.navbar` |
| Tab label: `padding:0 10px`, 11px, weight 400, uppercase, `--vscode-panelTitle-inactiveForeground`; checked uses `--vscode-panelTitle-activeBorder` / `-activeForeground` | `.navbar .action-label` |
| Content `height:calc(100% - 37px)` | `.body>.content` |
| Content container `max-width:75%`, `margin:0 auto`; narrow below 500px hides additional details | `.content>.details`, `extensionEditor.ts` (`width < 500`) |
| Additional details `width:25%`, `min-width:175px`, content padding 12px | `.additional-details-container` |
| Additional details elements: padding-bottom 16px, non-first padding-top 16px, separator `1px solid rgba(128,128,128,.22)`, title 120% with padding-bottom 12px | `.additional-details-element` |
| Category chip: `border:1px solid rgba(136,136,136,.45)`, padding 2px 4px, radius 2px, font 90%, margin `0 6px 3px 0` | `.categories>.category` |
| Resources row: padding 2px 4px, link padding-left 4px | `.resources>.resource` |
| Info grid: `grid-template-columns:40% 60%`, gap 6px, font 90%, padding 2px 4px, odd rows `#8282820a` | `.more-info-entry` |
| Status line-height 22px, font-size 90%, margin-top 3px | `.actions-status-container>.status` |

### Markdown presentation (README / changelog)

| Value | Reference |
|---|---|
| `padding:0 26px`, `padding-top:1em`, font-size 14px, line-height 22px | `html,body` in markdown preview CSS |
| Headings: weight 600, margin-top 24px, margin-bottom 16px, line-height 1.25; h1 2em, h2 1.5em (both with 1px bottom border), h3 1.25em, h4 1em, h5 .875em, h6 .85em | markdown preview CSS |
| Paragraph margin-bottom 16px; list margin-bottom 0.7em | markdown preview CSS |
| Table: border-collapse, th/td padding 5px 10px, th border-bottom, `tbody tr+tr td` border-top | markdown preview CSS |
| Blockquote: border-left 5px, padding `0 16px 0 10px`, radius 2px | markdown preview CSS |
| Code: editor font, 1em, line-height 1.357em; pre padding 16px, radius 3px, background `--vscode-textCodeBlock-background`, border `--vscode-widget-border` | markdown preview CSS |

## Wording

| UI string | Reference |
|---|---|
| Tabs | `Details`, `Features`, `Changelog`, `Dependencies` (uppercased by CSS) — `extensionEditor.ts` |
| Install | `Install` |
| Update (list) | `Update` |
| Update (editor, verbose) | `Update to v{0}` |
| Uninstall | `Uninstall` |
| Manage | `Manage Extension` |
| Installed status | `Installed` |
| Install another version | `Install Specific Version...` (`localize('install another version', ...)`) |
| Copy identifier | `Copy Extension ID` |
| Download VSIX | `Download VSIX` |
| Search placeholder | `Search Extensions in Marketplace` (registry substitution below) |
| Empty list | `No extensions found.` |

**Registry substitution**: this extension targets Open VSX, so the search
placeholder reads `Search Extensions in Open VSX`. This is the only approved
wording substitution; everything else matches the reference verbatim.

## Known deviations

These are excluded from the parity score with the rationale recorded here.

| Deviation | Rationale |
|---|---|
| Scrollbars are Chrome scrollbars styled with `--vscode-scrollbarSlider-*` | The native `monaco-scrollable-element` is a runtime widget; porting its physics is out of scope |
| Hover uses `title` attributes instead of the managed hover widget | Native hover is a workbench widget with delays/positioning; deferred |
| Context menu is an in-webview approximation | No public API exposes native context menus; owned by `audit-and-align-native-ui` |
| Search suggestions (`@installed`, `@updates`, …) are not offered | Monaco `SuggestEnabledInput` cannot be reproduced 1:1 |
| Grid layout is not implemented | Only the list layout is in scope |
| Marketplace-only fields (verified publisher, pre-release, sponsor, `iconUrlFallback`) are unavailable from Open VSX | Data-source limitation |
| Additional-details column is rendered only on the Details tab | Owned by `audit-and-align-native-ui`; native 1.139.1 renders the column on every tab. Flagged for a follow-up correction |
| Loading placeholder count is a fixed heuristic (8 rows) | Native sizes placeholders to the viewport |
| No pre-release indicator in the editor title | Open VSX data does not expose a pre-release flag in this codebase |

## Re-audit policy

When the pinned VS Code version changes (target engine, `.vscode-test` build,
or `microsoft/vscode` tag), re-run this audit before accepting the change:

1. Re-extract the values in the tables above from the new build.
2. Update `src/test/fixtures/nativeReference.ts` and this document.
3. Re-run the unit suite (`npm run test:unit`) and the manual parity checklist
   (themes, widths 249/250/499/500px, extension states).
4. Record any new deviation with a rationale before lowering a score.

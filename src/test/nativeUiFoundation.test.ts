import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import {
    auditChecklist,
    computeParityScore,
    knownDeviations,
    PARITY_THRESHOLD,
    REFERENCE_CSS_RELATIVE_PATH,
    referenceValues,
} from './fixtures/nativeReference';
import {
    isWithinExtensionRoot,
    mediaAssetFsPath,
    NATIVE_LOADING_ASSETS,
} from '../ui/webviewAssets';
import {
    getFallbackNativeBaseCss,
    getFallbackSidebarCss,
    getSidebarViewHtml,
} from '../ui/sidebarViewHtml';
import { ExtensionSidebarViewProvider } from '../ui/ExtensionSidebarViewProvider';

const repoRoot = path.join(__dirname, '..', '..');
const referenceCssPath = path.join(repoRoot, REFERENCE_CSS_RELATIVE_PATH);

suite('Native UI Foundation Test Suite', () => {
    suite('Reference Fixtures & Parity Score', () => {
        test('audit checklist and known deviations are well formed', () => {
            assert.ok(referenceValues.length >= 30);
            assert.ok(auditChecklist.length >= 50);

            const itemIds = new Set(auditChecklist.map((item) => item.id));
            for (const deviation of knownDeviations) {
                assert.ok(
                    itemIds.has(deviation.id),
                    `deviation ${deviation.id} must reference a checklist item`,
                );
                assert.ok(deviation.rationale.length > 10);
            }
        });

        test('a fully passing audit meets the 98% bar and records deviations', () => {
            const results: Record<string, boolean> = {};
            for (const item of auditChecklist) {
                results[item.id] = true;
            }
            const score = computeParityScore(results);
            assert.strictEqual(score.total, auditChecklist.length - knownDeviations.length);
            assert.strictEqual(score.passed, score.total);
            assert.strictEqual(score.score, 1);
            assert.strictEqual(score.ok, true);
        });

        test('one failure in the in-scope set still passes; two failures fail the bar', () => {
            const inScope = auditChecklist.filter(
                (item) => !knownDeviations.some((deviation) => deviation.id === item.id),
            );
            const results: Record<string, boolean> = {};
            inScope.forEach((item, index) => {
                results[item.id] = index !== 0;
            });
            const oneFailure = computeParityScore(results);
            assert.strictEqual(oneFailure.passed, oneFailure.total - 1);
            assert.ok(oneFailure.score >= PARITY_THRESHOLD);
            assert.strictEqual(oneFailure.ok, true);

            results[inScope[1].id] = false;
            const twoFailures = computeParityScore(results);
            assert.ok(twoFailures.score < PARITY_THRESHOLD);
            assert.strictEqual(twoFailures.ok, false);
        });

        test('missing results count as failures', () => {
            const score = computeParityScore({});
            assert.strictEqual(score.passed, 0);
            assert.strictEqual(score.ok, false);
        });
    });

    suite('Reference Build Traceability', () => {
        test('documented values exist in the pinned workbench stylesheet', () => {
            if (!fs.existsSync(referenceCssPath)) {
                // The reference build is gitignored; skip when unavailable.
                return;
            }
            const css = fs.readFileSync(referenceCssPath, 'utf8');
            const expected = [
                '--vscode-spacing-size160',
                'font-size:26px',
                'line-height:30px',
                'max-width:95%',
                'max-width:75%',
                'height:36px',
                'width:25%',
                'min-width:175px',
                'height:41px',
                'height:calc(100% - 41px)',
                'height:calc(100% - 37px)',
                'padding-top:20px;padding-bottom:12px;padding-left:20px',
                'padding:5px 12px 6px 20px',
                'border-right:1px solid rgba(128,128,128,.7)',
                'grid-template-columns:40% 60%',
                'border-radius:var(--vscode-cornerRadius-xSmall)',
            ];
            for (const value of expected) {
                assert.ok(css.includes(value), `reference CSS should contain: ${value}`);
            }
        });

        test('the reference document exists and pins the version', () => {
            const docPath = path.join(repoRoot, 'docs', 'native-reference-1.139.1.md');
            assert.ok(fs.existsSync(docPath));
            const doc = fs.readFileSync(docPath, 'utf8');
            assert.ok(doc.includes('1.139.1'));
            assert.ok(doc.includes('Re-audit policy'));
            assert.ok(doc.includes('Known deviations'));
        });
    });

    suite('Vendored Reference Assets', () => {
        test('loading assets exist and resolve inside the extension root', () => {
            for (const asset of NATIVE_LOADING_ASSETS) {
                const assetPath = mediaAssetFsPath(repoRoot, asset);
                assert.ok(fs.existsSync(assetPath), `${asset} should exist at ${assetPath}`);
                assert.ok(isWithinExtensionRoot(repoRoot, assetPath));
            }
            assert.ok(!isWithinExtensionRoot(repoRoot, path.join(repoRoot, '..', 'outside.svg')));
        });

        test('sidebar stylesheet references every loading asset', () => {
            const css = getFallbackSidebarCss();
            assert.ok(css.includes('url("./loading.svg")'));
            assert.ok(css.includes('url("./loading-dark.svg")'));
            assert.ok(css.includes('url("./loading-hc.svg")'));
        });

        test('loading state renders native placeholder rows and allows the assets in CSP', () => {
            const html = getSidebarViewHtml({ isLoading: true, cspSource: 'vscode-webview:' });
            assert.ok(html.includes('extension-list-item loading'));
            assert.ok(html.includes('__loading_0'));
            assert.ok(html.includes('img-src vscode-webview:'));
        });

        test('provider grants the extension root to webview resources', async () => {
            const fakeExtensionUri = { path: '/tmp/extension' } as any;
            const provider = new ExtensionSidebarViewProvider(
                fakeExtensionUri,
                { getInstalledExtensions: () => [], checkUpdate: async () => ({ hasUpdate: false }) } as any,
                { search: async () => ({ extensions: [], total: 0 }) } as any,
            );
            const options: any = {};
            const view = {
                visible: true,
                webview: {
                    html: '',
                    cspSource: 'vscode-webview:',
                    options,
                    onDidReceiveMessage: () => ({ dispose: () => {} }),
                    postMessage: async () => true,
                    asWebviewUri: (uri: any) => uri,
                },
                onDidChangeVisibility: () => ({ dispose: () => {} }),
            };
            provider.resolveWebviewView(view as any, {} as any, {} as any);
            assert.ok(Array.isArray(view.webview.options.localResourceRoots));
            assert.ok(view.webview.options.localResourceRoots.includes(fakeExtensionUri));
        });
    });

    suite('Native Base Stylesheet', () => {
        test('defines the reference foundation values', () => {
            const css = getFallbackNativeBaseCss();
            assert.ok(css.includes('font-size: 13px;'));
            assert.ok(css.includes('line-height: 1.4em;'));
            assert.ok(css.includes('--vscode-shadow-sm: 0 0 4px rgba(0, 0, 0, 0.08);'));
            assert.ok(css.includes('--vscode-shadow-md: 0 0 6px rgba(0, 0, 0, 0.08);'));
            assert.ok(css.includes('--vscode-shadow-lg: 0 0 12px rgba(0, 0, 0, 0.14);'));
            assert.ok(css.includes('--vscode-cornerRadius-medium'));
            assert.ok(css.includes('--vscode-extensionButton-prominentBackground'));
            assert.ok(css.includes('--vscode-extensionButton-hoverBackground'));
            assert.ok(css.includes('font-size: 11px;'));
            assert.ok(css.includes('.monaco-list-row'));
        });

        test('list interaction states use theme variables with no literal colors', () => {
            const css = getFallbackNativeBaseCss();
            const start = css.indexOf('Native list interaction states');
            const end = css.indexOf('action bar', start);
            assert.ok(start > -1 && end > start);
            const states = css.slice(start, end);
            assert.ok(states.includes('var(--vscode-list-hoverBackground)'));
            assert.ok(states.includes('var(--vscode-list-inactiveSelectionBackground)'));
            assert.ok(states.includes('var(--vscode-list-activeSelectionBackground)'));
            assert.ok(states.includes('var(--vscode-list-focusOutline)'));
            assert.ok(!states.includes('#'));
        });

        test('scrollbars are styled with slider tokens', () => {
            const css = getFallbackNativeBaseCss();
            assert.ok(css.includes('::-webkit-scrollbar-thumb'));
            assert.ok(css.includes('var(--vscode-scrollbarSlider-background)'));
            assert.ok(css.includes('var(--vscode-scrollbarSlider-hoverBackground)'));
            assert.ok(css.includes('var(--vscode-scrollbarSlider-activeBackground)'));
        });
    });
});

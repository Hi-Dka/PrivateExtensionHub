import * as assert from 'assert';
import {
    applyRowPatch,
    computeRowPatch,
    formatInstallCount,
    formatRating,
    getFallbackSidebarCss,
    getSidebarEmptyMessage,
    getSidebarViewHtml,
    renderExtensionCard,
    renderSidebarRows,
    RowPatchState,
    SidebarExtensionItem,
    SidebarRow,
    SidebarViewData,
} from '../ui/sidebarViewHtml';
import {
    ExtensionSidebarViewProvider,
    SidebarWebviewMessage,
} from '../ui/ExtensionSidebarViewProvider';
import { ExtensionInfo } from '../models/index';
import { ExtensionManager, IVscodeHost } from '../extension/ExtensionManager';
import { ExtensionRepository } from '../repository/ExtensionRepository';

function waitFor(predicate: () => boolean, timeoutMs = 500): Promise<void> {
    return new Promise((resolve, reject) => {
        const started = Date.now();
        const tick = () => {
            if (predicate()) {
                resolve();
            } else if (Date.now() - started > timeoutMs) {
                reject(new Error('waitFor timeout'));
            } else {
                setTimeout(tick, 5);
            }
        };
        tick();
    });
}

suite('Sidebar View & ExtensionSidebarViewProvider Test Suite', () => {
    const mockExtension: ExtensionInfo = {
        id: 'publisher.sample-ext',
        namespace: 'publisher',
        name: 'sample-ext',
        displayName: 'Sample Extension',
        version: '1.0.0',
        description: 'Sample description for unit testing',
        iconUrl: 'https://example.com/sample-icon.png',
        downloadCount: 42500,
        rating: 4.8,
        ratingCount: 16,
    };

    suite('Sidebar Formatters Tests', () => {
        test('formatInstallCount should follow native thresholds (strictly greater than)', () => {
            assert.strictEqual(formatInstallCount(0), '');
            assert.strictEqual(formatInstallCount(undefined), '');
            assert.strictEqual(formatInstallCount(850), '850');
            assert.strictEqual(formatInstallCount(1000), '1000');
            assert.strictEqual(formatInstallCount(1001), '1K');
            assert.strictEqual(formatInstallCount(42500), '42K');
            assert.strictEqual(formatInstallCount(1000000), '1000K');
            assert.strictEqual(formatInstallCount(1250000), '1.2M');
        });

        test('formatRating should round to halves like the native RatingsWidget', () => {
            assert.strictEqual(formatRating(undefined), '');
            assert.strictEqual(formatRating(0), '');
            assert.strictEqual(formatRating(4.8), '5');
            assert.strictEqual(formatRating(5), '5');
            assert.strictEqual(formatRating(4.2), '4');
            assert.strictEqual(formatRating(4.25), '4.5');
        });
    });

    suite('Sidebar HTML Rendering Tests', () => {
        test('renderExtensionCard should render the native list item skeleton with static widget slots', () => {
            const item: SidebarExtensionItem = {
                info: mockExtension,
                isInstalled: false,
                hasUpdate: false,
            };

            const html = renderExtensionCard(item, 72);
            // 官方 DOM 结构
            assert.ok(html.includes('class="monaco-list-row"'));
            assert.ok(html.includes('style="top: 72px;"'));
            assert.ok(html.includes('class="extension-bookmark-container"'));
            assert.ok(html.includes('class="extension-list-item"'));
            assert.ok(html.includes('class="icon-container"'));
            assert.ok(html.includes('class="extension-icon"'));
            assert.ok(html.includes('class="icon"'));
            assert.ok(html.includes('class="codicon codicon-extensions"'));
            assert.ok(html.includes('class="details"'));
            assert.ok(html.includes('class="header-container"'));
            assert.ok(html.includes('class="header"'));
            assert.ok(html.includes('class="restart-required"'));
            assert.ok(html.includes('class="install-count"'));
            assert.ok(html.includes('class="ratings extension-ratings small"'));
            assert.ok(html.includes('class="sync-ignored"'));
            assert.ok(html.includes('class="extension-kind-indicator"'));
            assert.ok(html.includes('class="activation-status"'));
            assert.ok(html.includes('class="description ellipsis"'));
            assert.ok(html.includes('class="footer"'));
            assert.ok(html.includes('class="publisher-container"'));
            assert.ok(html.includes('class="publisher-name ellipsis"'));
            assert.ok(html.includes('class="monaco-action-bar"'));
            assert.ok(html.includes('class="actions-container"'));

            // 第一行：显示名 + 下载量 + 评分 (Codicons 渲染)
            assert.ok(html.includes('Sample Extension'));
            assert.ok(html.includes('codicon-cloud-download'));
            assert.ok(html.includes('42K'));
            assert.ok(html.includes('codicon-star-full'));
            assert.ok(html.includes('>5<'));

            // 第二行：单行描述
            assert.ok(html.includes('Sample description for unit testing'));

            // 图标与标识
            assert.ok(html.includes('src="https://example.com/sample-icon.png"'));
            assert.ok(html.includes('data-extension-id="publisher.sample-ext"'));
            assert.ok(!html.includes('icon-fallback'));
        });

        test('renderExtensionCard should hide install count and ratings for installed extensions', () => {
            const installed: SidebarExtensionItem = {
                info: mockExtension,
                isInstalled: true,
                installedVersion: '1.0.0',
                hasUpdate: false,
            };

            const html = renderExtensionCard(installed);
            assert.ok(!html.includes('codicon-cloud-download'));
            assert.ok(!html.includes('42K'));
            assert.ok(!html.includes('codicon-star-full'));

            const noRatingCount: SidebarExtensionItem = {
                info: { ...mockExtension, ratingCount: undefined },
                isInstalled: false,
                hasUpdate: false,
            };
            const htmlNoCount = renderExtensionCard(noRatingCount);
            assert.ok(!htmlNoCount.includes('codicon-star-full'));
            assert.ok(htmlNoCount.includes('codicon-cloud-download'));
        });

        test('renderExtensionCard should render native action anchors with reference classes', () => {
            const notInstalled = renderExtensionCard({
                info: mockExtension,
                isInstalled: false,
                hasUpdate: false,
            });
            assert.ok(notInstalled.includes('class="action-label extension-action label install prominent"'));
            assert.ok(notInstalled.includes('>Install</a>'));

            const update = renderExtensionCard({
                info: mockExtension,
                isInstalled: true,
                installedVersion: '1.0.0',
                hasUpdate: true,
                latestVersion: '1.2.0',
            });
            assert.ok(update.includes('class="action-label extension-action label update"'));
            assert.ok(update.includes('data-action="update"'));
            assert.ok(update.includes('data-version="1.2.0"'));
            assert.ok(update.includes('>Update</a>'));
            assert.ok(update.includes('extension-action icon manage codicon codicon-gear'));
            assert.ok(update.includes('title="Manage Extension"'));

            const installed = renderExtensionCard({
                info: mockExtension,
                isInstalled: true,
                installedVersion: '1.0.0',
                hasUpdate: false,
            });
            assert.ok(!installed.includes('data-action="install"'));
            assert.ok(!installed.includes('data-action="update"'));
            assert.ok(installed.includes('data-action="manage"'));
        });

        test('renderSidebarRows should produce a single native list with inline updates', () => {
            const data: SidebarViewData = {
                installed: [
                    { info: mockExtension, isInstalled: true, installedVersion: '1.0.0', hasUpdate: true, latestVersion: '2.0.0' },
                    { info: { ...mockExtension, id: 'other.ext', name: 'ext', displayName: 'Other' }, isInstalled: true, hasUpdate: false },
                ],
                updates: [{ info: mockExtension, isInstalled: true, hasUpdate: true, latestVersion: '2.0.0' }],
            };

            const rows = renderSidebarRows(data);
            assert.strictEqual(rows.length, 2);
            assert.strictEqual(rows[0].id, 'publisher.sample-ext');
            assert.ok(rows[0].html.includes('data-action="update"'));
            assert.ok(!rows[0].html.includes('section-header'));
        });

        test('renderSidebarRows should produce native loading placeholder rows', () => {
            const rows = renderSidebarRows({ isLoading: true });
            assert.strictEqual(rows.length, 8);
            assert.ok(rows[0].html.includes('extension-list-item loading'));
            assert.ok(rows[0].html.includes('__loading_0'));
            assert.strictEqual(getSidebarEmptyMessage({ isLoading: true }), null);
        });

        test('getSidebarViewHtml should render native viewlet structure, wording, and empty state', () => {
            const html = getSidebarViewHtml({
                searchQuery: '',
                isSearching: false,
                installed: [{ info: mockExtension, isInstalled: true, hasUpdate: false }],
                cspSource: 'vscode-webview:',
                nonce: 'test-nonce-123',
            });

            assert.ok(html.includes('id="searchInput"'));
            assert.ok(html.includes('placeholder="Search Extensions in Open VSX"'));
            assert.ok(html.includes('class="extensions-viewlet"'));
            assert.ok(html.includes('class="extensions"'));
            assert.ok(html.includes('class="monaco-list"'));
            assert.ok(html.includes('class="monaco-list-rows"'));
            assert.ok(html.includes('Sample Extension'));
            assert.ok(!html.includes('section-header'));
            assert.ok(!html.includes('spinner'));
            assert.ok(html.includes('nonce-test-nonce-123'));
        });

        test('getSidebarViewHtml should render the empty message container when the list is empty', () => {
            const html = getSidebarViewHtml({ installed: [] });
            assert.ok(html.includes('id="emptyState"'));
            assert.ok(html.includes('No extensions found.'));
            assert.strictEqual(getSidebarEmptyMessage({ installed: [] }), 'No extensions found.');
            assert.strictEqual(
                getSidebarEmptyMessage({ isSearching: true, searchResults: [{ info: mockExtension, isInstalled: false, hasUpdate: false }] }),
                null,
            );
        });

        test('getSidebarViewHtml should render search results in the same single list', () => {
            const html = getSidebarViewHtml({
                searchQuery: 'sample',
                isSearching: true,
                searchResults: [{ info: mockExtension, isInstalled: false, hasUpdate: false }],
            });
            assert.ok(html.includes('value="sample"'));
            assert.ok(html.includes('Sample Extension'));
            assert.ok(!html.includes('section-header'));
        });

        test('getSidebarViewHtml should load the native base stylesheet before the sidebar stylesheet', () => {
            const html = getSidebarViewHtml({
                cspSource: 'vscode-webview:',
                nativeBaseCssUri: 'vscode-webview://media/native-base.css',
                sidebarCssUri: 'vscode-webview://media/sidebar.css',
            });
            const baseIndex = html.indexOf('native-base.css');
            const sidebarIndex = html.indexOf('media/sidebar.css');
            assert.ok(baseIndex > -1 && sidebarIndex > -1);
            assert.ok(baseIndex < sidebarIndex);
            assert.ok(html.includes('font-src vscode-webview:'));
        });

        test('media/sidebar.css should match official extension.css layout rules', () => {
            const css = getFallbackSidebarCss();
            assert.ok(css.includes('--vscode-sideBar-background'));
            assert.ok(css.includes('padding: 0 0 0 var(--vscode-spacing-size160);'));
            assert.ok(css.includes('--vscode-fontWeight-semiBold'));
            assert.ok(css.includes('height: 20px;'));
            assert.ok(css.includes('height: 24px;'));
            assert.ok(css.includes('width: 36px;'));
            assert.ok(css.includes('max-width: 150px;'));
            assert.ok(css.includes('margin-left: 6px;'));
            assert.ok(css.includes('@media (max-width: 250px)'));
            assert.ok(css.includes('url("./loading.svg")'));
            assert.ok(css.includes('.message-container'));
            assert.ok(!css.includes('.section-header'));
            assert.ok(!css.includes('spinner'));
        });
    });

    suite('Keyed Row Patch Tests', () => {
        const row = (id: string, html?: string): SidebarRow => ({ id, html: html ?? `<div>${id}</div>` });

        test('computeRowPatch should insert, remove, move, and replace by row id', () => {
            // insert
            let ops = computeRowPatch([row('a')], [row('a'), row('b')]);
            assert.deepStrictEqual(ops, [{ op: 'insert', id: 'b', index: 1, html: row('b').html }]);

            // remove
            ops = computeRowPatch([row('a'), row('b')], [row('a')]);
            assert.deepStrictEqual(ops, [{ op: 'remove', id: 'b' }]);

            // move (reorder)
            ops = computeRowPatch([row('a'), row('b'), row('c')], [row('c'), row('a'), row('b')]);
            assert.deepStrictEqual(ops, [{ op: 'move', id: 'c', index: 0 }]);

            // replace (html changed)
            ops = computeRowPatch([row('a', '<div>old</div>')], [row('a', '<div>new</div>')]);
            assert.deepStrictEqual(ops, [{ op: 'replace', id: 'a', html: '<div>new</div>' }]);

            // no-op
            ops = computeRowPatch([row('a')], [row('a')]);
            assert.deepStrictEqual(ops, []);
        });

        test('applyRowPatch should transform rows into the target order', () => {
            const current = [row('a'), row('b'), row('c')];
            const next = [row('c', '<div>c2</div>'), row('d'), row('a')];
            const ops = computeRowPatch(current, next);
            const state: RowPatchState = { scrollTop: 0, focusedId: null, inputValue: '', caret: 0 };
            const result = applyRowPatch(current, ops, state);
            assert.deepStrictEqual(result.rows, next);
        });

        test('applyRowPatch should preserve scroll, focus, input, and caret mid-typing', () => {
            const current = [row('a'), row('b')];
            const next = [row('a', '<div>a-updated</div>'), row('b')];
            const ops = computeRowPatch(current, next);
            const state: RowPatchState = {
                scrollTop: 540,
                focusedId: 'a',
                inputValue: 'sampl',
                caret: 5,
            };

            const result = applyRowPatch(current, ops, state);
            assert.strictEqual(result.state.scrollTop, 540);
            assert.strictEqual(result.state.focusedId, 'a');
            assert.strictEqual(result.state.inputValue, 'sampl');
            assert.strictEqual(result.state.caret, 5);
        });

        test('applyRowPatch should clear focus only when the focused row disappears', () => {
            const current = [row('a'), row('b')];
            const ops = computeRowPatch(current, [row('b')]);
            const result = applyRowPatch(current, ops, {
                scrollTop: 100,
                focusedId: 'a',
                inputValue: 'que',
                caret: 3,
            });
            assert.strictEqual(result.state.focusedId, null);
            assert.strictEqual(result.state.inputValue, 'que');
            assert.strictEqual(result.state.scrollTop, 100);
        });
    });

    suite('ExtensionSidebarViewProvider Messaging & State Tests', () => {
        function createMockWebviewView() {
            let messageListener: ((msg: any) => void) | null = null;
            let visibilityListener: (() => void) | null = null;
            const posted: any[] = [];

            return {
                viewType: ExtensionSidebarViewProvider.viewType,
                visible: true,
                webview: {
                    html: '',
                    cspSource: 'vscode-webview:',
                    options: {},
                    onDidReceiveMessage: (listener: (msg: any) => void) => {
                        messageListener = listener;
                        return { dispose: () => {} };
                    },
                    postMessage: async (msg: any) => {
                        posted.push(msg);
                        return true;
                    },
                    asWebviewUri: (uri: any) => uri,
                },
                onDidChangeVisibility: (listener: () => void) => {
                    visibilityListener = listener;
                    return { dispose: () => {} };
                },
                getPosted: () => posted,
                simulateMessage: async (msg: SidebarWebviewMessage) => {
                    if (messageListener) {
                        await messageListener(msg);
                    }
                },
            };
        }

        function createMockRepo(overrides: Partial<ExtensionRepository> = {}): ExtensionRepository {
            return {
                getExtension: async () => mockExtension,
                getReadme: async () => '',
                getVersions: async () => ['1.0.0', '1.1.0'],
                search: async () => ({ extensions: [mockExtension], total: 1 }),
                getDownloadUrl: async () => '',
                getChangelog: async () => undefined,
                getManifest: async () => undefined,
                ...overrides,
            } as ExtensionRepository;
        }

        test('should resolve, render the initial document once, and reset on ready', async () => {
            const mockHost: IVscodeHost = {
                getAllExtensions: () => [{ id: mockExtension.id, packageJSON: { version: '1.0.0' } }],
                executeCommand: async () => undefined,
            };

            const provider = new ExtensionSidebarViewProvider(
                undefined,
                new ExtensionManager(createMockRepo(), mockHost),
                createMockRepo(),
            );

            const mockView = createMockWebviewView() as any;
            provider.resolveWebviewView(mockView, {} as any, {} as any);
            await provider.refresh();

            const initialHtml = mockView.webview.html;
            assert.ok(initialHtml.includes('id="listRows"'));

            // ready handshake sends a full reset (rows) without reassigning the document
            await mockView.simulateMessage({ command: 'ready' });
            const resets = mockView.getPosted().filter((m: any) => m.type === 'sidebarReset');
            assert.strictEqual(resets.length, 1);
            assert.strictEqual(resets[0].rows.length, 1);
            assert.strictEqual(resets[0].rows[0].id, 'publisher.sample-ext');
            assert.ok(resets[0].rows[0].html.includes('data-extension-id="publisher.sample-ext"'));
            assert.strictEqual(mockView.webview.html, initialHtml);
        });

        test('should send in-place patches for subsequent state updates', async () => {
            const mockHost: IVscodeHost = {
                getAllExtensions: () => [{ id: mockExtension.id, packageJSON: { version: '1.0.0' } }],
                executeCommand: async () => undefined,
            };

            const provider = new ExtensionSidebarViewProvider(
                undefined,
                new ExtensionManager(createMockRepo(), mockHost),
                createMockRepo(),
            );

            const mockView = createMockWebviewView() as any;
            provider.resolveWebviewView(mockView, {} as any, {} as any);
            await provider.refresh();
            const initialHtml = mockView.webview.html;

            provider.searchDebounceMs = 0;
            await provider.performSearch('sample');

            const patches = mockView.getPosted().filter((m: any) => m.type === 'sidebarPatch');
            assert.ok(patches.length > 0);
            assert.strictEqual(mockView.webview.html, initialHtml);
        });

        test('should debounce rapid search input into a single search request', async () => {
            let searchCalls = 0;
            const repo = createMockRepo({
                search: async (q: string) => {
                    searchCalls++;
                    return { extensions: [mockExtension], total: 1 };
                },
            });
            const mockHost: IVscodeHost = {
                getAllExtensions: () => [],
                executeCommand: async () => undefined,
            };

            const provider = new ExtensionSidebarViewProvider(
                undefined,
                new ExtensionManager(repo, mockHost),
                repo,
            );
            provider.searchDebounceMs = 10;

            const mockView = createMockWebviewView() as any;
            provider.resolveWebviewView(mockView, {} as any, {} as any);

            void provider.handleMessage({ command: 'search', query: 'a' });
            void provider.handleMessage({ command: 'search', query: 'ab' });
            void provider.handleMessage({ command: 'search', query: 'abc' });

            await waitFor(() => provider.getSearchResults().length === 1);
            assert.strictEqual(searchCalls, 1);
            assert.strictEqual(provider.getSearchQuery(), 'abc');
            assert.strictEqual(provider.getIsSearching(), true);
        });

        test('should clear search and cancel pending searches', async () => {
            const repo = createMockRepo();
            const mockHost: IVscodeHost = {
                getAllExtensions: () => [],
                executeCommand: async () => undefined,
            };
            const provider = new ExtensionSidebarViewProvider(
                undefined,
                new ExtensionManager(repo, mockHost),
                repo,
            );
            provider.searchDebounceMs = 10;

            const mockView = createMockWebviewView() as any;
            provider.resolveWebviewView(mockView, {} as any, {} as any);

            void provider.handleMessage({ command: 'search', query: 'pending' });
            await provider.handleMessage({ command: 'clearSearch' });

            assert.strictEqual(provider.getIsSearching(), false);
            assert.strictEqual(provider.getSearchQuery(), '');
            await new Promise((resolve) => setTimeout(resolve, 30));
            assert.strictEqual(provider.getSearchResults().length, 0);
        });

        test('should dispatch install, uninstall, and update messages correctly', async () => {
            let installedNs = '';
            let installedName = '';
            let installedVer = '';
            let uninstalledId = '';

            const mockHost: IVscodeHost = {
                getAllExtensions: () => [],
                executeCommand: async () => undefined,
            };

            const repo = createMockRepo();
            const manager = new ExtensionManager(repo, mockHost);
            manager.install = async (ns, name, ver) => {
                installedNs = ns;
                installedName = name;
                installedVer = ver || '';
            };
            manager.uninstall = async (id) => {
                uninstalledId = id;
            };

            const provider = new ExtensionSidebarViewProvider(undefined, manager, repo);
            const mockView = createMockWebviewView() as any;
            provider.resolveWebviewView(mockView, {} as any, {} as any);

            await provider.handleMessage({ command: 'install', id: mockExtension.id, version: '1.0.0' });
            assert.strictEqual(installedNs, 'publisher');
            assert.strictEqual(installedName, 'sample-ext');
            assert.strictEqual(installedVer, '1.0.0');

            await provider.handleMessage({ command: 'update', id: mockExtension.id, version: '1.1.0' });
            assert.strictEqual(installedVer, '1.1.0');

            await provider.handleMessage({ command: 'uninstall', id: mockExtension.id });
            assert.strictEqual(uninstalledId, mockExtension.id);
        });

        test('renderExtensionCard should render dataset attributes for contextmenu detection', () => {
            const item: SidebarExtensionItem = {
                info: mockExtension,
                isInstalled: true,
                installedVersion: '1.0.0',
                hasUpdate: true,
                latestVersion: '1.2.0',
            };

            const html = renderExtensionCard(item);
            assert.ok(html.includes('data-extension-id="publisher.sample-ext"'));
            assert.ok(html.includes('data-installed="true"'));
            assert.ok(html.includes('data-has-update="true"'));
            assert.ok(html.includes('data-version="1.2.0"'));
        });

        test('getSidebarViewHtml should render native context menu container and client-side scripts', () => {
            const html = getSidebarViewHtml({
                searchQuery: '',
                isSearching: false,
                searchResults: [],
            });

            assert.ok(html.includes('id="contextMenuContainer"'));
            assert.ok(html.includes('id="contextMenuList"'));
            assert.ok(html.includes('class="monaco-menu-container"'));

            assert.ok(html.includes("addEventListener('contextmenu'"));
            assert.ok(html.includes("addEventListener('keydown'"));
            assert.ok(html.includes('data-menu-action="'));
            assert.ok(html.includes("'installAnotherVersion'"));
            assert.ok(html.includes("'downloadVsix'"));
            assert.ok(html.includes("'copyId'"));
            assert.ok(html.includes("'Install Specific Version...'"));
            assert.ok(html.includes("'Copy Extension ID'"));
            assert.ok(html.includes("'Download VSIX'"));
        });

        test('getSidebarViewHtml should embed the in-place patch protocol and no client debounce', () => {
            const html = getSidebarViewHtml({});
            assert.ok(html.includes("addEventListener('message'"));
            assert.ok(html.includes("msg.type === 'sidebarReset'"));
            assert.ok(html.includes("msg.type === 'sidebarPatch'"));
            assert.ok(html.includes("postMessage({ command: 'ready' })"));
            assert.ok(html.includes('preserveContext'));
            assert.ok(!html.includes('debounceTimer'));
            assert.ok(!html.includes('setTimeout'));
        });

        test('getFallbackSidebarCss should contain context menu styling rules', () => {
            const css = getFallbackSidebarCss();
            assert.ok(css.includes('.monaco-menu-container'));
            assert.ok(css.includes('--vscode-menu-background'));
            assert.ok(css.includes('--vscode-menu-selectionBackground'));
            assert.ok(css.includes('.action-item-separator'));
        });

        test('should dispatch installAnotherVersion, downloadVsix, and copy messages correctly', async () => {
            const mockHost: IVscodeHost = {
                getAllExtensions: () => [],
                executeCommand: async () => undefined,
            };

            const repo = createMockRepo({}) as any;
            const manager = new ExtensionManager(repo, mockHost);
            const provider = new ExtensionSidebarViewProvider(undefined, manager, repo);

            const mockView = createMockWebviewView() as any;
            provider.resolveWebviewView(mockView, {} as any, {} as any);

            await provider.handleMessage({ command: 'installAnotherVersion', id: mockExtension.id });
            await provider.handleMessage({ command: 'downloadVsix', id: mockExtension.id, version: '1.0.0' });
            await provider.handleMessage({ command: 'copy', text: 'publisher.sample-ext' });
        });
    });
});

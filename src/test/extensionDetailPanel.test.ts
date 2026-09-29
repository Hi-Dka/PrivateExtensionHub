import * as assert from 'assert';
import {
    getDetailViewHtml,
    renderMarkdown,
    renderFeatureContributions,
    renderDependencies,
    getFallbackDetailCss,
    getFallbackMarkdownCss,
    DetailViewData,
} from '../ui/detailViewHtml';
import {
    ExtensionDetailPanel,
    setVscodeModuleForTesting,
    getNonce,
} from '../ui/ExtensionDetailPanel';
import { ExtensionInfo, ExtensionManifest } from '../models/index';
import { ExtensionManager, IVscodeHost } from '../extension/ExtensionManager';
import { ExtensionRepository } from '../repository/ExtensionRepository';

suite('ExtensionDetailPanel Test Suite', () => {
    const testExtension: ExtensionInfo = {
        id: 'test-pub.test-pkg',
        namespace: 'test-pub',
        name: 'test-pkg',
        displayName: 'Test Package',
        version: '1.0.0',
        description: 'A test extension description',
        downloadCount: 4200,
    };

    teardown(() => {
        setVscodeModuleForTesting(null);
    });

    suite('Markdown Renderer Tests', () => {
        test('renderMarkdown should return placeholder for empty or whitespace content', () => {
            const emptyRes = renderMarkdown('');
            assert.ok(emptyRes.includes('No README provided.'));

            const spaceRes = renderMarkdown('   \n  ');
            assert.ok(spaceRes.includes('No README provided.'));
        });

        test('renderMarkdown should render headers, code blocks, bold, and links', () => {
            const md = [
                '# Heading 1',
                '## Heading 2',
                '**Bold Text** and *Italic Text*',
                '```typescript\nconst x = 1;\n```',
                '[Link Text](https://example.com)',
                '- Item 1\n- Item 2',
            ].join('\n\n');

            const html = renderMarkdown(md);
            assert.ok(html.includes('<h1'));
            assert.ok(html.includes('Heading 1</h1>'));
            assert.ok(html.includes('<h2'));
            assert.ok(html.includes('Heading 2</h2>'));
            assert.ok(html.includes('<strong>Bold Text</strong>'));
            assert.ok(html.includes('<em>Italic Text</em>'));
            assert.ok(html.includes('<pre><code'));
            assert.ok(html.includes('const x = 1;'));
            assert.ok(
                html.includes(
                    '<a href="https://example.com"',
                ),
            );
            assert.ok(html.includes('<li>Item 1</li>'));
        });

        test('renderMarkdown should rewrite relative image URLs when baseUrl provided and preserve absolute URLs', () => {
            const md = [
                '![Relative Image](images/preview.png)',
                '![Relative With Dot](./docs/banner.gif)',
                '![Absolute Image](https://example.com/logo.png)',
            ].join('\n\n');

            const baseUrl = 'https://open-vsx.org/api/publisher/my-ext/1.0.0/file/';
            const html = renderMarkdown(md, { baseUrl });

            assert.ok(html.includes('src="https://open-vsx.org/api/publisher/my-ext/1.0.0/file/images/preview.png"'));
            assert.ok(html.includes('src="https://open-vsx.org/api/publisher/my-ext/1.0.0/file/docs/banner.gif"'));
            assert.ok(html.includes('src="https://example.com/logo.png"'));
        });

        test('renderMarkdown should render GFM tables', () => {
            const md = '| Feature | Status |\n| --- | --- |\n| Theme | Active |';
            const html = renderMarkdown(md);
            assert.ok(html.includes('<table>'));
            assert.ok(html.includes('<th>Feature</th>'));
            assert.ok(html.includes('<td>Active</td>'));
        });
    });

    suite('Feature Contributions & Dependencies Parsers', () => {
        test('renderFeatureContributions should handle empty manifest or missing contributes', () => {
            assert.ok(renderFeatureContributions(undefined).includes('No feature contributions.'));
            assert.ok(renderFeatureContributions({}).includes('No feature contributions.'));
        });

        test('renderFeatureContributions should render configuration settings, commands, and keybindings', () => {
            const manifest: ExtensionManifest = {
                contributes: {
                    configuration: {
                        title: 'Test Config',
                        properties: {
                            'test.enable': {
                                type: 'boolean',
                                default: true,
                                description: 'Enable test features',
                            },
                        },
                    },
                    commands: [
                        {
                            command: 'test.run',
                            title: 'Run Test',
                            category: 'Testing',
                        },
                    ],
                    keybindings: [
                        {
                            command: 'test.run',
                            key: 'ctrl+alt+r',
                            when: 'editorTextFocus',
                        },
                    ],
                } as any,
            };

            const html = renderFeatureContributions(manifest);
            assert.ok(html.includes('Settings'));
            assert.ok(html.includes('test.enable'));
            assert.ok(html.includes('Enable test features'));
            assert.ok(html.includes('true'));
            assert.ok(html.includes('Commands'));
            assert.ok(html.includes('test.run'));
            assert.ok(html.includes('Testing: Run Test'));
            assert.ok(html.includes('Keybindings'));
            assert.ok(html.includes('ctrl+alt+r'));
            assert.ok(html.includes('editorTextFocus'));
        });

        test('renderDependencies should render dependency list with Codicon or empty message', () => {
            assert.ok(renderDependencies(undefined).includes('No dependencies.'));
            assert.ok(renderDependencies([]).includes('No dependencies.'));

            const deps = ['ms-python.python', 'golang.go'];
            const html = renderDependencies(deps);
            assert.ok(html.includes('ms-python.python'));
            assert.ok(html.includes('golang.go'));
            assert.ok(html.includes('codicon-package'));
        });
    });

    suite('Nonce Security Tests', () => {
        test('getNonce should generate random 32-character alphanumeric string', () => {
            const nonce1 = getNonce();
            const nonce2 = getNonce();
            assert.strictEqual(nonce1.length, 32);
            assert.strictEqual(nonce2.length, 32);
            assert.notStrictEqual(nonce1, nonce2);
            assert.ok(/^[A-Za-z0-9]{32}$/.test(nonce1));
            assert.ok(/^[A-Za-z0-9]{32}$/.test(nonce2));
        });

        test('getDetailViewHtml should use explicit nonce in CSP and script tag', () => {
            const explicitNonce = 'test-explicit-nonce-12345';
            const html = getDetailViewHtml({
                extension: testExtension,
                isInstalled: false,
                hasUpdate: false,
                nonce: explicitNonce,
            });
            assert.ok(html.includes(`script-src 'nonce-${explicitNonce}'`));
            assert.ok(html.includes(`<script nonce="${explicitNonce}">`));
            assert.ok(!html.includes("script-src 'nonce-';"));
        });

        test('getDetailViewHtml should use fallback nonce when nonce is omitted', () => {
            const html = getDetailViewHtml({
                extension: testExtension,
                isInstalled: false,
                hasUpdate: false,
            });
            assert.ok(html.includes("script-src 'nonce-detail-nonce'"));
            assert.ok(html.includes('<script nonce="detail-nonce">'));
            assert.ok(!html.includes("script-src 'nonce-';"));
        });
    });

    suite('HTML Generation Tests', () => {
        test('getDetailViewHtml should render the native extension icon structure', () => {
            const data: DetailViewData = {
                extension: testExtension,
                readmeMarkdown: '# Hello',
                isInstalled: false,
                hasUpdate: false,
            };

            const html = getDetailViewHtml(data);
            assert.ok(html.includes('class="extension-icon"'));
            assert.ok(html.includes('class="icon"'));
            assert.ok(html.includes('codicon codicon-extensions'));
            assert.ok(html.includes('height: 128px;'));
            assert.ok(html.includes('width: 128px;'));
        });

        test('getFallbackDetailCss and getFallbackMarkdownCss should load CSS content', () => {
            const detailCss = getFallbackDetailCss();
            assert.ok(detailCss.length > 0);
            assert.ok(detailCss.includes('--vscode-editor-background'));

            const markdownCss = getFallbackMarkdownCss();
            assert.ok(markdownCss.length > 0);
        });

        test('getDetailViewHtml should include codicons URI, native base stylesheet first, and font-src in CSP', () => {
            const html = getDetailViewHtml({
                extension: testExtension,
                isInstalled: false,
                hasUpdate: false,
                cspSource: 'vscode-webview:',
                codiconsUri: 'vscode-webview://media/codicons/codicon.css',
                nativeBaseCssUri: 'vscode-webview://media/native-base.css',
                detailCssUri: 'vscode-webview://media/detail.css',
                markdownCssUri: 'vscode-webview://media/markdown.css',
            });
            assert.ok(html.includes('font-src vscode-webview:'));
            assert.ok(html.includes('<link rel="stylesheet" href="vscode-webview://media/codicons/codicon.css">'));
            assert.ok(html.includes('<link rel="stylesheet" href="vscode-webview://media/native-base.css">'));
            assert.ok(html.includes('<link rel="stylesheet" href="vscode-webview://media/detail.css">'));
            assert.ok(html.includes('<link rel="stylesheet" href="vscode-webview://media/markdown.css">'));
            assert.ok(html.indexOf('native-base.css') < html.indexOf('media/detail.css'));
        });

        test('getDetailViewHtml should render the native header, subtitle, and title-cased tabs', () => {
            const data: DetailViewData = {
                extension: testExtension,
                readmeMarkdown: '# Hello World',
                changelogMarkdown: '## Changelog 1.0.0',
                manifest: {
                    contributes: {
                        commands: [{ command: 'test.run', title: 'Run Test' }],
                    },
                    extensionDependencies: ['dep.one'],
                },
                isInstalled: false,
                hasUpdate: false,
            };

            const html = getDetailViewHtml(data);
            assert.ok(html.includes('Test Package'));
            assert.ok(html.includes('test-pub'));

            // 头部 subtitle-entry 原生嵌套 (publisher + install), identifier 不再出现在 subtitle
            assert.ok(html.includes('class="subtitle"'));
            assert.ok(html.includes('class="subtitle-entry"'));
            assert.ok(html.includes('class="publisher"'));
            assert.ok(html.includes('class="publisher-name ellipsis"'));
            assert.ok(html.includes('class="install"'));
            assert.ok(html.includes('class="count"'));
            assert.ok(!html.includes('subtitle-entry identifier'));

            // 动作按钮与 ⚙ 管理菜单 (原生文案)
            assert.ok(html.includes('class="actions-status-container"'));
            assert.ok(html.includes('action-label extension-action label prominent install'));
            assert.ok(html.includes('>Install</a>'));
            assert.ok(html.includes('id="manageGearBtn"'));
            assert.ok(html.includes('data-action="installAnotherVersion"'));
            assert.ok(html.includes('Install Specific Version...'));

            // 原生 Tab 文案 (由 CSS 大写显示)
            assert.ok(html.includes('class="navbar"'));
            assert.ok(html.includes('data-tab="tab-details">Details</a>'));
            assert.ok(html.includes('data-tab="tab-features">Features</a>'));
            assert.ok(html.includes('data-tab="tab-changelog">Changelog</a>'));
            assert.ok(html.includes('data-tab="tab-dependencies">Dependencies</a>'));
            assert.ok(html.includes('action-label checked'));
            assert.ok(!html.includes('FEATURE CONTRIBUTIONS'));

            // 内容区
            assert.ok(html.includes('id="tab-details"'));
            assert.ok(html.includes('id="tab-features"'));
            assert.ok(html.includes('id="tab-changelog"'));
            assert.ok(html.includes('id="tab-dependencies"'));
            assert.ok(html.includes('Changelog 1.0.0'));
            assert.ok(html.includes('dep.one'));
        });

        test('getDetailViewHtml should render uninstall and update buttons when update available', () => {
            const data: DetailViewData = {
                extension: testExtension,
                readmeMarkdown: '# Hello World',
                isInstalled: true,
                installedVersion: '1.0.0',
                hasUpdate: true,
                latestVersion: '1.1.0',
            };

            const html = getDetailViewHtml(data);
            assert.ok(html.includes('data-action="update"'));
            assert.ok(html.includes('Update to v1.1.0'));
            assert.ok(html.includes('data-action="uninstall"'));
            assert.ok(html.includes('>Uninstall</a>'));
            assert.ok(html.includes('class="status"'));
            assert.ok(!html.includes('badge'));
            assert.ok(html.includes('id="manageGearBtn"'));
        });

        test('getDetailViewHtml should render uninstall action when up-to-date', () => {
            const data: DetailViewData = {
                extension: testExtension,
                readmeMarkdown: '',
                isInstalled: true,
                installedVersion: '1.0.0',
                hasUpdate: false,
            };

            const html = getDetailViewHtml(data);
            assert.ok(html.includes('data-action="uninstall"'));
            assert.ok(!html.includes('data-action="update"'));
            assert.ok(html.includes('class="status"'));
            assert.ok(!html.includes('badge'));
            assert.ok(html.includes('id="manageGearBtn"'));
        });

        test('getDetailViewHtml should render authentic two-column layout with 3 modular side panel containers inside tab-details', () => {
            const extWithIcon: ExtensionInfo = {
                ...testExtension,
                iconUrl: 'https://example.com/icon.png',
                repositoryUrl: 'https://github.com/test-pub/test-pkg',
            };
            const data: DetailViewData = {
                extension: extWithIcon,
                readmeMarkdown: '# Welcome',
                manifest: {
                    categories: ['Themes', 'Linters'],
                    bugs: { url: 'https://github.com/test-pub/test-pkg/issues' },
                    license: 'MIT',
                },
                isInstalled: true,
                installedVersion: '1.0.0',
                hasUpdate: false,
            };

            const html = getDetailViewHtml(data);
            // DETAILS 双栏布局架构
            assert.ok(html.includes('details-layout'));
            assert.ok(html.includes('readme-container'));
            assert.ok(html.includes('additional-details-container'));
            assert.ok(html.includes('additional-details-content'));

            // 3 个官方模块化容器
            assert.ok(html.includes('categories-container'));
            assert.ok(html.includes('class="category"'));
            assert.ok(html.includes('Themes'));
            assert.ok(html.includes('Linters'));

            assert.ok(html.includes('resources-container'));
            assert.ok(html.includes('class="resource"'));
            assert.ok(html.includes('codicon-repo'));
            assert.ok(html.includes('https://github.com/test-pub/test-pkg'));
            assert.ok(html.includes('codicon-issues'));
            assert.ok(html.includes('https://github.com/test-pub/test-pkg/issues'));
            assert.ok(html.includes('Download VSIX'));

            assert.ok(html.includes('more-info-container'));
            assert.ok(html.includes('more-info-entry'));
            assert.ok(html.includes('Marketplace'));
            assert.ok(html.includes('data-copy="test-pub.test-pkg"'));
            assert.ok(html.includes('Publisher'));
            assert.ok(html.includes('test-pub'));
            assert.ok(html.includes('src="https://example.com/icon.png"'));
        });

        test('getDetailViewHtml should dynamically omit tabs when corresponding data is missing', () => {
            // 没有任何依赖项、没有 changelog、没有 feature contributions 的最小扩展
            const minimalData: DetailViewData = {
                extension: testExtension,
                readmeMarkdown: '# Minimal Extension',
                isInstalled: false,
                hasUpdate: false,
            };

            const html = getDetailViewHtml(minimalData);
            // DETAILS Tab 永远展示
            assert.ok(html.includes('>Details</a>'));
            assert.ok(html.includes('id="tab-details"'));

            // 空 Tab 均被省略，绝不渲染空占位
            assert.ok(!html.includes('id="tab-features"'));
            assert.ok(!html.includes('id="tab-changelog"'));
            assert.ok(!html.includes('id="tab-dependencies"'));
        });

        test('renderFeatureContributions should produce borderless Settings-style list and avoid HTML table elements', () => {
            const manifest: ExtensionManifest = {
                contributes: {
                    configuration: {
                        properties: {
                            'app.timeout': { type: 'number', default: 5000, description: 'Timeout in ms' }
                        }
                    },
                    commands: [
                        { command: 'app.ping', title: 'Ping Server' }
                    ]
                }
            };

            const html = renderFeatureContributions(manifest);
            assert.ok(html.includes('features-list'));
            assert.ok(html.includes('feature-item'));
            assert.ok(html.includes('Settings'));
            assert.ok(html.includes('Commands'));
            assert.ok(html.includes('app.timeout'));
            assert.ok(html.includes('app.ping'));

            // 严格验证不存在遗留的 HTML <table> 元素
            assert.ok(!html.includes('<table'));
            assert.ok(!html.includes('features-table'));
            assert.ok(!html.includes('<th>'));
            assert.ok(!html.includes('<td>'));
        });

        test('media/detail.css should align with official extensionEditor.css rules', () => {
            const css = getFallbackDetailCss();
            assert.ok(css.includes('--vscode-editor-background'));
            // 头部副标题竖线分割
            assert.ok(css.includes('border-right: 1px solid rgba(128, 128, 128, 0.7);'));
            // 11px 大写 Tab 导航
            assert.ok(css.includes('font-size: 11px;'));
            assert.ok(css.includes('text-transform: uppercase;'));
            assert.ok(css.includes('.action-label.checked'));
            assert.ok(css.includes('border-bottom: 1px solid var(--vscode-panelTitle-activeBorder'));
            // 内容器度量
            assert.ok(css.includes('height: calc(100% - 37px);'));
            assert.ok(css.includes('max-width: 75%;'));
            assert.ok(css.includes('width: 25%;'));
            assert.ok(css.includes('min-width: 175px;'));
            assert.ok(css.includes('@media (max-width: 499px)'));
            // 附加详情
            assert.ok(css.includes('.additional-details-container'));
            assert.ok(css.includes('grid-template-columns: 40% 60%;'));
            assert.ok(css.includes('#8282820a'));
            assert.ok(css.includes('120%'));
        });

        test('media/markdown.css should follow the pinned markdown presentation', () => {
            const css = getFallbackMarkdownCss();
            assert.ok(css.includes('padding: 1em 26px 0;'));
            assert.ok(css.includes('font-size: var(--markdown-font-size, 14px);'));
            assert.ok(css.includes('line-height: var(--markdown-line-height, 22px);'));
            assert.ok(css.includes('padding: 5px 10px;'));
            assert.ok(css.includes('border-left-width: 5px;'));
            assert.ok(css.includes('border-radius: 3px;'));
            // 原生 markdown 预览没有行内 code 色块
            assert.ok(!css.includes('padding: 2px 5px'));
        });

        test('getDetailViewHtml script should contain tab switching, patch protocol, and event handlers', () => {
            const html = getDetailViewHtml({
                extension: testExtension,
                isInstalled: false,
                hasUpdate: false,
            });
            assert.ok(html.includes("closest('.navbar .action-label')"));
            assert.ok(html.includes("tabBtn.classList.add('checked')"));
            assert.ok(html.includes("targetPane.classList.add('active')"));
            assert.ok(html.includes("closest('#manageGearBtn')"));
            assert.ok(html.includes("closest('[data-action]')"));
            assert.ok(html.includes("closest('[data-copy]')"));
            assert.ok(html.includes("closest('a[href^=\"http://\"], a[href^=\"https://\"]')"));
            assert.ok(html.includes("addEventListener('message'"));
            assert.ok(html.includes("msg.type === 'detailPatch'"));
            assert.ok(html.includes("postMessage({ command: 'ready' })"));
        });
    });

    suite('ExtensionDetailPanel Lifecycle & Messaging Tests', () => {
        function createMockWebviewPanel() {
            let messageListener: ((msg: any) => void) | null = null;
            let disposeListener: (() => void) | null = null;
            const posted: any[] = [];

            return {
                viewType: 'privateExtensionHub.detailView',
                title: 'Test',
                active: true,
                visible: true,
                webview: {
                    html: '',
                    cspSource: 'vscode-webview:',
                    postMessage: async (msg: any) => {
                        posted.push(msg);
                        return true;
                    },
                    onDidReceiveMessage: (listener: (msg: any) => void) => {
                        messageListener = listener;
                        return { dispose: () => {} };
                    },
                    asWebviewUri: (uri: any) => uri,
                },
                onDidDispose: (listener: () => void) => {
                    disposeListener = listener;
                    return { dispose: () => {} };
                },
                reveal: () => {},
                dispose: () => {
                    disposeListener?.();
                },
                getPosted: () => posted,
                simulateMessage: (msg: any) => messageListener?.(msg),
            };
        }

        test('should update panel HTML on updateContent and handle install message', async () => {
            let installedVersionTarget = '';
            let installedNamespace = '';
            let installedName = '';

            const mockHost: IVscodeHost = {
                getAllExtensions: () => [],
                executeCommand: async () => undefined,
            };

            const mockRepo: ExtensionRepository = {
                getExtension: async () => testExtension,
                getReadme: async () => '# Detailed README documentation',
                getVersions: async () => ['1.0.0', '0.9.0'],
                search: async () => ({ extensions: [], total: 0 }),
                getDownloadUrl: async () => 'https://fake/dl',
                getChangelog: async () => '## Changelog 1.0.0',
                getManifest: async () => ({ name: 'test-pkg' }),
            };

            const manager = new ExtensionManager(mockRepo, mockHost);
            manager.install = async (ns, name, ver) => {
                installedNamespace = ns;
                installedName = name;
                installedVersionTarget = ver || '';
            };

            const mockPanel = createMockWebviewPanel() as any;
            let updatedFired = false;

            const detailPanel = new ExtensionDetailPanel(
                mockPanel,
                testExtension,
                manager,
                mockRepo,
                () => {
                    updatedFired = true;
                },
            );

            await detailPanel.updateContent();
            assert.ok(mockPanel.webview.html.includes('Detailed README documentation'));
            assert.ok(mockPanel.webview.html.includes('Changelog 1.0.0'));

            // 验证 updateContent 会生成动态 32 位 Nonce 并注入 CSP 和 script 标签
            const cspNonceMatch = mockPanel.webview.html.match(/script-src 'nonce-([A-Za-z0-9]{32})'/);
            assert.ok(cspNonceMatch, 'CSP should contain a 32-character nonce');
            const scriptNonceMatch = mockPanel.webview.html.match(/<script nonce="([A-Za-z0-9]{32})">/);
            assert.ok(scriptNonceMatch, 'Script tag should contain a 32-character nonce');
            assert.strictEqual(cspNonceMatch[1], scriptNonceMatch[1]);

            // 模拟 Webview 点击安装
            await detailPanel.handleWebviewMessage({
                command: 'install',
                version: '1.0.0',
            });

            assert.strictEqual(installedNamespace, 'test-pub');
            assert.strictEqual(installedName, 'test-pkg');
            assert.strictEqual(installedVersionTarget, '1.0.0');
            assert.strictEqual(updatedFired, true);

            // 初始渲染之后的状态刷新以增量 patch 发送, 不再重写文档
            const patches = mockPanel.getPosted().filter((m: any) => m.type === 'detailPatch');
            assert.ok(patches.length >= 1);
            assert.ok(patches[patches.length - 1].patch.header.includes('Test Package'));
            assert.ok(mockPanel.webview.html.includes('Detailed README documentation'));
        });

        test('should patch the document in place instead of reassigning webview.html', async () => {
            const mockHost: IVscodeHost = {
                getAllExtensions: () => [],
                executeCommand: async () => undefined,
            };
            const mockRepo: ExtensionRepository = {
                getExtension: async () => testExtension,
                getReadme: async () => '# Readme content',
                getVersions: async () => ['1.0.0'],
                search: async () => ({ extensions: [], total: 0 }),
                getDownloadUrl: async () => '',
                getChangelog: async () => undefined,
                getManifest: async () => undefined,
            };
            const manager = new ExtensionManager(mockRepo, mockHost);
            const mockPanel = createMockWebviewPanel() as any;
            const detailPanel = new ExtensionDetailPanel(mockPanel, testExtension, manager, mockRepo);

            await detailPanel.updateContent();
            const initialHtml = mockPanel.webview.html;
            assert.ok(initialHtml.includes('Readme content'));

            await detailPanel.updateContent();
            assert.strictEqual(mockPanel.webview.html, initialHtml);
            assert.ok(mockPanel.getPosted().some((m: any) => m.type === 'detailPatch'));
        });

        test('should answer the ready handshake with a full patch', async () => {
            const mockHost: IVscodeHost = {
                getAllExtensions: () => [],
                executeCommand: async () => undefined,
            };
            const mockRepo: ExtensionRepository = {
                getExtension: async () => testExtension,
                getReadme: async () => '# Ready readme',
                getVersions: async () => ['1.0.0'],
                search: async () => ({ extensions: [], total: 0 }),
                getDownloadUrl: async () => '',
                getChangelog: async () => undefined,
                getManifest: async () => undefined,
            };
            const manager = new ExtensionManager(mockRepo, mockHost);
            const mockPanel = createMockWebviewPanel() as any;
            const detailPanel = new ExtensionDetailPanel(mockPanel, testExtension, manager, mockRepo);

            await detailPanel.updateContent();
            await detailPanel.handleWebviewMessage({ command: 'ready' });
            const patches = mockPanel.getPosted().filter((m: any) => m.type === 'detailPatch');
            assert.ok(patches.length >= 1);
            const lastPatch = patches[patches.length - 1].patch;
            assert.ok(lastPatch.header.includes('Test Package'));
            assert.ok(lastPatch.navbar.includes('tab-details'));
            assert.ok(lastPatch.panes['tab-details'].includes('Ready readme'));
        });

        test('should handle uninstall message properly', async () => {
            let uninstalledId = '';
            const mockHost: IVscodeHost = {
                getAllExtensions: () => [
                    {
                        id: testExtension.id,
                        packageJSON: { version: '1.0.0' },
                    },
                ],
                executeCommand: async () => undefined,
            };

            const mockRepo: ExtensionRepository = {
                getExtension: async () => testExtension,
                getReadme: async () => '',
                getVersions: async () => ['1.0.0'],
                search: async () => ({ extensions: [], total: 0 }),
                getDownloadUrl: async () => '',
                getChangelog: async () => undefined,
                getManifest: async () => undefined,
            };

            const manager = new ExtensionManager(mockRepo, mockHost);
            manager.uninstall = async (id) => {
                uninstalledId = id;
            };

            const mockPanel = createMockWebviewPanel() as any;
            const detailPanel = new ExtensionDetailPanel(
                mockPanel,
                testExtension,
                manager,
                mockRepo,
            );

            await detailPanel.handleWebviewMessage({
                command: 'uninstall',
            });

            assert.strictEqual(uninstalledId, testExtension.id);
        });

        test('should handle update message properly', async () => {
            let updatedVersionTarget = '';
            let infoMsg = '';
            setVscodeModuleForTesting({
                window: {
                    showInformationMessage: (msg: string) => {
                        infoMsg = msg;
                    },
                },
            });

            const mockHost: IVscodeHost = {
                getAllExtensions: () => [],
                executeCommand: async () => undefined,
            };
            const mockRepo: ExtensionRepository = {
                getExtension: async () => testExtension,
                getReadme: async () => '',
                getVersions: async () => ['2.0.0'],
                search: async () => ({ extensions: [], total: 0 }),
                getDownloadUrl: async () => '',
                getChangelog: async () => undefined,
                getManifest: async () => undefined,
            };
            const manager = new ExtensionManager(mockRepo, mockHost);
            manager.install = async (_ns, _name, ver) => {
                updatedVersionTarget = ver || '';
            };

            const mockPanel = createMockWebviewPanel() as any;
            const detailPanel = new ExtensionDetailPanel(
                mockPanel,
                testExtension,
                manager,
                mockRepo,
            );

            await detailPanel.handleWebviewMessage({
                command: 'update',
                version: '2.0.0',
            });

            assert.strictEqual(updatedVersionTarget, '2.0.0');
            assert.ok(infoMsg.includes('2.0.0'));
        });

        test('should handle installVersion message properly', async () => {
            let installedVersionTarget = '';
            let infoMsg = '';
            setVscodeModuleForTesting({
                window: {
                    showInformationMessage: (msg: string) => {
                        infoMsg = msg;
                    },
                },
            });

            const mockHost: IVscodeHost = {
                getAllExtensions: () => [],
                executeCommand: async () => undefined,
            };
            const mockRepo: ExtensionRepository = {
                getExtension: async () => testExtension,
                getReadme: async () => '',
                getVersions: async () => ['0.9.5'],
                search: async () => ({ extensions: [], total: 0 }),
                getDownloadUrl: async () => '',
                getChangelog: async () => undefined,
                getManifest: async () => undefined,
            };
            const manager = new ExtensionManager(mockRepo, mockHost);
            manager.install = async (_ns, _name, ver) => {
                installedVersionTarget = ver || '';
            };

            const mockPanel = createMockWebviewPanel() as any;
            const detailPanel = new ExtensionDetailPanel(
                mockPanel,
                testExtension,
                manager,
                mockRepo,
            );

            await detailPanel.handleWebviewMessage({
                command: 'installVersion',
                version: '0.9.5',
            });

            assert.strictEqual(installedVersionTarget, '0.9.5');
            assert.ok(infoMsg.includes('0.9.5'));
        });

        test('should bridge copy message to vscode.env.clipboard.writeText', async () => {
            let copiedText = '';
            let infoMsg = '';
            setVscodeModuleForTesting({
                env: {
                    clipboard: {
                        writeText: async (t: string) => {
                            copiedText = t;
                        },
                    },
                },
                window: {
                    showInformationMessage: (msg: string) => {
                        infoMsg = msg;
                    },
                },
            });

            const mockRepo: ExtensionRepository = {
                getExtension: async () => testExtension,
                getReadme: async () => '',
                getVersions: async () => [],
                search: async () => ({ extensions: [], total: 0 }),
                getDownloadUrl: async () => '',
                getChangelog: async () => undefined,
                getManifest: async () => undefined,
            };
            const mockHost: IVscodeHost = {
                getAllExtensions: () => [],
                executeCommand: async () => undefined,
            };
            const manager = new ExtensionManager(mockRepo, mockHost);
            const mockPanel = createMockWebviewPanel() as any;
            const detailPanel = new ExtensionDetailPanel(
                mockPanel,
                testExtension,
                manager,
                mockRepo,
            );

            await detailPanel.handleWebviewMessage({
                command: 'copy',
                text: 'my.identifier',
            });

            assert.strictEqual(copiedText, 'my.identifier');
            assert.ok(infoMsg.includes('my.identifier'));
        });

        test('should bridge openExternal message to vscode.env.openExternal', async () => {
            let openedUrl = '';
            setVscodeModuleForTesting({
                env: {
                    openExternal: async (uri: any) => {
                        openedUrl = uri.toString();
                    },
                },
                Uri: {
                    parse: (url: string) => ({
                        toString: () => url,
                    }),
                },
            });

            const mockRepo: ExtensionRepository = {
                getExtension: async () => testExtension,
                getReadme: async () => '',
                getVersions: async () => [],
                search: async () => ({ extensions: [], total: 0 }),
                getDownloadUrl: async () => '',
                getChangelog: async () => undefined,
                getManifest: async () => undefined,
            };
            const mockHost: IVscodeHost = {
                getAllExtensions: () => [],
                executeCommand: async () => undefined,
            };
            const manager = new ExtensionManager(mockRepo, mockHost);
            const mockPanel = createMockWebviewPanel() as any;
            const detailPanel = new ExtensionDetailPanel(
                mockPanel,
                testExtension,
                manager,
                mockRepo,
            );

            await detailPanel.handleWebviewMessage({
                command: 'openExternal',
                url: 'https://github.com/test',
            });

            assert.strictEqual(openedUrl, 'https://github.com/test');
        });

        test('should handle installAnotherVersion by querying versions, opening QuickPick, and installing', async () => {
            let quickPickItems: any[] = [];
            let installedVersion = '';
            let updateCalled = false;

            setVscodeModuleForTesting({
                window: {
                    showQuickPick: async (items: any[]) => {
                        quickPickItems = items;
                        return { label: '0.8.0' };
                    },
                    showInformationMessage: () => {},
                },
            });

            const mockRepo: ExtensionRepository = {
                getExtension: async () => testExtension,
                getReadme: async () => '',
                getVersions: async () => ['1.0.0', '0.9.0', '0.8.0'],
                search: async () => ({ extensions: [], total: 0 }),
                getDownloadUrl: async () => '',
                getChangelog: async () => undefined,
                getManifest: async () => undefined,
            };
            const mockHost: IVscodeHost = {
                getAllExtensions: () => [
                    { id: testExtension.id, packageJSON: { version: '1.0.0' } },
                ],
                executeCommand: async () => undefined,
            };
            const manager = new ExtensionManager(mockRepo, mockHost);
            manager.install = async (_ns, _name, ver) => {
                installedVersion = ver || '';
            };

            const mockPanel = createMockWebviewPanel() as any;
            const detailPanel = new ExtensionDetailPanel(
                mockPanel,
                testExtension,
                manager,
                mockRepo,
                () => {
                    updateCalled = true;
                },
            );

            await detailPanel.handleWebviewMessage({
                command: 'installAnotherVersion',
            });

            assert.strictEqual(quickPickItems.length, 3);
            assert.strictEqual(quickPickItems[0].label, '1.0.0');
            assert.strictEqual(quickPickItems[0].description, '(已安装)');
            assert.strictEqual(installedVersion, '0.8.0');
            assert.strictEqual(updateCalled, true);
        });
    });
});

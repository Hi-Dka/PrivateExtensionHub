import type * as vscode from 'vscode';
import { ExtensionInfo } from '../models/index';
import { ExtensionManager } from '../extension/ExtensionManager';
import { ExtensionRepository } from '../repository/ExtensionRepository';
import { getDetailViewHtml, buildDetailState, DetailShellData, DetailViewData } from './detailViewHtml';
import type { DetailState } from '../webview/types';
import { MEDIA_DIR } from './webviewAssets';

let vscodeModule: typeof vscode | null = null;
try {
    vscodeModule = require('vscode');
} catch {
    vscodeModule = null;
}

export function setVscodeModuleForTesting(mock: any): void {
    vscodeModule = mock;
}

export function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

export interface WebviewActionMessage {
    command:
        | 'install'
        | 'uninstall'
        | 'update'
        | 'installVersion'
        | 'installAnotherVersion'
        | 'copy'
        | 'openExternal'
        | 'ready';
    version?: string;
    text?: string;
    url?: string;
}

export class ExtensionDetailPanel {
    private static readonly panels = new Map<string, ExtensionDetailPanel>();

    private htmlInitialized = false;
    private lastState?: DetailState;

    constructor(
        public readonly panel: vscode.WebviewPanel,
        public extension: ExtensionInfo,
        private readonly extensionManager: ExtensionManager,
        private readonly repository: ExtensionRepository,
        private readonly onDidUpdate?: () => void,
        public readonly extensionUri?: vscode.Uri,
    ) {
        this.panel.onDidDispose(() => {
            ExtensionDetailPanel.panels.delete(this.extension.id);
        });

        this.panel.webview.onDidReceiveMessage((message: WebviewActionMessage) => {
            this.handleWebviewMessage(message);
        });
    }

    /**
     * 打开或激活指定扩展的详情页面
     */
    static async show(
        extension: ExtensionInfo,
        extensionManager: ExtensionManager,
        repository: ExtensionRepository,
        onDidUpdate?: () => void,
        extensionUri?: vscode.Uri,
    ): Promise<ExtensionDetailPanel> {
        const existing = ExtensionDetailPanel.panels.get(extension.id);
        if (existing) {
            existing.panel.reveal();
            await existing.updateContent();
            return existing;
        }

        if (!vscodeModule) {
            throw new Error('vscode module not found in current environment');
        }

        const mediaUri = extensionUri && vscodeModule
            ? vscodeModule.Uri.joinPath(extensionUri, 'media')
            : undefined;

        const panel = vscodeModule.window.createWebviewPanel(
            'privateExtensionHub.detailView',
            extension.displayName || extension.name,
            vscodeModule.ViewColumn.Active,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: extensionUri
                    ? [extensionUri, ...(mediaUri ? [mediaUri] : [])]
                    : [],
            },
        );

        const instance = new ExtensionDetailPanel(
            panel,
            extension,
            extensionManager,
            repository,
            onDidUpdate,
            extensionUri,
        );

        ExtensionDetailPanel.panels.set(extension.id, instance);
        await instance.updateContent();
        return instance;
    }

    /**
     * 处理来自 Webview 的用户操作
     */
    async handleWebviewMessage(message: WebviewActionMessage): Promise<void> {
        const displayName = this.extension.displayName || this.extension.name;

        try {
            switch (message.command) {
                case 'install': {
                    const targetVer = message.version || this.extension.version;
                    await this.extensionManager.install(
                        this.extension.namespace,
                        this.extension.name,
                        targetVer,
                    );
                    vscodeModule?.window.showInformationMessage(
                        `扩展 ${displayName} (v${targetVer}) 安装完成！`,
                    );
                    break;
                }
                case 'uninstall': {
                    await this.extensionManager.uninstall(this.extension.id);
                    vscodeModule?.window.showInformationMessage(
                        `扩展 ${displayName} 卸载成功！`,
                    );
                    break;
                }
                case 'update': {
                    await this.extensionManager.install(
                        this.extension.namespace,
                        this.extension.name,
                        message.version,
                    );
                    vscodeModule?.window.showInformationMessage(
                        `扩展 ${displayName} 更新至 v${message.version} 成功！`,
                    );
                    break;
                }
                case 'installVersion': {
                    if (message.version) {
                        await this.extensionManager.install(
                            this.extension.namespace,
                            this.extension.name,
                            message.version,
                        );
                        vscodeModule?.window.showInformationMessage(
                            `扩展 ${displayName} 已切换安装至 v${message.version}！`,
                        );
                    }
                    break;
                }
                case 'copy': {
                    if (message.text && vscodeModule?.env?.clipboard) {
                        await vscodeModule.env.clipboard.writeText(message.text);
                        vscodeModule.window.showInformationMessage(
                            `已复制到剪贴板: ${message.text}`,
                        );
                    }
                    return;
                }
                case 'openExternal': {
                    if (message.url && vscodeModule?.env?.openExternal) {
                        await vscodeModule.env.openExternal(
                            vscodeModule.Uri.parse(message.url),
                        );
                    }
                    return;
                }
                case 'ready': {
                    if (this.htmlInitialized && this.lastState) {
                        this.panel.webview.postMessage({
                            type: 'detail:state',
                            state: this.lastState,
                        });
                    }
                    return;
                }
                case 'installAnotherVersion': {
                    const versions = await this.repository.getVersions(
                        this.extension.namespace,
                        this.extension.name,
                    );
                    if (!versions || versions.length === 0) {
                        vscodeModule?.window.showInformationMessage('未找到其他可用版本');
                        return;
                    }
                    const currentInstalled = this.extensionManager.getInstalledVersion(
                        this.extension.id,
                    );
                    const items = versions.map((v) => ({
                        label: v,
                        description: v === currentInstalled ? '(已安装)' : undefined,
                    }));
                    const picked = await vscodeModule?.window.showQuickPick(items, {
                        placeHolder: `选择要安装的 ${displayName} 版本`,
                    });
                    if (picked) {
                        await this.extensionManager.install(
                            this.extension.namespace,
                            this.extension.name,
                            picked.label,
                        );
                        vscodeModule?.window.showInformationMessage(
                            `扩展 ${displayName} 已切换安装至 v${picked.label}！`,
                        );
                        await this.updateContent();
                        this.onDidUpdate?.();
                    }
                    return;
                }
            }

            // 更新面板自身内容与触发外部刷新
            await this.updateContent();
            this.onDidUpdate?.();
        } catch (err: any) {
            const msg = err instanceof Error ? err.message : String(err);
            vscodeModule?.window?.showErrorMessage?.(
                `操作失败 [${message.command}]: ${msg}`,
            );
        }
    }

    /**
     * 拉取最新状态并重新生成 Webview HTML
     */
    async updateContent(): Promise<void> {
        const isInstalled = this.extensionManager.isInstalled(
            this.extension.id,
        );
        const installedVersion = this.extensionManager.getInstalledVersion(
            this.extension.id,
        );

        let hasUpdate = false;
        let latestVersion: string | undefined;

        if (isInstalled) {
            const checkRes = await this.extensionManager.checkUpdate(
                this.extension.id,
            );
            hasUpdate = checkRes.hasUpdate;
            latestVersion = checkRes.latestVersion;
        }

        const [readmeMarkdown, changelogMarkdown, manifest] = await Promise.all([
            this.repository
                .getReadme(this.extension.namespace, this.extension.name)
                .catch(() => ''),
            this.repository
                .getChangelog(this.extension.namespace, this.extension.name)
                .catch(() => undefined),
            this.repository
                .getManifest(this.extension.namespace, this.extension.name)
                .catch(() => undefined),
        ]);

        let codiconsUri: string | undefined;
        let nativeBaseCssUri: string | undefined;
        let detailCssUri: string | undefined;
        let markdownCssUri: string | undefined;
        let detailJsUri: string | undefined;

        if (this.extensionUri && vscodeModule) {
            codiconsUri = this.panel.webview
                .asWebviewUri(
                    vscodeModule.Uri.joinPath(
                        this.extensionUri,
                        MEDIA_DIR,
                        'codicons',
                        'codicon.css',
                    ),
                )
                .toString();
            nativeBaseCssUri = this.panel.webview
                .asWebviewUri(
                    vscodeModule.Uri.joinPath(this.extensionUri, MEDIA_DIR, 'native-base.css'),
                )
                .toString();
            detailCssUri = this.panel.webview
                .asWebviewUri(
                    vscodeModule.Uri.joinPath(this.extensionUri, MEDIA_DIR, 'detail.css'),
                )
                .toString();
            markdownCssUri = this.panel.webview
                .asWebviewUri(
                    vscodeModule.Uri.joinPath(this.extensionUri, MEDIA_DIR, 'markdown.css'),
                )
                .toString();
            detailJsUri = this.panel.webview
                .asWebviewUri(vscodeModule.Uri.joinPath(this.extensionUri, MEDIA_DIR, 'detail.js'))
                .toString();
        }

        const registryUrl = vscodeModule?.workspace?.getConfiguration
            ? vscodeModule.workspace
                  .getConfiguration('privateExtensionHub')
                  .get<string>('openVSXUrl', 'https://open-vsx.org')
            : 'https://open-vsx.org';

        const viewData: DetailViewData = {
            extension: this.extension,
            readmeMarkdown,
            changelogMarkdown,
            manifest,
            isInstalled,
            installedVersion,
            hasUpdate,
            latestVersion,
            registryUrl,
        };
        const state = buildDetailState(viewData);
        this.lastState = state;

        if (!this.htmlInitialized) {
            const shellData: DetailShellData = {
                state,
                cspSource: this.panel.webview.cspSource,
                nonce: getNonce(),
                codiconsUri,
                nativeBaseCssUri,
                detailCssUri,
                markdownCssUri,
                detailJsUri,
            };
            this.panel.webview.html = getDetailViewHtml(shellData);
            this.htmlInitialized = true;
            return;
        }

        // 初始渲染之后只发送状态；渲染与 Tab 状态由 webview 组件保持
        this.panel.webview.postMessage({ type: 'detail:state', state });
    }

    /**
     * 刷新所有已打开的详情页面（用于侧边栏安装/卸载后的两路状态同步）
     */
    static async refreshAll(): Promise<void> {
        const promises = Array.from(this.panels.values()).map((p) =>
            p.updateContent(),
        );
        await Promise.allSettled(promises);
    }

    /**
     * 刷新指定扩展的详情页面（若已打开）
     */
    static async refreshPanel(extensionId: string): Promise<void> {
        const p = this.panels.get(extensionId);
        if (p) {
            await p.updateContent();
        }
    }

    /**
     * 辅助测试清理方法
     */
    static clearAllPanels(): void {
        this.panels.clear();
    }
}

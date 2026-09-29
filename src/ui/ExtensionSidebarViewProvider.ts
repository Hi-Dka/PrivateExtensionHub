import type * as vscode from 'vscode';
import { ExtensionInfo } from '../models/index';
import { ExtensionManager } from '../extension/ExtensionManager';
import { ExtensionRepository } from '../repository/ExtensionRepository';
import { ExtensionDetailPanel } from './ExtensionDetailPanel';
import {
    computeRowPatch,
    getSidebarEmptyMessage,
    getSidebarViewHtml,
    renderSidebarRows,
    SidebarExtensionItem,
    SidebarRow,
    SidebarViewData,
} from './sidebarViewHtml';
import { MEDIA_DIR } from './webviewAssets';

let vscodeModule: typeof vscode | null = null;
try {
    vscodeModule = require('vscode');
} catch {
    vscodeModule = null;
}

export interface SidebarWebviewMessage {
    command:
        | 'search'
        | 'clearSearch'
        | 'openDetail'
        | 'install'
        | 'uninstall'
        | 'update'
        | 'manage'
        | 'installAnotherVersion'
        | 'downloadVsix'
        | 'copy'
        | 'ready';
    query?: string;
    id?: string;
    version?: string;
    text?: string;
}

export class ExtensionSidebarViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'privateExtensionHub.sidebarView';

    /** Native Delayer(500) for the extensions search box. */
    public searchDebounceMs = 500;

    public view?: vscode.WebviewView;
    private searchQuery: string = '';
    private isSearching: boolean = false;
    private searchResults: SidebarExtensionItem[] = [];
    private cachedInstalled: SidebarExtensionItem[] = [];
    private cachedUpdates: SidebarExtensionItem[] = [];
    private isLoading: boolean = false;
    private searchTimer: NodeJS.Timeout | null = null;
    private searchRequestId = 0;
    private initialized = false;
    private renderedRows: SidebarRow[] = [];
    private renderedEmptyMessage: string | null = null;

    constructor(
        private readonly extensionUri: vscode.Uri | undefined,
        private readonly extensionManager: ExtensionManager,
        private readonly repository: ExtensionRepository,
    ) {}

    /**
     * VS Code WebviewViewProvider 生命周期入口
     */
    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ): void {
        this.view = webviewView;
        this.initialized = false;
        this.renderedRows = [];
        this.renderedEmptyMessage = null;

        const mediaUri = this.extensionUri && vscodeModule
            ? vscodeModule.Uri.joinPath(this.extensionUri, MEDIA_DIR)
            : undefined;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: this.extensionUri
                ? [this.extensionUri, ...(mediaUri ? [mediaUri] : [])]
                : [],
        };

        // 监听 Webview 发来的消息
        webviewView.webview.onDidReceiveMessage((message: SidebarWebviewMessage) => {
            this.handleMessage(message);
        });

        // 视图可见性变化时刷新
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this.refresh();
            }
        });

        // 初始化加载列表
        this.refresh();
    }

    /**
     * 处理来自 Webview 的用户操作
     */
    async handleMessage(message: SidebarWebviewMessage): Promise<void> {
        try {
            switch (message.command) {
                case 'search': {
                    const query = (message.query || '').trim();
                    if (query) {
                        this.scheduleSearch(query);
                    } else {
                        await this.clearSearch();
                    }
                    break;
                }

                case 'clearSearch': {
                    await this.clearSearch();
                    break;
                }

                case 'ready': {
                    this.handleWebviewReady();
                    break;
                }

                case 'openDetail': {
                    if (message.id) {
                        await this.openDetail(message.id);
                    }
                    break;
                }

                case 'install': {
                    if (message.id) {
                        await this.installExtension(message.id, message.version);
                    }
                    break;
                }

                case 'uninstall': {
                    if (message.id) {
                        await this.uninstallExtension(message.id);
                    }
                    break;
                }

                case 'update': {
                    if (message.id) {
                        await this.updateExtension(message.id, message.version);
                    }
                    break;
                }

                case 'manage': {
                    if (message.id) {
                        await this.manageExtension(message.id);
                    }
                    break;
                }

                case 'installAnotherVersion': {
                    if (message.id) {
                        await this.installAnotherVersion(message.id);
                    }
                    break;
                }

                case 'downloadVsix': {
                    if (message.id) {
                        await this.downloadVsix(message.id, message.version);
                    }
                    break;
                }

                case 'copy': {
                    const text = message.text || message.id || '';
                    if (vscodeModule && text) {
                        await vscodeModule.env.clipboard.writeText(text);
                        vscodeModule.window.setStatusBarMessage(`已复制: ${text}`, 2000);
                    }
                    break;
                }
            }
        } catch (err: any) {
            const msg = err instanceof Error ? err.message : String(err);
            vscodeModule?.window.showErrorMessage(`Action failed [${message.command}]: ${msg}`);
        }
    }

    /**
     * 原生节奏：搜索输入在停止输入 500ms 后执行 (Delayer(500))。
     */
    scheduleSearch(query: string): void {
        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
        }
        this.searchTimer = setTimeout(() => {
            this.searchTimer = null;
            this.performSearch(query).catch((err) => {
                const msg = err instanceof Error ? err.message : String(err);
                vscodeModule?.window.showErrorMessage(`Search failed: ${msg}`);
            });
        }, this.searchDebounceMs);
    }

    /**
     * 执行扩展搜索 (过期请求会被取消)
     */
    async performSearch(query: string): Promise<void> {
        const requestId = ++this.searchRequestId;
        this.searchQuery = query;
        this.isSearching = true;
        this.isLoading = true;
        this.updateViewHtml();

        try {
            const searchRes = await this.repository.search(query);
            const results = searchRes.extensions;
            const items: SidebarExtensionItem[] = [];

            for (const ext of results) {
                const isInstalled = this.extensionManager.isInstalled(ext.id);
                const installedVersion = this.extensionManager.getInstalledVersion(ext.id);
                let hasUpdate = false;
                let latestVersion: string | undefined;

                if (isInstalled) {
                    const check = await this.extensionManager.checkUpdate(ext.id);
                    hasUpdate = check.hasUpdate;
                    latestVersion = check.latestVersion;
                }

                items.push({
                    info: ext,
                    isInstalled,
                    installedVersion,
                    hasUpdate,
                    latestVersion,
                });
            }

            if (requestId !== this.searchRequestId) {
                return;
            }
            this.searchResults = items;
        } catch (err) {
            if (requestId === this.searchRequestId) {
                this.searchResults = [];
            }
            throw err;
        } finally {
            if (requestId === this.searchRequestId) {
                this.isLoading = false;
                this.updateViewHtml();
            }
        }
    }

    /**
     * 清除搜索结果并恢复默认列表
     */
    async clearSearch(): Promise<void> {
        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
            this.searchTimer = null;
        }
        this.searchRequestId++;
        this.searchQuery = '';
        this.isSearching = false;
        this.searchResults = [];
        await this.refresh();
    }

    /**
     * 打开指定扩展的详情页面
     */
    async openDetail(extensionId: string): Promise<void> {
        const item = this.findExtension(extensionId);
        let ext: ExtensionInfo | undefined = item?.info;

        if (!ext) {
            const [namespace, name] = extensionId.split('.');
            if (namespace && name) {
                ext = await this.repository.getExtension(namespace, name);
            }
        }

        if (!ext) {
            vscodeModule?.window.showErrorMessage(`Extension not found: ${extensionId}`);
            return;
        }

        await ExtensionDetailPanel.show(
            ext,
            this.extensionManager,
            this.repository,
            () => this.refresh(),
            this.extensionUri,
        );
    }

    /**
     * 安装扩展
     */
    private async installExtension(extensionId: string, version?: string): Promise<void> {
        const item = this.findExtension(extensionId);
        const [namespace, name] = extensionId.split('.');
        const targetVersion = version || item?.info.version;

        if (!namespace || !name) {
            return;
        }

        await this.extensionManager.install(namespace, name, targetVersion);
        vscodeModule?.window.showInformationMessage(
            `Extension ${item?.info.displayName || extensionId} installed successfully!`,
        );

        await this.refresh();
        await ExtensionDetailPanel.refreshPanel(extensionId);
    }

    /**
     * 卸载扩展
     */
    private async uninstallExtension(extensionId: string): Promise<void> {
        await this.extensionManager.uninstall(extensionId);
        vscodeModule?.window.showInformationMessage(
            `Extension ${extensionId} uninstalled successfully!`,
        );

        await this.refresh();
        await ExtensionDetailPanel.refreshPanel(extensionId);
    }

    /**
     * 更新扩展
     */
    private async updateExtension(extensionId: string, version?: string): Promise<void> {
        const [namespace, name] = extensionId.split('.');
        if (!namespace || !name) {
            return;
        }

        await this.extensionManager.install(namespace, name, version);
        vscodeModule?.window.showInformationMessage(
            `Extension ${extensionId} updated to v${version} successfully!`,
        );

        await this.refresh();
        await ExtensionDetailPanel.refreshPanel(extensionId);
    }

    /**
     * 管理扩展 (齿轮菜单)
     */
    private async manageExtension(extensionId: string): Promise<void> {
        if (!vscodeModule) {
            return;
        }

        const choices = ['Open Details', 'Install Another Version...', 'Copy Extension ID', 'Uninstall'];
        const selected = await vscodeModule.window.showQuickPick(choices, {
            placeHolder: `Manage extension ${extensionId}`,
        });

        if (selected === 'Open Details') {
            await this.openDetail(extensionId);
        } else if (selected === 'Install Another Version...') {
            await this.installAnotherVersion(extensionId);
        } else if (selected === 'Copy Extension ID') {
            await vscodeModule.env.clipboard.writeText(extensionId);
            vscodeModule.window.setStatusBarMessage(`已复制: ${extensionId}`, 2000);
        } else if (selected === 'Uninstall') {
            await this.uninstallExtension(extensionId);
        }
    }

    /**
     * 安装其他版本 (弹出 QuickPick 选择版本并安装)
     */
    async installAnotherVersion(extensionId: string): Promise<void> {
        const [namespace, name] = extensionId.split('.');
        if (!namespace || !name) {
            return;
        }

        try {
            const versions = await this.repository.getVersions(namespace, name);
            if (!versions || versions.length === 0) {
                vscodeModule?.window.showInformationMessage(`未找到 ${extensionId} 的其他版本`);
                return;
            }

            const currentInstalled = this.extensionManager.getInstalledVersion(extensionId);
            const items = versions.map((ver: string) => ({
                label: ver,
                description: ver === currentInstalled ? '(已安装)' : undefined,
            }));

            const selected = await vscodeModule?.window.showQuickPick(items, {
                placeHolder: `选择 ${extensionId} 的安装版本`,
            });

            if (selected) {
                const chosenVersion = typeof selected === 'string' ? selected : selected.label;
                await this.installExtension(extensionId, chosenVersion);
            }
        } catch (err: any) {
            const msg = err instanceof Error ? err.message : String(err);
            vscodeModule?.window.showErrorMessage(`获取版本列表失败: ${msg}`);
        }
    }

    /**
     * 下载 VSIX 扩展包文件
     */
    async downloadVsix(extensionId: string, version?: string): Promise<void> {
        const item = this.findExtension(extensionId);
        const [namespace, name] = extensionId.split('.');
        const targetVersion = version || item?.installedVersion || item?.info.version;
        if (!namespace || !name || !targetVersion) {
            return;
        }

        try {
            const vsixUrl = await this.repository.getDownloadUrl(namespace, name, targetVersion);
            if (vscodeModule && vsixUrl) {
                await vscodeModule.env.openExternal(vscodeModule.Uri.parse(vsixUrl));
            }
        } catch (err: any) {
            const msg = err instanceof Error ? err.message : String(err);
            vscodeModule?.window.showErrorMessage(`获取下载链接失败: ${msg}`);
        }
    }

    /**
     * 全量刷新扩展状态 (拉取已安装扩展列表并检查可用更新)
     */
    async refresh(): Promise<void> {
        this.isLoading = true;
        this.updateViewHtml();

        try {
            const installed = this.extensionManager.getInstalledExtensions();
            const updatesList: SidebarExtensionItem[] = [];
            const installedList: SidebarExtensionItem[] = [];

            for (const ext of installed) {
                const check = await this.extensionManager.checkUpdate(ext.id);
                const item: SidebarExtensionItem = {
                    info: ext,
                    isInstalled: true,
                    installedVersion: ext.version,
                    hasUpdate: check.hasUpdate,
                    latestVersion: check.latestVersion,
                };

                installedList.push(item);
                if (check.hasUpdate) {
                    updatesList.push(item);
                }
            }

            this.cachedInstalled = installedList;
            this.cachedUpdates = updatesList;

            // 若当前处于搜索模式，更新搜索列表各项的安装与更新状态
            if (this.isSearching && this.searchResults.length > 0) {
                for (const item of this.searchResults) {
                    const isInst = this.extensionManager.isInstalled(item.info.id);
                    item.isInstalled = isInst;
                    item.installedVersion = this.extensionManager.getInstalledVersion(item.info.id);
                    if (isInst) {
                        const check = await this.extensionManager.checkUpdate(item.info.id);
                        item.hasUpdate = check.hasUpdate;
                        item.latestVersion = check.latestVersion;
                    } else {
                        item.hasUpdate = false;
                        item.latestVersion = undefined;
                    }
                }
            }
        } finally {
            this.isLoading = false;
            this.updateViewHtml();
        }
    }

    /**
     * 初始渲染完整文档；之后的更新以增量 patch 消息发送，保留滚动/焦点/输入。
     */
    updateViewHtml(): void {
        if (!this.view) {
            return;
        }
        if (!this.initialized) {
            this.renderFullDocument();
            this.initialized = true;
            return;
        }
        this.sendPatch();
    }

    private buildViewData(): SidebarViewData {
        let codiconsUri: string | undefined;
        let sidebarCssUri: string | undefined;
        let nativeBaseCssUri: string | undefined;
        if (this.view && this.extensionUri && vscodeModule) {
            codiconsUri = this.view.webview
                .asWebviewUri(
                    vscodeModule.Uri.joinPath(
                        this.extensionUri,
                        MEDIA_DIR,
                        'codicons',
                        'codicon.css',
                    ),
                )
                .toString();
            nativeBaseCssUri = this.view.webview
                .asWebviewUri(
                    vscodeModule.Uri.joinPath(this.extensionUri, MEDIA_DIR, 'native-base.css'),
                )
                .toString();
            sidebarCssUri = this.view.webview
                .asWebviewUri(
                    vscodeModule.Uri.joinPath(this.extensionUri, MEDIA_DIR, 'sidebar.css'),
                )
                .toString();
        }

        return {
            searchQuery: this.searchQuery,
            isSearching: this.isSearching,
            isLoading: this.isLoading,
            searchResults: this.searchResults,
            updates: this.cachedUpdates,
            installed: this.cachedInstalled,
            cspSource: this.view?.webview.cspSource,
            codiconsUri,
            nativeBaseCssUri,
            sidebarCssUri,
        };
    }

    private renderFullDocument(): void {
        const data = this.buildViewData();
        if (!this.view) {
            return;
        }
        this.view.webview.html = getSidebarViewHtml(data);
        this.renderedRows = renderSidebarRows(data);
        this.renderedEmptyMessage = getSidebarEmptyMessage(data);
    }

    private sendPatch(): void {
        if (!this.view) {
            return;
        }
        const data = this.buildViewData();
        const nextRows = renderSidebarRows(data);
        const nextEmptyMessage = getSidebarEmptyMessage(data);
        const ops = computeRowPatch(this.renderedRows, nextRows);
        this.renderedRows = nextRows;

        if (ops.length === 0 && nextEmptyMessage === this.renderedEmptyMessage) {
            return;
        }
        this.renderedEmptyMessage = nextEmptyMessage;
        this.view.webview.postMessage({
            type: 'sidebarPatch',
            ops,
            emptyMessage: nextEmptyMessage,
        });
    }

    /**
     * Webview 文档加载完成后握手：发送完整行状态（重载后恢复内容）。
     */
    private handleWebviewReady(): void {
        if (!this.view) {
            return;
        }
        const data = this.buildViewData();
        this.renderedRows = renderSidebarRows(data);
        this.renderedEmptyMessage = getSidebarEmptyMessage(data);
        this.view.webview.postMessage({
            type: 'sidebarReset',
            rows: this.renderedRows,
            emptyMessage: this.renderedEmptyMessage,
        });
    }

    /**
     * 在缓存和搜索结果中查找扩展
     */
    private findExtension(extensionId: string): SidebarExtensionItem | undefined {
        const idLower = extensionId.toLowerCase();
        return (
            this.searchResults.find((i) => i.info.id.toLowerCase() === idLower) ||
            this.cachedUpdates.find((i) => i.info.id.toLowerCase() === idLower) ||
            this.cachedInstalled.find((i) => i.info.id.toLowerCase() === idLower)
        );
    }

    // 供测试调用的访问器
    getSearchQuery(): string {
        return this.searchQuery;
    }

    getIsSearching(): boolean {
        return this.isSearching;
    }

    getSearchResults(): SidebarExtensionItem[] {
        return this.searchResults;
    }

    getCachedInstalled(): SidebarExtensionItem[] {
        return this.cachedInstalled;
    }

    getCachedUpdates(): SidebarExtensionItem[] {
        return this.cachedUpdates;
    }
}

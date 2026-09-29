import type * as vscode from 'vscode';
import { ExtensionInfo } from '../models/index';
import { ExtensionManager } from '../extension/ExtensionManager';
import { ExtensionRepository } from '../repository/ExtensionRepository';
import {
    CategoryTreeItem,
    ExtensionTreeItem,
    TreeItemNode,
} from './ExtensionTreeItem';

let EventEmitterClass: any;
try {
    const vscodeModule = require('vscode');
    EventEmitterClass = vscodeModule.EventEmitter;
} catch {
    EventEmitterClass = class {
        private listeners: Array<(e: any) => any> = [];
        event = (listener: any) => {
            this.listeners.push(listener);
            return { dispose: () => {} };
        };
        fire(data: any) {
            this.listeners.forEach((l) => l(data));
        }
        dispose() {}
    };
}

export class ExtensionTreeDataProvider
    implements vscode.TreeDataProvider<TreeItemNode>
{
    private _onDidChangeTreeData: vscode.EventEmitter<
        TreeItemNode | undefined | null | void
    > = new EventEmitterClass();
    readonly onDidChangeTreeData: vscode.Event<
        TreeItemNode | undefined | null | void
    > = this._onDidChangeTreeData.event;

    private installedCache: ExtensionInfo[] | null = null;
    private updatesCache: Array<{
        extension: ExtensionInfo;
        latestVersion: string;
    }> | null = null;

    private searchQuery: string = '';
    private searchResults: ExtensionInfo[] = [];

    constructor(
        private readonly extensionManager: ExtensionManager,
        private readonly repository?: ExtensionRepository,
    ) {}

    /**
     * 刷新视图
     */
    refresh(): void {
        this.installedCache = null;
        this.updatesCache = null;
        this._onDidChangeTreeData.fire();
    }

    /**
     * 设置搜索结果并更新视图
     */
    setSearchResults(query: string, results: ExtensionInfo[]): void {
        this.searchQuery = query;
        this.searchResults = results;
        this._onDidChangeTreeData.fire();
    }

    /**
     * 清空搜索结果
     */
    clearSearch(): void {
        this.searchQuery = '';
        this.searchResults = [];
        this._onDidChangeTreeData.fire();
    }

    /**
     * 执行搜索并自动刷新搜索结果节点
     */
    async performSearch(query: string): Promise<ExtensionInfo[]> {
        if (!this.repository || !query.trim()) {
            this.clearSearch();
            return [];
        }
        const res = await this.repository.search(query.trim(), 50);
        // 标记搜索结果中已安装状态
        const mapped = res.extensions.map((ext) => {
            const isInstalled = this.extensionManager.isInstalled(ext.id);
            return {
                ...ext,
                isInstalled,
                installedVersion: isInstalled
                    ? this.extensionManager.getInstalledVersion(ext.id)
                    : undefined,
            };
        });
        this.setSearchResults(query.trim(), mapped);
        return mapped;
    }

    getTreeItem(element: TreeItemNode): vscode.TreeItem {
        return element as any;
    }

    async getChildren(element?: TreeItemNode): Promise<TreeItemNode[]> {
        if (!element) {
            return this.getRootCategories();
        }

        if (element instanceof CategoryTreeItem) {
            return this.getCategoryChildren(element);
        }

        return [];
    }

    /**
     * 获取顶层分类节点
     */
    private async getRootCategories(): Promise<CategoryTreeItem[]> {
        if (this.installedCache === null) {
            this.installedCache =
                this.extensionManager.getInstalledExtensions();
        }

        if (this.updatesCache === null) {
            this.updatesCache = await this.checkAllUpdates(this.installedCache);
        }

        const categories: CategoryTreeItem[] = [];

        // 1. 如果有可用更新，优先展示可用更新
        if (this.updatesCache.length > 0) {
            categories.push(
                new CategoryTreeItem(
                    'updates',
                    '可用更新',
                    this.updatesCache.length,
                ),
            );
        }

        // 2. 如果存在搜索结果或搜索词，展示搜索结果
        if (this.searchResults.length > 0 || this.searchQuery) {
            categories.push(
                new CategoryTreeItem(
                    'searchResults',
                    `搜索结果: "${this.searchQuery}"`,
                    this.searchResults.length,
                ),
            );
        }

        // 3. 展示已安装扩展
        categories.push(
            new CategoryTreeItem(
                'installed',
                '已安装',
                this.installedCache.length,
            ),
        );

        return categories;
    }

    /**
     * 获取某一分类下的子扩展节点
     */
    private getCategoryChildren(category: CategoryTreeItem): ExtensionTreeItem[] {
        switch (category.categoryType) {
            case 'updates':
                return (this.updatesCache || []).map(
                    (u) =>
                        new ExtensionTreeItem(
                            u.extension,
                            'updates',
                            u.latestVersion,
                        ),
                );
            case 'searchResults':
                return this.searchResults.map(
                    (ext) => new ExtensionTreeItem(ext, 'searchResults'),
                );
            case 'installed':
                return (this.installedCache || []).map(
                    (ext) => new ExtensionTreeItem(ext, 'installed'),
                );
            default:
                return [];
        }
    }

    /**
     * 检查所有已安装扩展的更新
     */
    private async checkAllUpdates(
        installed: ExtensionInfo[],
    ): Promise<Array<{ extension: ExtensionInfo; latestVersion: string }>> {
        const results = await Promise.allSettled(
            installed.map(async (ext) => {
                const res = await this.extensionManager.checkUpdate(ext.id);
                return { ext, res };
            }),
        );

        const updates: Array<{
            extension: ExtensionInfo;
            latestVersion: string;
        }> = [];

        for (const item of results) {
            if (item.status === 'fulfilled') {
                const { ext, res } = item.value;
                if (res.hasUpdate && res.latestVersion) {
                    updates.push({
                        extension: ext,
                        latestVersion: res.latestVersion,
                    });
                }
            }
        }

        return updates;
    }
}

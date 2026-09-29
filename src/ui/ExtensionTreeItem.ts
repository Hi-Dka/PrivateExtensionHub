import type * as vscode from 'vscode';
import { ExtensionInfo } from '../models/index';

/**
 * 安全基类：在 VS Code 运行时继承原生 TreeItem，在 Node 测试环境中降级为普通类
 */
let TreeItemBase: typeof vscode.TreeItem;
try {
    const vscodeModule = require('vscode');
    TreeItemBase = vscodeModule.TreeItem;
} catch {
    TreeItemBase = class {
        label?: string;
        id?: string;
        description?: string;
        tooltip?: string;
        contextValue?: string;
        iconPath?: any;
        collapsibleState?: number;
        command?: any;
        constructor(label?: string, collapsibleState?: number) {
            this.label = label;
            this.collapsibleState = collapsibleState;
        }
    } as any;
}

export type CategoryType = 'updates' | 'searchResults' | 'installed';

/**
 * 分组根节点（如“可用更新”、“搜索结果”、“已安装”）
 */
export class CategoryTreeItem extends TreeItemBase {
    constructor(
        public readonly categoryType: CategoryType,
        public readonly title: string,
        count: number,
        collapsibleState: number = 2, // 2 = vscode.TreeItemCollapsibleState.Expanded
    ) {
        super(`${title} (${count})`, collapsibleState);
        this.id = `category:${categoryType}`;
        this.contextValue = `category-${categoryType}`;

        try {
            const vscodeModule = require('vscode');
            if (categoryType === 'updates') {
                this.iconPath = new vscodeModule.ThemeIcon('cloud-download');
            } else if (categoryType === 'searchResults') {
                this.iconPath = new vscodeModule.ThemeIcon('search');
            } else {
                this.iconPath = new vscodeModule.ThemeIcon('extensions');
            }
        } catch {
            // Node 测试环境忽略图标设置
        }
    }
}

/**
 * 具体的扩展叶子节点
 */
export class ExtensionTreeItem extends TreeItemBase {
    constructor(
        public readonly extension: ExtensionInfo,
        public readonly categoryType: CategoryType,
        public readonly targetVersion?: string,
    ) {
        super(extension.displayName || extension.name, 0); // 0 = vscode.TreeItemCollapsibleState.None

        this.id = `${categoryType}:${extension.id}`;

        if (categoryType === 'updates') {
            this.description = `v${extension.installedVersion || extension.version} → v${targetVersion || extension.version}`;
            this.tooltip = `${extension.displayName || extension.name} (${extension.id})\n当前版本: v${extension.installedVersion || extension.version}\n最新版本: v${targetVersion || extension.version}\n${extension.description}`;
            this.contextValue = 'extension-update';
        } else if (categoryType === 'installed') {
            this.description = `v${extension.installedVersion || extension.version}`;
            this.tooltip = `${extension.displayName || extension.name} (${extension.id})\n版本: v${extension.installedVersion || extension.version}\n${extension.description}`;
            this.contextValue = 'extension-installed';
        } else {
            // searchResults
            this.description = `v${extension.version} • ${extension.namespace}`;
            this.tooltip = `${extension.displayName || extension.name} (${extension.id})\n版本: v${extension.version}\n发布者: ${extension.namespace}\n${extension.description}`;
            this.contextValue = extension.isInstalled
                ? 'extension-installed'
                : 'extension-uninstalled';
        }

        try {
            const vscodeModule = require('vscode');
            if (categoryType === 'updates') {
                this.iconPath = new vscodeModule.ThemeIcon('arrow-up');
            } else if (extension.isInstalled) {
                this.iconPath = new vscodeModule.ThemeIcon('check');
            } else {
                this.iconPath = new vscodeModule.ThemeIcon('extensions');
            }
        } catch {
            // Node 测试环境忽略图标设置
        }

        // 单击该树项时，打开扩展详情页面
        this.command = {
            command: 'hidka.openExtensionDetail',
            title: '打开扩展详情',
            arguments: [this],
        };
    }
}

export type TreeItemNode = CategoryTreeItem | ExtensionTreeItem;

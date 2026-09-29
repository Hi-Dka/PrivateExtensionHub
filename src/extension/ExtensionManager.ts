import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { ExtensionInfo } from '../models/index';
import { ExtensionRepository } from '../repository/index';

/**
 * 宿主环境接口抽象，便于解耦和单元测试
 */
export interface IVscodeHost {
    getAllExtensions(): Array<{
        id: string;
        packageJSON?: {
            name?: string;
            publisher?: string;
            version?: string;
            displayName?: string;
            description?: string;
        };
    }>;
    executeCommand(command: string, ...rest: any[]): Promise<any>;
}

/**
 * 默认宿主环境实现（动态获取 vscode API）
 */
export function getDefaultVscodeHost(): IVscodeHost {
    try {
        const vscode = require('vscode');
        return {
            getAllExtensions: () => vscode.extensions.all,
            executeCommand: (cmd, ...args) =>
                vscode.commands.executeCommand(cmd, ...args),
        };
    } catch {
        return {
            getAllExtensions: () => [],
            executeCommand: async () => undefined as any,
        };
    }
}

export interface UpdateCheckResult {
    hasUpdate: boolean;
    currentVersion?: string;
    latestVersion?: string;
}

export class ExtensionManager {
    constructor(
        private readonly repository: ExtensionRepository,
        private readonly vscodeHost: IVscodeHost = getDefaultVscodeHost(),
    ) {}

    /**
     * 获取所有当前已安装的扩展
     */
    getInstalledExtensions(): ExtensionInfo[] {
        const raw = this.vscodeHost.getAllExtensions();
        return raw.map((ext) => {
            const pkg = ext.packageJSON || {};
            const [namespace, name] = ext.id.includes('.')
                ? ext.id.split('.')
                : ['', ext.id];
            return {
                id: ext.id.toLowerCase(),
                namespace: pkg.publisher || namespace,
                name: pkg.name || name,
                displayName: pkg.displayName || pkg.name || ext.id,
                version: pkg.version || '0.0.0',
                description: pkg.description || '',
                downloadCount: 0,
                isInstalled: true,
                installedVersion: pkg.version,
            };
        });
    }

    /**
     * 判断某个扩展是否已安装
     */
    isInstalled(id: string): boolean {
        const target = id.toLowerCase();
        return this.vscodeHost
            .getAllExtensions()
            .some((ext) => ext.id.toLowerCase() === target);
    }

    /**
     * 获取某个已安装扩展的版本号
     */
    getInstalledVersion(id: string): string | undefined {
        const target = id.toLowerCase();
        const ext = this.vscodeHost
            .getAllExtensions()
            .find((e) => e.id.toLowerCase() === target);
        return ext?.packageJSON?.version;
    }

    /**
     * 检测某个扩展是否有可用更新
     */
    async checkUpdate(id: string): Promise<UpdateCheckResult> {
        const currentVersion = this.getInstalledVersion(id);
        if (!currentVersion) {
            return { hasUpdate: false };
        }

        const [namespace, name] = id.includes('.') ? id.split('.') : ['', id];
        if (!namespace || !name) {
            return { hasUpdate: false, currentVersion };
        }

        const remote = await this.repository.getExtension(namespace, name);
        if (!remote || !remote.version) {
            return { hasUpdate: false, currentVersion };
        }

        const hasUpdate = this.isNewerVersion(remote.version, currentVersion);
        return {
            hasUpdate,
            currentVersion,
            latestVersion: remote.version,
        };
    }

    /**
     * 下载并安装指定扩展
     */
    async install(
        namespace: string,
        name: string,
        version?: string,
    ): Promise<void> {
        let targetVersion = version;

        if (!targetVersion) {
            const ext = await this.repository.getExtension(namespace, name);
            if (!ext || !ext.version) {
                throw new Error(
                    `Extension not found in repository: ${namespace}.${name}`,
                );
            }
            targetVersion = ext.version;
        }

        const downloadUrl = await this.repository.getDownloadUrl(
            namespace,
            name,
            targetVersion,
        );

        const tempFilePath = path.join(
            os.tmpdir(),
            `${namespace}.${name}-${targetVersion}-${Date.now()}.vsix`,
        );

        try {
            const response = await fetch(downloadUrl);
            if (!response.ok) {
                throw new Error(
                    `Failed to download VSIX: HTTP ${response.status} ${response.statusText}`,
                );
            }

            const buffer = Buffer.from(await response.arrayBuffer());
            await fs.promises.writeFile(tempFilePath, buffer);

            // 构造 vscode.Uri 实例（必须是真实的 vscode.Uri 对象，否则无法通过 VS Code 命令参数校验）
            let fileUri: any;
            try {
                const vscodeModule = require('vscode');
                fileUri = vscodeModule.Uri.file(tempFilePath);
            } catch {
                fileUri = {
                    fsPath: tempFilePath,
                    scheme: 'file',
                    path: tempFilePath,
                };
            }

            await this.vscodeHost.executeCommand(
                'workbench.extensions.installExtension',
                fileUri,
            );
        } finally {
            // 始终清理临时 VSIX 文件
            try {
                if (fs.existsSync(tempFilePath)) {
                    await fs.promises.unlink(tempFilePath);
                }
            } catch {
                // 忽略清理失败异常
            }
        }
    }

    /**
     * 卸载指定扩展
     */
    async uninstall(id: string): Promise<void> {
        await this.vscodeHost.executeCommand(
            'workbench.extensions.uninstallExtension',
            id,
        );
    }

    /**
     * 语义化版本比对（remote 是否高于 local）
     */
    private isNewerVersion(remote: string, local: string): boolean {
        const clean = (v: string) =>
            v
                .replace(/^v/, '')
                .split('-')[0]
                .split('.')
                .map((num) => parseInt(num, 10) || 0);

        const rParts = clean(remote);
        const lParts = clean(local);

        for (let i = 0; i < Math.max(rParts.length, lParts.length); i++) {
            const r = rParts[i] ?? 0;
            const l = lParts[i] ?? 0;
            if (r > l) {
                return true;
            }
            if (r < l) {
                return false;
            }
        }
        return false;
    }
}

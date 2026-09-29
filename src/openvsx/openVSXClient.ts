import { OpenVSXExtension, OpenVSXSearchResult } from './models/index';
import { ExtensionManifest } from '../models/index';

export interface ILogger {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string | Error, ...args: any[]): void;
}

export class OpenVSXClient {
    private readonly baseUrl: string;
    private readonly logger?: ILogger;

    constructor(baseUrl: string, logger?: ILogger) {
        this.baseUrl = baseUrl.replace(/\/+$/, '');
        this.logger = logger;
    }

    /**
     * 搜索扩展
     */
    async search(
        query: string,
        size = 20,
        offset = 0,
    ): Promise<OpenVSXSearchResult> {
        const params = new URLSearchParams({
            query,
            size: String(size),
            offset: String(offset),
        });

        this.logger?.info(
            `[OpenVSX] 正在搜索扩展: query="${query}", size=${size}, offset=${offset}`,
        );

        return this.request<OpenVSXSearchResult>(
            `/api/-/search?${params.toString()}`,
        );
    }

    /**
     * 获取扩展详情
     */
    async getExtension(
        namespace: string,
        name: string,
    ): Promise<OpenVSXExtension> {
        this.logger?.info(
            `[OpenVSX] 正在获取扩展详情: ${namespace}.${name}`,
        );

        return this.request<OpenVSXExtension>(
            `/api/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`,
        );
    }

    /**
     * 获取扩展所有可用版本号列表
     */
    async getVersions(namespace: string, name: string): Promise<string[]> {
        this.logger?.info(
            `[OpenVSX] 正在获取版本列表: ${namespace}.${name}`,
        );

        const result = await this.getExtension(namespace, name);

        if (result.allVersions && Object.keys(result.allVersions).length > 0) {
            const versions = Object.keys(result.allVersions).filter(
                (ver) => ver !== 'latest' && ver !== 'pre-release',
            );
            this.logger?.info(
                `[OpenVSX] 获取到 ${versions.length} 个版本: ${namespace}.${name}`,
            );
            return versions;
        }

        const fallback = result.version ? [result.version] : [];
        this.logger?.info(
            `[OpenVSX] 使用当前版本作为回退: ${namespace}.${name}@${fallback[0] ?? 'unknown'}`,
        );
        return fallback;
    }

    /**
     * 获取指定版本的 VSIX 下载地址
     */
    async getDownloadUrl(
        namespace: string,
        name: string,
        version: string,
    ): Promise<string> {
        this.logger?.info(
            `[OpenVSX] 正在解析 VSIX 下载地址: ${namespace}.${name}@${version}`,
        );

        let downloadUrl: string | undefined;
        const extension = await this.getExtension(namespace, name);

        if (extension.version === version && extension.files?.download) {
            downloadUrl = extension.files.download;
        } else {
            const versionDetail = await this.request<OpenVSXExtension>(
                `/api/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
            );
            downloadUrl = versionDetail.files?.download;
        }

        if (!downloadUrl) {
            const errMsg = `VSIX download URL not found: ${namespace}.${name}@${version}`;
            this.logger?.error(`[OpenVSX] ${errMsg}`);
            throw new Error(errMsg);
        }

        this.logger?.info(`[OpenVSX] 下载链接已获取: ${downloadUrl}`);
        return downloadUrl;
    }

    /**
     * 获取 README 文档
     */
    async getReadme(
        namespace: string,
        name: string,
        version?: string,
    ): Promise<string> {
        this.logger?.info(
            `[OpenVSX] 正在获取 README: ${namespace}.${name}@${version ?? 'latest'}`,
        );

        let readmeUrl: string | undefined;

        if (!version) {
            const extension = await this.getExtension(namespace, name);
            readmeUrl = extension.files?.readme;
        } else {
            const versionDetail = await this.request<OpenVSXExtension>(
                `/api/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
            );
            readmeUrl = versionDetail.files?.readme;
        }

        if (!readmeUrl) {
            const errMsg = `README not found: ${namespace}.${name}@${version ?? 'latest'}`;
            this.logger?.error(`[OpenVSX] ${errMsg}`);
            throw new Error(errMsg);
        }

        const startTime = Date.now();
        this.logger?.info(`[HTTP] GET README 内容: ${readmeUrl}`);
        const response = await fetch(readmeUrl);
        const duration = Date.now() - startTime;

        if (!response.ok) {
            this.logger?.error(
                `[HTTP] README 请求失败: HTTP ${response.status} ${response.statusText} (${duration}ms)`,
            );
            throw new Error(
                `Failed to fetch README: ${response.status} ${response.statusText}`,
            );
        }

        const text = await response.text();
        this.logger?.info(
            `[OpenVSX] README 获取成功，共 ${text.length} 字符 (${duration}ms)`,
        );
        return text;
    }

    /**
     * 获取 CHANGELOG 更新日志文档
     */
    async getChangelog(
        namespace: string,
        name: string,
        version?: string,
    ): Promise<string | undefined> {
        this.logger?.info(
            `[OpenVSX] 正在获取 CHANGELOG: ${namespace}.${name}@${version ?? 'latest'}`,
        );

        let changelogUrl: string | undefined;

        if (!version) {
            const extension = await this.getExtension(namespace, name);
            changelogUrl = extension.files?.changelog;
        } else {
            const versionDetail = await this.request<OpenVSXExtension>(
                `/api/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
            );
            changelogUrl = versionDetail.files?.changelog;
        }

        if (!changelogUrl) {
            this.logger?.info(
                `[OpenVSX] CHANGELOG 未提供: ${namespace}.${name}@${version ?? 'latest'}`,
            );
            return undefined;
        }

        const startTime = Date.now();
        this.logger?.info(`[HTTP] GET CHANGELOG 内容: ${changelogUrl}`);
        const response = await fetch(changelogUrl);
        const duration = Date.now() - startTime;

        if (!response.ok) {
            this.logger?.warn(
                `[HTTP] CHANGELOG 请求失败: HTTP ${response.status} ${response.statusText} (${duration}ms)`,
            );
            return undefined;
        }

        const text = await response.text();
        this.logger?.info(
            `[OpenVSX] CHANGELOG 获取成功，共 ${text.length} 字符 (${duration}ms)`,
        );
        return text;
    }

    /**
     * 获取扩展清单 (package.json)
     */
    async getManifest(
        namespace: string,
        name: string,
        version?: string,
    ): Promise<ExtensionManifest | undefined> {
        this.logger?.info(
            `[OpenVSX] 正在获取 Manifest: ${namespace}.${name}@${version ?? 'latest'}`,
        );

        let manifestUrl: string | undefined;

        if (!version) {
            const extension = await this.getExtension(namespace, name);
            manifestUrl = extension.files?.manifest;
        } else {
            const versionDetail = await this.request<OpenVSXExtension>(
                `/api/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
            );
            manifestUrl = versionDetail.files?.manifest;
        }

        if (!manifestUrl) {
            this.logger?.info(
                `[OpenVSX] Manifest 未提供: ${namespace}.${name}@${version ?? 'latest'}`,
            );
            return undefined;
        }

        const startTime = Date.now();
        this.logger?.info(`[HTTP] GET Manifest 内容: ${manifestUrl}`);
        const response = await fetch(manifestUrl);
        const duration = Date.now() - startTime;

        if (!response.ok) {
            this.logger?.warn(
                `[HTTP] Manifest 请求失败: HTTP ${response.status} ${response.statusText} (${duration}ms)`,
            );
            return undefined;
        }

        const manifest = (await response.json()) as ExtensionManifest;
        this.logger?.info(
            `[OpenVSX] Manifest 获取成功 (${duration}ms)`,
        );
        return manifest;
    }

    /**
     * 通用 HTTP 请求
     */
    private async request<T>(path: string): Promise<T> {
        const url = `${this.baseUrl}${path}`;
        const startTime = Date.now();

        this.logger?.info(`[HTTP] 发起请求: GET ${url}`);

        try {
            const response = await fetch(url);
            const duration = Date.now() - startTime;

            if (!response.ok) {
                this.logger?.error(
                    `[HTTP] 请求失败: HTTP ${response.status} ${response.statusText} (${duration}ms) - ${url}`,
                );
                throw new OpenVSXError(response.status, response.statusText, url);
            }

            this.logger?.info(
                `[HTTP] 请求成功: HTTP ${response.status} OK (${duration}ms) - ${url}`,
            );
            return response.json() as T;
        } catch (error) {
            if (!(error instanceof OpenVSXError)) {
                this.logger?.error(
                    `[HTTP] 网络请求异常 (${Date.now() - startTime}ms): ${error instanceof Error ? error.message : String(error)}`,
                );
            }
            throw error;
        }
    }
}

export class OpenVSXError extends Error {
    public readonly status: number;
    public readonly statusText: string;
    public readonly url: string;

    constructor(status: number, statusText: string, url: string) {
        super(`Open VSX request failed: ${status} ${statusText} - ${url}`);

        this.name = 'OpenVSXError';
        this.status = status;
        this.statusText = statusText;
        this.url = url;
    }
}

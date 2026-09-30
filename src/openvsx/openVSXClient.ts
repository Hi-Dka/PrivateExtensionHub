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
            `[OpenVSX] Searching extensions: query="${query}", size=${size}, offset=${offset}`,
        );

        return this.request<OpenVSXSearchResult>(
            `/api/-/search?${params.toString()}`,
        );
    }

    async getExtension(
        namespace: string,
        name: string,
    ): Promise<OpenVSXExtension> {
        this.logger?.info(
            `[OpenVSX] Fetching extension details: ${namespace}.${name}`,
        );

        return this.request<OpenVSXExtension>(
            `/api/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`,
        );
    }

    async getVersions(namespace: string, name: string): Promise<string[]> {
        this.logger?.info(
            `[OpenVSX] Fetching version list: ${namespace}.${name}`,
        );

        const result = await this.getExtension(namespace, name);

        if (result.allVersions && Object.keys(result.allVersions).length > 0) {
            const versions = Object.keys(result.allVersions).filter(
                (ver) => ver !== 'latest' && ver !== 'pre-release',
            );
            this.logger?.info(
                `[OpenVSX] Found ${versions.length} versions: ${namespace}.${name}`,
            );
            return versions;
        }

        const fallback = result.version ? [result.version] : [];
        this.logger?.info(
            `[OpenVSX] Using current version as fallback: ${namespace}.${name}@${fallback[0] ?? 'unknown'}`,
        );
        return fallback;
    }

    async getDownloadUrl(
        namespace: string,
        name: string,
        version: string,
    ): Promise<string> {
        this.logger?.info(
            `[OpenVSX] Resolving VSIX download URL: ${namespace}.${name}@${version}`,
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

        this.logger?.info(`[OpenVSX] Download URL resolved: ${downloadUrl}`);
        return downloadUrl;
    }

    async getReadme(
        namespace: string,
        name: string,
        version?: string,
    ): Promise<string> {
        this.logger?.info(
            `[OpenVSX] Fetching README: ${namespace}.${name}@${version ?? 'latest'}`,
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
        this.logger?.info(`[HTTP] GET README content: ${readmeUrl}`);
        const response = await fetch(readmeUrl);
        const duration = Date.now() - startTime;

        if (!response.ok) {
            this.logger?.error(
                `[HTTP] Failed to fetch README: HTTP ${response.status} ${response.statusText} (${duration}ms)`,
            );
            throw new Error(
                `Failed to fetch README: ${response.status} ${response.statusText}`,
            );
        }

        const text = await response.text();
        this.logger?.info(
            `[OpenVSX] README fetched successfully, ${text.length} characters (${duration}ms)`,
        );
        return text;
    }

    async getChangelog(
        namespace: string,
        name: string,
        version?: string,
    ): Promise<string | undefined> {
        this.logger?.info(
            `[OpenVSX] Fetching CHANGELOG: ${namespace}.${name}@${version ?? 'latest'}`,
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
                `[OpenVSX] CHANGELOG not provided: ${namespace}.${name}@${version ?? 'latest'}`,
            );
            return undefined;
        }

        const startTime = Date.now();
        this.logger?.info(`[HTTP] GET CHANGELOG content: ${changelogUrl}`);
        const response = await fetch(changelogUrl);
        const duration = Date.now() - startTime;

        if (!response.ok) {
            this.logger?.warn(
                `[HTTP] Failed to fetch CHANGELOG: HTTP ${response.status} ${response.statusText} (${duration}ms)`,
            );
            return undefined;
        }

        const text = await response.text();
        this.logger?.info(
            `[OpenVSX] CHANGELOG fetched successfully, ${text.length} characters (${duration}ms)`,
        );
        return text;
    }

    async getManifest(
        namespace: string,
        name: string,
        version?: string,
    ): Promise<ExtensionManifest | undefined> {
        this.logger?.info(
            `[OpenVSX] Fetching manifest: ${namespace}.${name}@${version ?? 'latest'}`,
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
                `[OpenVSX] Manifest not provided: ${namespace}.${name}@${version ?? 'latest'}`,
            );
            return undefined;
        }

        const startTime = Date.now();
        this.logger?.info(`[HTTP] GET Manifest content: ${manifestUrl}`);
        const response = await fetch(manifestUrl);
        const duration = Date.now() - startTime;

        if (!response.ok) {
            this.logger?.warn(
                `[HTTP] Failed to fetch manifest: HTTP ${response.status} ${response.statusText} (${duration}ms)`,
            );
            return undefined;
        }

        const manifest = (await response.json()) as ExtensionManifest;
        this.logger?.info(
            `[OpenVSX] Manifest fetched successfully (${duration}ms)`,
        );
        return manifest;
    }

    private async request<T>(path: string): Promise<T> {
        const url = `${this.baseUrl}${path}`;
        const startTime = Date.now();

        this.logger?.info(`[HTTP] Sending request: GET ${url}`);

        try {
            const response = await fetch(url);
            const duration = Date.now() - startTime;

            if (!response.ok) {
                this.logger?.error(
                    `[HTTP] Request failed: HTTP ${response.status} ${response.statusText} (${duration}ms) - ${url}`,
                );
                throw new OpenVSXError(response.status, response.statusText, url);
            }

            this.logger?.info(
                `[HTTP] Request succeeded: HTTP ${response.status} OK (${duration}ms) - ${url}`,
            );
            return response.json() as T;
        } catch (error) {
            if (!(error instanceof OpenVSXError)) {
                this.logger?.error(
                    `[HTTP] Network request error (${Date.now() - startTime}ms): ${error instanceof Error ? error.message : String(error)}`,
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

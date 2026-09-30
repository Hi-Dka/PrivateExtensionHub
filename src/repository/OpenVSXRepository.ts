import { OpenVSXClient, OpenVSXError } from '../openvsx/openVSXClient';
import { OpenVSXExtension } from '../openvsx/models/index';
import { ExtensionInfo, ExtensionManifest } from '../models/index';
import { ExtensionRepository, SearchResult } from './ExtensionRepository';

export class OpenVSXRepository implements ExtensionRepository {
    private readonly changelogCache = new Map<string, string | undefined>();
    private readonly manifestCache = new Map<string, ExtensionManifest | undefined>();

    constructor(private readonly client: OpenVSXClient) {}

    /**
     * 搜索扩展并映射为标准化领域模型列表
     */
    async search(
        query: string,
        size = 20,
        offset = 0,
    ): Promise<SearchResult<ExtensionInfo>> {
        const result = await this.client.search(query, size, offset);
        const extensions = (result.extensions || []).map((ext) =>
            this.mapToExtensionInfo(ext),
        );
        return {
            extensions,
            total: result.totalSize ?? extensions.length,
        };
    }

    /**
     * 获取单个扩展详情，若 404 则返回 undefined
     */
    async getExtension(
        namespace: string,
        name: string,
    ): Promise<ExtensionInfo | undefined> {
        try {
            const ext = await this.client.getExtension(namespace, name);
            return this.mapToExtensionInfo(ext);
        } catch (err) {
            if (err instanceof OpenVSXError && err.status === 404) {
                return undefined;
            }
            throw err;
        }
    }

    /**
     * 获取扩展所有可用版本号列表
     */
    async getVersions(namespace: string, name: string): Promise<string[]> {
        return this.client.getVersions(namespace, name);
    }

    /**
     * 获取指定版本的 VSIX 下载链接
     */
    async getDownloadUrl(
        namespace: string,
        name: string,
        version: string,
    ): Promise<string> {
        return this.client.getDownloadUrl(namespace, name, version);
    }

    /**
     * 获取扩展的 README 文档内容
     */
    async getReadme(
        namespace: string,
        name: string,
        version?: string,
    ): Promise<string> {
        return this.client.getReadme(namespace, name, version);
    }

    /**
     * 获取扩展的 CHANGELOG 更新日志，带内存缓存
     */
    async getChangelog(
        namespace: string,
        name: string,
        version?: string,
    ): Promise<string | undefined> {
        const cacheKey = `${namespace}.${name}@${version ?? 'latest'}`;
        if (this.changelogCache.has(cacheKey)) {
            return this.changelogCache.get(cacheKey);
        }
        const changelog = await this.client.getChangelog(
            namespace,
            name,
            version,
        );
        this.changelogCache.set(cacheKey, changelog);
        return changelog;
    }

    /**
     * 获取扩展的清单文件 (package.json)，带内存缓存
     */
    async getManifest(
        namespace: string,
        name: string,
        version?: string,
    ): Promise<ExtensionManifest | undefined> {
        const cacheKey = `${namespace}.${name}@${version ?? 'latest'}`;
        if (this.manifestCache.has(cacheKey)) {
            return this.manifestCache.get(cacheKey);
        }
        const manifest = await this.client.getManifest(
            namespace,
            name,
            version,
        );
        this.manifestCache.set(cacheKey, manifest);
        return manifest;
    }

    /**
     * 将 Open VSX 原始 DTO 转换为业务领域实体 ExtensionInfo
     */
    private mapToExtensionInfo(dto: OpenVSXExtension): ExtensionInfo {
        return {
            id: `${dto.namespace}.${dto.name}`,
            namespace: dto.namespace,
            name: dto.name,
            displayName: dto.displayName || dto.name,
            version: dto.version,
            description: dto.description || '',
            publisherName:
                dto.publishedBy?.displayName ||
                dto.publishedBy?.loginName ||
                dto.namespace,
            publisherDisplayName:
                dto.publishedBy?.displayName ||
                dto.namespaceDisplayName ||
                dto.publishedBy?.fullName,
            iconUrl: dto.files?.icon,
            repositoryUrl: dto.repository || dto.homepage,
            homepageUrl: dto.homepage,
            bugsUrl: dto.bugs,
            downloadUrl: dto.files?.download,
            downloadCount: dto.downloadCount ?? 0,
            rating:
                dto.averageRating !== undefined && dto.averageRating !== null
                    ? Math.round(dto.averageRating * 10) / 10
                    : undefined,
            ratingCount: dto.reviewCount,
            categories: dto.categories && dto.categories.length > 0 ? dto.categories : undefined,
            tags: dto.tags && dto.tags.length > 0 ? dto.tags : undefined,
            license: dto.license,
            timestamp: dto.timestamp,
            verified: dto.verified,
            isPreRelease: dto.preRelease,
            preview: dto.preview,
            engines: dto.engines,
        };
    }
}

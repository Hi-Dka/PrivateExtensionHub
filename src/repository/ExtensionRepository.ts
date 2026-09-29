import { ExtensionInfo, ExtensionManifest } from '../models/index';

export interface SearchResult<T> {
    extensions: T[];
    total: number;
}

export interface ExtensionRepository {
    /**
     * 搜索扩展并返回标准化业务模型列表
     * @param query 搜索关键词
     * @param size 每页大小，默认为 20
     * @param offset 分页偏移量，默认为 0
     */
    search(
        query: string,
        size?: number,
        offset?: number,
    ): Promise<SearchResult<ExtensionInfo>>;

    /**
     * 获取单个扩展的详情实体
     * @param namespace 发布者命名空间
     * @param name 扩展名称
     */
    getExtension(
        namespace: string,
        name: string,
    ): Promise<ExtensionInfo | undefined>;

    /**
     * 获取扩展的所有可用版本号列表
     * @param namespace 发布者命名空间
     * @param name 扩展名称
     */
    getVersions(namespace: string, name: string): Promise<string[]>;

    /**
     * 获取指定版本的 VSIX 下载链接
     * @param namespace 发布者命名空间
     * @param name 扩展名称
     * @param version 版本号
     */
    getDownloadUrl(
        namespace: string,
        name: string,
        version: string,
    ): Promise<string>;

    /**
     * 获取扩展的 README 说明文档
     * @param namespace 发布者命名空间
     * @param name 扩展名称
     * @param version 可选指定版本号，未传时默认获取最新版
     */
    getReadme(
        namespace: string,
        name: string,
        version?: string,
    ): Promise<string>;

    /**
     * 获取扩展的 CHANGELOG 更新日志
     * @param namespace 发布者命名空间
     * @param name 扩展名称
     * @param version 可选指定版本号，未传时默认获取最新版
     */
    getChangelog(
        namespace: string,
        name: string,
        version?: string,
    ): Promise<string | undefined>;

    /**
     * 获取扩展的清单文件 (package.json)
     * @param namespace 发布者命名空间
     * @param name 扩展名称
     * @param version 可选指定版本号，未传时默认获取最新版
     */
    getManifest(
        namespace: string,
        name: string,
        version?: string,
    ): Promise<ExtensionManifest | undefined>;
}

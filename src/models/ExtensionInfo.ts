export interface ExtensionInfo {
    /**
     * 全局唯一标识符，格式为 `${namespace}.${name}` (例如: `redhat.java`)
     */
    id: string;

    /**
     * 扩展发布者命名空间 (例如: `redhat`)
     */
    namespace: string;

    /**
     * 扩展名称 (例如: `java`)
     */
    name: string;

    /**
     * 显示名称 (如果发布者未提供，默认回退为 name)
     */
    displayName: string;

    /**
     * 当前或最新版本号 (例如: `1.57.0`)
     */
    version: string;

    /**
     * 扩展简介描述
     */
    description: string;

    /**
     * 发布者显示名称
     */
    publisherName?: string;

    /**
     * 扩展图标 URL
     */
    iconUrl?: string;

    /**
     * 源码仓库 URL
     */
    repositoryUrl?: string;

    /**
     * 下载统计计数
     */
    downloadCount: number;

    /**
     * 用户评分 (0.0 ~ 5.0)
     */
    rating?: number;

    /**
     * 评价总数
     */
    ratingCount?: number;

    /**
     * 业务状态：本地是否已安装
     */
    isInstalled?: boolean;

    /**
     * 业务状态：本地已安装的版本号
     */
    installedVersion?: string;

    /**
     * 业务状态：是否有更新可用
     */
    hasUpdate?: boolean;
}

export interface ExtensionVersion {
    /**
     * 版本号字符串 (例如: `1.57.0`)
     */
    version: string;

    /**
     * VSIX 安装包直接下载链接
     */
    downloadUrl?: string;

    /**
     * 该版本的 README 文档地址
     */
    readmeUrl?: string;

    /**
     * 该版本的发布时间戳
     */
    timestamp?: string;

    /**
     * 目标运行平台 (例如: `universal`, `linux-x64`)
     */
    targetPlatform?: string;
}

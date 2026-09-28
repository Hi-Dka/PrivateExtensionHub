export interface OpenVSXExtension {
    namespace: string;
    name: string;

    version: string;
    displayName?: string;
    description?: string;

    publishedBy?: {
        loginName?: string;
        displayName?: string;
    };

    homepage?: string;
    repository?: string;

    downloadCount?: number;

    files?: {
        download?: string;
        readme?: string;
        changelog?: string;
        icon?: string;
    };

    allVersions?: Record<string, string>;
    allVersionsUrl?: string;
}

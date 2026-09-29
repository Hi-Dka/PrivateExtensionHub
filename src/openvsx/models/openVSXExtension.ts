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
    averageRating?: number;
    reviewCount?: number;

    files?: {
        download?: string;
        readme?: string;
        changelog?: string;
        icon?: string;
        manifest?: string;
    };

    allVersions?: Record<string, string>;
    allVersionsUrl?: string;
}

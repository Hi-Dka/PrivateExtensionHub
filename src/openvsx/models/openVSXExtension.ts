export interface OpenVSXPublishedBy {
    loginName?: string;
    fullName?: string;
    avatarUrl?: string;
    homepage?: string;
    provider?: string;
    displayName?: string;
}

export interface OpenVSXFiles {
    download?: string;
    readme?: string;
    changelog?: string;
    license?: string;
    icon?: string;
    signature?: string;
    manifest?: string;
    vsixmanifest?: string;
    sha256?: string;
    publicKey?: string;
}

export interface OpenVSXEngines {
    vscode?: string;
    node?: string;
    pnpm?: string;
    [key: string]: string | undefined;
}

export interface OpenVSXExtension {
    namespace: string;
    name: string;
    version: string;

    displayName?: string;
    description?: string;

    // Namespace & Publisher
    namespaceDisplayName?: string;
    namespaceUrl?: string;
    publishedBy?: OpenVSXPublishedBy;
    publishedWithTrustedPublishing?: boolean;
    verified?: boolean;

    // Links & Resources
    homepage?: string;
    repository?: string;
    bugs?: string;
    reviewsUrl?: string;
    sponsorLink?: string;

    // Metrics & Ratings
    downloadCount?: number;
    averageRating?: number;
    reviewCount?: number;

    // Status & Flags
    downloadable?: boolean;
    deprecated?: boolean;
    preview?: boolean;
    preRelease?: boolean;

    // Runtime & Compatibility
    engines?: OpenVSXEngines;
    targetPlatform?: string;
    extensionKind?: string[];

    // Metadata & Classification
    categories?: string[];
    tags?: string[];
    license?: string;
    localizedLanguages?: string[];
    bundledExtensions?: string[];
    dependencies?: string[];

    // Gallery theme & branding
    galleryColor?: string;
    galleryTheme?: string;

    // Timestamp
    timestamp?: string;

    // Files & Downloads
    files?: OpenVSXFiles;
    downloads?: Record<string, string>;

    // Versions
    allVersions?: Record<string, string>;
    allVersionsUrl?: string;
    versionAlias?: string[];
}

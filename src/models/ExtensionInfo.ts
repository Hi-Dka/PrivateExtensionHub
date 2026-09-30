import type { ExtensionEngines } from './ExtensionManifest';

export interface ExtensionInfo {
    // =========================================================================
    // 1. Core Identity & Presentation (Header & Summary)
    // =========================================================================

    /**
     * Unique identifier, format: `${namespace}.${name}` (e.g. `formulahendry.auto-rename-tag`)
     */
    id: string;

    /**
     * Extension publisher namespace (e.g. `formulahendry`)
     */
    namespace: string;

    /**
     * Extension name (e.g. `auto-rename-tag`)
     */
    name: string;

    /**
     * Display name (defaults to name if not provided)
     */
    displayName: string;

    /**
     * Current or latest version string (e.g. `0.1.10`)
     */
    version: string;

    /**
     * Extension short description
     */
    description: string;

    /**
     * Publisher login/account name
     */
    publisherName?: string;

    /**
     * Human-friendly publisher display name
     */
    publisherDisplayName?: string;

    /**
     * Whether publisher is verified
     */
    verified?: boolean;

    /**
     * Extension icon URL
     */
    iconUrl?: string;

    // =========================================================================
    // 2. Marketplace Cloud Metadata (Registry / Cloud)
    // =========================================================================

    /**
     * First published date in marketplace (ISO date string, Marketplace: Published)
     */
    publishedDate?: string;

    /**
     * Release timestamp of current/latest version (ISO date string, Marketplace: Last Released)
     */
    lastReleasedDate?: string;

    /**
     * Legacy alias for lastReleasedDate
     */
    timestamp?: string;

    /**
     * VSIX download package file size in bytes (Marketplace: Size)
     */
    packageSize?: number;

    /**
     * Legacy alias for packageSize
     */
    size?: number;

    /**
     * Total download count
     */
    downloadCount: number;

    /**
     * Average rating (0.0 ~ 5.0)
     */
    rating?: number;

    /**
     * Review / rating count
     */
    ratingCount?: number;

    /**
     * Categories
     */
    categories?: string[];

    /**
     * Keywords / tags
     */
    tags?: string[];

    /**
     * SPDX license identifier or license text
     */
    license?: string;

    /**
     * Source repository URL
     */
    repositoryUrl?: string;

    /**
     * Homepage / documentation URL
     */
    homepageUrl?: string;

    /**
     * Issue tracker URL
     */
    bugsUrl?: string;

    /**
     * Direct VSIX download URL
     */
    downloadUrl?: string;

    /**
     * Marketplace page URL
     */
    marketplaceUrl?: string;

    /**
     * Engine compatibility requirements
     */
    engines?: ExtensionEngines;

    /**
     * Whether extension is marked as preview
     */
    preview?: boolean;

    /**
     * Whether this version is a pre-release
     */
    isPreRelease?: boolean;

    // =========================================================================
    // 3. Local Installation Status (Client / Machine)
    // =========================================================================

    /**
     * Local installation status: whether installed on current machine
     */
    isInstalled?: boolean;

    /**
     * Local installation status: installed version string (Installation: Version)
     */
    installedVersion?: string;

    /**
     * Local installation status: when extension was installed or updated locally (Installation: Last Updated)
     */
    lastUpdated?: string;

    /**
     * Local installation status: disk space consumed by installed extension (Installation: Size)
     */
    installedSize?: number;

    /**
     * Local installation status: whether a newer version is available in marketplace
     */
    hasUpdate?: boolean;
}

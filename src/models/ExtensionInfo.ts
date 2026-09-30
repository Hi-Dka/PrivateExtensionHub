import type { ExtensionEngines } from './ExtensionManifest';

export interface ExtensionInfo {
    /**
     * Unique identifier, format: `${namespace}.${name}` (e.g. `redhat.java`)
     */
    id: string;

    /**
     * Extension publisher namespace (e.g. `redhat`)
     */
    namespace: string;

    /**
     * Extension name (e.g. `java`)
     */
    name: string;

    /**
     * Display name (defaults to name if not provided)
     */
    displayName: string;

    /**
     * Current or latest version string (e.g. `1.57.0`)
     */
    version: string;

    /**
     * Extension short description
     */
    description: string;

    /**
     * Publisher login/display name
     */
    publisherName?: string;

    /**
     * Human-friendly publisher display name
     */
    publisherDisplayName?: string;

    /**
     * Extension icon URL
     */
    iconUrl?: string;

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
     * Release timestamp of this version (ISO date string)
     */
    timestamp?: string;

    /**
     * Last updated timestamp (ISO date string)
     */
    lastUpdated?: string;

    /**
     * Published timestamp (ISO date string)
     */
    publishedDate?: string;

    /**
     * Engine compatibility requirements
     */
    engines?: ExtensionEngines;

    /**
     * Whether publisher is verified
     */
    verified?: boolean;

    /**
     * Whether this version is a pre-release
     */
    isPreRelease?: boolean;

    /**
     * Whether extension is marked as preview
     */
    preview?: boolean;

    /**
     * Package size in bytes
     */
    size?: number;

    /**
     * Marketplace page URL
     */
    marketplaceUrl?: string;

    /**
     * Local installation status: installed
     */
    isInstalled?: boolean;

    /**
     * Local installation status: installed version
     */
    installedVersion?: string;

    /**
     * Local installation status: has update
     */
    hasUpdate?: boolean;
}

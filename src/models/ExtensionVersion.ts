import type { ExtensionEngines } from './ExtensionManifest';

/**
 * Optional descriptor for historical extension versions.
 * Note: Core repository flows and interactive version selection (QuickPick)
 * operate directly on version strings (string[]). This descriptor is reserved
 * for future detailed version history views.
 */
export interface ExtensionVersion {
    /**
     * Version string (e.g. `1.57.0`)
     */
    version: string;

    /**
     * Release timestamp string of this specific version
     */
    releasedDate?: string;

    /**
     * Legacy alias for releasedDate
     */
    timestamp?: string;

    /**
     * VSIX package file size in bytes
     */
    packageSize?: number;

    /**
     * Legacy alias for packageSize
     */
    size?: number;

    /**
     * Target platform (e.g. `universal`, `linux-x64`)
     */
    targetPlatform?: string;

    /**
     * Engine compatibility requirements for this version
     */
    engines?: ExtensionEngines;

    /**
     * Direct VSIX download URL
     */
    downloadUrl?: string;

    /**
     * URL of the README file for this version
     */
    readmeUrl?: string;

    /**
     * URL of the CHANGELOG file for this version
     */
    changelogUrl?: string;

    /**
     * Whether this is the latest version
     */
    isLatest?: boolean;

    /**
     * Whether this is a pre-release version
     */
    isPreRelease?: boolean;
}

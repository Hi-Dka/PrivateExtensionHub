import type { ExtensionEngines } from './ExtensionManifest';

export interface ExtensionVersion {
    /**
     * Version string (e.g. `1.57.0`)
     */
    version: string;

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
     * Release timestamp string
     */
    timestamp?: string;

    /**
     * Target platform (e.g. `universal`, `linux-x64`)
     */
    targetPlatform?: string;

    /**
     * Engine compatibility requirements
     */
    engines?: ExtensionEngines;

    /**
     * Whether this is the latest version
     */
    isLatest?: boolean;

    /**
     * Whether this is a pre-release version
     */
    isPreRelease?: boolean;

    /**
     * Package size in bytes
     */
    size?: number;
}

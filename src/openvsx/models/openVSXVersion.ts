export interface OpenVSXVersion {
    version: string;
    targetPlatform?: string;
    timestamp?: string;
    url?: string;
    engines?: Record<string, string>;
    files?: {
        download?: string;
        readme?: string;
        changelog?: string;
        icon?: string;
        manifest?: string;
        [key: string]: string | undefined;
    };
}

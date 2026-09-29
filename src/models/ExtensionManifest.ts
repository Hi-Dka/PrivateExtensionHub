export interface ConfigurationProperty {
    id?: string;
    type?: string | string[];
    default?: any;
    description?: string;
    scope?: string;
    enum?: any[];
}

export interface ContributedCommand {
    command: string;
    title: string;
    category?: string;
}

export interface ExtensionManifest {
    name?: string;
    displayName?: string;
    version?: string;
    publisher?: string;
    description?: string;
    extensionDependencies?: string[];
    contributes?: {
        commands?: ContributedCommand[];
        configuration?:
            | {
                  title?: string;
                  properties?: Record<string, ConfigurationProperty>;
              }
            | Array<{
                  title?: string;
                  properties?: Record<string, ConfigurationProperty>;
              }>;
        [key: string]: any;
    };
    [key: string]: any;
}

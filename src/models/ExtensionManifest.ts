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
    icon?: string | { light?: string; dark?: string };
    enablement?: string;
}

export interface ContributedKeybinding {
    command: string;
    key?: string;
    mac?: string;
    linux?: string;
    win?: string;
    when?: string;
    args?: any;
}

export interface ExtensionBugsInfo {
    url?: string;
    email?: string;
}

export interface ExtensionRepositoryInfo {
    type?: string;
    url?: string;
}

export interface ExtensionBadge {
    url: string;
    href: string;
    description: string;
}

export interface ExtensionEngines {
    vscode?: string;
    [key: string]: string | undefined;
}

export interface ExtensionManifestContributes {
    commands?: ContributedCommand[];
    keybindings?: ContributedKeybinding[];
    configuration?:
        | {
              title?: string;
              properties?: Record<string, ConfigurationProperty>;
          }
        | Array<{
              title?: string;
              properties?: Record<string, ConfigurationProperty>;
          }>;
    menus?: Record<string, any[]>;
    submenus?: Array<{ id: string; label: string }>;
    views?: Record<string, any[]>;
    viewsContainers?: Record<string, any[]>;
    [key: string]: any;
}

export interface ExtensionManifest {
    name?: string;
    displayName?: string;
    version?: string;
    publisher?: string;
    description?: string;
    main?: string;
    browser?: string;
    preview?: boolean;
    icon?: string;
    categories?: string[];
    keywords?: string[];
    license?: string;
    homepage?: string;
    repository?: ExtensionRepositoryInfo | string;
    bugs?: ExtensionBugsInfo | string;
    qna?: string | false;
    badges?: ExtensionBadge[];
    engines?: ExtensionEngines;
    extensionDependencies?: string[];
    extensionPack?: string[];
    contributes?: ExtensionManifestContributes;
    [key: string]: any;
}

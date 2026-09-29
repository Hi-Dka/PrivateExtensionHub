import type { ExtensionInfo, ExtensionManifest } from '../models/index';

/**
 * Shared host <-> webview state and message types.
 * The host imports these type-only; the webview bundles use them at runtime.
 */

/** Item rendered by the sidebar list (mirrors the provider's cached data). */
export interface SidebarItem {
    info: ExtensionInfo;
    isInstalled: boolean;
    installedVersion?: string;
    hasUpdate: boolean;
    latestVersion?: string;
}

export interface SidebarState {
    isLoading: boolean;
    isSearching: boolean;
    query: string;
    items: SidebarItem[];
    emptyMessage: string | null;
}

export interface DetailState {
    extension: ExtensionInfo;
    manifest?: ExtensionManifest;
    /** README rendered by the host (markdown-it + relative image rewriting). */
    readmeHtml: string;
    changelogHtml?: string;
    isInstalled: boolean;
    installedVersion?: string;
    hasUpdate: boolean;
    latestVersion?: string;
    registryUrl: string;
}

export interface SidebarStateMessage {
    type: 'sidebar:state';
    state: SidebarState;
}

export interface DetailStateMessage {
    type: 'detail:state';
    state: DetailState;
}

export type HostToWebviewMessage = SidebarStateMessage | DetailStateMessage;

export type SidebarCommand =
    | 'search'
    | 'clearSearch'
    | 'openDetail'
    | 'install'
    | 'uninstall'
    | 'update'
    | 'manage'
    | 'installAnotherVersion'
    | 'downloadVsix'
    | 'copy'
    | 'ready';

export interface SidebarWebviewMessage {
    command: SidebarCommand;
    query?: string;
    id?: string;
    version?: string;
    text?: string;
}

export type DetailCommand =
    | 'install'
    | 'uninstall'
    | 'update'
    | 'installVersion'
    | 'installAnotherVersion'
    | 'copy'
    | 'openExternal'
    | 'ready';

export interface DetailWebviewMessage {
    command: DetailCommand;
    version?: string;
    text?: string;
    url?: string;
}

/** Global that shells use to embed the initial state for first paint. */
export const WEBVIEW_BOOT_STATE = '__WEBVIEW_INITIAL_STATE__';

export type WebviewBootState =
    | { kind: 'sidebar'; state: SidebarState }
    | { kind: 'detail'; state: DetailState };

/** Runtime helpers for the webview side. */
export function readBootState<T extends WebviewBootState>(kind: T['kind']): T['state'] | null {
    const boot = (globalThis as Record<string, unknown>)[WEBVIEW_BOOT_STATE] as WebviewBootState | undefined;
    return boot && boot.kind === kind ? (boot.state as T['state']) : null;
}

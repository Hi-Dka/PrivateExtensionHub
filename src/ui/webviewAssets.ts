import * as path from 'path';

/**
 * Media (webview static asset) paths shared by the webview surfaces.
 *
 * These helpers keep asset resolution in one place so tests can verify that
 * every vendored reference asset resolves inside the extension root that is
 * granted to webviews through `localResourceRoots`.
 */

export const MEDIA_DIR = 'media';

/** Reference loading placeholders vendored from the pinned VS Code build. */
export const NATIVE_LOADING_ASSETS: readonly string[] = [
    'loading.svg',
    'loading-dark.svg',
    'loading-hc.svg',
];

/** Absolute filesystem path of a media asset inside an extension root. */
export function mediaAssetFsPath(extensionRoot: string, asset: string): string {
    return path.join(extensionRoot, MEDIA_DIR, asset);
}

/** True when `candidate` is inside (or equal to) `extensionRoot`. */
export function isWithinExtensionRoot(extensionRoot: string, candidate: string): boolean {
    const resolvedRoot = path.resolve(extensionRoot);
    const resolvedCandidate = path.resolve(candidate);
    const relative = path.relative(resolvedRoot, resolvedCandidate);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

import * as fs from 'fs';
import * as path from 'path';
import type { SidebarState } from '../webview/types';
import { WEBVIEW_BOOT_STATE } from '../webview/types';

/**
 * Serialize state for an inline <script>. `<` is escaped so the JSON can never
 * terminate the script element.
 */
export function embedJson(value: unknown): string {
    return JSON.stringify(value).replace(/</g, '\\u003c');
}

export interface SidebarShellData {
    state: SidebarState;
    cspSource?: string;
    nonce?: string;
    codiconsUri?: string;
    nativeBaseCssUri?: string;
    sidebarCssUri?: string;
    sidebarJsUri?: string;
}

let cachedSidebarCss: string | null = null;
let cachedNativeBaseCss: string | null = null;

function readMediaFile(fileName: string): string {
    try {
        const candidatePaths = [
            path.join(__dirname, '..', 'media', fileName),
            path.join(__dirname, '..', '..', 'media', fileName),
        ];
        for (const cssPath of candidatePaths) {
            if (fs.existsSync(cssPath)) {
                return fs.readFileSync(cssPath, 'utf8');
            }
        }
    } catch {
        // ignore
    }
    return '';
}

export function getFallbackSidebarCss(): string {
    if (cachedSidebarCss === null) {
        cachedSidebarCss = readMediaFile('sidebar.css');
    }
    return cachedSidebarCss;
}

export function getFallbackNativeBaseCss(): string {
    if (cachedNativeBaseCss === null) {
        cachedNativeBaseCss = readMediaFile('native-base.css');
    }
    return cachedNativeBaseCss;
}

/**
 * 生成侧边栏 Webview 外壳：内嵌初始状态，挂载样式与客户端 bundle。
 * 所有标记渲染由 `media/sidebar.js`（Preact）负责。
 */
export function getSidebarViewHtml(data: SidebarShellData): string {
    const cspSource = data.cspSource || '';
    const nonce = data.nonce || 'sidebar-nonce';

    const codiconLink = data.codiconsUri
        ? `<link rel="stylesheet" href="${data.codiconsUri}">`
        : '';
    const nativeBaseCssLink = data.nativeBaseCssUri
        ? `<link rel="stylesheet" href="${data.nativeBaseCssUri}">`
        : `<style>${getFallbackNativeBaseCss()}</style>`;
    const sidebarCssLink = data.sidebarCssUri
        ? `<link rel="stylesheet" href="${data.sidebarCssUri}">`
        : `<style>${getFallbackSidebarCss()}</style>`;
    const scriptTag = data.sidebarJsUri
        ? `<script nonce="${nonce}" src="${data.sidebarJsUri}"></script>`
        : '';

    const bootState = { kind: 'sidebar' as const, state: data.state };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${cspSource}; img-src ${cspSource} https: http: data:; style-src 'unsafe-inline' ${cspSource}; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Extensions</title>
    ${codiconLink}
    ${nativeBaseCssLink}
    ${sidebarCssLink}
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}">window.${WEBVIEW_BOOT_STATE} = ${embedJson(bootState)};</script>
    ${scriptTag}
</body>
</html>
`;
}

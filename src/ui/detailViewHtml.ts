import * as fs from 'fs';
import * as path from 'path';
import MarkdownIt from 'markdown-it';
import { ExtensionInfo, ExtensionManifest } from '../models/index';
import { embedJson, getFallbackNativeBaseCss } from './sidebarViewHtml';
import { WEBVIEW_BOOT_STATE } from '../webview/types';
import type { DetailState } from '../webview/types';

export interface DetailViewData {
    extension: ExtensionInfo;
    readmeMarkdown?: string;
    changelogMarkdown?: string;
    manifest?: ExtensionManifest;
    versions?: string[];
    isInstalled: boolean;
    installedVersion?: string;
    hasUpdate: boolean;
    latestVersion?: string;
    cspSource?: string;
    nonce?: string;
    codiconsUri?: string;
    nativeBaseCssUri?: string;
    detailCssUri?: string;
    markdownCssUri?: string;
    registryUrl?: string;
}

export interface DetailShellData {
    state: DetailState;
    cspSource?: string;
    nonce?: string;
    codiconsUri?: string;
    nativeBaseCssUri?: string;
    detailCssUri?: string;
    markdownCssUri?: string;
    detailJsUri?: string;
}

export interface MarkdownRenderOptions {
    baseUrl?: string;
}

/**
 * 创建配置了安全属性与相对图片重写的 MarkdownIt 实例
 */
export function createMarkdownRenderer(options?: MarkdownRenderOptions): any {
    const md = new MarkdownIt({
        html: true,
        linkify: true,
        typographer: false,
    });

    const defaultImageRenderer = md.renderer.rules.image || function (tokens, idx, opt, _env, self) {
        return self.renderToken(tokens, idx, opt);
    };

    md.renderer.rules.image = (tokens, idx, opt, env, self) => {
        const token = tokens[idx];
        const srcIndex = token.attrIndex('src');
        if (srcIndex >= 0) {
            const rawSrc = token.attrs![srcIndex][1];
            const src = String(rawSrc);
            if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
                if (options?.baseUrl) {
                    const cleanPath = src.replace(/^\.?\//, '');
                    const cleanBase = options.baseUrl.endsWith('/') ? options.baseUrl : `${options.baseUrl}/`;
                    token.attrs![srcIndex][1] = `${cleanBase}${cleanPath}`;
                }
            }
        }
        return defaultImageRenderer(tokens, idx, opt, env, self);
    };

    return md;
}

/**
 * 工业级 GFM Markdown 转 HTML 格式化器
 */
export function renderMarkdown(markdown?: string, options?: MarkdownRenderOptions): string {
    if (!markdown || !markdown.trim()) {
        return '<div class="empty-state">No README provided.</div>';
    }
    const md = createMarkdownRenderer(options);
    return md.render(markdown);
}

let cachedDetailCss: string | null = null;
let cachedMarkdownCss: string | null = null;

export function getFallbackDetailCss(): string {
    if (cachedDetailCss !== null) {
        return cachedDetailCss;
    }
    try {
        const candidatePaths = [
            path.join(__dirname, '..', 'media', 'detail.css'),
            path.join(__dirname, '..', '..', 'media', 'detail.css'),
        ];
        for (const cssPath of candidatePaths) {
            if (fs.existsSync(cssPath)) {
                cachedDetailCss = fs.readFileSync(cssPath, 'utf8');
                return cachedDetailCss;
            }
        }
    } catch {
        // ignore
    }
    return '';
}

export function getFallbackMarkdownCss(): string {
    if (cachedMarkdownCss !== null) {
        return cachedMarkdownCss;
    }
    try {
        const candidatePaths = [
            path.join(__dirname, '..', 'media', 'markdown.css'),
            path.join(__dirname, '..', '..', 'media', 'markdown.css'),
        ];
        for (const cssPath of candidatePaths) {
            if (fs.existsSync(cssPath)) {
                cachedMarkdownCss = fs.readFileSync(cssPath, 'utf8');
                return cachedMarkdownCss;
            }
        }
    } catch {
        // ignore
    }
    return '';
}

/**
 * Build the client state for the detail editor: markdown is rendered on the
 * host (markdown-it + relative image rewriting); everything else is structured
 * data rendered by the Preact components.
 */
export function buildDetailState(data: DetailViewData): DetailState {
    const {
        extension,
        readmeMarkdown,
        changelogMarkdown,
        manifest,
        isInstalled,
        installedVersion,
        hasUpdate,
        latestVersion,
        registryUrl = 'https://open-vsx.org',
    } = data;

    const currentVersion = isInstalled ? installedVersion || extension.version : extension.version;
    const cleanRegistry = registryUrl.replace(/\/+$/, '');
    const baseUrl = `${cleanRegistry}/api/${extension.namespace}/${extension.name}/${currentVersion}/file/`;

    return {
        extension,
        manifest,
        readmeHtml: renderMarkdown(readmeMarkdown, { baseUrl }),
        changelogHtml:
            changelogMarkdown && changelogMarkdown.trim().length > 0
                ? renderMarkdown(changelogMarkdown, { baseUrl })
                : undefined,
        isInstalled,
        installedVersion,
        hasUpdate,
        latestVersion,
        registryUrl,
    };
}

/**
 * 生成详情页 Webview 外壳：内嵌初始状态，挂载样式与客户端 bundle。
 * 所有标记渲染由 `media/detail.js`（Preact）负责。
 */
export function getDetailViewHtml(data: DetailShellData): string {
    const cspSource = data.cspSource || '';
    const nonce = data.nonce || 'detail-nonce';

    const codiconLink = data.codiconsUri
        ? `<link rel="stylesheet" href="${data.codiconsUri}">`
        : '';
    const nativeBaseCssLink = data.nativeBaseCssUri
        ? `<link rel="stylesheet" href="${data.nativeBaseCssUri}">`
        : `<style>${getFallbackNativeBaseCss()}</style>`;
    const detailCssLink = data.detailCssUri
        ? `<link rel="stylesheet" href="${data.detailCssUri}">`
        : `<style>${getFallbackDetailCss()}</style>`;
    const markdownCssLink = data.markdownCssUri
        ? `<link rel="stylesheet" href="${data.markdownCssUri}">`
        : `<style>${getFallbackMarkdownCss()}</style>`;
    const scriptTag = data.detailJsUri
        ? `<script nonce="${nonce}" src="${data.detailJsUri}"></script>`
        : '';

    const bootState = { kind: 'detail' as const, state: data.state };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${cspSource}; img-src ${cspSource} https: http: data:; style-src 'unsafe-inline' ${cspSource}; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeTitle(data.state.extension.displayName || data.state.extension.name)}</title>
    ${codiconLink}
    ${nativeBaseCssLink}
    ${detailCssLink}
    ${markdownCssLink}
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}">window.${WEBVIEW_BOOT_STATE} = ${embedJson(bootState)};</script>
    ${scriptTag}
</body>
</html>
`;
}

function escapeTitle(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

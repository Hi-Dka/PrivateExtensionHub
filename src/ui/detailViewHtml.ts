import * as fs from 'fs';
import * as path from 'path';
import MarkdownIt from 'markdown-it';
import { ExtensionInfo, ExtensionManifest } from '../models/index';
import { escapeHtml, getFallbackNativeBaseCss } from './sidebarViewHtml';

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

/** In-place patch payload for an already-rendered editor document. */
export interface DetailPatch {
    header: string;
    navbar: string;
    panes: Record<string, string>;
    additionalDetails: string;
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

/**
 * 检查扩展 Manifest 是否包含任何功能贡献项 (Settings, Commands, Keybindings 等)
 */
export function hasFeatureContributions(manifest?: ExtensionManifest): boolean {
    if (!manifest || !manifest.contributes) {
        return false;
    }
    const { contributes } = manifest;
    if (contributes.configuration) {
        const configs = Array.isArray(contributes.configuration)
            ? contributes.configuration
            : [contributes.configuration];
        for (const cfg of configs) {
            if (cfg.properties && Object.keys(cfg.properties).length > 0) {
                return true;
            }
        }
    }
    if (contributes.commands && contributes.commands.length > 0) {
        return true;
    }
    if ((contributes as any).keybindings && (contributes as any).keybindings.length > 0) {
        return true;
    }
    return false;
}

/**
 * 渲染 Feature Contributions (Settings, Commands, Keybindings) - 1:1 对标 VS Code 原生 borderless Settings 列表
 */
export function renderFeatureContributions(manifest?: ExtensionManifest): string {
    if (!manifest || !manifest.contributes) {
        return '<div class="empty-state">No feature contributions.</div>';
    }

    const { contributes } = manifest;
    let hasContent = false;
    let sectionsHtml = '';

    // 1. Configuration Settings
    const configConfigs = Array.isArray(contributes.configuration)
        ? contributes.configuration
        : contributes.configuration
          ? [contributes.configuration]
          : [];

    const properties: Array<{ key: string; type?: string; default?: any; description?: string }> = [];
    for (const cfg of configConfigs) {
        if (cfg.properties) {
            for (const [propKey, propVal] of Object.entries(cfg.properties)) {
                properties.push({
                    key: propKey,
                    type: Array.isArray(propVal.type) ? propVal.type.join(' | ') : propVal.type,
                    default: propVal.default !== undefined ? JSON.stringify(propVal.default) : '',
                    description: propVal.description || '',
                });
            }
        }
    }

    if (properties.length > 0) {
        hasContent = true;
        const rows = properties
            .map((p) => {
                return `
                <div class="feature-item">
                    <div class="feature-item-header">
                        <span class="feature-item-key"><code>${escapeHtml(p.key)}</code></span>
                        ${p.default ? `<span class="feature-item-default">Default: <code>${escapeHtml(p.default)}</code></span>` : ''}
                    </div>
                    ${p.description ? `<div class="feature-item-desc">${escapeHtml(p.description)}</div>` : ''}
                </div>`;
            })
            .join('');

        sectionsHtml += `
            <div class="features-section">
                <div class="features-header">Settings <span class="features-count">(${properties.length})</span></div>
                <div class="features-list">
                    ${rows}
                </div>
            </div>
        `;
    }

    // 2. Commands
    const commands = contributes.commands || [];
    if (commands.length > 0) {
        hasContent = true;
        const rows = commands
            .map((c) => {
                const title = c.category ? `${c.category}: ${c.title}` : c.title;
                return `
                <div class="feature-item">
                    <div class="feature-item-header">
                        <span class="feature-item-key"><code>${escapeHtml(c.command)}</code></span>
                    </div>
                    <div class="feature-item-desc">${escapeHtml(title)}</div>
                </div>`;
            })
            .join('');

        sectionsHtml += `
            <div class="features-section">
                <div class="features-header">Commands <span class="features-count">(${commands.length})</span></div>
                <div class="features-list">
                    ${rows}
                </div>
            </div>
        `;
    }

    // 3. Keybindings
    const keybindings = (contributes as any).keybindings || [];
    if (keybindings.length > 0) {
        hasContent = true;
        const rows = keybindings
            .map((k: any) => {
                const keyStr = k.mac || k.key || '';
                const whenStr = k.when ? `<div class="feature-item-desc">When: <code>${escapeHtml(k.when)}</code></div>` : '';
                return `
                <div class="feature-item">
                    <div class="feature-item-header">
                        <span class="feature-item-key"><code>${escapeHtml(k.command)}</code></span>
                        ${keyStr ? `<span class="feature-item-keybinding"><code>${escapeHtml(keyStr)}</code></span>` : ''}
                    </div>
                    ${whenStr}
                </div>`;
            })
            .join('');

        sectionsHtml += `
            <div class="features-section">
                <div class="features-header">Keybindings <span class="features-count">(${keybindings.length})</span></div>
                <div class="features-list">
                    ${rows}
                </div>
            </div>
        `;
    }

    if (!hasContent) {
        return '<div class="empty-state">No feature contributions.</div>';
    }

    return sectionsHtml;
}

/**
 * 渲染 Dependencies 列表
 */
export function renderDependencies(dependencies?: string[]): string {
    if (!dependencies || dependencies.length === 0) {
        return '<div class="empty-state">No dependencies.</div>';
    }

    const items = dependencies
        .map((dep) => {
            return `
            <li class="dependency-item">
                <span class="dependency-icon"><i class="codicon codicon-package"></i></span>
                <span class="dependency-id">${escapeHtml(dep)}</span>
            </li>`;
        })
        .join('');

    return `<ul class="dependencies-list">${items}</ul>`;
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

interface DetailTab {
    id: string;
    label: string;
    paneHtml: string;
}

interface DetailModel {
    displayName: string;
    headerHtml: string;
    navbarItemsHtml: string;
    tabs: DetailTab[];
    additionalDetailsHtml: string;
}

function renderEditorIcon(extension: ExtensionInfo, displayName: string): string {
    const iconUrl = extension.iconUrl ? escapeHtml(extension.iconUrl) : '';
    return `<div class="extension-icon"><img class="icon" alt="${displayName}"${iconUrl ? ` src="${iconUrl}"` : ''} /><span class="codicon codicon-extensions"${iconUrl ? ' style="display: none;"' : ''}></span></div>`;
}

/**
 * 大尺寸 RatingsWidget: 5 星 + 数量 (对齐 extensionsWidgets.ts)
 */
export function renderRatingWidget(rating?: number, ratingCount?: number): string {
    if (!rating || rating <= 0 || !ratingCount || ratingCount <= 0) {
        return '';
    }
    const rounded = Math.round(rating * 2) / 2;
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        const icon =
            rounded >= i ? 'codicon-star-full' : rounded >= i - 0.5 ? 'codicon-star-half' : 'codicon-star-empty';
        stars += `<span class="codicon ${icon}"></span>`;
    }
    return `<span class="rating clickable">${stars}<span style="padding-left: 1px"> (${ratingCount})</span></span>`;
}

function renderHeader(
    extension: ExtensionInfo,
    isInstalled: boolean,
    hasUpdate: boolean,
    latestVersion: string | undefined,
): string {
    const displayName = escapeHtml(extension.displayName || extension.name);
    const publisher = escapeHtml(extension.namespace || '');
    const identifier = escapeHtml(extension.id);
    const description = escapeHtml(extension.description || '');

    const subtitleEntries: string[] = [];
    subtitleEntries.push(
        `<span class="publisher"><span class="publisher-name ellipsis">${publisher}</span></span>`,
    );
    if (extension.downloadCount) {
        subtitleEntries.push(
            `<span class="install"><span class="codicon codicon-cloud-download"></span><span class="count">${extension.downloadCount.toLocaleString()}</span></span>`,
        );
    }
    const ratingWidget = renderRatingWidget(extension.rating, extension.ratingCount);
    if (ratingWidget) {
        subtitleEntries.push(ratingWidget);
    }
    const subtitleHtml = subtitleEntries
        .map(
            (entry, index) =>
                `<div class="subtitle-entry${index === subtitleEntries.length - 1 ? ' last-non-empty' : ''}">${entry}</div>`,
        )
        .join('');

    const manageMenu = `
        <li class="action-item action-dropdown-item">
            <a class="action-label extension-action icon manage codicon codicon-gear" role="button" tabindex="0" id="manageGearBtn" title="Manage Extension"></a>
            <div class="manage-menu" id="manageDropdown">
                <div class="manage-menu-item" data-action="installAnotherVersion"><span class="codicon codicon-history"></span> Install Specific Version...</div>
                <div class="manage-menu-item" data-copy="${identifier}"><span class="codicon codicon-copy"></span> Copy Extension ID</div>
            </div>
        </li>`;

    let actionsHtml = '';
    if (!isInstalled) {
        actionsHtml = `
            <li class="action-item"><a class="action-label extension-action label prominent install" role="button" tabindex="0" data-action="install" data-version="${escapeHtml(extension.version)}" title="Install">Install</a></li>
            ${manageMenu}`;
    } else if (hasUpdate && latestVersion) {
        actionsHtml = `
            <li class="action-item"><a class="action-label extension-action label update" role="button" tabindex="0" data-action="update" data-version="${escapeHtml(latestVersion)}" title="Update to v${escapeHtml(latestVersion)}">Update to v${escapeHtml(latestVersion)}</a></li>
            <li class="action-item"><a class="action-label extension-action label uninstall" role="button" tabindex="0" data-action="uninstall" title="Uninstall">Uninstall</a></li>
            ${manageMenu}`;
    } else {
        actionsHtml = `
            <li class="action-item"><a class="action-label extension-action label uninstall" role="button" tabindex="0" data-action="uninstall" title="Uninstall">Uninstall</a></li>
            ${manageMenu}`;
    }

    return `
        <div class="icon-container">${renderEditorIcon(extension, displayName)}</div>
        <div class="details">
            <div class="title">
                <span class="name">${displayName}</span>
            </div>
            <div class="subtitle">${subtitleHtml}</div>
            <div class="description">${description}</div>
            <div class="actions-status-container">
                <div class="monaco-action-bar">
                    <ul class="actions-container">
                        ${actionsHtml}
                    </ul>
                </div>
                <div class="status"></div>
            </div>
        </div>`;
}

function renderAdditionalDetails(
    extension: ExtensionInfo,
    manifest: ExtensionManifest | undefined,
    currentVersion: string,
    vsixDownloadUrl: string,
): string {
    const categories =
        manifest?.categories && manifest.categories.length > 0
            ? manifest.categories.map((c: string) => escapeHtml(c)).join(', ')
            : '';
    const resources: string[] = [];
    if (extension.repositoryUrl) {
        resources.push(
            `<div class="resource"><span class="codicon codicon-repo"></span><a href="${escapeHtml(extension.repositoryUrl)}" target="_blank" rel="noopener noreferrer">Repository</a></div>`,
        );
    }
    if (manifest?.bugs?.url) {
        resources.push(
            `<div class="resource"><span class="codicon codicon-issues"></span><a href="${escapeHtml(manifest.bugs.url)}" target="_blank" rel="noopener noreferrer">Issues</a></div>`,
        );
    }
    resources.push(
        `<div class="resource"><span class="codicon codicon-link-external"></span><a href="${escapeHtml(vsixDownloadUrl)}" target="_blank" rel="noopener noreferrer">Download VSIX</a></div>`,
    );

    const infoRows: string[] = [];
    const infoRow = (name: string, valueHtml: string) =>
        `<div class="more-info-entry"><div class="more-info-entry-name">${name}</div><div>${valueHtml}</div></div>`;

    infoRows.push(
        infoRow(
            'Identifier',
            `<span>${escapeHtml(extension.id)}</span><button class="copy-icon-btn" title="Copy Extension ID" data-copy="${escapeHtml(extension.id)}"><span class="codicon codicon-copy"></span></button>`,
        ),
    );
    infoRows.push(infoRow('Publisher', escapeHtml(extension.namespace || '')));
    infoRows.push(infoRow('Version', escapeHtml(currentVersion)));
    if (extension.downloadCount) {
        infoRows.push(infoRow('Downloads', escapeHtml(extension.downloadCount.toLocaleString())));
    }
    if (manifest?.license) {
        infoRows.push(infoRow('License', escapeHtml(manifest.license)));
    }

    const categoriesHtml = categories
        ? `<div class="categories-container additional-details-element">
                    <div class="additional-details-title">Categories</div>
                    <div class="categories">${categories
                        .split(', ')
                        .map((category: string) => `<span class="category">${category}</span>`)
                        .join('')}</div>
                </div>`
        : '';

    return `
            <div class="additional-details-content">
                ${categoriesHtml}
                <div class="resources-container additional-details-element">
                    <div class="additional-details-title">Resources</div>
                    <div class="resources">${resources.join('')}</div>
                </div>
                <div class="more-info-container additional-details-element">
                    <div class="additional-details-title">Marketplace</div>
                    <div class="more-info">${infoRows.join('')}</div>
                </div>
            </div>`;
}

function buildDetailModel(data: DetailViewData): DetailModel {
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

    const displayName = extension.displayName || extension.name;
    const currentVersion = isInstalled ? installedVersion || extension.version : extension.version;

    const cleanRegistry = registryUrl.replace(/\/+$/, '');
    const baseUrl = `${cleanRegistry}/api/${extension.namespace}/${extension.name}/${currentVersion}/file/`;
    const vsixDownloadUrl = `${cleanRegistry}/api/${extension.namespace}/${extension.name}/${currentVersion}/file/${extension.namespace}.${extension.name}-${currentVersion}.vsix`;

    const headerHtml = renderHeader(
        extension,
        isInstalled,
        hasUpdate,
        latestVersion,
    );
    const additionalDetailsInner = renderAdditionalDetails(
        extension,
        manifest,
        currentVersion,
        vsixDownloadUrl,
    );

    const renderedReadme = renderMarkdown(readmeMarkdown, { baseUrl });
    const renderedFeatures = renderFeatureContributions(manifest);
    const renderedChangelog = renderMarkdown(changelogMarkdown, { baseUrl });
    const renderedDependencies = renderDependencies(manifest?.extensionDependencies);
    const hasDependencies = Boolean(
        (manifest?.extensionDependencies && manifest.extensionDependencies.length > 0) ||
            ((manifest as any)?.extensionPack && (manifest as any).extensionPack.length > 0),
    );

    const tabs: DetailTab[] = [];
    tabs.push({
        id: 'tab-details',
        label: 'Details',
        paneHtml: `<div class="details-layout"><div class="readme-container markdown-body">${renderedReadme}</div><div class="additional-details-container">${additionalDetailsInner}</div></div>`,
    });
    if (hasFeatureContributions(manifest)) {
        tabs.push({
            id: 'tab-features',
            label: 'Features',
            paneHtml: `<div class="subcontent">${renderedFeatures}</div>`,
        });
    }
    if (changelogMarkdown && changelogMarkdown.trim().length > 0) {
        tabs.push({
            id: 'tab-changelog',
            label: 'Changelog',
            paneHtml: `<div class="subcontent markdown-body">${renderedChangelog}</div>`,
        });
    }
    if (hasDependencies) {
        tabs.push({
            id: 'tab-dependencies',
            label: 'Dependencies',
            paneHtml: `<div class="subcontent">${renderedDependencies}</div>`,
        });
    }

    const navbarItemsHtml = tabs
        .map(
            (tab, index) =>
                `<li class="action-item"><a class="action-label${index === 0 ? ' checked' : ''}" data-tab="${tab.id}">${tab.label}</a></li>`,
        )
        .join('');

    return {
        displayName,
        headerHtml,
        navbarItemsHtml,
        tabs,
        additionalDetailsHtml: additionalDetailsInner,
    };
}

/** 头部内容 (用于增量 patch) */
export function renderDetailHeader(data: DetailViewData): string {
    return buildDetailModel(data).headerHtml;
}

/** 增量 patch: 头部 / 导航栏 / 各 Tab / 附加详情 */
export function getDetailPatch(data: DetailViewData): DetailPatch {
    const model = buildDetailModel(data);
    const panes: Record<string, string> = {};
    for (const tab of model.tabs) {
        panes[tab.id] = tab.paneHtml;
    }
    return {
        header: model.headerHtml,
        navbar: model.navbarItemsHtml,
        panes,
        additionalDetails: model.additionalDetailsHtml,
    };
}

/**
 * 生成 1:1 对齐 VS Code 原生 Extension Editor 设计规范的页面
 */
export function getDetailViewHtml(data: DetailViewData): string {
    const {
        cspSource = '',
        nonce = data.nonce || 'detail-nonce',
    } = data;

    const model = buildDetailModel(data);
    const activeTab = model.tabs[0];

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

    const panesHtml = model.tabs
        .map(
            (tab) =>
                `<div id="${tab.id}" class="tab-pane${tab.id === activeTab.id ? ' active' : ''}">${tab.paneHtml}</div>`,
        )
        .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${cspSource}; img-src ${cspSource} https: http: data:; style-src 'unsafe-inline' ${cspSource}; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(model.displayName)}</title>
    ${codiconLink}
    ${nativeBaseCssLink}
    ${detailCssLink}
    ${markdownCssLink}
</head>
<body>
    <div class="extension-editor">
        <div class="header">${model.headerHtml}</div>
        <div class="body">
            <div class="navbar">
                <div class="monaco-action-bar">
                    <ul class="actions-container" id="navbarItems">${model.navbarItemsHtml}</ul>
                </div>
            </div>
            <div class="content">
                ${panesHtml}
            </div>
        </div>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        function attachIconHandlers(root) {
            var imgs = root.querySelectorAll('.extension-icon img.icon');
            for (var i = 0; i < imgs.length; i++) {
                (function (img) {
                    if (img.getAttribute('data-bound') === '1') return;
                    img.setAttribute('data-bound', '1');
                    var fallback = img.nextElementSibling;
                    var src = img.getAttribute('src');
                    function showFallback() {
                        img.style.display = 'none';
                        if (fallback) fallback.style.display = '';
                    }
                    if (!src) {
                        showFallback();
                        return;
                    }
                    function showIcon() { img.style.visibility = 'visible'; }
                    img.style.visibility = 'hidden';
                    img.addEventListener('load', showIcon);
                    img.addEventListener('error', showFallback);
                    if (img.complete) {
                        if (img.naturalWidth > 0) showIcon(); else showFallback();
                    }
                })(imgs[i]);
            }
        }

        function replaceInnerPreservingScroll(element, html) {
            if (!element) return;
            var scrollTop = element.scrollTop;
            element.innerHTML = html;
            element.scrollTop = scrollTop;
        }

        function applyDetailPatch(patch) {
            var navbarItems = document.getElementById('navbarItems');
            var checked = document.querySelector('.navbar .action-label.checked');
            var activeId = checked ? checked.getAttribute('data-tab') : null;

            if (patch.header !== undefined) {
                replaceInnerPreservingScroll(document.querySelector('.extension-editor > .header'), patch.header);
            }
            if (patch.navbar !== undefined && navbarItems) {
                replaceInnerPreservingScroll(navbarItems, patch.navbar);
            }
            if (patch.panes) {
                for (var id in patch.panes) {
                    if (Object.prototype.hasOwnProperty.call(patch.panes, id)) {
                        replaceInnerPreservingScroll(document.getElementById(id), patch.panes[id]);
                    }
                }
            }
            if (patch.additionalDetails !== undefined) {
                replaceInnerPreservingScroll(document.querySelector('.additional-details-container'), patch.additionalDetails);
            }

            // 保持当前激活的 Tab；若已不存在则回退到第一个 Tab
            var target = activeId && navbarItems ? navbarItems.querySelector('[data-tab="' + activeId + '"]') : null;
            if (!target && navbarItems) {
                target = navbarItems.querySelector('.action-label');
            }
            if (target) {
                var labels = document.querySelectorAll('.navbar .action-label');
                for (var i = 0; i < labels.length; i++) {
                    labels[i].classList.remove('checked');
                }
                target.classList.add('checked');
                var panes = document.querySelectorAll('.tab-pane');
                for (var j = 0; j < panes.length; j++) {
                    panes[j].classList.remove('active');
                }
                var pane = document.getElementById(target.getAttribute('data-tab'));
                if (pane) pane.classList.add('active');
            }

            attachIconHandlers(document);
        }

        window.addEventListener('message', function (event) {
            var msg = event.data;
            if (msg && msg.type === 'detailPatch' && msg.patch) {
                applyDetailPatch(msg.patch);
            }
        });

        document.addEventListener('click', (e) => {
            // 管理下拉菜单切换
            const gearBtn = e.target.closest('#manageGearBtn');
            const dropdown = document.getElementById('manageDropdown');
            if (gearBtn && dropdown) {
                dropdown.classList.toggle('show');
                e.stopPropagation();
                return;
            }

            // 点击外部关闭下拉菜单
            if (dropdown && dropdown.classList.contains('show') && !e.target.closest('#manageDropdown')) {
                dropdown.classList.remove('show');
            }

            // 动作按钮点击 (安装 / 卸载 / 更新 / 安装其他版本)
            const actionTarget = e.target.closest('[data-action]');
            if (actionTarget) {
                const action = actionTarget.getAttribute('data-action');
                const version = actionTarget.getAttribute('data-version');
                vscode.postMessage({ command: action, version: version || undefined });
                if (dropdown) {
                    dropdown.classList.remove('show');
                }
                return;
            }

            // 复制按钮点击
            const copyBtn = e.target.closest('[data-copy]');
            if (copyBtn) {
                const text = copyBtn.getAttribute('data-copy');
                if (text) {
                    vscode.postMessage({ command: 'copy', text: text });
                    const icon = copyBtn.querySelector('.codicon');
                    if (icon) {
                        icon.classList.remove('codicon-copy');
                        icon.classList.add('codicon-check');
                        setTimeout(() => {
                            icon.classList.remove('codicon-check');
                            icon.classList.add('codicon-copy');
                        }, 1500);
                    }
                }
                if (dropdown) {
                    dropdown.classList.remove('show');
                }
                return;
            }

            // 外部链接点击委托给宿主
            const link = e.target.closest('a[href^="http://"], a[href^="https://"]');
            if (link) {
                e.preventDefault();
                vscode.postMessage({ command: 'openExternal', url: link.href });
                return;
            }

            // Tab 切换 (.navbar .action-label)
            const tabBtn = e.target.closest('.navbar .action-label');
            if (tabBtn) {
                const targetId = tabBtn.getAttribute('data-tab');
                document.querySelectorAll('.navbar .action-label').forEach(t => t.classList.remove('checked'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                tabBtn.classList.add('checked');
                const targetPane = document.getElementById(targetId);
                if (targetPane) {
                    targetPane.classList.add('active');
                }
            }
        });

        attachIconHandlers(document);
        vscode.postMessage({ command: 'ready' });
    </script>
</body>
</html>`;
}

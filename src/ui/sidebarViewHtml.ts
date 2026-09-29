import * as fs from 'fs';
import * as path from 'path';
import { ExtensionInfo } from '../models/index';

export interface SidebarExtensionItem {
    info: ExtensionInfo;
    isInstalled: boolean;
    installedVersion?: string;
    hasUpdate: boolean;
    latestVersion?: string;
}

export interface SidebarViewData {
    searchQuery?: string;
    isSearching?: boolean;
    isLoading?: boolean;
    searchResults?: SidebarExtensionItem[];
    updates?: SidebarExtensionItem[];
    installed?: SidebarExtensionItem[];
    cspSource?: string;
    nonce?: string;
    codiconsUri?: string;
    sidebarCssUri?: string;
    nativeBaseCssUri?: string;
}

/** Reference row height: extensionsList.ts EXTENSION_LIST_ELEMENT_HEIGHT. */
export const EXTENSION_ROW_HEIGHT = 72;

/** Placeholder rows used while loading (native sizes to viewport). */
export const LOADING_PLACEHOLDER_COUNT = 8;

/** A rendered list row: identity plus the HTML fragment that represents it. */
export interface SidebarRow {
    id: string;
    html: string;
}

export interface RowPatchOperation {
    op: 'remove' | 'insert' | 'replace' | 'move';
    id: string;
    index?: number;
    html?: string;
}

/** Client-persisted context that must survive a patch (see design.md #4). */
export interface RowPatchState {
    scrollTop: number;
    focusedId: string | null;
    inputValue: string;
    caret: number;
}

export interface RowPatchResult {
    rows: SidebarRow[];
    state: RowPatchState;
}

/**
 * 安全转义 HTML 特殊字符
 */
export function escapeHtml(str?: string): string {
    if (!str) {
        return '';
    }
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * 格式化下载量为紧凑可读格式 (对齐 VS Code InstallCountWidget: >1M 显示 1.2M, >1K 显示 42K)
 */
export function formatInstallCount(count?: number): string {
    if (!count || count <= 0) {
        return '';
    }
    if (count > 1_000_000) {
        return `${Math.floor(count / 100_000) / 10}M`;
    }
    if (count > 1_000) {
        return `${Math.floor(count / 1_000)}K`;
    }
    return String(count);
}

/**
 * 格式化评分为紧凑格式 (对齐 VS Code RatingsWidget: 四舍五入到 0.5, 显示 5 而不是 5.0)
 */
export function formatRating(rating?: number): string {
    if (rating === undefined || rating === null || rating <= 0) {
        return '';
    }
    return String(Math.round(rating * 2) / 2);
}

/**
 * 渲染单个扩展卡片 (1:1 原生 VS Code extensionsList.ts & extension.css 结构)
 */
export function renderExtensionCard(item: SidebarExtensionItem, top = 0): string {
    const ext = item.info;
    const displayName = escapeHtml(ext.displayName || ext.name);
    const publisher = escapeHtml(ext.namespace);
    const description = escapeHtml(ext.description || 'No description provided.');

    // 与小尺寸 InstallCountWidget 一致：已安装扩展不显示安装量
    const installCountFormatted = item.isInstalled ? '' : formatInstallCount(ext.downloadCount);
    // 与小尺寸 RatingsWidget 一致：已安装扩展/没有评分数量时不显示评分
    const ratingFormatted =
        !item.isInstalled && ext.rating !== undefined && ext.rating > 0 && (ext.ratingCount ?? 0) > 0
            ? formatRating(ext.rating)
            : '';

    const iconUrl = ext.iconUrl ? escapeHtml(ext.iconUrl) : '';
    const iconHtml = `
                <div class="extension-icon">
                    <img class="icon" alt=""${iconUrl ? ` src="${iconUrl}"` : ''} />
                    <span class="codicon codicon-extensions"${iconUrl ? ' style="display: none;"' : ''}></span>
                </div>`;

    // 动作按钮区域渲染 (置于底栏 monaco-action-bar, 原生锚点 + 官方动作类名)
    let actionsHtml = '';
    if (!item.isInstalled) {
        actionsHtml = `
                            <li class="action-item"><a class="action-label extension-action label install prominent" role="button" tabindex="0" data-action="install" data-id="${escapeHtml(ext.id)}" data-version="${escapeHtml(ext.version)}" title="Install">Install</a></li>
        `;
    } else if (item.hasUpdate && item.latestVersion) {
        actionsHtml = `
                            <li class="action-item"><a class="action-label extension-action label update" role="button" tabindex="0" data-action="update" data-id="${escapeHtml(ext.id)}" data-version="${escapeHtml(item.latestVersion)}" title="Update to v${escapeHtml(item.latestVersion)}">Update</a></li>
                            <li class="action-item"><a class="action-label extension-action icon manage codicon codicon-gear" role="button" tabindex="0" data-action="manage" data-id="${escapeHtml(ext.id)}" title="Manage Extension"></a></li>
        `;
    } else {
        actionsHtml = `
                            <li class="action-item"><a class="action-label extension-action icon manage codicon codicon-gear" role="button" tabindex="0" data-action="manage" data-id="${escapeHtml(ext.id)}" title="Manage Extension"></a></li>
        `;
    }

    return `
    <div class="monaco-list-row" data-extension-id="${escapeHtml(ext.id)}" data-installed="${item.isInstalled}" data-has-update="${item.hasUpdate}" data-version="${escapeHtml(item.latestVersion || ext.version)}" style="top: ${top}px;">
        <div class="extension-bookmark-container"></div>
        <div class="extension-bookmark-container"></div>
        <div class="extension-list-item" data-action="detail" data-id="${escapeHtml(ext.id)}">
            <div class="icon-container">${iconHtml}
            </div>
            <div class="details">
                <div class="header-container">
                    <div class="header">
                        <span class="name" title="${displayName}">${displayName}</span>
                        <span class="restart-required"></span>
                        <span class="install-count">${installCountFormatted ? `<span class="codicon codicon-cloud-download"></span><span class="count">${installCountFormatted}</span>` : ''}</span>
                        <span class="ratings extension-ratings small">${ratingFormatted ? `<span class="codicon codicon-star-full"></span><span class="count">${ratingFormatted}</span>` : ''}</span>
                        <span class="sync-ignored"></span>
                        <span class="extension-kind-indicator"></span>
                        <span class="activation-status"></span>
                    </div>
                </div>
                <div class="description ellipsis" title="${description}">${description}</div>
                <div class="footer">
                    <div class="publisher-container">
                        <span class="publisher" title="${publisher}">
                            <span class="publisher-name ellipsis">${publisher}</span>
                        </span>
                    </div>
                    <div class="monaco-action-bar">
                        <ul class="actions-container">
                            ${actionsHtml}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
}

/** Loading placeholder row (native `.extension-list-item.loading`). */
export function renderLoadingRow(index: number): string {
    return `
    <div class="monaco-list-row" data-extension-id="__loading_${index}" style="top: ${index * EXTENSION_ROW_HEIGHT}px;">
        <div class="extension-list-item loading" aria-hidden="true"></div>
    </div>
    `;
}

/**
 * Compute the rows for the current state (single native-style list).
 */
export function renderSidebarRows(data: SidebarViewData): SidebarRow[] {
    const rows: SidebarRow[] = [];
    const items = data.isSearching ? data.searchResults || [] : data.installed || [];
    if (data.isLoading && items.length === 0) {
        for (let i = 0; i < LOADING_PLACEHOLDER_COUNT; i++) {
            rows.push({ id: `__loading_${i}`, html: renderLoadingRow(i) });
        }
        return rows;
    }

    items.forEach((item, index) => {
        rows.push({
            id: item.info.id,
            html: renderExtensionCard(item, index * EXTENSION_ROW_HEIGHT),
        });
    });
    return rows;
}

/** Empty-state message for the current state (native message container). */
export function getSidebarEmptyMessage(data: SidebarViewData): string | null {
    if (data.isLoading) {
        return null;
    }
    const items = data.isSearching ? data.searchResults || [] : data.installed || [];
    return items.length === 0 ? 'No extensions found.' : null;
}

/**
 * Keyed row patch computation: transforms `current` into `next` with
 * remove/insert/replace/move operations keyed by row id (data-extension-id).
 */
export function computeRowPatch(current: SidebarRow[], next: SidebarRow[]): RowPatchOperation[] {
    const ops: RowPatchOperation[] = [];
    const nextIds = new Set(next.map((row) => row.id));

    // 1. Remove rows that are gone (reverse order keeps indices stable).
    for (let i = current.length - 1; i >= 0; i--) {
        if (!nextIds.has(current[i].id)) {
            ops.push({ op: 'remove', id: current[i].id });
        }
    }

    // 2. Walk the target order and insert/move/replace as needed.
    const working = current.filter((row) => nextIds.has(row.id));
    const currentHtml = new Map(current.map((row) => [row.id, row.html]));
    for (let i = 0; i < next.length; i++) {
        const target = next[i];
        const existingIndex = working.findIndex((row) => row.id === target.id);
        if (existingIndex === -1) {
            ops.push({ op: 'insert', id: target.id, index: i, html: target.html });
            working.splice(i, 0, target);
            continue;
        }
        if (existingIndex !== i) {
            ops.push({ op: 'move', id: target.id, index: i });
            const [moved] = working.splice(existingIndex, 1);
            working.splice(i, 0, moved);
        }
        if (currentHtml.get(target.id) !== target.html) {
            ops.push({ op: 'replace', id: target.id, html: target.html });
        }
    }
    return ops;
}

/**
 * Pure model of the client-side patch application, including preservation of
 * scroll position, focus, and in-progress input (design.md decision #4).
 * The embedded client script implements the same semantics on the DOM.
 */
export function applyRowPatch(
    current: SidebarRow[],
    ops: RowPatchOperation[],
    state: RowPatchState,
): RowPatchResult {
    let rows = current.slice();
    for (const op of ops) {
        const index = rows.findIndex((row) => row.id === op.id);
        switch (op.op) {
            case 'remove':
                if (index !== -1) {
                    rows.splice(index, 1);
                }
                break;
            case 'insert': {
                const at = Math.max(0, Math.min(op.index ?? rows.length, rows.length));
                rows.splice(at, 0, { id: op.id, html: op.html ?? '' });
                break;
            }
            case 'move': {
                if (index !== -1) {
                    const [moved] = rows.splice(index, 1);
                    const at = Math.max(0, Math.min(op.index ?? rows.length, rows.length));
                    rows.splice(at, 0, moved);
                }
                break;
            }
            case 'replace':
                if (index !== -1) {
                    rows[index] = { id: op.id, html: op.html ?? rows[index].html };
                }
                break;
        }
    }

    const focusedStillPresent =
        state.focusedId !== null && rows.some((row) => row.id === state.focusedId);
    return {
        rows,
        state: {
            scrollTop: state.scrollTop,
            focusedId: focusedStillPresent ? state.focusedId : null,
            inputValue: state.inputValue,
            caret: state.caret,
        },
    };
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
 * 生成原生 Extensions 视图结构的侧边栏 Webview HTML。
 */
export function getSidebarViewHtml(data: SidebarViewData): string {
    const cspSource = data.cspSource || '';
    const nonce = data.nonce || 'sidebar-nonce';
    const searchQuery = data.searchQuery || '';

    const rows = renderSidebarRows(data);
    const emptyMessage = getSidebarEmptyMessage(data);
    const rowsHtml = rows.map((row) => row.html).join('');
    const rowsHeight = rows.length * EXTENSION_ROW_HEIGHT;

    const codiconLink = data.codiconsUri
        ? `<link rel="stylesheet" href="${data.codiconsUri}">`
        : '';
    const nativeBaseCssLink = data.nativeBaseCssUri
        ? `<link rel="stylesheet" href="${data.nativeBaseCssUri}">`
        : `<style>${getFallbackNativeBaseCss()}</style>`;
    const sidebarCssLink = data.sidebarCssUri
        ? `<link rel="stylesheet" href="${data.sidebarCssUri}">`
        : `<style>${getFallbackSidebarCss()}</style>`;

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
    <div class="extensions-viewlet">
        <!-- 原生 41px viewlet header (搜索容器) -->
        <div class="header">
            <div class="extensions-search-container">
                <div class="search-box">
                    <input type="text" class="search-input" id="searchInput" placeholder="Search Extensions in Open VSX" value="${escapeHtml(searchQuery)}" autofocus />
                    <button class="search-clear-btn" id="searchClearBtn" title="Clear Search"><span class="codicon codicon-close"></span></button>
                </div>
            </div>
        </div>

        <!-- 列表主区域 (原生单列表) -->
        <div class="extensions">
            <div class="monaco-list" id="listContainer">
                <div class="monaco-list-rows" id="listRows" style="height: ${rowsHeight}px;">${rowsHtml}</div>
            </div>
            <div class="message-container" id="emptyState" style="display: ${emptyMessage ? 'flex' : 'none'};">
                <div class="message" id="emptyMessage">${emptyMessage ? escapeHtml(emptyMessage) : ''}</div>
            </div>
        </div>

        <!-- 官方原生风格浮动上下文菜单 (Context Menu) -->
        <div class="monaco-menu-container" id="contextMenuContainer" style="display: none;">
            <div class="monaco-menu">
                <ul class="actions-container" id="contextMenuList" role="menu">
                </ul>
            </div>
        </div>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        const ROW_HEIGHT = ${EXTENSION_ROW_HEIGHT};

        const searchInput = document.getElementById('searchInput');
        const searchClearBtn = document.getElementById('searchClearBtn');
        const listContainer = document.getElementById('listContainer');
        const listRows = document.getElementById('listRows');
        const emptyState = document.getElementById('emptyState');
        const emptyMessage = document.getElementById('emptyMessage');
        const contextMenuContainer = document.getElementById('contextMenuContainer');
        const contextMenuList = document.getElementById('contextMenuList');
        let activeContextExt = null;

        /* ------------------------------------------------ rows & patches */

        function positionRows() {
            var rows = listRows.children;
            for (var i = 0; i < rows.length; i++) {
                rows[i].style.top = (i * ROW_HEIGHT) + 'px';
                rows[i].style.height = ROW_HEIGHT + 'px';
            }
            listRows.style.height = (rows.length * ROW_HEIGHT) + 'px';
        }

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

        function createRowElement(html) {
            var template = document.createElement('template');
            template.innerHTML = html.trim();
            return template.content.firstElementChild;
        }

        function preserveContext(mutator) {
            var scrollTop = listContainer.scrollTop;
            var active = document.activeElement;
            var focusInfo = null;
            if (active && active.getAttribute) {
                var activeRow = active.closest ? active.closest('.monaco-list-row') : null;
                if (activeRow) {
                    focusInfo = {
                        id: activeRow.getAttribute('data-extension-id'),
                        action: active.getAttribute('data-action')
                    };
                }
            }
            mutator();
            listContainer.scrollTop = scrollTop;
            if (focusInfo && focusInfo.id) {
                var row = listRows.querySelector('[data-extension-id="' + focusInfo.id + '"]');
                if (row) {
                    var target = focusInfo.action
                        ? row.querySelector('[data-action="' + focusInfo.action + '"]')
                        : null;
                    (target || row).focus();
                }
            }
        }

        function updateEmpty(message) {
            if (!emptyState || !emptyMessage) return;
            if (message && listRows.children.length === 0) {
                emptyMessage.textContent = message;
                emptyState.style.display = 'flex';
            } else {
                emptyState.style.display = 'none';
            }
        }

        function applyRows(rows) {
            preserveContext(function () {
                listRows.innerHTML = rows.map(function (row) { return row.html; }).join('');
                positionRows();
                attachIconHandlers(listRows);
            });
        }

        function applyPatch(ops, message) {
            preserveContext(function () {
                for (var i = 0; i < ops.length; i++) {
                    var op = ops[i];
                    var existing = listRows.querySelector('[data-extension-id="' + op.id + '"]');
                    if (op.op === 'remove') {
                        if (existing) existing.remove();
                    } else if (op.op === 'insert') {
                        var insertAt = op.index || 0;
                        var ref = listRows.children[insertAt] || null;
                        listRows.insertBefore(createRowElement(op.html), ref);
                    } else if (op.op === 'replace') {
                        var replacement = createRowElement(op.html);
                        if (existing) {
                            existing.replaceWith(replacement);
                        } else {
                            listRows.appendChild(replacement);
                        }
                    } else if (op.op === 'move') {
                        if (existing) {
                            var moveTo = op.index || 0;
                            var moveRef = listRows.children[moveTo] || null;
                            if (moveRef !== existing) {
                                listRows.insertBefore(existing, moveRef);
                            }
                        }
                    }
                }
                positionRows();
                attachIconHandlers(listRows);
            });
            updateEmpty(message);
        }

        window.addEventListener('message', function (event) {
            var msg = event.data;
            if (!msg) return;
            if (msg.type === 'sidebarReset') {
                applyRows(msg.rows || []);
                updateEmpty(msg.emptyMessage);
            } else if (msg.type === 'sidebarPatch') {
                applyPatch(msg.ops || [], msg.emptyMessage);
            }
        });

        /* ------------------------------------------------ context menu */

        function hideContextMenu() {
            if (contextMenuContainer) {
                contextMenuContainer.style.display = 'none';
                activeContextExt = null;
            }
        }

        function showContextMenu(clientX, clientY, ext) {
            if (!contextMenuContainer || !contextMenuList) return;
            activeContextExt = ext;

            var items = [];
            function item(action, icon, label) {
                return '<li class="action-item" role="presentation">' +
                    '<a class="action-menu-item" role="menuitem" data-menu-action="' + action + '">' +
                        '<span class="menu-item-icon codicon codicon-' + icon + '"></span>' +
                        '<span class="action-label">' + label + '</span>' +
                    '</a>' +
                '</li>';
            }

            if (!ext.isInstalled) {
                items.push(item('install', 'cloud-download', 'Install'));
                items.push(item('installAnotherVersion', 'history', 'Install Specific Version...'));
            } else {
                if (ext.hasUpdate) {
                    items.push(item('update', 'arrow-up', 'Update'));
                }
                items.push(item('installAnotherVersion', 'history', 'Install Specific Version...'));
                items.push(item('uninstall', 'trash', 'Uninstall'));
            }

            items.push('<li class="action-item action-item-separator" role="presentation"></li>');
            items.push(item('copyId', 'copy', 'Copy Extension ID'));
            items.push(item('downloadVsix', 'link-external', 'Download VSIX'));
            items.push('<li class="action-item action-item-separator" role="presentation"></li>');
            items.push(item('openDetail', 'info', 'Show Extension Details'));

            contextMenuList.innerHTML = items.join('');
            contextMenuContainer.style.display = 'block';

            // 视口边缘自适应吸附计算
            var menuRect = contextMenuContainer.getBoundingClientRect();
            var posX = Math.max(4, Math.min(clientX, window.innerWidth - menuRect.width - 6));
            var posY = Math.max(4, Math.min(clientY, window.innerHeight - menuRect.height - 6));

            contextMenuContainer.style.left = posX + 'px';
            contextMenuContainer.style.top = posY + 'px';
        }

        document.addEventListener('contextmenu', (e) => {
            const card = e.target.closest('.monaco-list-row');
            if (card) {
                e.preventDefault();
                e.stopPropagation();
                const extId = card.getAttribute('data-extension-id');
                const isInstalled = card.getAttribute('data-installed') === 'true';
                const hasUpdate = card.getAttribute('data-has-update') === 'true';
                const version = card.getAttribute('data-version') || undefined;
                showContextMenu(e.clientX, e.clientY, { id: extId, isInstalled, hasUpdate, version });
            } else {
                hideContextMenu();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                hideContextMenu();
            }
        });

        /* ------------------------------------------------ search */

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const query = searchInput.value;
                if (searchClearBtn) {
                    searchClearBtn.style.display = query ? 'flex' : 'none';
                }
                // Host debounces by 500ms (native Delayer(500)).
                vscode.postMessage({ command: 'search', query: query });
            });

            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    searchInput.value = '';
                    if (searchClearBtn) {
                        searchClearBtn.style.display = 'none';
                    }
                    vscode.postMessage({ command: 'clearSearch' });
                }
            });
        }

        if (searchClearBtn) {
            searchClearBtn.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.focus();
                }
                searchClearBtn.style.display = 'none';
                vscode.postMessage({ command: 'clearSearch' });
            });
        }

        /* ------------------------------------------------ clicks */

        document.addEventListener('click', (e) => {
            const menuItem = e.target.closest('[data-menu-action]');
            if (menuItem && activeContextExt) {
                e.stopPropagation();
                const menuAction = menuItem.getAttribute('data-menu-action');
                const id = activeContextExt.id;
                const version = activeContextExt.version;
                hideContextMenu();

                if (menuAction === 'copyId') {
                    vscode.postMessage({ command: 'copy', text: id });
                } else if (menuAction === 'installAnotherVersion') {
                    vscode.postMessage({ command: 'installAnotherVersion', id });
                } else if (menuAction === 'downloadVsix') {
                    vscode.postMessage({ command: 'downloadVsix', id, version });
                } else if (menuAction === 'openDetail') {
                    vscode.postMessage({ command: 'openDetail', id });
                } else if (menuAction === 'install' || menuAction === 'uninstall' || menuAction === 'update') {
                    vscode.postMessage({ command: menuAction, id, version });
                }
                return;
            }

            hideContextMenu();

            const actionBtn = e.target.closest('.monaco-action-bar [data-action]');
            if (actionBtn) {
                e.stopPropagation();
                const action = actionBtn.getAttribute('data-action');
                const id = actionBtn.getAttribute('data-id');
                const version = actionBtn.getAttribute('data-version') || undefined;
                vscode.postMessage({ command: action, id, version });
                return;
            }

            const card = e.target.closest('[data-extension-id]');
            if (card) {
                const id = card.getAttribute('data-extension-id');
                vscode.postMessage({ command: 'openDetail', id });
                return;
            }
        });

        positionRows();
        attachIconHandlers(listRows);
        vscode.postMessage({ command: 'ready' });
    </script>
</body>
</html>
`;
}

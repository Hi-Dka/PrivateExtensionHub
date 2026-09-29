import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

if (
    (process.env.https_proxy || process.env.http_proxy) &&
    !process.execArgv.includes('--use-env-proxy')
) {
    const result = spawnSync(
        process.execPath,
        ['--use-env-proxy', ...process.execArgv, ...process.argv.slice(1)],
        {
            stdio: 'inherit',
            env: process.env,
        },
    );
    process.exit(result.status ?? 0);
}

const __dirname = import.meta.dirname;
const ROOT_DIR = path.resolve(__dirname, '..');
const MEDIA_DIR = path.join(ROOT_DIR, 'media');
const VENDOR_DIR = path.join(MEDIA_DIR, 'vendor');
const TAG_CACHE_FILE = path.join(__dirname, 'last-synced-tag');

const FALLBACK_TAG = '1.139.1';

const STYLES_TO_SYNC = [
    // 1. 扩展列表与侧边栏
    {
        name: 'extension.css',
        remotePath:
            'src/vs/workbench/contrib/extensions/browser/media/extension.css',
        targetPath: path.join(VENDOR_DIR, 'extension.css'),
    },
    {
        name: 'extensionsViewlet.css',
        remotePath:
            'src/vs/workbench/contrib/extensions/browser/media/extensionsViewlet.css',
        targetPath: path.join(VENDOR_DIR, 'extensionsViewlet.css'),
    },
    {
        name: 'extensionActions.css',
        remotePath:
            'src/vs/workbench/contrib/extensions/browser/media/extensionActions.css',
        targetPath: path.join(VENDOR_DIR, 'extensionActions.css'),
    },
    {
        name: 'extensionsWidgets.css',
        remotePath:
            'src/vs/workbench/contrib/extensions/browser/media/extensionsWidgets.css',
        targetPath: path.join(VENDOR_DIR, 'extensionsWidgets.css'),
    },

    // 2. 扩展详情编辑器
    {
        name: 'extensionEditor.css',
        remotePath:
            'src/vs/workbench/contrib/extensions/browser/media/extensionEditor.css',
        targetPath: path.join(VENDOR_DIR, 'extensionEditor.css'),
    },

    // 3. 基础通用控件 (Action Bar / List)
    {
        name: 'actionbar.css',
        remotePath: 'src/vs/base/browser/ui/actionbar/actionbar.css',
        targetPath: path.join(VENDOR_DIR, 'actionbar.css'),
    },
    {
        name: 'list.css',
        remotePath: 'src/vs/base/browser/ui/list/list.css',
        targetPath: path.join(VENDOR_DIR, 'list.css'),
    },

    // 4. Markdown 预览与代码高亮
    {
        name: 'markdown.css',
        remotePath: 'extensions/markdown-language-features/media/markdown.css',
        targetPath: path.join(VENDOR_DIR, 'markdown.css'),
    },
    {
        name: 'highlight.css',
        remotePath: 'extensions/markdown-language-features/media/highlight.css',
        targetPath: path.join(VENDOR_DIR, 'highlight.css'),
    },

    // 5. 官方 Loading 菊花 SVG
    {
        name: 'loading.svg',
        remotePath:
            'src/vs/workbench/contrib/extensions/browser/media/loading.svg',
        targetPath: path.join(VENDOR_DIR, 'loading.svg'),
    },
    {
        name: 'loading-dark.svg',
        remotePath:
            'src/vs/workbench/contrib/extensions/browser/media/loading-dark.svg',
        targetPath: path.join(VENDOR_DIR, 'loading-dark.svg'),
    },
    {
        name: 'loading-hc.svg',
        remotePath:
            'src/vs/workbench/contrib/extensions/browser/media/loading-hc.svg',
        targetPath: path.join(VENDOR_DIR, 'loading-hc.svg'),
    },
];

async function getLatestReleaseTag() {
    const url = 'https://api.github.com/repos/microsoft/vscode/releases/latest';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'PrivateExtensionHub-Build' },
        });
        if (!response.ok) {
            throw new Error(
                `Failed to fetch latest release: ${response.status} ${response.statusText}`,
            );
        }
        const data = await response.json();
        return data.tag_name || FALLBACK_TAG;
    } finally {
        clearTimeout(timeout);
    }
}

async function fetchRawFileWithRetry(tag, relativePath, maxRetries = 3) {
    const url = `https://raw.githubusercontent.com/microsoft/vscode/${tag}/${relativePath}`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: { 'User-Agent': 'PrivateExtensionHub-Build' },
            });

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status} ${response.statusText}`,
                );
            }
            return await response.text();
        } catch (err) {
            if (attempt === maxRetries) {
                throw new Error(
                    `Failed to fetch ${relativePath} after ${maxRetries} attempts: ${err.message}`,
                );
            }
            console.warn(
                `[Retry ${attempt}/${maxRetries}] Fetch failed for ${relativePath}, retrying...`,
            );
            await new Promise((r) => setTimeout(r, 1000 * attempt));
        } finally {
            clearTimeout(timeout);
        }
    }
}

export async function syncVSCodeStyles() {
    let latestTag = null;
    let cachedTag = fs.existsSync(TAG_CACHE_FILE)
        ? fs.readFileSync(TAG_CACHE_FILE, 'utf-8').trim()
        : null;

    try {
        latestTag = await getLatestReleaseTag();
        console.log(`Latest release tag fetched: ${latestTag}`);
    } catch (error) {
        console.error('Error fetching latest release tag:', error.message);
        if (!cachedTag) {
            console.warn(
                `No cached tag found. Falling back to default tag: ${FALLBACK_TAG}`,
            );
            latestTag = FALLBACK_TAG;
        } else {
            console.warn(`Using cached tag: ${cachedTag}`);
            latestTag = cachedTag;
        }
    }

    const allFilesExist = STYLES_TO_SYNC.every((item) =>
        fs.existsSync(item.targetPath),
    );

    if (allFilesExist && cachedTag === latestTag) {
        console.log(
            `All files are up-to-date with tag: ${latestTag}. No sync needed.`,
        );
        return;
    }

    console.log(
        `Syncing official styles for VS Code ${latestTag} into media/vendor/...`,
    );
    fs.mkdirSync(VENDOR_DIR, { recursive: true });

    let successCount = 0;
    for (const item of STYLES_TO_SYNC) {
        try {
            console.log(`  Downloading [${item.name}]...`);
            const content = await fetchRawFileWithRetry(
                latestTag,
                item.remotePath,
            );
            fs.mkdirSync(path.dirname(item.targetPath), { recursive: true });
            fs.writeFileSync(item.targetPath, content, 'utf-8');
            successCount++;
        } catch (err) {
            console.error(`  Failed to sync ${item.name}:`, err.message);
            throw err;
        }
    }

    fs.writeFileSync(TAG_CACHE_FILE, latestTag, 'utf-8');
    console.log(
        `\nSuccessfully synced ${successCount} files for VS Code ${latestTag}!`,
    );
}

if (process.argv[1]?.endsWith('sync-vscode-styles.mjs')) {
    syncVSCodeStyles().catch((err) => {
        console.error('\nSync aborted due to error:', err);
        process.exit(1);
    });
}

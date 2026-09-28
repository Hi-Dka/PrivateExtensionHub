import * as vscode from 'vscode';
import { Log } from './common/logger';
import { OpenVSXClient, OpenVSXError } from './openvsx/openVSXClient';

function getClient(): { client: OpenVSXClient; registryUrl: string } {
    const config = vscode.workspace.getConfiguration('privateExtensionHub');
    const registryUrl = config.get<string>(
        'openVSXUrl',
        'https://open-vsx.org',
    );
    return {
        client: new OpenVSXClient(registryUrl, Log),
        registryUrl,
    };
}

function handleError(err: unknown, actionDesc: string) {
    if (err instanceof OpenVSXError) {
        Log.error(
            `${actionDesc}失败 [HTTP ${err.status}]: ${err.statusText} (${err.url})`,
        );
        if (err.status === 404) {
            vscode.window.showWarningMessage(
                `${actionDesc}：未找到对应资源 (404)`,
            );
        } else if (err.status >= 500) {
            vscode.window.showErrorMessage(
                `${actionDesc}：Open VSX 服务器内部错误 (${err.status})`,
            );
        } else {
            vscode.window.showErrorMessage(`${actionDesc}失败: ${err.message}`);
        }
    } else if (err instanceof Error) {
        Log.error(`${actionDesc}异常: ${err.message}`);
        vscode.window.showErrorMessage(`${actionDesc}失败: ${err.message}`);
    }
}

export function activate(context: vscode.ExtensionContext) {
    Log.init(context);
    Log.info('Private Extension Hub is now active!');
    Log.show();

    const searchDisposable = vscode.commands.registerCommand(
        'hidka.searchExtension',
        async () => {
            const query = await vscode.window.showInputBox({
                prompt: '请输入要搜索的扩展名称或关键词 (例如: python, git, rust)',
                placeHolder: 'python',
            });

            if (!query || query.trim() === '') {
                Log.info('[Search] 用户取消了输入或输入内容为空');
                return;
            }

            const trimmedQuery = query.trim();
            const { client, registryUrl } = getClient();

            // 唤出输出面板展示实时日志
            Log.show();
            Log.info('----------------------------------------');
            Log.info(`[Search] 开始搜索: "${trimmedQuery}"`);
            Log.info(`[Search] 目标仓库地址: ${registryUrl}`);

            try {
                // 搜索扩展
                const searchResult = await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: `正在 Open VSX 搜索 "${trimmedQuery}"...`,
                        cancellable: false,
                    },
                    () => client.search(trimmedQuery, 20),
                );

                if (
                    !searchResult.extensions ||
                    searchResult.extensions.length === 0
                ) {
                    Log.warn(`[Search] 未找到与 "${trimmedQuery}" 相关的扩展`);
                    vscode.window.showInformationMessage(
                        `未找到与 "${trimmedQuery}" 相关的扩展`,
                    );
                    return;
                }

                Log.info(
                    `[Search] 搜索成功: 共命中 ${searchResult.totalSize} 个扩展，当前拉取展示前 ${searchResult.extensions.length} 个结果:`,
                );
                searchResult.extensions.forEach((ext, idx) => {
                    Log.info(
                        `  [${idx + 1}] ${ext.namespace}.${ext.name} (v${ext.version}) - ${ext.displayName || '无显示名称'}`,
                    );
                });

                // 弹出列表供用户选择
                const items = searchResult.extensions.map((ext) => ({
                    label: ext.displayName || `${ext.namespace}.${ext.name}`,
                    description: `v${ext.version} (${ext.namespace}.${ext.name})`,
                    detail: ext.description || '暂无描述',
                    ext,
                }));

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: `找到 ${searchResult.totalSize} 个扩展，请选择`,
                });

                if (!selected) {
                    Log.info('[Search] 用户关闭了选择列表');
                    return;
                }

                const { ext } = selected;
                Log.info(
                    `[Select] 用户选中了扩展: ${ext.namespace}.${ext.name} (v${ext.version})`,
                );

                // 选择扩展后，展示可选操作
                const action = await vscode.window.showQuickPick(
                    [
                        {
                            label: '$(book) 查看 README',
                            id: 'readme',
                            description: '在编辑器中打开扩展说明文档',
                        },
                        {
                            label: '$(versions) 查看所有版本',
                            id: 'versions',
                            description: '查看已发布的所有历史版本号',
                        },
                        {
                            label: '$(cloud-download) 获取 VSIX 下载链接',
                            id: 'download',
                            description: '获取最新版本的 VSIX 下载地址',
                        },
                    ],
                    {
                        placeHolder: `${selected.label} (v${ext.version}) - 请选择操作`,
                    },
                );

                if (!action) {
                    Log.info('[Select] 用户取消了操作菜单');
                    return;
                }

                Log.info(
                    `[Action] 用户选择了操作: ${action.label} (${action.id})`,
                );

                if (action.id === 'readme') {
                    Log.info(
                        `[Action:README] 正在获取 ${ext.namespace}.${ext.name} 的 README 文档...`,
                    );
                    const readmeContent = await vscode.window.withProgress(
                        {
                            location: vscode.ProgressLocation.Notification,
                            title: `正在拉取 ${selected.label} 的 README...`,
                        },
                        () => client.getReadme(ext.namespace, ext.name),
                    );
                    Log.info(
                        `[Action:README] 文档获取成功 (共 ${readmeContent.length} 字符)，正在编辑器中展示...`,
                    );
                    const doc = await vscode.workspace.openTextDocument({
                        content: readmeContent,
                        language: 'markdown',
                    });
                    await vscode.window.showTextDocument(doc);
                } else if (action.id === 'versions') {
                    Log.info(
                        `[Action:Versions] 正在获取 ${ext.namespace}.${ext.name} 的历史版本列表...`,
                    );
                    const versions = await vscode.window.withProgress(
                        {
                            location: vscode.ProgressLocation.Notification,
                            title: `正在获取 ${selected.label} 的版本列表...`,
                        },
                        () => client.getVersions(ext.namespace, ext.name),
                    );
                    Log.info(
                        `[Action:Versions] 成功获取到 ${versions.length} 个版本: ${versions.join(', ')}`,
                    );
                    vscode.window.showInformationMessage(
                        `${selected.label} 共有 ${versions.length} 个版本: ${versions.slice(0, 10).join(', ')}${versions.length > 10 ? ' ...' : ''}`,
                    );
                } else if (action.id === 'download') {
                    Log.info(
                        `[Action:Download] 正在解析 ${ext.namespace}.${ext.name}@${ext.version} 的下载链接...`,
                    );
                    const downloadUrl = await vscode.window.withProgress(
                        {
                            location: vscode.ProgressLocation.Notification,
                            title: `正在获取下载地址...`,
                        },
                        () =>
                            client.getDownloadUrl(
                                ext.namespace,
                                ext.name,
                                ext.version,
                            ),
                    );
                    Log.info(
                        `[Action:Download] 下载链接获取成功: ${downloadUrl}`,
                    );
                    const choice = await vscode.window.showInformationMessage(
                        `下载链接已获取: ${downloadUrl}`,
                        '复制链接',
                        '打开链接',
                    );
                    if (choice === '复制链接') {
                        await vscode.env.clipboard.writeText(downloadUrl);
                        Log.info(
                            '[Action:Download] 下载链接已复制到系统剪贴板',
                        );
                        vscode.window.showInformationMessage(
                            '下载链接已复制到剪贴板！',
                        );
                    } else if (choice === '打开链接') {
                        Log.info(
                            `[Action:Download] 正在浏览器中打开链接: ${downloadUrl}`,
                        );
                        await vscode.env.openExternal(
                            vscode.Uri.parse(downloadUrl),
                        );
                    }
                }
            } catch (err) {
                handleError(err, '扩展操作');
            }
        },
    );

    context.subscriptions.push(searchDisposable);
}

export function deactivate() {}

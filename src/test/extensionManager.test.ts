import * as assert from 'assert';
import * as fs from 'fs';
import { ExtensionManager, IVscodeHost } from '../extension/ExtensionManager';
import { ExtensionRepository, SearchResult } from '../repository/ExtensionRepository';
import { ExtensionInfo } from '../models/index';

suite('ExtensionManager Test Suite', () => {
    const originalFetch = globalThis.fetch;

    teardown(() => {
        globalThis.fetch = originalFetch;
    });

    test('getInstalledExtensions should map installed extensions to ExtensionInfo', () => {
        const mockHost: IVscodeHost = {
            getAllExtensions: () => [
                {
                    id: 'ms-python.python',
                    packageJSON: {
                        publisher: 'ms-python',
                        name: 'python',
                        displayName: 'Python Language',
                        version: '2024.1.0',
                        description: 'Python tooling',
                    },
                },
                {
                    id: 'redhat.java',
                    packageJSON: {
                        name: 'java',
                        version: '1.5.0',
                    },
                },
            ],
            executeCommand: async () => undefined,
        };

        const mockRepo = {} as ExtensionRepository;
        const manager = new ExtensionManager(mockRepo, mockHost);
        const installed = manager.getInstalledExtensions();

        assert.strictEqual(installed.length, 2);
        assert.strictEqual(installed[0].id, 'ms-python.python');
        assert.strictEqual(installed[0].version, '2024.1.0');
        assert.strictEqual(installed[0].isInstalled, true);
        assert.strictEqual(installed[1].id, 'redhat.java');
        assert.strictEqual(installed[1].namespace, 'redhat');
    });

    test('isInstalled and getInstalledVersion should check presence case-insensitively', () => {
        const mockHost: IVscodeHost = {
            getAllExtensions: () => [
                {
                    id: 'MS-Python.Python',
                    packageJSON: { version: '2024.1.0' },
                },
            ],
            executeCommand: async () => undefined,
        };

        const mockRepo = {} as ExtensionRepository;
        const manager = new ExtensionManager(mockRepo, mockHost);

        assert.strictEqual(manager.isInstalled('ms-python.python'), true);
        assert.strictEqual(manager.isInstalled('non.existent'), false);
        assert.strictEqual(manager.getInstalledVersion('ms-python.python'), '2024.1.0');
        assert.strictEqual(manager.getInstalledVersion('non.existent'), undefined);
    });

    test('checkUpdate should detect when repository has a newer version', async () => {
        const mockHost: IVscodeHost = {
            getAllExtensions: () => [
                {
                    id: 'ms-python.python',
                    packageJSON: { version: '1.2.0' },
                },
            ],
            executeCommand: async () => undefined,
        };

        const mockRepo: ExtensionRepository = {
            getExtension: async () => ({
                id: 'ms-python.python',
                namespace: 'ms-python',
                name: 'python',
                displayName: 'Python',
                version: '1.3.0',
                description: '',
                downloadCount: 0,
            }),
            search: async () => ({ extensions: [], total: 0 }),
            getVersions: async () => ['1.3.0'],
            getDownloadUrl: async () => 'https://fake/dl',
            getReadme: async () => '',
            getChangelog: async () => undefined,
            getManifest: async () => undefined,
        };

        const manager = new ExtensionManager(mockRepo, mockHost);
        const updateInfo = await manager.checkUpdate('ms-python.python');

        assert.strictEqual(updateInfo.hasUpdate, true);
        assert.strictEqual(updateInfo.currentVersion, '1.2.0');
        assert.strictEqual(updateInfo.latestVersion, '1.3.0');
    });

    test('checkUpdate should return false when already latest or uninstalled', async () => {
        const mockHost: IVscodeHost = {
            getAllExtensions: () => [
                {
                    id: 'ms-python.python',
                    packageJSON: { version: '2.0.0' },
                },
            ],
            executeCommand: async () => undefined,
        };

        const mockRepo: ExtensionRepository = {
            getExtension: async () => ({
                id: 'ms-python.python',
                namespace: 'ms-python',
                name: 'python',
                displayName: 'Python',
                version: '2.0.0',
                description: '',
                downloadCount: 0,
            }),
            search: async () => ({ extensions: [], total: 0 }),
            getVersions: async () => ['2.0.0'],
            getDownloadUrl: async () => '',
            getReadme: async () => '',
            getChangelog: async () => undefined,
            getManifest: async () => undefined,
        };

        const manager = new ExtensionManager(mockRepo, mockHost);
        const sameResult = await manager.checkUpdate('ms-python.python');
        assert.strictEqual(sameResult.hasUpdate, false);

        const uninstalledResult = await manager.checkUpdate('other.ext');
        assert.strictEqual(uninstalledResult.hasUpdate, false);
    });

    test('install should download VSIX, execute command, and clean up temporary file', async () => {
        let executedCommand = '';
        let executedUri: any = null;
        let createdFilePath = '';

        const mockHost: IVscodeHost = {
            getAllExtensions: () => [],
            executeCommand: async (cmd, arg) => {
                executedCommand = cmd;
                executedUri = arg;
                createdFilePath = arg?.fsPath;
                // 验证在执行命令时，临时文件确实存在
                assert.ok(fs.existsSync(createdFilePath), 'Temporary VSIX file should exist during execution');
            },
        };

        globalThis.fetch = (async () => {
            return {
                ok: true,
                status: 200,
                statusText: 'OK',
                arrayBuffer: async () => Buffer.from('fake-vsix-content').buffer,
            } as Response;
        }) as typeof fetch;

        const mockRepo: ExtensionRepository = {
            getExtension: async () => ({
                id: 'test.ext',
                namespace: 'test',
                name: 'ext',
                displayName: 'Test',
                version: '1.0.0',
                description: '',
                downloadCount: 0,
            }),
            getDownloadUrl: async () => 'https://fake/dl/test.ext.vsix',
            search: async () => ({ extensions: [], total: 0 }),
            getVersions: async () => ['1.0.0'],
            getReadme: async () => '',
            getChangelog: async () => undefined,
            getManifest: async () => undefined,
        };

        const manager = new ExtensionManager(mockRepo, mockHost);
        await manager.install('test', 'ext', '1.0.0');

        assert.strictEqual(executedCommand, 'workbench.extensions.installExtension');
        assert.ok(executedUri);
        // 验证安装完成后，临时文件已被清理删除
        assert.strictEqual(fs.existsSync(createdFilePath), false, 'Temporary VSIX file should be deleted in finally block');
    });

    test('uninstall should delegate to executeCommand', async () => {
        let uninstalledId = '';
        const mockHost: IVscodeHost = {
            getAllExtensions: () => [],
            executeCommand: async (cmd, id) => {
                if (cmd === 'workbench.extensions.uninstallExtension') {
                    uninstalledId = id;
                }
            },
        };

        const mockRepo = {} as ExtensionRepository;
        const manager = new ExtensionManager(mockRepo, mockHost);
        await manager.uninstall('ms-python.python');

        assert.strictEqual(uninstalledId, 'ms-python.python');
    });
});

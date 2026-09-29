import * as assert from 'assert';
import { ExtensionTreeDataProvider } from '../ui/ExtensionTreeDataProvider';
import { CategoryTreeItem, ExtensionTreeItem } from '../ui/ExtensionTreeItem';
import { ExtensionManager, IVscodeHost } from '../extension/ExtensionManager';
import { ExtensionRepository } from '../repository/ExtensionRepository';
import { ExtensionInfo } from '../models/index';

suite('ExtensionTreeDataProvider Test Suite', () => {
    function createMockManager(
        installedList: Array<{
            id: string;
            name: string;
            publisher: string;
            version: string;
        }> = [],
        updatesMap: Record<string, string> = {}, // id -> latestVersion
    ): ExtensionManager {
        const mockHost: IVscodeHost = {
            getAllExtensions: () =>
                installedList.map((item) => ({
                    id: item.id,
                    packageJSON: {
                        name: item.name,
                        publisher: item.publisher,
                        version: item.version,
                    },
                })),
            executeCommand: async () => undefined,
        };

        const mockRepo: ExtensionRepository = {
            getExtension: async (ns, name) => {
                const id = `${ns}.${name}`;
                if (updatesMap[id]) {
                    return {
                        id,
                        namespace: ns,
                        name,
                        displayName: name,
                        version: updatesMap[id],
                        description: '',
                        downloadCount: 0,
                    };
                }
                return undefined;
            },
            search: async () => ({ extensions: [], total: 0 }),
            getVersions: async () => [],
            getDownloadUrl: async () => '',
            getReadme: async () => '',
            getChangelog: async () => undefined,
            getManifest: async () => undefined,
        };

        return new ExtensionManager(mockRepo, mockHost);
    }

    test('should show only Installed category when no updates and no search', async () => {
        const manager = createMockManager([
            {
                id: 'publisher.test-ext',
                name: 'test-ext',
                publisher: 'publisher',
                version: '1.0.0',
            },
        ]);

        const provider = new ExtensionTreeDataProvider(manager);
        const roots = await provider.getChildren();

        assert.strictEqual(roots.length, 1);
        assert.ok(roots[0] instanceof CategoryTreeItem);
        const cat = roots[0] as CategoryTreeItem;
        assert.strictEqual(cat.categoryType, 'installed');
        assert.strictEqual(cat.label, '已安装 (1)');

        const children = await provider.getChildren(cat);
        assert.strictEqual(children.length, 1);
        assert.ok(children[0] instanceof ExtensionTreeItem);
        const extItem = children[0] as ExtensionTreeItem;
        assert.strictEqual(extItem.extension.id, 'publisher.test-ext');
        assert.strictEqual(extItem.contextValue, 'extension-installed');
        assert.strictEqual(extItem.description, 'v1.0.0');
    });

    test('should show Available Updates category when newer version exists', async () => {
        const manager = createMockManager(
            [
                {
                    id: 'publisher.updatable',
                    name: 'updatable',
                    publisher: 'publisher',
                    version: '1.0.0',
                },
            ],
            {
                'publisher.updatable': '1.2.0',
            },
        );

        const provider = new ExtensionTreeDataProvider(manager);
        const roots = await provider.getChildren();

        assert.strictEqual(roots.length, 2);
        const updateCat = roots[0] as CategoryTreeItem;
        const installedCat = roots[1] as CategoryTreeItem;

        assert.strictEqual(updateCat.categoryType, 'updates');
        assert.strictEqual(updateCat.label, '可用更新 (1)');
        assert.strictEqual(installedCat.categoryType, 'installed');

        const updateChildren = await provider.getChildren(updateCat);
        assert.strictEqual(updateChildren.length, 1);
        const updateItem = updateChildren[0] as ExtensionTreeItem;
        assert.strictEqual(updateItem.extension.id, 'publisher.updatable');
        assert.strictEqual(updateItem.targetVersion, '1.2.0');
        assert.strictEqual(updateItem.contextValue, 'extension-update');
        assert.strictEqual(updateItem.description, 'v1.0.0 → v1.2.0');
    });

    test('should populate and display Search Results category after performSearch', async () => {
        const manager = createMockManager([
            {
                id: 'existing.pkg',
                name: 'pkg',
                publisher: 'existing',
                version: '1.0.0',
            },
        ]);

        const fakeSearchItem: ExtensionInfo = {
            id: 'new.awesome',
            namespace: 'new',
            name: 'awesome',
            displayName: 'Awesome Extension',
            version: '2.0.0',
            description: 'A great tool',
            downloadCount: 100,
        };

        const mockRepo: ExtensionRepository = {
            search: async (q) => ({
                extensions: q === 'awesome' ? [fakeSearchItem] : [],
                total: 1,
            }),
            getExtension: async () => undefined,
            getVersions: async () => [],
            getDownloadUrl: async () => '',
            getReadme: async () => '',
            getChangelog: async () => undefined,
            getManifest: async () => undefined,
        };

        const provider = new ExtensionTreeDataProvider(manager, mockRepo);
        await provider.performSearch('awesome');

        const roots = await provider.getChildren();
        const searchCat = roots.find(
            (r) => (r as CategoryTreeItem).categoryType === 'searchResults',
        ) as CategoryTreeItem;
        assert.ok(searchCat, 'Search Results category should be present');
        assert.strictEqual(searchCat.label, '搜索结果: "awesome" (1)');

        const searchChildren = await provider.getChildren(searchCat);
        assert.strictEqual(searchChildren.length, 1);
        const searchItem = searchChildren[0] as ExtensionTreeItem;
        assert.strictEqual(searchItem.extension.id, 'new.awesome');
        assert.strictEqual(searchItem.contextValue, 'extension-uninstalled');

        // 清除搜索后，搜索结果分类应该消失
        provider.clearSearch();
        const rootsAfterClear = await provider.getChildren();
        assert.ok(
            !rootsAfterClear.some(
                (r) => (r as CategoryTreeItem).categoryType === 'searchResults',
            ),
        );
    });

    test('refresh should clear cached results and fire change event', async () => {
        const manager = createMockManager();
        const provider = new ExtensionTreeDataProvider(manager);

        let eventFired = false;
        provider.onDidChangeTreeData(() => {
            eventFired = true;
        });

        provider.refresh();
        assert.strictEqual(eventFired, true);
    });
});

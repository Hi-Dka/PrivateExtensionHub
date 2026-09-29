import * as assert from 'assert';
import { OpenVSXClient, OpenVSXError } from '../openvsx/openVSXClient';
import { OpenVSXExtension, OpenVSXSearchResult } from '../openvsx/models/index';
import { OpenVSXRepository } from '../repository/OpenVSXRepository';

suite('OpenVSXRepository Test Suite', () => {
    test('search should map DTOs to ExtensionInfo domain models and fallback displayName', async () => {
        const mockClient = {
            search: async (query: string, size?: number, offset?: number): Promise<OpenVSXSearchResult> => {
                return {
                    totalSize: 42,
                    extensions: [
                        {
                            namespace: 'ms-python',
                            name: 'python',
                            displayName: 'Python',
                            version: '2024.1.0',
                            description: 'Python language support',
                            downloadCount: 1000,
                            averageRating: 4.8,
                            reviewCount: 25,
                            repository: 'https://github.com/microsoft/vscode-python',
                            files: {
                                icon: 'https://fake/icon.png',
                                download: 'https://fake/python.vsix',
                            },
                        },
                        {
                            namespace: 'test-ns',
                            name: 'no-display-name',
                            version: '0.1.0',
                            // displayName omitted
                        },
                    ],
                };
            },
        } as unknown as OpenVSXClient;

        const repo = new OpenVSXRepository(mockClient);
        const result = await repo.search('python', 10, 0);

        assert.strictEqual(result.total, 42);
        assert.strictEqual(result.extensions.length, 2);

        // 第一个扩展：完整字段映射
        const first = result.extensions[0];
        assert.strictEqual(first.id, 'ms-python.python');
        assert.strictEqual(first.displayName, 'Python');
        assert.strictEqual(first.downloadCount, 1000);
        assert.strictEqual(first.rating, 4.8);
        assert.strictEqual(first.ratingCount, 25);
        assert.strictEqual(first.iconUrl, 'https://fake/icon.png');
        assert.strictEqual(first.repositoryUrl, 'https://github.com/microsoft/vscode-python');

        // 第二个扩展：displayName 回退到 name，downloadCount 默认 0
        const second = result.extensions[1];
        assert.strictEqual(second.id, 'test-ns.no-display-name');
        assert.strictEqual(second.displayName, 'no-display-name');
        assert.strictEqual(second.downloadCount, 0);
        assert.strictEqual(second.rating, undefined);
        assert.strictEqual(second.ratingCount, undefined);
        assert.strictEqual(second.description, '');
    });

    test('getExtension should map single extension and return ExtensionInfo', async () => {
        const mockClient = {
            getExtension: async (namespace: string, name: string): Promise<OpenVSXExtension> => {
                return {
                    namespace,
                    name,
                    displayName: 'Java Support',
                    version: '1.2.3',
                    publishedBy: {
                        displayName: 'Red Hat Inc.',
                    },
                };
            },
        } as unknown as OpenVSXClient;

        const repo = new OpenVSXRepository(mockClient);
        const ext = await repo.getExtension('redhat', 'java');

        assert.ok(ext);
        assert.strictEqual(ext.id, 'redhat.java');
        assert.strictEqual(ext.displayName, 'Java Support');
        assert.strictEqual(ext.publisherName, 'Red Hat Inc.');
    });

    test('getExtension should return undefined when client throws 404 OpenVSXError', async () => {
        const mockClient = {
            getExtension: async () => {
                throw new OpenVSXError(404, 'Not Found', 'https://fake/api/foo/bar');
            },
        } as unknown as OpenVSXClient;

        const repo = new OpenVSXRepository(mockClient);
        const ext = await repo.getExtension('foo', 'bar');

        assert.strictEqual(ext, undefined);
    });

    test('getExtension should rethrow non-404 errors', async () => {
        const mockClient = {
            getExtension: async () => {
                throw new OpenVSXError(500, 'Server Error', 'https://fake/api/foo/bar');
            },
        } as unknown as OpenVSXClient;

        const repo = new OpenVSXRepository(mockClient);
        await assert.rejects(
            async () => repo.getExtension('foo', 'bar'),
            (err: any) => err instanceof OpenVSXError && err.status === 500
        );
    });

    test('getVersions should delegate to client', async () => {
        const mockClient = {
            getVersions: async (namespace: string, name: string) => ['1.2.0', '1.1.0'],
        } as unknown as OpenVSXClient;

        const repo = new OpenVSXRepository(mockClient);
        const versions = await repo.getVersions('redhat', 'java');

        assert.deepStrictEqual(versions, ['1.2.0', '1.1.0']);
    });

    test('getDownloadUrl should delegate to client', async () => {
        const mockClient = {
            getDownloadUrl: async (namespace: string, name: string, version: string) =>
                `https://fake/${namespace}.${name}-${version}.vsix`,
        } as unknown as OpenVSXClient;

        const repo = new OpenVSXRepository(mockClient);
        const url = await repo.getDownloadUrl('redhat', 'java', '1.2.0');

        assert.strictEqual(url, 'https://fake/redhat.java-1.2.0.vsix');
    });

    test('getReadme should delegate to client', async () => {
        const mockClient = {
            getReadme: async (namespace: string, name: string, version?: string) =>
                `# README for ${namespace}.${name}@${version ?? 'latest'}`,
        } as unknown as OpenVSXClient;

        const repo = new OpenVSXRepository(mockClient);
        const readme = await repo.getReadme('redhat', 'java');

        assert.strictEqual(readme, '# README for redhat.java@latest');
    });

    test('getChangelog should delegate to client and cache results', async () => {
        let callCount = 0;
        const mockClient = {
            getChangelog: async (namespace: string, name: string, version?: string) => {
                callCount++;
                return `## Changelog for ${namespace}.${name}@${version ?? 'latest'}`;
            },
        } as unknown as OpenVSXClient;

        const repo = new OpenVSXRepository(mockClient);
        const result1 = await repo.getChangelog('redhat', 'java');
        const result2 = await repo.getChangelog('redhat', 'java');

        assert.strictEqual(result1, '## Changelog for redhat.java@latest');
        assert.strictEqual(result2, result1);
        assert.strictEqual(callCount, 1);
    });

    test('getManifest should delegate to client and cache results', async () => {
        let callCount = 0;
        const mockClient = {
            getManifest: async (namespace: string, name: string) => {
                callCount++;
                return {
                    name: 'java',
                    contributes: { commands: [{ command: 'java.build', title: 'Build Java' }] },
                };
            },
        } as unknown as OpenVSXClient;

        const repo = new OpenVSXRepository(mockClient);
        const result1 = await repo.getManifest('redhat', 'java');
        const result2 = await repo.getManifest('redhat', 'java');

        assert.strictEqual(result1?.name, 'java');
        assert.strictEqual(result2, result1);
        assert.strictEqual(callCount, 1);
    });
});

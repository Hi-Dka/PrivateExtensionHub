import * as assert from 'assert';
import { OpenVSXClient, OpenVSXError } from '../openvsx/openVSXClient';

suite('OpenVSXClient Test Suite', () => {
    const originalFetch = globalThis.fetch;
    const baseUrl = 'https://fake-open-vsx.org';

    teardown(() => {
        globalThis.fetch = originalFetch;
    });

    test('search should build correct query string and return result', async () => {
        let requestedUrl = '';
        globalThis.fetch = (async (url: string | URL | Request) => {
            requestedUrl = String(url);
            return {
                ok: true,
                status: 200,
                statusText: 'OK',
                json: async () => ({
                    extensions: [{ namespace: 'test-ns', name: 'test-ext', version: '1.0.0' }],
                    totalSize: 1,
                }),
            } as Response;
        }) as typeof fetch;

        const client = new OpenVSXClient(baseUrl);
        const result = await client.search('hello', 10, 0);

        assert.strictEqual(requestedUrl, `${baseUrl}/api/-/search?query=hello&size=10&offset=0`);
        assert.strictEqual(result.extensions.length, 1);
        assert.strictEqual(result.extensions[0].name, 'test-ext');
    });

    test('getExtension should query namespace and name', async () => {
        let requestedUrl = '';
        globalThis.fetch = (async (url: string | URL | Request) => {
            requestedUrl = String(url);
            return {
                ok: true,
                status: 200,
                statusText: 'OK',
                json: async () => ({
                    namespace: 'redhat',
                    name: 'java',
                    version: '1.5.0',
                    allVersions: {
                        'latest': 'https://fake/latest',
                        '1.5.0': 'https://fake/1.5.0',
                    },
                }),
            } as Response;
        }) as typeof fetch;

        const client = new OpenVSXClient(baseUrl);
        const ext = await client.getExtension('redhat', 'java');

        assert.strictEqual(requestedUrl, `${baseUrl}/api/redhat/java`);
        assert.strictEqual(ext.name, 'java');
        assert.strictEqual(ext.version, '1.5.0');
    });

    test('getVersions should return version strings and filter out aliases', async () => {
        globalThis.fetch = (async () => {
            return {
                ok: true,
                status: 200,
                statusText: 'OK',
                json: async () => ({
                    namespace: 'test-ns',
                    name: 'test-ext',
                    version: '2.0.0',
                    allVersions: {
                        'latest': 'https://fake/latest',
                        'pre-release': 'https://fake/pre-release',
                        '2.0.0': 'https://fake/2.0.0',
                        '1.0.0': 'https://fake/1.0.0',
                    },
                }),
            } as Response;
        }) as typeof fetch;

        const client = new OpenVSXClient(baseUrl);
        const versions = await client.getVersions('test-ns', 'test-ext');

        assert.deepStrictEqual(versions, ['2.0.0', '1.0.0']);
    });

    test('getVersions should fallback to extension.version if allVersions is empty', async () => {
        globalThis.fetch = (async () => {
            return {
                ok: true,
                status: 200,
                statusText: 'OK',
                json: async () => ({
                    namespace: 'test-ns',
                    name: 'test-ext',
                    version: '1.0.0',
                }),
            } as Response;
        }) as typeof fetch;

        const client = new OpenVSXClient(baseUrl);
        const versions = await client.getVersions('test-ns', 'test-ext');

        assert.deepStrictEqual(versions, ['1.0.0']);
    });

    test('getDownloadUrl for current version should not make second request', async () => {
        let callCount = 0;
        globalThis.fetch = (async (url: string | URL | Request) => {
            callCount++;
            return {
                ok: true,
                status: 200,
                statusText: 'OK',
                json: async () => ({
                    namespace: 'test-ns',
                    name: 'test-ext',
                    version: '1.2.3',
                    files: {
                        download: 'https://fake/test-1.2.3.vsix',
                    },
                }),
            } as Response;
        }) as typeof fetch;

        const client = new OpenVSXClient(baseUrl);
        const url = await client.getDownloadUrl('test-ns', 'test-ext', '1.2.3');

        assert.strictEqual(callCount, 1);
        assert.strictEqual(url, 'https://fake/test-1.2.3.vsix');
    });

    test('getDownloadUrl for different version should query version endpoint', async () => {
        const requestedUrls: string[] = [];
        globalThis.fetch = (async (url: string | URL | Request) => {
            const strUrl = String(url);
            requestedUrls.push(strUrl);
            if (strUrl === `${baseUrl}/api/test-ns/test-ext`) {
                return {
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    json: async () => ({
                        namespace: 'test-ns',
                        name: 'test-ext',
                        version: '2.0.0',
                        files: { download: 'https://fake/test-2.0.0.vsix' },
                    }),
                } as Response;
            } else if (strUrl === `${baseUrl}/api/test-ns/test-ext/1.0.0`) {
                return {
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    json: async () => ({
                        namespace: 'test-ns',
                        name: 'test-ext',
                        version: '1.0.0',
                        files: { download: 'https://fake/test-1.0.0.vsix' },
                    }),
                } as Response;
            }
            throw new Error(`Unexpected url: ${strUrl}`);
        }) as typeof fetch;

        const client = new OpenVSXClient(baseUrl);
        const url = await client.getDownloadUrl('test-ns', 'test-ext', '1.0.0');

        assert.strictEqual(requestedUrls.length, 2);
        assert.strictEqual(url, 'https://fake/test-1.0.0.vsix');
    });

    test('getReadme without version should fetch readme from root extension', async () => {
        globalThis.fetch = (async (url: string | URL | Request) => {
            const strUrl = String(url);
            if (strUrl === `${baseUrl}/api/test-ns/test-ext`) {
                return {
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    json: async () => ({
                        namespace: 'test-ns',
                        name: 'test-ext',
                        version: '1.0.0',
                        files: { readme: 'https://fake/readme.md' },
                    }),
                } as Response;
            } else if (strUrl === 'https://fake/readme.md') {
                return {
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    text: async () => '# Test Readme',
                } as Response;
            }
            throw new Error(`Unexpected url: ${strUrl}`);
        }) as typeof fetch;

        const client = new OpenVSXClient(baseUrl);
        const readme = await client.getReadme('test-ns', 'test-ext');

        assert.strictEqual(readme, '# Test Readme');
    });

    test('getChangelog should fetch changelog content or return undefined if missing', async () => {
        globalThis.fetch = (async (url: string | URL | Request) => {
            const strUrl = String(url);
            if (strUrl === `${baseUrl}/api/test-ns/test-ext`) {
                return {
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    json: async () => ({
                        namespace: 'test-ns',
                        name: 'test-ext',
                        version: '1.0.0',
                        files: { changelog: 'https://fake/changelog.md' },
                    }),
                } as Response;
            } else if (strUrl === 'https://fake/changelog.md') {
                return {
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    text: async () => '## 1.0.0 Changelog',
                } as Response;
            }
            throw new Error(`Unexpected url: ${strUrl}`);
        }) as typeof fetch;

        const client = new OpenVSXClient(baseUrl);
        const changelog = await client.getChangelog('test-ns', 'test-ext');
        assert.strictEqual(changelog, '## 1.0.0 Changelog');
    });

    test('getChangelog should return undefined when files.changelog is missing', async () => {
        globalThis.fetch = (async () => {
            return {
                ok: true,
                status: 200,
                statusText: 'OK',
                json: async () => ({
                    namespace: 'test-ns',
                    name: 'test-ext',
                    version: '1.0.0',
                    files: {},
                }),
            } as Response;
        }) as typeof fetch;

        const client = new OpenVSXClient(baseUrl);
        const changelog = await client.getChangelog('test-ns', 'test-ext');
        assert.strictEqual(changelog, undefined);
    });

    test('getManifest should fetch and parse package.json', async () => {
        globalThis.fetch = (async (url: string | URL | Request) => {
            const strUrl = String(url);
            if (strUrl === `${baseUrl}/api/test-ns/test-ext`) {
                return {
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    json: async () => ({
                        namespace: 'test-ns',
                        name: 'test-ext',
                        version: '1.0.0',
                        files: { manifest: 'https://fake/package.json' },
                    }),
                } as Response;
            } else if (strUrl === 'https://fake/package.json') {
                return {
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    json: async () => ({
                        name: 'test-ext',
                        contributes: {
                            commands: [{ command: 'test.run', title: 'Run Test' }],
                        },
                    }),
                } as Response;
            }
            throw new Error(`Unexpected url: ${strUrl}`);
        }) as typeof fetch;

        const client = new OpenVSXClient(baseUrl);
        const manifest = await client.getManifest('test-ns', 'test-ext');
        assert.ok(manifest);
        assert.strictEqual(manifest?.name, 'test-ext');
        assert.strictEqual(manifest?.contributes?.commands?.[0]?.command, 'test.run');
    });

    test('OpenVSXError should contain status, statusText, and url', () => {
        const error = new OpenVSXError(404, 'Not Found', 'https://example.com/api');
        assert.strictEqual(error.status, 404);
        assert.strictEqual(error.statusText, 'Not Found');
        assert.strictEqual(error.url, 'https://example.com/api');
        assert.strictEqual(error.name, 'OpenVSXError');
    });
});

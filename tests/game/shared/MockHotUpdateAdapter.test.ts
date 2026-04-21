import { MockHotUpdateAdapter } from '@game/shared/MockHotUpdateAdapter';
import { ManifestInfo } from '@framework/hotupdate/HotUpdateDefs';

describe('MockHotUpdateAdapter', () => {
    let adapter: MockHotUpdateAdapter;

    beforeEach(() => {
        adapter = new MockHotUpdateAdapter();
    });

    describe('getLocalManifest', () => {
        it('默认返回 null', async () => {
            const manifest = await adapter.getLocalManifest();
            expect(manifest).toBeNull();
        });

        it('setLocalManifest 后返回设置的值', async () => {
            const info: ManifestInfo = {
                version: '1.0.0',
                packageUrl: 'http://example.com/packages/',
                remoteManifestUrl: 'http://example.com/manifest',
                remoteVersionUrl: 'http://example.com/version',
                assets: {},
            };
            adapter.setLocalManifest(info);
            const manifest = await adapter.getLocalManifest();
            expect(manifest).toEqual(info);
        });

        it('setLocalManifest(null) 恢复为 null', async () => {
            adapter.setLocalManifest({
                version: '1.0.0',
                packageUrl: '',
                remoteManifestUrl: '',
                remoteVersionUrl: '',
                assets: {},
            });
            adapter.setLocalManifest(null);
            const manifest = await adapter.getLocalManifest();
            expect(manifest).toBeNull();
        });
    });

    describe('fetchRemoteVersion', () => {
        it('默认返回 1.0.0', async () => {
            const version = await adapter.fetchRemoteVersion('http://example.com/version');
            expect(version).toBe('1.0.0');
        });

        it('setRemoteVersion 后返回新版本', async () => {
            adapter.setRemoteVersion('2.0.0');
            const version = await adapter.fetchRemoteVersion('http://example.com/version');
            expect(version).toBe('2.0.0');
        });

        it('追踪 fetchVersionCalls', async () => {
            await adapter.fetchRemoteVersion('http://a.com/v');
            await adapter.fetchRemoteVersion('http://b.com/v');
            expect(adapter.fetchVersionCalls).toEqual(['http://a.com/v', 'http://b.com/v']);
        });
    });

    describe('fetchRemoteManifest', () => {
        it('未设置时 reject', async () => {
            await expect(adapter.fetchRemoteManifest('http://example.com/manifest'))
                .rejects.toThrow('远程 manifest 未设置');
        });

        it('setRemoteManifest 后返回正确值', async () => {
            const manifest: ManifestInfo = {
                version: '2.0.0',
                packageUrl: 'http://example.com/packages/',
                remoteManifestUrl: 'http://example.com/manifest',
                remoteVersionUrl: 'http://example.com/version',
                assets: { 'res/a.png': { md5: 'abc123', size: 1024 } },
            };
            adapter.setRemoteManifest(manifest);
            const result = await adapter.fetchRemoteManifest('http://example.com/manifest');
            expect(result).toEqual(manifest);
        });

        it('追踪 fetchManifestCalls', async () => {
            adapter.setRemoteManifest({
                version: '1.0.0',
                packageUrl: '',
                remoteManifestUrl: '',
                remoteVersionUrl: '',
                assets: {},
            });
            await adapter.fetchRemoteManifest('http://a.com/m');
            expect(adapter.fetchManifestCalls).toEqual(['http://a.com/m']);
        });
    });

    describe('downloadAsset', () => {
        it('默认下载成功', async () => {
            const result = await adapter.downloadAsset('http://cdn.com/a.png', '/cache/a.png');
            expect(result).toBe(true);
        });

        it('setDownloadError 后对应 URL reject', async () => {
            adapter.setDownloadError('http://cdn.com/fail.png', new Error('网络超时'));
            await expect(adapter.downloadAsset('http://cdn.com/fail.png', '/cache/fail.png'))
                .rejects.toThrow('网络超时');
        });

        it('未设置 error 的 URL 仍成功', async () => {
            adapter.setDownloadError('http://cdn.com/fail.png', new Error('失败'));
            const result = await adapter.downloadAsset('http://cdn.com/ok.png', '/cache/ok.png');
            expect(result).toBe(true);
        });

        it('追踪 downloadCalls', async () => {
            await adapter.downloadAsset('http://cdn.com/a.png', '/cache/a.png');
            expect(adapter.downloadCalls).toEqual([
                { url: 'http://cdn.com/a.png', savePath: '/cache/a.png' },
            ]);
        });
    });

    describe('verifyFile', () => {
        it('默认验证通过', async () => {
            const result = await adapter.verifyFile('/cache/a.png', 'abc123');
            expect(result).toBe(true);
        });

        it('setVerifyFailure 后验证失败', async () => {
            adapter.setVerifyFailure('/cache/corrupted.png');
            const result = await adapter.verifyFile('/cache/corrupted.png', 'abc123');
            expect(result).toBe(false);
        });

        it('追踪 verifyCalls', async () => {
            await adapter.verifyFile('/cache/a.png', 'md5hash');
            expect(adapter.verifyCalls).toEqual([
                { filePath: '/cache/a.png', expectedMd5: 'md5hash' },
            ]);
        });
    });

    describe('applyUpdate', () => {
        it('默认返回 true', async () => {
            const result = await adapter.applyUpdate();
            expect(result).toBe(true);
        });

        it('setApplyResult(false) 后返回 false', async () => {
            adapter.setApplyResult(false);
            const result = await adapter.applyUpdate();
            expect(result).toBe(false);
        });

        it('追踪 applyUpdateCalls', async () => {
            await adapter.applyUpdate();
            await adapter.applyUpdate();
            expect(adapter.applyUpdateCalls).toBe(2);
        });
    });

    describe('rollback', () => {
        it('默认返回 true', async () => {
            const result = await adapter.rollback();
            expect(result).toBe(true);
        });

        it('setRollbackResult(false) 后返回 false', async () => {
            adapter.setRollbackResult(false);
            const result = await adapter.rollback();
            expect(result).toBe(false);
        });

        it('追踪 rollbackCalls', async () => {
            await adapter.rollback();
            expect(adapter.rollbackCalls).toBe(1);
        });
    });
});

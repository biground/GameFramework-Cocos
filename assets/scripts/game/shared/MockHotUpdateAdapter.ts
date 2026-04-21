import { IHotUpdateAdapter, ManifestInfo } from '@framework/hotupdate/HotUpdateDefs';
import { Logger } from '@framework/debug/Logger';

/**
 * 模拟热更新适配器
 * 用于 Demo 和测试环境的热更新模拟
 *
 * @description
 * 实现 IHotUpdateAdapter 接口，在不依赖真实文件系统和网络的情况下
 * 模拟热更新流程，用于单元测试和 Demo 演示。
 * 所有方法的返回值均可通过 setter 方法预设，便于测试验证。
 *
 * @example
 * ```typescript
 * const adapter = new MockHotUpdateAdapter();
 * adapter.setLocalManifest({ version: '1.0.0', ... });
 * adapter.setRemoteVersion('2.0.0');
 * const version = await adapter.fetchRemoteVersion('http://example.com/version');
 * ```
 */
export class MockHotUpdateAdapter implements IHotUpdateAdapter {
    private static readonly TAG = 'MockHotUpdateAdapter';

    /** 模拟的本地 manifest */
    private _localManifest: ManifestInfo | null = null;

    /** 模拟的远程版本号 */
    private _remoteVersion: string = '1.0.0';

    /** 模拟的远程 manifest */
    private _remoteManifest: ManifestInfo | null = null;

    /** 模拟下载结果（默认全部成功） */
    private _downloadResult: boolean = true;

    /** 模拟下载失败的 URL 集合 */
    private _downloadErrors: Map<string, Error> = new Map();

    /** 模拟验证失败的文件路径集合 */
    private _verifyFailures: Set<string> = new Set();

    /** 模拟应用更新结果 */
    private _applyResult: boolean = true;

    /** 模拟回滚结果 */
    private _rollbackResult: boolean = true;

    /** 调用追踪 */
    public readonly fetchVersionCalls: string[] = [];
    public readonly fetchManifestCalls: string[] = [];
    public readonly downloadCalls: Array<{ url: string; savePath: string }> = [];
    public readonly verifyCalls: Array<{ filePath: string; expectedMd5: string }> = [];
    public applyUpdateCalls: number = 0;
    public rollbackCalls: number = 0;

    /**
     * 获取本地 manifest（模拟）
     * @returns 本地 manifest 信息
     */
    public getLocalManifest(): Promise<ManifestInfo | null> {
        Logger.debug(MockHotUpdateAdapter.TAG, '获取本地 manifest');
        return Promise.resolve(this._localManifest);
    }

    /**
     * 下载远程版本号（模拟）
     * @param url 版本文件 URL
     * @returns 版本号字符串
     */
    public fetchRemoteVersion(url: string): Promise<string> {
        this.fetchVersionCalls.push(url);
        Logger.debug(MockHotUpdateAdapter.TAG, `fetchRemoteVersion: ${url}`);
        return Promise.resolve(this._remoteVersion);
    }

    /**
     * 下载远程完整 manifest（模拟）
     * @param url manifest URL
     * @returns manifest 信息
     */
    public fetchRemoteManifest(url: string): Promise<ManifestInfo> {
        this.fetchManifestCalls.push(url);
        Logger.debug(MockHotUpdateAdapter.TAG, `fetchRemoteManifest: ${url}`);
        if (this._remoteManifest === null) {
            return Promise.reject(new Error('[MockHotUpdateAdapter] 远程 manifest 未设置'));
        }
        return Promise.resolve(this._remoteManifest);
    }

    /**
     * 下载单个资源文件（模拟）
     * @param url 文件 URL
     * @param savePath 保存路径
     * @returns 是否下载成功
     */
    public downloadAsset(url: string, savePath: string): Promise<boolean> {
        this.downloadCalls.push({ url, savePath });
        Logger.debug(MockHotUpdateAdapter.TAG, `downloadAsset: ${url} → ${savePath}`);
        const error = this._downloadErrors.get(url);
        if (error) {
            return Promise.reject(error);
        }
        return Promise.resolve(this._downloadResult);
    }

    /**
     * 验证文件完整性（模拟）
     * @param filePath 文件路径
     * @param expectedMd5 期望的 MD5 值
     * @returns 是否验证通过
     */
    public verifyFile(filePath: string, expectedMd5: string): Promise<boolean> {
        this.verifyCalls.push({ filePath, expectedMd5 });
        Logger.debug(MockHotUpdateAdapter.TAG, `verifyFile: ${filePath}, md5: ${expectedMd5}`);
        if (this._verifyFailures.has(filePath)) {
            return Promise.resolve(false);
        }
        return Promise.resolve(true);
    }

    /**
     * 应用更新（模拟）
     * @returns 是否应用成功
     */
    public applyUpdate(): Promise<boolean> {
        this.applyUpdateCalls++;
        Logger.debug(MockHotUpdateAdapter.TAG, '应用更新');
        return Promise.resolve(this._applyResult);
    }

    /**
     * 回退到之前的版本（模拟）
     * @returns 是否回退成功
     */
    public rollback(): Promise<boolean> {
        this.rollbackCalls++;
        Logger.debug(MockHotUpdateAdapter.TAG, '回滚版本');
        return Promise.resolve(this._rollbackResult);
    }

    // ─── 预设方法（仅用于测试） ─────────────────────────

    /**
     * 设置模拟的本地 manifest
     * @param manifest manifest 信息
     */
    public setLocalManifest(manifest: ManifestInfo | null): void {
        this._localManifest = manifest;
        Logger.debug(MockHotUpdateAdapter.TAG, `setLocalManifest: ${manifest?.version ?? 'null'}`);
    }

    /**
     * 设置模拟的远程版本号
     * @param version 版本号字符串
     */
    public setRemoteVersion(version: string): void {
        this._remoteVersion = version;
        Logger.debug(MockHotUpdateAdapter.TAG, `setRemoteVersion: ${version}`);
    }

    /**
     * 设置模拟的远程 manifest
     * @param manifest manifest 信息
     */
    public setRemoteManifest(manifest: ManifestInfo): void {
        this._remoteManifest = manifest;
        Logger.debug(MockHotUpdateAdapter.TAG, `setRemoteManifest: ${manifest.version}`);
    }

    /**
     * 设置模拟下载失败的 URL
     * @param url 文件 URL
     * @param error 错误对象
     */
    public setDownloadError(url: string, error: Error): void {
        this._downloadErrors.set(url, error);
        Logger.debug(MockHotUpdateAdapter.TAG, `setDownloadError: ${url}`);
    }

    /**
     * 设置模拟验证失败的文件路径
     * @param filePath 文件路径
     */
    public setVerifyFailure(filePath: string): void {
        this._verifyFailures.add(filePath);
        Logger.debug(MockHotUpdateAdapter.TAG, `setVerifyFailure: ${filePath}`);
    }

    /**
     * 设置模拟应用更新结果
     * @param result 是否成功
     */
    public setApplyResult(result: boolean): void {
        this._applyResult = result;
    }

    /**
     * 设置模拟回滚结果
     * @param result 是否成功
     */
    public setRollbackResult(result: boolean): void {
        this._rollbackResult = result;
    }
}

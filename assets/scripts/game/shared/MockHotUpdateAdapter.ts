import {
    IHotUpdateAdapter,
    ManifestInfo,
} from '@framework/hotupdate/HotUpdateDefs';

/**
 * 模拟热更新适配器
 * 用于 Demo 和测试环境的热更新模拟
 * 
 * @description
 * 实现 IHotUpdateAdapter 接口，在不依赖真实文件系统和网络的情况下
 * 模拟热更新流程，用于单元测试和 Demo 演示。
 */
export class MockHotUpdateAdapter implements IHotUpdateAdapter {
    private static readonly TAG = 'MockHotUpdateAdapter';

    /** 模拟的本地 manifest */
    private _localManifest: ManifestInfo | null = null;

    /** 模拟的远程 manifest */
    private _remoteManifest: ManifestInfo | null = null;

    // Constructor
    constructor() {
        // TODO: 初始化热更新适配器配置
    }

    /**
     * 获取本地 manifest（模拟）
     * @returns 本地 manifest 信息
     */
    public getLocalManifest(): Promise<ManifestInfo | null> {
        // TODO: 实现模拟获取本地 manifest
        return Promise.resolve(this._localManifest);
    }

    /**
     * 下载远程版本号（模拟）
     * @param _url 版本文件 URL
     * @returns 版本号字符串
     */
    public fetchRemoteVersion(_url: string): Promise<string> {
        // TODO: 实现模拟下载版本号
        return Promise.resolve('1.0.0');
    }

    /**
     * 下载远程完整 manifest（模拟）
     * @param _url manifest URL
     * @returns manifest 信息
     */
    public fetchRemoteManifest(_url: string): Promise<ManifestInfo> {
        // TODO: 实现模拟下载 manifest
        if (this._remoteManifest === null) {
            return Promise.reject(new Error('[MockHotUpdateAdapter] 远程 manifest 未设置'));
        }
        return Promise.resolve(this._remoteManifest);
    }

    /**
     * 下载单个资源文件（模拟）
     * @param _url 文件 URL
     * @param _savePath 保存路径
     * @returns 是否下载成功
     */
    public downloadAsset(_url: string, _savePath: string): Promise<boolean> {
        // TODO: 实现模拟下载资源
        return Promise.resolve(true);
    }

    /**
     * 验证文件完整性（模拟）
     * @param _filePath 文件路径
     * @param _expectedMd5 期望的 MD5 值
     * @returns 是否验证通过
     */
    public verifyFile(_filePath: string, _expectedMd5: string): Promise<boolean> {
        // TODO: 实现模拟文件验证
        return Promise.resolve(true);
    }

    /**
     * 应用更新（模拟）
     * @returns 是否应用成功
     */
    public applyUpdate(): Promise<boolean> {
        // TODO: 实现模拟应用更新
        return Promise.resolve(true);
    }

    /**
     * 回退到之前的版本（模拟）
     * @returns 是否回退成功
     */
    public rollback(): Promise<boolean> {
        // TODO: 实现模拟回退
        return Promise.resolve(true);
    }

    /**
     * 设置模拟的本地 manifest（仅用于测试）
     * @param manifest manifest 信息
     */
    public setLocalManifest(manifest: ManifestInfo | null): void {
        this._localManifest = manifest;
    }

    /**
     * 设置模拟的远程 manifest（仅用于测试）
     * @param manifest manifest 信息
     */
    public setRemoteManifest(manifest: ManifestInfo): void {
        this._remoteManifest = manifest;
    }
}

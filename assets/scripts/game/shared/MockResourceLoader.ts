import { IResourceLoader, LoadAssetCallbacks } from '@framework/resource/ResourceDefs';
import { Logger } from '@framework/debug/Logger';

/**
 * 模拟资源加载器
 * 用于 Demo 和测试环境的资源加载模拟
 */
export class MockResourceLoader implements IResourceLoader {
    private static readonly TAG = 'MockResourceLoader';
    private _registeredAssets: Map<string, unknown> = new Map();
    readonly loadRequests: Map<string, LoadAssetCallbacks> = new Map();
    readonly releaseRequests: string[] = [];
    private _autoSuccess: boolean = false;
    private _loadDelay: number = 0;

    public loadAsset(path: string, callbacks: LoadAssetCallbacks): void {
        Logger.debug(MockResourceLoader.TAG, `loadAsset: ${path}`);
        if (this._autoSuccess) {
            const asset = this._registeredAssets.get(path) ?? { type: 'mock', path };
            this._scheduleCallback(() => {
                callbacks.onSuccess?.(path, asset);
            });
            return;
        }
        this.loadRequests.set(path, callbacks);
    }

    public releaseAsset(path: string): void {
        Logger.debug(MockResourceLoader.TAG, `releaseAsset: ${path}`);
        this.releaseRequests.push(path);
        this._registeredAssets.delete(path);
    }

    public registerAsset(path: string, asset: unknown): void {
        this._registeredAssets.set(path, asset);
        Logger.debug(MockResourceLoader.TAG, `registerAsset: ${path}`);
    }

    public resolve(path: string, asset?: unknown): void {
        const callbacks = this.loadRequests.get(path);
        if (!callbacks) {
            Logger.warn(MockResourceLoader.TAG, `resolve: 未找到待处理请求 ${path}`);
            return;
        }
        const resolvedAsset = asset ?? this._registeredAssets.get(path) ?? { type: 'mock', path };
        this.loadRequests.delete(path);
        this._scheduleCallback(() => {
            Logger.debug(MockResourceLoader.TAG, `resolve: ${path}`);
            callbacks.onSuccess?.(path, resolvedAsset);
        });
    }

    public reject(path: string, error?: Error): void {
        const callbacks = this.loadRequests.get(path);
        if (!callbacks) {
            Logger.warn(MockResourceLoader.TAG, `reject: 未找到待处理请求 ${path}`);
            return;
        }
        const resolvedError = error ?? new Error(`[MockResourceLoader] load failed: ${path}`);
        this.loadRequests.delete(path);
        this._scheduleCallback(() => {
            Logger.debug(MockResourceLoader.TAG, `reject: ${path}`);
            callbacks.onFailure?.(path, resolvedError);
        });
    }

    public progress(path: string, value: number): void {
        const callbacks = this.loadRequests.get(path);
        if (!callbacks) {
            Logger.warn(MockResourceLoader.TAG, `progress: 未找到待处理请求 ${path}`);
            return;
        }
        callbacks.onProgress?.(path, value);
    }

    public setAutoSuccess(enabled: boolean): void {
        this._autoSuccess = enabled;
        Logger.debug(MockResourceLoader.TAG, `setAutoSuccess: ${enabled}`);
    }

    public setLoadDelay(ms: number): void {
        this._loadDelay = ms;
        Logger.debug(MockResourceLoader.TAG, `setLoadDelay: ${ms}ms`);
    }

    private _scheduleCallback(callback: () => void): void {
        if (this._loadDelay > 0) {
            setTimeout(callback, this._loadDelay);
        } else {
            callback();
        }
    }
}

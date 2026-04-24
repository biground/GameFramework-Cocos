import { Asset, resources } from 'cc';

import { Logger } from '../../framework/debug/Logger';
import type { IResourceLoader, LoadAssetCallbacks } from '../../framework/resource/ResourceDefs';

/**
 * Cocos 资源加载器（Runtime 层 IResourceLoader 实现）
 *
 * 职责：
 * - 桥接 `cc.resources.load` / `Asset.addRef` / `Asset.decRef`
 * - 维护 path → Asset 映射，保证同一 path 仅 addRef 一次
 * - 并发同 path 加载时合并请求（single-flight）
 */
export class CocosResourceLoader implements IResourceLoader {
    private static readonly TAG = 'CocosResourceLoader';

    /** 已加载成功的资源：path → Asset */
    private readonly _loaded = new Map<string, Asset>();

    /** 正在加载中的请求：path → 等待完成的 callbacks 列表 */
    private readonly _pending = new Map<string, LoadAssetCallbacks[]>();

    public loadAsset(path: string, callbacks: LoadAssetCallbacks): void {
        // 命中已加载缓存：直接回调成功
        const cached = this._loaded.get(path);
        if (cached) {
            callbacks.onSuccess?.(path, cached);
            return;
        }

        // 命中 pending：追加 waiter，不重复调 resources.load
        const pending = this._pending.get(path);
        if (pending) {
            pending.push(callbacks);
            return;
        }

        // 首次加载：注册 waiter，发起底层加载
        this._pending.set(path, [callbacks]);

        resources.load(
            path,
            null as unknown as never,
            (finished: number, total: number) => {
                const progress = total > 0 ? finished / total : 0;
                const waiters = this._pending.get(path);
                if (!waiters) {
                    return;
                }
                for (const cb of waiters) {
                    cb.onProgress?.(path, progress);
                }
            },
            (err: Error | null, asset: Asset) => {
                const waiters = this._pending.get(path) ?? [];
                this._pending.delete(path);

                if (err) {
                    for (const cb of waiters) {
                        cb.onFailure?.(path, err);
                    }
                    return;
                }

                asset.addRef();
                this._loaded.set(path, asset);
                for (const cb of waiters) {
                    cb.onSuccess?.(path, asset);
                }
            },
        );
    }

    public releaseAsset(path: string): void {
        const asset = this._loaded.get(path);
        if (!asset) {
            Logger.warn(CocosResourceLoader.TAG, `releaseAsset 未曾 load 的 path: ${path}`);
            return;
        }

        this._loaded.delete(path);
        asset.decRef(true);
    }
}

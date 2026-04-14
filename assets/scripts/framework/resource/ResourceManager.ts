import { ModuleBase } from '../core/ModuleBase';
import { Logger } from '../debug/Logger';
import { IResourceManager } from '../interfaces/IResourceManager';
import {
    AssetInfo,
    IResourceLoader,
    LoadAssetCallbacks,
    LoadState,
    PreloadCallbacks,
    ReadonlyAssetInfo,
} from './ResourceDefs';

/**
 * 资源管理器
 * 统一管理游戏资源的加载、释放、缓存与引用计数
 *
 * 设计要点：
 * - 引用计数按 owner 粒度（同一 owner 多次 load 同一资源只计 1 次）
 * - 加载去重（资源 Loading 中再次请求不重复发起，回调追加到等待列表）
 * - 通过 IResourceLoader 策略注入，Framework 层不依赖引擎 API
 */
export class ResourceManager extends ModuleBase implements IResourceManager {
    private static readonly TAG = 'ResourceManager';

    public get moduleName(): string {
        return 'ResourceManager';
    }

    public get priority(): number {
        return 100;
    }

    /** 资源缓存：path → AssetInfo */
    private readonly _assets: Map<string, AssetInfo> = new Map();

    /** 加载中的回调等待列表：path → callbacks[] */
    private readonly _pendingCallbacks: Map<string, LoadAssetCallbacks[]> = new Map();

    /** 资源加载器（由 Runtime 层注入） */
    private _loader: IResourceLoader | null = null;

    // ─── 生命周期 ──────────────────────────────────────

    public onInit(): void {
        this._assets.clear();
        this._pendingCallbacks.clear();
        Logger.info(ResourceManager.TAG, '资源管理器初始化');
    }

    public onShutdown(): void {
        // 先拷贝路径、清空内部状态，再释放底层资源
        // 确保即使 releaseAsset 有副作用也不会影响遍历
        const paths = [...this._assets.keys()];
        Logger.info(ResourceManager.TAG, `资源管理器关闭，释放 ${paths.length} 个资源`);
        this._assets.clear();
        this._pendingCallbacks.clear();
        for (const path of paths) {
            this._loader?.releaseAsset(path);
        }
    }

    // ─── IResourceManager 实现 ─────────────────────────

    /**
     * 设置资源加载器
     */
    public setResourceLoader(loader: IResourceLoader): void {
        if (!loader) {
            Logger.error(ResourceManager.TAG, 'loader 不能为空');
            throw new Error('[ResourceManager] loader 不能为空');
        }
        this._loader = loader;
    }

    /**
     * 加载资源
     *
     * 三种情况：
     * 1. 已加载（Loaded）→ 直接回调，owner 加入持有者集合
     * 2. 加载中（Loading）→ 追加回调到 _pendingCallbacks
     * 3. 未加载（None/Failed）→ 创建 AssetInfo，发起加载
     */
    public loadAsset(path: string, owner: string, callbacks?: LoadAssetCallbacks): void {
        if (!path) {
            Logger.error(ResourceManager.TAG, '资源路径不能为空');
            throw new Error('[ResourceManager] 资源路径不能为空');
        }
        if (!owner) {
            Logger.error(ResourceManager.TAG, 'owner 不能为空');
            throw new Error('[ResourceManager] owner 不能为空');
        }
        if (!this._loader) {
            Logger.error(ResourceManager.TAG, '未设置 ResourceLoader，请先调用 setResourceLoader');
            throw new Error('[ResourceManager] 未设置 ResourceLoader，请先调用 setResourceLoader');
        }

        const existing = this._assets.get(path);

        // 情况 1：已加载 — 缓存命中
        if (existing && existing.state === LoadState.Loaded) {
            Logger.debug(ResourceManager.TAG, `缓存命中: ${path}`);
            this._addOwner(existing, owner);
            callbacks?.onSuccess?.(path, existing.asset);
            return;
        }

        // 情况 2：加载中 — 去重，追加回调
        if (existing && existing.state === LoadState.Loading) {
            Logger.debug(ResourceManager.TAG, `加载去重, 追加回调: ${path}`);
            this._addOwner(existing, owner);
            if (callbacks) {
                const pending = this._pendingCallbacks.get(path);
                pending?.push(callbacks);
            }
            return;
        }

        // 情况 3：未加载 — 发起新加载
        Logger.debug(ResourceManager.TAG, `发起加载: ${path}`);
        const info = this._createAssetInfo(path);
        info.state = LoadState.Loading;
        this._assets.set(path, info);
        this._addOwner(info, owner);

        // 初始化等待列表
        const pendingList: LoadAssetCallbacks[] = [];
        if (callbacks) {
            pendingList.push(callbacks);
        }
        this._pendingCallbacks.set(path, pendingList);

        // 委托给实际加载器
        this._loader.loadAsset(path, {
            onSuccess: (p: string, asset: unknown) => {
                Logger.debug(ResourceManager.TAG, `加载成功: ${p}`);
                info.state = LoadState.Loaded;
                info.asset = asset;
                this._notifyPendingCallbacks(p, asset, null);
            },
            onFailure: (p: string, error: Error) => {
                Logger.warn(ResourceManager.TAG, `加载失败: ${p}`, error);
                info.state = LoadState.Failed;
                this._notifyPendingCallbacks(p, null, error);
                this._assets.delete(p);
            },
            onProgress: (p: string, progress: number) => {
                // 进度透传给所有等待中的回调
                const pending = this._pendingCallbacks.get(p);
                if (pending) {
                    for (const cbs of pending) {
                        cbs.onProgress?.(p, progress);
                    }
                }
            },
        });
    }

    /**
     * 释放资源
     */
    public releaseAsset(path: string, owner: string): void {
        const info = this._assets.get(path);
        if (!info) return;

        // 防重复释放：owner 不在持有者集合中
        if (!info.owners.has(owner)) return;

        Logger.debug(ResourceManager.TAG, `释放: ${path}`);
        info.owners.delete(owner);
        info.refCount--;

        // 引用计数归零 → 真正释放
        if (info.refCount === 0) {
            Logger.debug(ResourceManager.TAG, `引用归零，真正释放: ${path}`);
            this._loader?.releaseAsset(path);
            this._assets.delete(path);
        }
    }

    /**
     * 释放指定 owner 的所有资源
     */
    public releaseByOwner(owner: string): void {
        // 先收集，避免遍历中修改 Map
        const paths: string[] = [];
        for (const [path, info] of this._assets) {
            if (info.owners.has(owner)) {
                paths.push(path);
            }
        }
        for (const path of paths) {
            this.releaseAsset(path, owner);
        }
    }

    /**
     * 查询资源是否已加载
     */
    public hasAsset(path: string): boolean {
        const info = this._assets.get(path);
        return info !== undefined && info.state === LoadState.Loaded;
    }

    /**
     * 获取引用计数
     */
    public getAssetRefCount(path: string): number {
        return this._assets.get(path)?.refCount ?? 0;
    }

    /**
     * 获取资源详细信息（返回深层只读视图，外部无法篡改）
     */
    public getAssetInfo(path: string): ReadonlyAssetInfo | undefined {
        return this._assets.get(path);
    }

    /**
     * 预加载一组资源
     */
    public preload(paths: string[], owner: string, callbacks?: PreloadCallbacks): void {
        // 去重
        const uniquePaths = [...new Set(paths)];
        const total = uniquePaths.length;

        Logger.debug(ResourceManager.TAG, `预加载: ${total} 个资源`);

        // 空列表直接完成
        if (total === 0) {
            callbacks?.onComplete?.(0, 0);
            return;
        }

        let loaded = 0;
        let failed = 0;

        const checkComplete = (): void => {
            callbacks?.onProgress?.(loaded + failed, total);
            if (loaded + failed === total) {
                callbacks?.onComplete?.(loaded, failed);
            }
        };

        for (const path of uniquePaths) {
            this.loadAsset(path, owner, {
                onSuccess: (p: string, asset: unknown) => {
                    loaded++;
                    callbacks?.onAssetLoaded?.(p, asset);
                    checkComplete();
                },
                onFailure: (p: string, error: Error) => {
                    failed++;
                    callbacks?.onAssetFailed?.(p, error);
                    checkComplete();
                },
            });
        }
    }

    // ─── 内部辅助方法 ──────────────────────────────────

    /**
     * 为资源添加 owner
     * 如果是新 owner，refCount +1
     * @returns 是否是新增的 owner
     */
    private _addOwner(info: AssetInfo, owner: string): boolean {
        if (info.owners.has(owner)) {
            return false;
        }
        info.owners.add(owner);
        info.refCount++;
        return true;
    }

    /**
     * 创建新的 AssetInfo
     */
    private _createAssetInfo(path: string): AssetInfo {
        return {
            path,
            asset: null,
            state: LoadState.None,
            refCount: 0,
            owners: new Set<string>(),
        };
    }

    /**
     * 通知所有等待中的回调
     */
    private _notifyPendingCallbacks(path: string, asset: unknown, error: Error | null): void {
        const pending = this._pendingCallbacks.get(path);
        if (!pending) return;
        for (const cbs of pending) {
            if (error) {
                cbs.onFailure?.(path, error);
            } else {
                cbs.onSuccess?.(path, asset);
            }
        }
        this._pendingCallbacks.delete(path);
    }
}

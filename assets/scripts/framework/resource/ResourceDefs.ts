/**
 * 资源加载状态枚举
 */
export enum LoadState {
    /** 未加载 */
    None = 0,
    /** 加载中 */
    Loading = 1,
    /** 已加载 */
    Loaded = 2,
    /** 加载失败 */
    Failed = 3,
}

/**
 * 资源信息（内部管理用）
 * 记录单个资源的加载状态、引用计数和持有者信息
 */
export interface AssetInfo {
    /** 资源路径（唯一标识） */
    readonly path: string;
    /** 实际资源对象（Framework 层不关心具体类型） */
    asset: unknown;
    /** 当前加载状态 */
    state: LoadState;
    /** 总引用计数（= owners.size） */
    refCount: number;
    /** 持有者集合（按 owner 标识去重） */
    owners: Set<string>;
}

/**
 * 资源信息的只读视图（对外暴露用）
 * 所有属性均为 readonly，Set 替换为 ReadonlySet，防止外部篡改
 */
export interface ReadonlyAssetInfo {
    readonly path: string;
    readonly asset: unknown;
    readonly state: LoadState;
    readonly refCount: number;
    readonly owners: ReadonlySet<string>;
}

/**
 * 资源加载回调
 */
export interface LoadAssetCallbacks {
    /** 加载成功回调 */
    onSuccess?: (path: string, asset: unknown) => void;
    /** 加载失败回调 */
    onFailure?: (path: string, error: Error) => void;
    /** 加载进度回调（0~1） */
    onProgress?: (path: string, progress: number) => void;
}

/**
 * 预加载回调
 */
export interface PreloadCallbacks {
    /** 单个资源加载完成 */
    onAssetLoaded?: (path: string, asset: unknown) => void;
    /** 单个资源加载失败 */
    onAssetFailed?: (path: string, error: Error) => void;
    /** 整体进度（0~1） */
    onProgress?: (loaded: number, total: number) => void;
    /** 全部完成 */
    onComplete?: (successCount: number, failCount: number) => void;
}

/**
 * 资源加载器接口（策略模式）
 * Framework 层定义契约，Runtime 层提供实际实现
 *
 * @example
 * ```typescript
 * // Runtime 层实现
 * class CocosResourceLoader implements IResourceLoader {
 *     loadAsset(path: string, callbacks: LoadAssetCallbacks): void {
 *         cc.resources.load(path, (err, asset) => {
 *             if (err) callbacks.onFailure?.(path, err);
 *             else callbacks.onSuccess?.(path, asset);
 *         });
 *     }
 *     releaseAsset(path: string): void {
 *         cc.resources.release(path);
 *     }
 * }
 * ```
 *
 * @契约 引用计数由 ResourceManager 按 owner 维度统计；
 * 实现方仅在「owner 首次 load(path)」时对底层资源 addRef，
 * 「最后一个 owner release(path)」时 decRef(true)。
 * 不要在每次 load/release 都增减底层引用，否则会导致双重记账。
 */
export interface IResourceLoader {
    /**
     * 执行资源加载
     * @param path 资源路径
     * @param callbacks 加载回调
     */
    loadAsset(path: string, callbacks: LoadAssetCallbacks): void;

    /**
     * 执行资源释放
     * @param path 资源路径
     */
    releaseAsset(path: string): void;
}

/**
 * 资源事件键（用于 EventManager 通知）
 */
export const ResourceEvents = {
    /** 资源加载成功事件描述 */
    ASSET_LOADED: 'resource.asset_loaded',
    /** 资源加载失败事件描述 */
    ASSET_FAILED: 'resource.asset_failed',
    /** 资源释放事件描述 */
    ASSET_RELEASED: 'resource.asset_released',
} as const;

import {
    LoadAssetCallbacks,
    PreloadCallbacks,
    ReadonlyAssetInfo,
    IResourceLoader,
} from '../resource/ResourceDefs';

/**
 * 资源管理器接口
 * 定义资源系统的公共契约，业务层应依赖此接口而非 ResourceManager 实现类
 *
 * 核心职责：
 * 1. 统一的资源加载/释放入口
 * 2. 引用计数管理（按 owner 粒度）
 * 3. 缓存与加载去重
 * 4. 预加载支持
 */
export interface IResourceManager {
    /**
     * 设置资源加载器（策略注入）
     * 必须在使用 loadAsset 之前调用
     * @param loader 资源加载器实现
     */
    setResourceLoader(loader: IResourceLoader): void;

    /**
     * 加载资源
     * - 已缓存：直接回调，引用计数 +1（同一 owner 不重复计数）
     * - 加载中：追加回调到等待列表
     * - 未加载：发起新加载请求
     *
     * @param path 资源路径
     * @param owner 持有者标识（用于归属追踪和批量释放）
     * @param callbacks 加载回调（可选）
     */
    loadAsset(path: string, owner: string, callbacks?: LoadAssetCallbacks): void;

    /**
     * 释放资源
     * 移除指定 owner 的持有关系，引用计数 -1
     * 当引用计数归零时，真正释放底层资源
     *
     * @param path 资源路径
     * @param owner 持有者标识
     */
    releaseAsset(path: string, owner: string): void;

    /**
     * 释放指定 owner 持有的所有资源
     * 常用于场景切换时批量清理
     *
     * @param owner 持有者标识
     */
    releaseByOwner(owner: string): void;

    /**
     * 查询资源是否已加载
     * @param path 资源路径
     * @returns 是否已缓存
     */
    hasAsset(path: string): boolean;

    /**
     * 获取资源的当前引用计数
     * @param path 资源路径
     * @returns 引用计数，未加载返回 0
     */
    getAssetRefCount(path: string): number;

    /**
     * 获取资源的详细信息（深层只读视图）
     * @param path 资源路径
     * @returns 资源信息，不存在返回 undefined
     */
    getAssetInfo(path: string): ReadonlyAssetInfo | undefined;

    /**
     * 预加载一组资源
     * @param paths 资源路径数组
     * @param owner 持有者标识
     * @param callbacks 预加载回调（可选）
     */
    preload(paths: string[], owner: string, callbacks?: PreloadCallbacks): void;
}

import { EventKey } from '../event/EventDefs';

// ─── 场景加载回调 ──────────────────────────────────────

/**
 * 场景加载回调集合
 * 由 ISceneLoader 内部使用，SceneManager 在调用 loader.loadScene 时传入
 */
export interface LoadSceneCallbacks {
    /** 加载进度回调（0~1） */
    onProgress?: (progress: number) => void;
    /** 加载成功回调 */
    onSuccess?: (sceneName: string) => void;
    /** 加载失败回调 */
    onFailure?: (sceneName: string, error: string) => void;
}

/**
 * 场景加载选项
 * 业务层调用 SceneManager.loadScene 时的可选参数
 */
export interface LoadSceneOptions {
    /** 加载进度回调（0~1） */
    onProgress?: (progress: number) => void;
    /** 用户自定义数据，可在回调中透传 */
    userData?: unknown;
}

// ─── 场景加载器策略接口 ────────────────────────────────

/**
 * 场景加载器接口
 * Runtime 层实现此接口，注入到 SceneManager，实现 Framework 层与引擎解耦
 */
export interface ISceneLoader {
    /**
     * 加载场景
     * @param sceneName 场景名称
     * @param callbacks 加载回调集合
     */
    loadScene(sceneName: string, callbacks: LoadSceneCallbacks): void;

    /**
     * 卸载场景
     * @param sceneName 场景名称
     */
    unloadScene(sceneName: string): void;
}

// ─── 场景事件 ──────────────────────────────────────────

/**
 * 场景模块事件常量
 * 使用 EventKey<T> 实现类型安全的事件订阅与分发
 */
export const SceneEvents = {
    /** 场景加载中（携带进度） */
    SCENE_LOADING: new EventKey<{ sceneName: string; progress: number }>('scene_loading'),
    /** 场景加载完成 */
    SCENE_LOADED: new EventKey<{ sceneName: string }>('scene_loaded'),
    /** 场景已卸载 */
    SCENE_UNLOADED: new EventKey<{ sceneName: string }>('scene_unloaded'),
} as const;

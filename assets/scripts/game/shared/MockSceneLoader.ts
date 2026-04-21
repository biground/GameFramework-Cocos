import { ISceneLoader, LoadSceneCallbacks } from '@framework/scene/SceneDefs';
import { Logger } from '@framework/debug/Logger';

/**
 * 模拟场景加载器
 * 用于 Demo 和测试环境的场景加载模拟
 *
 * @description
 * 实现 ISceneLoader 接口，在不依赖 CocosCreator 引擎的情况下
 * 模拟场景加载行为，支持手动控制、进度模拟、延迟模拟和调用追踪。
 *
 * ## 功能特性
 * - **手动控制**: resolveLoad / rejectLoad / simulateProgress
 * - **自动模式**: setAutoSuccess 启用后自动完成加载
 * - **进度模拟**: simulateProgressSteps 自动发射进度序列
 * - **延迟模拟**: setLoadDelay 设置加载延迟
 * - **调用追踪**: loadRequests / loadedScenes / unloadedScenes
 */
export class MockSceneLoader implements ISceneLoader {
    private static readonly TAG = 'MockSceneLoader';

    // ─── 调用追踪 ──────────────────────────────────────

    /** 待处理的场景加载请求（场景名 → 回调集合） */
    public readonly loadRequests: Map<string, LoadSceneCallbacks> = new Map();

    /** 已成功加载的场景名称列表 */
    public readonly loadedScenes: string[] = [];

    /** 已卸载的场景名称列表 */
    public readonly unloadedScenes: string[] = [];

    // ─── 配置状态 ──────────────────────────────────────

    /** 是否自动成功完成加载 */
    private _autoSuccess: boolean = false;

    /** 加载延迟（毫秒） */
    private _loadDelay: number = 0;

    // ─── 接口实现 ──────────────────────────────────────

    /**
     * 加载场景（模拟）
     * @param sceneName 场景名称
     * @param callbacks 加载回调集合
     */
    public loadScene(sceneName: string, callbacks: LoadSceneCallbacks): void {
        Logger.debug(MockSceneLoader.TAG, 'loadScene:', sceneName);
        this.loadRequests.set(sceneName, callbacks);

        if (this._autoSuccess) {
            this._scheduleResolve(sceneName);
        }
    }

    /**
     * 卸载场景（模拟）
     * @param sceneName 场景名称
     */
    public unloadScene(sceneName: string): void {
        Logger.debug(MockSceneLoader.TAG, 'unloadScene:', sceneName);
        this.unloadedScenes.push(sceneName);
        this.loadRequests.delete(sceneName);
    }

    // ─── 手动控制 ──────────────────────────────────────

    /**
     * 手动触发场景加载成功
     * @param sceneName 场景名称
     */
    public resolveLoad(sceneName: string): void {
        const callbacks = this.loadRequests.get(sceneName);
        if (!callbacks) {
            Logger.warn(MockSceneLoader.TAG, 'resolveLoad: 场景不存在:', sceneName);
            return;
        }

        Logger.debug(MockSceneLoader.TAG, 'resolveLoad:', sceneName);
        this._executeWithDelay(() => {
            // 先更新状态，再调用回调
            this.loadedScenes.push(sceneName);
            this.loadRequests.delete(sceneName);
            callbacks.onSuccess?.(sceneName);
        });
    }

    /**
     * 手动触发场景加载失败
     * @param sceneName 场景名称
     * @param error 错误对象（可选）
     */
    public rejectLoad(sceneName: string, error?: Error): void {
        const callbacks = this.loadRequests.get(sceneName);
        if (!callbacks) {
            Logger.warn(MockSceneLoader.TAG, 'rejectLoad: 场景不存在:', sceneName);
            return;
        }

        const errorMsg = error?.toString() ?? `[MockSceneLoader] 加载失败: ${sceneName}`;
        Logger.debug(MockSceneLoader.TAG, 'rejectLoad:', sceneName, errorMsg);

        this._executeWithDelay(() => {
            callbacks.onFailure?.(sceneName, errorMsg);
            this.loadRequests.delete(sceneName);
        });
    }

    /**
     * 模拟加载进度
     * @param sceneName 场景名称
     * @param progress 进度值（0~1）
     */
    public simulateProgress(sceneName: string, progress: number): void {
        const callbacks = this.loadRequests.get(sceneName);
        if (!callbacks) {
            Logger.warn(MockSceneLoader.TAG, 'simulateProgress: 场景不存在:', sceneName);
            return;
        }

        Logger.debug(MockSceneLoader.TAG, 'simulateProgress:', sceneName, progress);
        callbacks.onProgress?.(progress);
    }

    // ─── 自动模式 ──────────────────────────────────────

    /**
     * 设置自动成功模式
     * @param enabled 启用后 loadScene 会自动触发成功回调
     */
    public setAutoSuccess(enabled: boolean): void {
        this._autoSuccess = enabled;
        Logger.debug(MockSceneLoader.TAG, 'setAutoSuccess:', enabled);
    }

    // ─── 进度模拟 ──────────────────────────────────────

    /**
     * 自动发射进度序列
     * @param sceneName 场景名称
     * @param steps 进度步长数组，默认 [0, 0.25, 0.5, 0.75, 1.0]
     */
    public simulateProgressSteps(sceneName: string, steps?: number[]): void {
        const progressSteps = steps ?? [0, 0.25, 0.5, 0.75, 1.0];

        Logger.debug(MockSceneLoader.TAG, 'simulateProgressSteps:', sceneName, progressSteps);

        for (const step of progressSteps) {
            this.simulateProgress(sceneName, step);
        }
    }

    // ─── 延迟模拟 ──────────────────────────────────────

    /**
     * 设置加载延迟
     * @param ms 延迟毫秒数，0 表示同步执行
     */
    public setLoadDelay(ms: number): void {
        this._loadDelay = ms;
        Logger.debug(MockSceneLoader.TAG, 'setLoadDelay:', ms);
    }

    // ─── 内部方法 ──────────────────────────────────────

    /**
     * 根据延迟配置执行回调
     * @param callback 要执行的回调函数
     */
    private _executeWithDelay(callback: () => void): void {
        if (this._loadDelay > 0) {
            setTimeout(callback, this._loadDelay);
        } else {
            callback();
        }
    }

    /**
     * 自动模式下调度 resolveLoad
     * @param sceneName 场景名称
     */
    private _scheduleResolve(sceneName: string): void {
        this._executeWithDelay(() => {
            this.resolveLoad(sceneName);
        });
    }
}

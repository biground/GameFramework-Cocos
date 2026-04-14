import { ModuleBase } from '../core/ModuleBase';
import { ISceneManager } from './ISceneManager';
import { ISceneLoader, LoadSceneOptions } from './SceneDefs';

/**
 * 场景管理器
 * 统一管理游戏场景的加载、卸载和切换
 *
 * 设计要点：
 * - 加载去重：正在加载 / 已是当前场景时忽略请求
 * - 通过 ISceneLoader 策略注入，Framework 层不依赖引擎 API
 * - 场景事件广播（待集成 EventManager）
 */
export class SceneManager extends ModuleBase implements ISceneManager {
    public get moduleName(): string {
        return 'SceneManager';
    }

    public get priority(): number {
        return 220;
    }

    // ─── 内部状态 ──────────────────────────────────────

    /** 当前已加载的场景名称 */
    private _currentScene: string | null = null;

    /** 正在加载中的场景名称 */
    private _loadingScene: string | null = null;

    /** 是否正在加载场景 */
    private _isLoading: boolean = false;

    /** 场景加载器（由 Runtime 层注入） */
    private _sceneLoader: ISceneLoader | null = null;

    // ─── 只读属性 ──────────────────────────────────────

    /**
     * 当前场景名称，未加载时为 null
     */
    public get currentScene(): string | null {
        return this._currentScene;
    }

    /**
     * 是否正在加载场景
     */
    public get isLoading(): boolean {
        return this._isLoading;
    }

    // ─── 生命周期 ──────────────────────────────────────

    public onInit(): void {
        // TODO: 实现
    }

    public onShutdown(): void {
        // TODO: 实现
    }

    // ─── ISceneManager 实现 ────────────────────────────

    /**
     * 设置场景加载器
     * @param loader 场景加载器实现
     */
    public setSceneLoader(loader: ISceneLoader): void {
        this._sceneLoader = loader;
    }

    /**
     * 加载场景
     * @param sceneName 场景名称
     * @param options 加载选项（可选）
     */
    public loadScene(_sceneName: string, _options?: LoadSceneOptions): void {
        // TODO: 实现
        // 占位引用，避免 TS6133（实现后移除）
        void this._sceneLoader;
        void this._loadingScene;
    }
}

import { ModuleBase } from '../core/ModuleBase';
import { Logger } from '../debug/Logger';
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
    private static readonly TAG = 'SceneManager';

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
        Logger.info(SceneManager.TAG, '场景管理器初始化');
        this._currentScene = null;
        this._loadingScene = null;
        this._isLoading = false;
    }

    public onShutdown(): void {
        Logger.info(SceneManager.TAG, '场景管理器关闭');
        this._currentScene = null;
        this._loadingScene = null;
        this._isLoading = false;
        this._sceneLoader = null;
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
    public loadScene(sceneName: string, options?: LoadSceneOptions): void {
        // 异常：空场景名
        if (!sceneName) {
            Logger.warn(SceneManager.TAG, '场景名称不能为空');
            return;
        }

        // 异常：未设置加载器
        if (!this._sceneLoader) {
            Logger.warn(SceneManager.TAG, '未设置场景加载器，请先调用 setSceneLoader');
            return;
        }

        // 去重：已是当前场景
        if (this._currentScene === sceneName) {
            Logger.warn(SceneManager.TAG, `已在场景 ${sceneName} 中，忽略重复加载`);
            return;
        }

        // 去重：正在加载中
        if (this._isLoading) {
            Logger.warn(
                SceneManager.TAG,
                `正在加载场景 ${this._loadingScene}，忽略新请求 ${sceneName}`,
            );
            return;
        }

        Logger.info(SceneManager.TAG, `开始加载场景: ${sceneName}`);
        this._isLoading = true;
        this._loadingScene = sceneName;

        this._sceneLoader.loadScene(sceneName, {
            onProgress: (progress: number) => {
                options?.onProgress?.(progress);
            },
            onSuccess: () => {
                Logger.info(SceneManager.TAG, `场景加载完成: ${sceneName}`);
                this._currentScene = sceneName;
                this._loadingScene = null;
                this._isLoading = false;
            },
            onFailure: () => {
                Logger.error(SceneManager.TAG, `场景加载失败: ${sceneName}`);
                this._loadingScene = null;
                this._isLoading = false;
            },
        });
    }
}

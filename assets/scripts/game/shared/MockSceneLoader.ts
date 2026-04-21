import {
    ISceneLoader,
    LoadSceneCallbacks,
} from '@framework/scene/SceneDefs';

/**
 * 模拟场景加载器
 * 用于 Demo 和测试环境的场景加载模拟
 * 
 * @description
 * 实现 ISceneLoader 接口，在不依赖 CocosCreator 引擎的情况下
 * 模拟场景加载行为，用于单元测试和 Demo 演示。
 */
export class MockSceneLoader implements ISceneLoader {
    private static readonly TAG = 'MockSceneLoader';

    /** 已注册的场景名称列表 */
    private _registeredScenes: Set<string> = new Set();

    // Constructor
    constructor() {
        // TODO: 初始化场景加载器配置
    }

    /**
     * 加载场景（模拟）
     * @param sceneName 场景名称
     * @param callbacks 加载回调集合
     */
    public loadScene(sceneName: string, callbacks: LoadSceneCallbacks): void {
        // TODO: 实现模拟场景加载逻辑
        if (this._registeredScenes.has(sceneName)) {
            callbacks.onProgress?.(1.0);
            callbacks.onSuccess?.(sceneName);
        } else {
            callbacks.onFailure?.(sceneName, `[MockSceneLoader] 场景不存在: ${sceneName}`);
        }
    }

    /**
     * 卸载场景（模拟）
     * @param sceneName 场景名称
     */
    public unloadScene(_sceneName: string): void {
        // TODO: 实现模拟场景卸载逻辑
    }

    /**
     * 注册可用场景（仅用于测试）
     * @param sceneName 场景名称
     */
    public registerScene(sceneName: string): void {
        this._registeredScenes.add(sceneName);
    }
}

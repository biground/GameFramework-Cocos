import { ISceneLoader, LoadSceneOptions } from '../scene/SceneDefs';

/**
 * 场景管理器接口
 * 定义场景系统的公共契约，业务层应依赖此接口而非 SceneManager 实现类
 *
 * 核心职责：
 * 1. 场景的加载与卸载
 * 2. 加载去重（正在加载 / 已是当前场景时忽略）
 * 3. 通过 ISceneLoader 策略注入，Framework 层不依赖引擎 API
 * 4. 场景事件广播（SCENE_LOADING / SCENE_LOADED / SCENE_UNLOADED）
 */
export interface ISceneManager {
    /**
     * 设置场景加载器（策略注入）
     * 必须在加载场景之前调用
     * @param loader 场景加载器实现
     */
    setSceneLoader(loader: ISceneLoader): void;

    /**
     * 加载场景
     * 如果正在加载或已是当前场景则忽略
     * @param sceneName 场景名称
     * @param options 加载选项（可选）
     */
    loadScene(sceneName: string, options?: LoadSceneOptions): void;

    /**
     * 当前场景名称，未加载时为 null
     */
    readonly currentScene: string | null;

    /**
     * 是否正在加载场景
     */
    readonly isLoading: boolean;
}

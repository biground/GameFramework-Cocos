import type { IProcedureManager } from '@framework/interfaces/IProcedureManager';
import type { IResourceManager } from '@framework/interfaces/IResourceManager';
import type { ISceneManager } from '@framework/interfaces/ISceneManager';
import type { IUIManager } from '@framework/interfaces/IUIManager';

/** ProcedureManager 中保存运行时上下文的共享键。 */
export const RUNTIME_GAME_CONTEXT_KEY = 'RuntimeGameContext';

/** Runtime 默认启动后进入的主场景名称。 */
export const DEFAULT_RUNTIME_TARGET_SCENE_NAME = 'MainScene';

/**
 * Cocos Runtime 游戏启动上下文。
 *
 * Game 层通过接口类型使用框架模块，避免直接依赖模块实现。
 */
export interface RuntimeGameContext {
    /** 资源管理器接口。 */
    readonly resourceManager: IResourceManager;

    /** 场景管理器接口。 */
    readonly sceneManager: ISceneManager;

    /** UI 管理器接口。 */
    readonly uiManager: IUIManager;

    /** 流程管理器接口。 */
    readonly procedureManager: IProcedureManager;

    /** 启动流程最终要进入的目标场景名称。 */
    readonly targetSceneName: string;

    /** 最近一次启动失败信息，供后续 Wave 扩展错误流程。 */
    readonly lastFailure?: Error;
}

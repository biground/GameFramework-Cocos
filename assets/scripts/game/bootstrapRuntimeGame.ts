import { GameEntry } from '@framework/core/GameEntry';
import { ProcedureManager } from '@framework/procedure/ProcedureManager';
import { ResourceManager } from '@framework/resource/ResourceManager';
import { SceneManager } from '@framework/scene/SceneManager';
import { UIManager } from '@framework/ui/UIManager';
import { installCocosRuntime } from '@runtime/cc-385/installCocosRuntime';

import { DEFAULT_RUNTIME_TARGET_SCENE_NAME, RuntimeGameContext } from './RuntimeGameContext';

export { DEFAULT_RUNTIME_TARGET_SCENE_NAME, RUNTIME_GAME_CONTEXT_KEY } from './RuntimeGameContext';

/** Runtime 游戏启动选项。 */
export interface BootstrapRuntimeGameOptions {
    /** Runtime 策略装配函数，测试中可注入替身。 */
    readonly installRuntime?: () => void;

    /** 目标主场景名称，未传时使用默认主场景。 */
    readonly targetSceneName?: string;
}

/**
 * 注册 Runtime 游戏所需的框架模块并装配 Cocos Runtime 策略。
 *
 * Wave 1 只负责 composition root 与上下文创建，暂不初始化 Procedure 链。
 */
export function bootstrapRuntimeGame(
    options: BootstrapRuntimeGameOptions = {},
): RuntimeGameContext {
    const resourceManager = new ResourceManager();
    const sceneManager = new SceneManager();
    const uiManager = new UIManager();
    const procedureManager = new ProcedureManager();

    GameEntry.registerModule(resourceManager);
    GameEntry.registerModule(sceneManager);
    GameEntry.registerModule(uiManager);
    GameEntry.registerModule(procedureManager);

    const installRuntime = options.installRuntime ?? installCocosRuntime;
    installRuntime();

    return {
        resourceManager,
        sceneManager,
        uiManager,
        procedureManager,
        targetSceneName: options.targetSceneName ?? DEFAULT_RUNTIME_TARGET_SCENE_NAME,
    };
}

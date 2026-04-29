import { GameEntry } from '@framework/core/GameEntry';
import { ProcedureManager } from '@framework/procedure/ProcedureManager';
import { ResourceManager } from '@framework/resource/ResourceManager';
import { SceneManager } from '@framework/scene/SceneManager';
import { UILayer } from '@framework/ui/UIDefs';
import { UIManager } from '@framework/ui/UIManager';
import type { IHotUpdateManager } from '@framework/interfaces/IHotUpdateManager';
import { installCocosRuntime } from '@runtime/cc-385/installCocosRuntime';

import {
    DEFAULT_RUNTIME_TARGET_SCENE_NAME,
    RUNTIME_GAME_CONTEXT_KEY,
    RuntimeGameContext,
} from './RuntimeGameContext';
import { ProcedureHotUpdateCheck } from './procedure/ProcedureHotUpdateCheck';
import { ProcedureConfigLoad } from './procedure/ProcedureConfigLoad';
import { ProcedureScenePreload } from './procedure/ProcedureScenePreload';
import { ProcedureLoadMainScene } from './procedure/ProcedureLoadMainScene';
import { ProcedureMainSceneReady } from './procedure/ProcedureMainSceneReady';
import { ProcedureSceneLoadFailed } from './procedure/ProcedureSceneLoadFailed';
import { MainMenuForm } from './ui/MainMenuForm';

export { DEFAULT_RUNTIME_TARGET_SCENE_NAME, RUNTIME_GAME_CONTEXT_KEY } from './RuntimeGameContext';

/** Runtime 游戏启动选项。 */
export interface BootstrapRuntimeGameOptions {
    /** Runtime 策略装配函数，测试中可注入替身。 */
    readonly installRuntime?: () => void;

    /** Runtime 装配完成后的测试扩展点，可替换 Scene/UI 等运行时策略。 */
    readonly afterInstallRuntime?: (context: RuntimeGameContext) => void;

    /** 目标主场景名称，未传时使用默认主场景。 */
    readonly targetSceneName?: string;

    /** 可选：热更新管理器。 */
    readonly hotUpdateManager?: IHotUpdateManager;

    /** 可选：需要预加载的资源目录列表。 */
    readonly configDirs?: string[];

    /** 可选：需要预加载的场景名，默认为 targetSceneName。 */
    readonly sceneToPreload?: string;
}

/**
 * 注册 Runtime 游戏所需的框架模块并装配 Cocos Runtime 策略。
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

    const context: RuntimeGameContext = {
        resourceManager,
        sceneManager,
        uiManager,
        procedureManager,
        targetSceneName: options.targetSceneName ?? DEFAULT_RUNTIME_TARGET_SCENE_NAME,
        hotUpdateManager: options.hotUpdateManager,
        configDirs: options.configDirs ?? [],
        sceneToPreload: options.sceneToPreload,
    };

    options.afterInstallRuntime?.(context);

    uiManager.registerForm(MainMenuForm.FORM_NAME, {
        path: MainMenuForm.RESOURCE_PATH,
        layer: UILayer.Normal,
    });

    procedureManager.initialize(
        new ProcedureHotUpdateCheck(),
        new ProcedureConfigLoad(),
        new ProcedureScenePreload(),
        new ProcedureLoadMainScene(),
        new ProcedureMainSceneReady(),
        new ProcedureSceneLoadFailed(),
    );
    procedureManager.setData(RUNTIME_GAME_CONTEXT_KEY, context);
    procedureManager.startProcedure(ProcedureHotUpdateCheck);

    return context;
}

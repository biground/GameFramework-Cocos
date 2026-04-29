import type { IFsm } from '@framework/fsm/FsmDefs';
import { Logger } from '@framework/debug/Logger';
import { ProcedureBase } from '@framework/procedure/ProcedureBase';

import { RUNTIME_GAME_CONTEXT_KEY, RuntimeGameContext } from '../RuntimeGameContext';
import { ProcedureLoadMainScene } from './ProcedureLoadMainScene';
import { ProcedureSceneLoadFailed } from './ProcedureSceneLoadFailed';

const TAG = 'ProcedureScenePreload';

/**
 * 场景预加载流程
 *
 * 职责：
 * 1. 从 context 获取 sceneToPreload（默认为 context.targetSceneName）
 * 2. 调用 context.sceneManager.preloadScene() 预加载场景
 * 3. 预加载完成 → 切换到 ProcedureLoadMainScene（正式切换场景）
 * 4. 预加载失败 → context.lastFailure = 错误 + 切换到 ProcedureSceneLoadFailed
 */
export class ProcedureScenePreload extends ProcedureBase {
    /** 进入流程时触发场景预加载。 */
    public override onEnter(fsm: IFsm<unknown>): void {
        const context = this.getContext<RuntimeGameContext>(fsm, RUNTIME_GAME_CONTEXT_KEY);
        const sceneName = context.sceneToPreload ?? context.targetSceneName;

        Logger.info(TAG, `开始预加载场景：${sceneName}`);

        context.sceneManager.preloadScene(sceneName, (error?: string) => {
            if (error) {
                Logger.warn(TAG, `场景预加载失败：${error}`);
                context.lastFailure = new Error(
                    `[ProcedureScenePreload] 场景 ${sceneName} 预加载失败：${error}`,
                );
                this.changeProcedure(fsm, ProcedureSceneLoadFailed);
            } else {
                Logger.info(TAG, `场景预加载完成：${sceneName}`);
                this.changeProcedure(fsm, ProcedureLoadMainScene);
            }
        });
    }
}

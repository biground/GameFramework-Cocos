import type { IFsm } from '@framework/fsm/FsmDefs';
import { ProcedureBase } from '@framework/procedure/ProcedureBase';

import { RUNTIME_GAME_CONTEXT_KEY, RuntimeGameContext } from '../RuntimeGameContext';
import { ProcedureMainSceneReady } from './ProcedureMainSceneReady';
import { ProcedureSceneLoadFailed } from './ProcedureSceneLoadFailed';

/** 主场景加载流程状态。 */
export type SceneLoadState = 'idle' | 'loading' | 'succeeded' | 'failed';

/**
 * Runtime 启动阶段的主场景加载流程。
 *
 * SceneManager 当前只暴露 currentScene/isLoading，因此本流程发起一次加载后通过轮询判断结果。
 */
export class ProcedureLoadMainScene extends ProcedureBase {
    private _state: SceneLoadState = 'idle';
    private _hasStarted = false;

    /** 当前场景加载状态。 */
    public get state(): SceneLoadState {
        return this._state;
    }

    /** 进入流程时发起一次主场景加载。 */
    public override onEnter(fsm: IFsm<unknown>): void {
        this._state = 'idle';
        this._hasStarted = false;
        this.startSceneLoad(fsm);
    }

    /** 每帧轮询场景加载结果并切换到后续流程。 */
    public override onUpdate(fsm: IFsm<unknown>, _deltaTime: number): void {
        if (this._state === 'succeeded' || this._state === 'failed') {
            return;
        }

        const context = this.getContext<RuntimeGameContext>(fsm, RUNTIME_GAME_CONTEXT_KEY);
        const currentScene = context.sceneManager.currentScene;

        if (currentScene === context.targetSceneName) {
            this._state = 'succeeded';
            this.changeProcedure(fsm, ProcedureMainSceneReady);
            return;
        }

        if (this._hasStarted && !context.sceneManager.isLoading) {
            this._state = 'failed';
            context.lastFailure = new Error(
                `[ProcedureLoadMainScene] 加载主场景失败：目标场景 ${context.targetSceneName}，当前场景 ${currentScene ?? 'null'}`,
            );
            this.changeProcedure(fsm, ProcedureSceneLoadFailed);
        }
    }

    private startSceneLoad(fsm: IFsm<unknown>): void {
        if (this._hasStarted) {
            return;
        }

        const context = this.getContext<RuntimeGameContext>(fsm, RUNTIME_GAME_CONTEXT_KEY);
        context.sceneManager.loadScene(context.targetSceneName);
        this._hasStarted = true;
        this._state = 'loading';
    }
}

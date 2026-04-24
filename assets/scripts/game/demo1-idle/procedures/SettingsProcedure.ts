/**
 * 设置流程 —— 设置面板（静音、删除存档、返回主界面）
 *
 * 进入时暂停游戏主循环，返回时切换回 MainProcedure。
 * @module
 */

import { ProcedureBase } from '@framework/procedure/ProcedureBase';
import { IFsm } from '@framework/fsm/FsmDefs';
import { Logger } from '@framework/debug/Logger';
import { IProcedureContext, PROCEDURE_CONTEXT_KEY } from './ProcedureContext';
import { MainProcedure } from './MainProcedure';
import { PROCEDURE_CHANGED } from '@game/demo1-idle/events/IdleEvents';

const TAG = 'SettingsProcedure';

/**
 * 设置流程
 *
 * 暂停游戏，展示设置面板，支持静音切换、存档删除、返回主界面。
 */
export class SettingsProcedure extends ProcedureBase {
    private _backRequested = false;

    /** 进入设置流程 */
    onEnter(fsm: IFsm<unknown>): void {
        Logger.info(TAG, '进入设置流程');

        const ctx = this.getContext<IProcedureContext>(fsm, PROCEDURE_CONTEXT_KEY);

        this._backRequested = false;

        ctx.eventManager.emit(PROCEDURE_CHANGED, { from: 'Main', to: 'Settings' });
        Logger.info(TAG, '设置面板已打开');
    }

    /**
     * 每帧检测是否请求返回主界面
     */
    onUpdate(fsm: IFsm<unknown>, _dt: number): void {
        if (this._backRequested) {
            this._backRequested = false;
            this.changeProcedure(fsm, MainProcedure);
        }
    }

    /** 离开设置流程 */
    onLeave(_fsm: IFsm<unknown>): void {
        Logger.info(TAG, '离开设置流程，返回主游戏');
    }

    /**
     * 请求返回主界面
     *
     * 由 UI 按钮回调调用，下一帧切换回 MainProcedure。
     */
    requestBack(): void {
        this._backRequested = true;
    }

    /**
     * 删除存档
     * @param fsm 所属状态机
     */
    deleteSave(fsm: IFsm<unknown>): void {
        const ctx = this.getContext<IProcedureContext>(fsm, PROCEDURE_CONTEXT_KEY);
        ctx.saveSystem.clearSave();
        ctx.gameData.reset();
        Logger.info(TAG, '存档已删除，游戏数据已重置');
    }
}

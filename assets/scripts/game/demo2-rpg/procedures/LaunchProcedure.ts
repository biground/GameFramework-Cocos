/**
 * RPG 启动流程 —— 框架初始化完成后的第一个流程
 *
 * 获取共享上下文、记录启动日志、发射流程变更事件，然后切换到 PreloadProcedure。
 * @module
 */

import { ProcedureBase } from '@framework/procedure/ProcedureBase';
import { IFsm } from '@framework/fsm/FsmDefs';
import { Logger } from '@framework/debug/Logger';
import { IRpgProcedureContext, RPG_PROCEDURE_CONTEXT_KEY } from './RpgProcedureContext';
import { RpgEvents } from '@game/demo2-rpg/events/RpgEvents';
import { PreloadProcedure } from './PreloadProcedure';

const TAG = 'LaunchProcedure';

/**
 * RPG 启动流程
 *
 * 框架所有模块初始化完成后进入此流程，
 * 获取上下文、记录启动日志、发射 PROCEDURE_CHANGED 事件，
 * 然后切换到预加载流程。
 */
export class LaunchProcedure extends ProcedureBase {
    /** 进入启动流程 */
    onEnter(fsm: IFsm<unknown>): void {
        const ctx = fsm.getData<IRpgProcedureContext>(RPG_PROCEDURE_CONTEXT_KEY);
        if (!ctx) {
            Logger.error(TAG, 'RPG Procedure 上下文缺失');
            throw new Error(`[${TAG}] RPG Procedure 上下文缺失`);
        }

        Logger.info(TAG, 'RPG 框架初始化完成，进入启动流程');

        ctx.eventManager.emit(RpgEvents.PROCEDURE_CHANGED, {
            from: 'Launch',
            to: 'Preload',
        });

        this.changeProcedure(fsm, PreloadProcedure);
    }
}

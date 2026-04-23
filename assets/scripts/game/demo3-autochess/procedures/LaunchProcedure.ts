/**
 * Auto-chess 启动流程 — 框架初始化完成后的第一个流程
 *
 * 获取共享上下文、记录启动日志、发射阶段变更事件，然后切换到 PreloadProcedure。
 * @module
 */

import { ProcedureBase } from '../../../framework/procedure/ProcedureBase';
import { IFsm } from '../../../framework/fsm/FsmDefs';
import { Logger } from '../../../framework/debug/Logger';
import { AutoChessEvents } from '../AutoChessDefs';
import { IAutoChessProcedureContext, AUTO_CHESS_CONTEXT_KEY } from './AutoChessProcedureContext';
import { PreloadProcedure } from './PreloadProcedure';

const TAG = 'LaunchProcedure';

/**
 * Auto-chess 启动流程
 *
 * 框架所有模块初始化完成后进入此流程，
 * 获取上下文、记录启动日志、发射 PHASE_CHANGED 事件，
 * 然后切换到预加载流程。
 */
export class LaunchProcedure extends ProcedureBase {
    /** 进入启动流程 */
    onEnter(fsm: IFsm<unknown>): void {
        const ctx = fsm.getData<IAutoChessProcedureContext>(AUTO_CHESS_CONTEXT_KEY);
        if (!ctx) {
            Logger.error(TAG, 'Auto-chess Procedure 上下文缺失');
            throw new Error(`[${TAG}] Auto-chess Procedure 上下文缺失`);
        }

        Logger.info(TAG, '🎮 自走棋框架初始化完成，进入启动流程');

        ctx.eventManager.emit(AutoChessEvents.PHASE_CHANGED, {
            from: 'Launch',
            to: 'Preload',
        });

        this.changeProcedure(fsm, PreloadProcedure);
    }
}

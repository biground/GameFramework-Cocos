/**
 * Auto-chess 游戏结束流程
 *
 * 玩家 HP 归零后进入，输出最终成绩，发射 GAME_OVER 事件，
 * 提供 restart() 接口供外部调用重新开始游戏。
 * @module
 */

import { ProcedureBase } from '../../../framework/procedure/ProcedureBase';
import { IFsm } from '../../../framework/fsm/FsmDefs';
import { Logger } from '../../../framework/debug/Logger';
import { AutoChessEvents } from '../AutoChessDefs';
import { IAutoChessProcedureContext, AUTO_CHESS_CONTEXT_KEY } from './AutoChessProcedureContext';
import { PrepareProcedure } from './PrepareProcedure';

const TAG = 'GameOverProcedure';

/**
 * 游戏结束流程
 *
 * 输出最终成绩、发射 GAME_OVER 事件，提供重新开始接口。
 */
export class GameOverProcedure extends ProcedureBase {
    /** 缓存 FSM 引用，供 restart() 使用 */
    private _fsm: IFsm<unknown> | null = null;

    /** 缓存上下文引用 */
    private _ctx: IAutoChessProcedureContext | null = null;

    /** 进入游戏结束流程 */
    onEnter(fsm: IFsm<unknown>): void {
        const ctx = fsm.getData<IAutoChessProcedureContext>(AUTO_CHESS_CONTEXT_KEY);
        if (!ctx) {
            Logger.error(TAG, 'Auto-chess Procedure 上下文缺失');
            throw new Error(`[${TAG}] Auto-chess Procedure 上下文缺失`);
        }

        this._fsm = fsm;
        this._ctx = ctx;

        const { gameData, eventManager, renderer } = ctx;

        Logger.info(TAG, `游戏结束！坚持了 ${gameData.round} 轮`);

        // 发射 GAME_OVER 事件
        eventManager.emit(AutoChessEvents.GAME_OVER, {
            finalRound: gameData.round,
            result: '游戏结束',
        });

        // 渲染最终成绩
        if (renderer && typeof (renderer as Record<string, unknown>).log === 'function') {
            const r = renderer as { log: (msg: string, color?: string) => void };
            r.log(`💀 游戏结束！你坚持了 ${gameData.round} 轮`, '#FF5722');
        }
    }

    /**
     * 重新开始游戏
     *
     * 重置所有游戏数据并切换到准备阶段。
     * @param fsm 所属状态机（可选，如已缓存则使用缓存）
     */
    restart(fsm?: IFsm<unknown>): void {
        const targetFsm = fsm ?? this._fsm;
        const ctx =
            this._ctx ?? targetFsm?.getData<IAutoChessProcedureContext>(AUTO_CHESS_CONTEXT_KEY);

        if (!targetFsm || !ctx) {
            Logger.error(TAG, '无法重新开始：FSM 或上下文缺失');
            throw new Error(`[${TAG}] 无法重新开始：FSM 或上下文缺失`);
        }

        Logger.info(TAG, '重新开始游戏');
        ctx.gameData.reset();
        this.changeProcedure(targetFsm, PrepareProcedure);
    }

    /** 离开流程时清理缓存 */
    onLeave(fsm: IFsm<unknown>): void {
        this._fsm = null;
        this._ctx = null;
        super.onLeave(fsm);
    }
}

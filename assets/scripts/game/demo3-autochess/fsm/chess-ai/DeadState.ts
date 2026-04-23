/**
 * 棋子 AI 死亡状态（终态）
 *
 * 进入后标记 isAlive=false，发射 CHESS_KILLED 事件。
 * 不会切换到任何其他状态。
 * @module
 */

import { FsmState } from '../../../../framework/fsm/FsmState';
import { IFsm } from '../../../../framework/fsm/FsmDefs';
import { Logger } from '../../../../framework/debug/Logger';
import { IChessAiBlackboard, ChessAiDataKeys } from '../ChessAiFsmDefs';
import { AutoChessEvents } from '../../AutoChessDefs';

const TAG = 'ChessAiFSM';

/** 从 FSM 共享数据中获取黑板 */
function getBlackboard(fsm: IFsm<string>): IChessAiBlackboard {
    const bb = fsm.getData<IChessAiBlackboard>(ChessAiDataKeys.BLACKBOARD);
    if (!bb) {
        throw new Error(`[${TAG}] 黑板数据缺失，FSM="${fsm.name}"`);
    }
    return bb;
}

/**
 * 死亡状态（终态）
 *
 * 进入后标记棋子死亡并发出击杀事件。
 */
export class DeadState extends FsmState<string> {
    /** 进入死亡状态，标记阵亡并发出事件 */
    onEnter(fsm: IFsm<string>): void {
        const bb = getBlackboard(fsm);
        const piece = bb.pieceState;

        piece.isAlive = false;

        // 击杀者为当前目标（如果有的话）
        const killerId = bb.target?.id ?? 0;

        Logger.info(TAG, `[${fsm.name}] 棋子 #${piece.id} 阵亡（击杀者 #${killerId}）`);

        bb.eventManager.emit(AutoChessEvents.CHESS_KILLED, {
            pieceId: piece.id,
            killerPieceId: killerId,
        });
    }
}

/**
 * 棋子 AI 移动状态
 *
 * 每次 update 朝目标移动 1 格（曼哈顿方向）。
 * - 到达攻击范围 → Attack
 * - 目标死亡 → 回 Idle
 * - 自身 HP<=0 → Dead
 * @module
 */

import { FsmState } from '../../../../framework/fsm/FsmState';
import { IFsm } from '../../../../framework/fsm/FsmDefs';
import { Logger } from '../../../../framework/debug/Logger';
import { IChessAiBlackboard, ChessAiDataKeys } from '../ChessAiFsmDefs';
import { IGridPosition } from '../../AutoChessDefs';
import { AttackState } from './AttackState';
import { IdleState } from './IdleState';
import { DeadState } from './DeadState';

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
 * 计算朝目标移动一步的目标位置
 * 优先缩短行距离，行相同时缩短列距离
 */
function computeStepTowards(from: IGridPosition, to: IGridPosition): IGridPosition {
    let dr = 0;
    let dc = 0;
    if (to.row !== from.row) {
        dr = to.row > from.row ? 1 : -1;
    } else if (to.col !== from.col) {
        dc = to.col > from.col ? 1 : -1;
    }
    return { row: from.row + dr, col: from.col + dc };
}

/**
 * 移动状态
 *
 * 每帧朝目标移动一格，到达攻击范围后切换到 Attack。
 */
export class MoveToState extends FsmState<string> {
    /** 每帧移动一格 */
    onUpdate(fsm: IFsm<string>, _deltaTime: number): void {
        const bb = getBlackboard(fsm);
        const piece = bb.pieceState;

        // 自身已死亡 → Dead
        if (piece.hp <= 0) {
            this.changeState(fsm, DeadState);
            return;
        }

        // 目标死亡或丢失 → 回 Idle 重新寻敌
        if (!bb.target || !bb.target.isAlive) {
            Logger.debug(TAG, `[${fsm.name}] 棋子 #${piece.id} 目标丢失，回到 Idle`);
            this.changeState(fsm, IdleState);
            return;
        }

        const targetPos = bb.target.position;
        const nextPos = computeStepTowards(piece.position, targetPos);

        // 尝试在棋盘上移动
        const moved = bb.boardSystem.movePiece(
            piece.position.row,
            piece.position.col,
            nextPos.row,
            nextPos.col,
        );

        if (moved) {
            piece.position.row = nextPos.row;
            piece.position.col = nextPos.col;
            Logger.debug(
                TAG,
                `[${fsm.name}] 棋子 #${piece.id} 移动到 (${nextPos.row}, ${nextPos.col})`,
            );
        }

        // 检查是否进入攻击范围
        const inRange = bb.boardSystem.isInRange(piece.position, targetPos, piece.range);
        if (inRange) {
            Logger.debug(TAG, `[${fsm.name}] 棋子 #${piece.id} → Attack（进入攻击范围）`);
            this.changeState(fsm, AttackState);
        }
    }
}

/**
 * 棋子 AI 空闲状态
 *
 * 进入时寻找最近敌人：
 * - 在攻击范围内 → Attack
 * - 不在范围内 → MoveTo
 * - 无目标 → 保持 Idle
 * @module
 */

import { FsmState } from '../../../../framework/fsm/FsmState';
import { IFsm } from '../../../../framework/fsm/FsmDefs';
import { Logger } from '../../../../framework/debug/Logger';
import { IChessAiBlackboard } from '../ChessAiFsmDefs';
import { AttackState } from './AttackState';
import { MoveToState } from './MoveToState';

const TAG = 'ChessAiFSM';

/**
 * 空闲状态
 *
 * 进入后自动寻找最近敌人并决策下一步行为。
 */
export class IdleState extends FsmState<string, IChessAiBlackboard> {
    /** 进入空闲状态，寻找最近敌人 */
    onEnter(fsm: IFsm<string, IChessAiBlackboard>): void {
        const bb = fsm.blackboard;
        const piece = bb.pieceState;
        const enemies = bb.allEnemies().filter((e) => e.isAlive);

        if (enemies.length === 0) {
            Logger.debug(TAG, `[${fsm.name}] 棋子 #${piece.id} 空闲：无存活敌人`);
            bb.target = null;
            return;
        }

        // 寻找最近敌人（使用 boardSystem 的曼哈顿距离）
        const isPlayerSide = piece.side === 'player';
        const nearestPos = bb.boardSystem.findNearestEnemy(piece.position, isPlayerSide);

        if (!nearestPos) {
            Logger.debug(TAG, `[${fsm.name}] 棋子 #${piece.id} 空闲：棋盘上无敌方棋子`);
            bb.target = null;
            return;
        }

        // 找到棋盘上该位置的 pieceId，再匹配到运行时状态
        const targetPieceId = bb.boardSystem.getPieceAt(nearestPos.row, nearestPos.col);
        const targetState = enemies.find((e) => e.id === targetPieceId) ?? null;

        if (!targetState) {
            Logger.debug(TAG, `[${fsm.name}] 棋子 #${piece.id} 空闲：无法匹配目标运行时状态`);
            bb.target = null;
            return;
        }

        bb.target = targetState;

        // 判断是否在攻击范围内
        const inRange = bb.boardSystem.isInRange(piece.position, nearestPos, piece.range);
        if (inRange) {
            Logger.debug(
                TAG,
                `[${fsm.name}] 棋子 #${piece.id} → Attack（目标 #${targetState.id} 在范围内）`,
            );
            this.changeState(fsm, AttackState);
        } else {
            Logger.debug(
                TAG,
                `[${fsm.name}] 棋子 #${piece.id} → MoveTo（目标 #${targetState.id} 距离过远）`,
            );
            this.changeState(fsm, MoveToState);
        }
    }
}

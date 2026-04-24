/**
 * 棋子 AI 攻击状态
 *
 * 冷却完毕时对目标造成伤害并发射 CHESS_ATTACK 事件。
 * - 目标死亡 → 回 Idle
 * - 自身 HP<=0 → Dead
 * - 目标离开范围 → MoveTo
 * @module
 */

import { FsmState } from '../../../../framework/fsm/FsmState';
import { IFsm } from '../../../../framework/fsm/FsmDefs';
import { Logger } from '../../../../framework/debug/Logger';
import { IChessAiBlackboard } from '../ChessAiFsmDefs';
import { AutoChessEvents } from '../../AutoChessDefs';
import { IdleState } from './IdleState';
import { MoveToState } from './MoveToState';
import { DeadState } from './DeadState';

const TAG = 'ChessAiFSM';

/**
 * 攻击状态
 *
 * 管理攻击冷却和伤害逻辑。
 */
export class AttackState extends FsmState<string, IChessAiBlackboard> {
    /** 攻击冷却计时器 */
    private _cooldown: number = 0;

    /** 进入攻击状态，重置冷却 */
    onEnter(_fsm: IFsm<string, IChessAiBlackboard>): void {
        this._cooldown = 0;
    }

    /** 每帧检查冷却，执行攻击 */
    onUpdate(fsm: IFsm<string, IChessAiBlackboard>, deltaTime: number): void {
        const bb = fsm.blackboard;
        const piece = bb.pieceState;

        // 自身已死亡 → Dead
        if (piece.hp <= 0) {
            this.changeState(fsm, DeadState);
            return;
        }

        // 目标死亡或丢失 → 回 Idle
        if (!bb.target || !bb.target.isAlive) {
            Logger.debug(TAG, `[${fsm.name}] 棋子 #${piece.id} 目标已死亡，回到 Idle`);
            this.changeState(fsm, IdleState);
            return;
        }

        // 检查目标是否还在攻击范围内
        const inRange = bb.boardSystem.isInRange(piece.position, bb.target.position, piece.range);
        if (!inRange) {
            Logger.debug(TAG, `[${fsm.name}] 棋子 #${piece.id} 目标离开攻击范围，→ MoveTo`);
            this.changeState(fsm, MoveToState);
            return;
        }

        // 递减冷却
        if (this._cooldown > 0) {
            this._cooldown = Math.max(0, this._cooldown - deltaTime);
            return;
        }

        // 冷却完毕 → 攻击
        const damage = piece.atk;
        bb.target.hp -= damage;
        if (bb.target.hp <= 0) {
            bb.target.hp = 0;
            bb.target.isAlive = false;
        }

        Logger.debug(TAG, `[${fsm.name}] 棋子 #${piece.id} 攻击 #${bb.target.id}，伤害 ${damage}`);

        // 发射攻击事件
        bb.eventManager.emit(AutoChessEvents.CHESS_ATTACK, {
            attackerId: piece.id,
            defenderId: bb.target.id,
            damage,
        });

        // 重置冷却
        this._cooldown = piece.atkSpeed;

        // 目标死亡 → 从棋盘移除死亡棋子 → 回 Idle
        if (!bb.target.isAlive) {
            bb.boardSystem.removePiece(bb.target.position.row, bb.target.position.col);
            Logger.debug(TAG, `[${fsm.name}] 目标 #${bb.target.id} 已被击杀，回到 Idle`);
            this.changeState(fsm, IdleState);
        }
    }

    /** 离开攻击状态时清理冷却 */
    onLeave(_fsm: IFsm<string, IChessAiBlackboard>): void {
        this._cooldown = 0;
    }
}

/**
 * 回合开始状态
 *
 * 递增回合数 → 计算行动顺序 → 切换到 SelectAction
 * @module
 */

import { FsmState } from '@framework/fsm/FsmState';
import { IFsm } from '@framework/fsm/FsmDefs';
import { Logger } from '@framework/debug/Logger';
import { IBattleBlackboard } from '../BattleFsmDefs';
import { RpgEvents } from '../../events/RpgEvents';
import { SelectActionState } from './SelectActionState';

const TAG = 'BattleFSM';

/**
 * 回合开始状态
 *
 * 进入时递增回合数、发射 ROUND_START 事件、计算行动顺序并存入黑板，
 * 然后立即切换到 SelectActionState。
 */
export class RoundStartState extends FsmState<IBattleBlackboard, IBattleBlackboard> {
    /** 进入回合开始状态 */
    onEnter(fsm: IFsm<IBattleBlackboard, IBattleBlackboard>): void {
        const bb = fsm.blackboard;

        // 递增回合数
        bb.gameData.currentRound++;
        const round = bb.gameData.currentRound;

        // 发射回合开始事件
        bb.eventManager.emit(RpgEvents.ROUND_START, { roundNumber: round });

        // 计算行动顺序
        bb.turnOrder = bb.battleSystem.calculateTurnOrder(bb.allCharacters);
        bb.currentActorIndex = 0;

        // 日志
        const orderNames = bb.turnOrder.map((c) => c.name).join(' → ');
        Logger.info(TAG, `=== 第 ${round} 回合 === 行动顺序: ${orderNames}`);

        this.changeState(fsm, SelectActionState);
    }
}

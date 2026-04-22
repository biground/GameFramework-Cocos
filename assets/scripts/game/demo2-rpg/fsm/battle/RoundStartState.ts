/**
 * 回合开始状态
 *
 * 递增回合数 → 计算行动顺序 → 切换到 SelectAction
 * @module
 */

import { FsmState } from '@framework/fsm/FsmState';
import { IFsm } from '@framework/fsm/FsmDefs';
import { Logger } from '@framework/debug/Logger';
import { IBattleBlackboard, BattleFsmDataKeys } from '../BattleFsmDefs';
import { RpgEvents } from '../../events/RpgEvents';
import { SelectActionState } from './SelectActionState';

const TAG = 'BattleFSM';

/**
 * 从 FSM 共享数据中获取黑板
 */
function getBlackboard(fsm: IFsm<IBattleBlackboard>): IBattleBlackboard {
    const bb = fsm.getData<IBattleBlackboard>(BattleFsmDataKeys.BLACKBOARD);
    if (!bb) {
        throw new Error(`[${TAG}] 黑板数据缺失，FSM="${fsm.name}"`);
    }
    return bb;
}

/**
 * 回合开始状态
 *
 * 进入时递增回合数、发射 ROUND_START 事件、计算行动顺序并存入黑板，
 * 然后立即切换到 SelectActionState。
 */
export class RoundStartState extends FsmState<IBattleBlackboard> {
    /** 进入回合开始状态 */
    onEnter(fsm: IFsm<IBattleBlackboard>): void {
        const bb = getBlackboard(fsm);

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

        // 切换到选择行动（延迟到下一个宏任务，避免 FSM 递归切换）
        setTimeout(() => this.changeState(fsm, SelectActionState), 0);
    }
}

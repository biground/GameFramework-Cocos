/**
 * 回合结束状态
 *
 * 对所有存活角色进行 BUFF 回合递减 → 检查最大回合限制 → 切换回 RoundStart
 * @module
 */

import { FsmState } from '@framework/fsm/FsmState';
import { IFsm } from '@framework/fsm/FsmDefs';
import { Logger } from '@framework/debug/Logger';
import { IBattleBlackboard } from '../BattleFsmDefs';
import { RpgEvents } from '../../events/RpgEvents';
import { RoundStartState } from './RoundStartState';
import { DefeatState } from './DefeatState';

const TAG = 'BattleFSM';

/**
 * 回合结束状态
 *
 * 进入时对所有存活角色执行 BUFF 回合递减，发射过期事件，
 * 检查是否超过最大回合限制，然后切换回 RoundStartState。
 */
export class RoundEndState extends FsmState<IBattleBlackboard, IBattleBlackboard> {
    /** 进入回合结束状态 */
    onEnter(fsm: IFsm<IBattleBlackboard, IBattleBlackboard>): void {
        const bb = fsm.blackboard;
        const round = bb.gameData.currentRound;

        // 对所有存活角色进行 BUFF 递减
        const aliveChars = bb.allCharacters.filter((c) => c.isAlive);
        for (const char of aliveChars) {
            const expired = bb.buffSystem.tickBuffs(char.id);
            for (const buff of expired) {
                bb.eventManager.emit(RpgEvents.BUFF_EXPIRED, {
                    targetId: char.id,
                    buffType: buff.buffType,
                });
                Logger.debug(TAG, `${char.name} 的 ${buff.buffType} 效果已过期`);
            }
        }

        // 发射回合结束事件
        bb.eventManager.emit(RpgEvents.ROUND_END, { roundNumber: round });
        Logger.info(TAG, `=== 第 ${round} 回合结束 ===`);

        // 检查最大回合限制
        if (bb.maxRound > 0 && round >= bb.maxRound) {
            Logger.info(TAG, `已达最大回合数 ${bb.maxRound}，判定失败`);
            this.changeState(fsm, DefeatState);
            return;
        }

        // 切换回回合开始
        this.changeState(fsm, RoundStartState);
    }
}

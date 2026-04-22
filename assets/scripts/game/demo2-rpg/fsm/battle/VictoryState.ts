/**
 * 胜利状态
 *
 * 计算奖励（经验+金币） → 发射 BATTLE_VICTORY 事件 → 播放胜利音效
 * @module
 */

import { FsmState } from '@framework/fsm/FsmState';
import { IFsm } from '@framework/fsm/FsmDefs';
import { Logger } from '@framework/debug/Logger';
import { IBattleBlackboard, BattleFsmDataKeys } from '../BattleFsmDefs';
import { RpgEvents } from '../../events/RpgEvents';

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
 * 胜利状态
 *
 * 进入时遍历所有击杀的敌方角色，累加经验和金币奖励，
 * 发射 BATTLE_VICTORY 事件，播放胜利音效。
 */
export class VictoryState extends FsmState<IBattleBlackboard> {
    /** 进入胜利状态 */
    onEnter(fsm: IFsm<IBattleBlackboard>): void {
        const bb = getBlackboard(fsm);

        // 计算奖励：遍历已死亡的敌方角色，查找怪物配置获取奖励
        let totalExp = 0;
        let totalGold = 0;
        const deadEnemies = bb.allCharacters.filter((c) => c.group === 'enemy' && !c.isAlive);

        for (const enemy of deadEnemies) {
            const monsterConfig = bb.monsterTable.find((m) => m.name === enemy.name);
            if (monsterConfig) {
                totalExp += monsterConfig.expReward;
                totalGold += monsterConfig.goldReward;
            }
        }

        // 更新游戏数据
        bb.gameData.totalExp += totalExp;
        bb.gameData.gold += totalGold;

        Logger.info(TAG, `🎉 战斗胜利！获得 ${totalExp} 经验, ${totalGold} 金币`);

        // 发射胜利事件
        bb.eventManager.emit(RpgEvents.BATTLE_VICTORY, {
            expReward: totalExp,
            goldReward: totalGold,
        });

        // 播放胜利音效
        bb.audioManager.playSound('sfx_victory');
    }
}

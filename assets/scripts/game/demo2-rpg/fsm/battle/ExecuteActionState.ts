/**
 * 执行行动状态
 *
 * 读取行动决策 → 调用 BattleSystem.executeAction → 发射事件 → 检查战斗结束
 * @module
 */

import { FsmState } from '@framework/fsm/FsmState';
import { IFsm } from '@framework/fsm/FsmDefs';
import { Logger } from '@framework/debug/Logger';
import { IBattleBlackboard, BattleFsmDataKeys } from '../BattleFsmDefs';
import { RpgEvents } from '../../events/RpgEvents';
import { SelectActionState } from './SelectActionState';
import { RoundEndState } from './RoundEndState';
import { VictoryState } from './VictoryState';
import { DefeatState } from './DefeatState';

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
 * 执行行动状态
 *
 * 读取 actionDecision 并调用 BattleSystem 执行，发射战斗相关事件，
 * 检查战斗结束条件后决定下一个状态。
 */
export class ExecuteActionState extends FsmState<IBattleBlackboard> {
    /** 进入执行行动状态 */
    onEnter(fsm: IFsm<IBattleBlackboard>): void {
        const bb = getBlackboard(fsm);
        const decision = bb.actionDecision;

        if (!decision) {
            Logger.error(TAG, '无行动决策，跳过执行');
            bb.currentActorIndex++;
            this._nextStep(fsm, bb);
            return;
        }

        // 执行行动
        const result = bb.battleSystem.executeAction(decision, bb.allCharacters, bb.skillTable);

        // 发射技能使用事件
        bb.eventManager.emit(RpgEvents.SKILL_USED, {
            casterId: decision.actorId,
            skillId: decision.skillId,
            targetIds: decision.targetIds,
        });

        // 发射攻击事件（针对每个受到伤害的目标）
        for (const [targetId, damage] of result.damages) {
            bb.eventManager.emit(RpgEvents.ATTACK, {
                attackerId: decision.actorId,
                defenderId: targetId,
                damage,
                skillId: decision.skillId,
            });

            const target = bb.allCharacters.find((c) => c.id === targetId);
            if (target) {
                bb.eventManager.emit(RpgEvents.CHARACTER_HURT, {
                    characterId: targetId,
                    damage,
                    remainingHp: target.hp,
                });

                // 死亡事件
                if (!target.isAlive) {
                    bb.eventManager.emit(RpgEvents.CHARACTER_DEAD, {
                        characterId: targetId,
                        group: target.group,
                    });
                }
            }
        }

        // 发射治愈事件
        for (const [targetId, amount] of result.heals) {
            const target = bb.allCharacters.find((c) => c.id === targetId);
            if (target) {
                bb.eventManager.emit(RpgEvents.CHARACTER_HEALED, {
                    characterId: targetId,
                    amount,
                    remainingHp: target.hp,
                });
            }
        }

        // 发射 BUFF 施加事件
        for (const buff of result.buffsApplied) {
            for (const targetId of decision.targetIds) {
                bb.eventManager.emit(RpgEvents.BUFF_APPLIED, {
                    targetId,
                    buffType: buff.buffType,
                    duration: buff.remainingRounds,
                });
            }
        }

        // 播放音效
        bb.audioManager.playSound('sfx_attack');

        // 清空决策
        bb.actionDecision = null;

        // 检查战斗是否结束
        const players = bb.allCharacters.filter((c) => c.group === 'player');
        const enemies = bb.allCharacters.filter((c) => c.group === 'enemy');
        const endResult = bb.battleSystem.checkBattleEnd(players, enemies);

        if (endResult.ended) {
            if (endResult.victory) {
                this.changeState(fsm, VictoryState);
            } else {
                this.changeState(fsm, DefeatState);
            }
            return;
        }

        // 移动到下一个行动者
        bb.currentActorIndex++;
        this._nextStep(fsm, bb);
    }

    /**
     * 决定下一步：还有角色未行动则回到 SelectAction，否则进入 RoundEnd
     */
    private _nextStep(fsm: IFsm<IBattleBlackboard>, bb: IBattleBlackboard): void {
        if (bb.currentActorIndex < bb.turnOrder.length) {
            this.changeState(fsm, SelectActionState);
        } else {
            this.changeState(fsm, RoundEndState);
        }
    }
}

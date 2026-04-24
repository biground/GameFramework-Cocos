/**
 * 选择行动状态
 *
 * 获取当前行动者，跳过死亡/眩晕角色，AI 决策或默认普攻，
 * 设置 actionDecision 后切换到 ExecuteAction。
 * @module
 */

import { FsmState } from '@framework/fsm/FsmState';
import { IFsm } from '@framework/fsm/FsmDefs';
import { Logger } from '@framework/debug/Logger';
import { IBattleBlackboard } from '../BattleFsmDefs';
import { BuffType, ActionDecision, CharacterState } from '../../data/RpgGameData';
import { EnemyAI } from '../../systems/EnemyAI';
import { ExecuteActionState } from './ExecuteActionState';
import { RoundEndState } from './RoundEndState';

const TAG = 'BattleFSM';

/**
 * 选择行动状态
 *
 * 依次处理行动列表中的角色：
 * - 跳过已死亡或被眩晕的角色
 * - 敌方角色使用 {@link EnemyAI} 决策
 * - 玩家角色本 Demo 中也用 AI 自动选择（默认普攻）
 */
export class SelectActionState extends FsmState<IBattleBlackboard, IBattleBlackboard> {
    /** 进入选择行动状态 */
    onEnter(fsm: IFsm<IBattleBlackboard, IBattleBlackboard>): void {
        const bb = fsm.blackboard;

        // 跳过已死亡或被眩晕的角色
        while (bb.currentActorIndex < bb.turnOrder.length) {
            const actor = bb.turnOrder[bb.currentActorIndex];
            if (!actor.isAlive) {
                Logger.debug(TAG, `${actor.name} 已死亡，跳过`);
                bb.currentActorIndex++;
                continue;
            }
            if (actor.buffs.some((b) => b.buffType === BuffType.STUN && b.remainingRounds > 0)) {
                Logger.info(TAG, `${actor.name} 被眩晕，无法行动`);
                bb.currentActorIndex++;
                continue;
            }
            break;
        }

        // 全部角色已行动完毕，切换到回合结束
        if (bb.currentActorIndex >= bb.turnOrder.length) {
            this.changeState(fsm, RoundEndState);
            return;
        }

        const actor = bb.turnOrder[bb.currentActorIndex];
        let decision: ActionDecision;

        if (actor.group === 'enemy') {
            // 敌方 AI 决策
            const playerChars = bb.allCharacters.filter((c) => c.group === 'player');
            decision = EnemyAI.decideAction(actor, playerChars, bb.skillTable);
        } else {
            // 玩家方：本 Demo 中自动选择默认普攻（攻击随机存活敌方）
            decision = this._autoPlayerAction(actor, bb.allCharacters);
        }

        bb.actionDecision = decision;
        Logger.debug(
            TAG,
            `${actor.name} 选择行动: 技能=${String(decision.skillId)}, 目标=${decision.targetIds.join(',')}`,
        );

        this.changeState(fsm, ExecuteActionState);
    }

    /**
     * 玩家自动行动：普攻攻击第一个存活敌方
     */
    private _autoPlayerAction(actor: CharacterState, allChars: CharacterState[]): ActionDecision {
        const aliveEnemies = allChars.filter((c) => c.group === 'enemy' && c.isAlive);
        const targetId = aliveEnemies.length > 0 ? aliveEnemies[0].id : -1;
        return {
            actorId: actor.id,
            skillId: 1, // 普通攻击
            targetIds: targetId >= 0 ? [targetId] : [],
        };
    }
}

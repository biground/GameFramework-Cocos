/**
 * EnemyAI — 敌方 AI 决策系统
 *
 * 根据敌方角色状态、玩家角色列表和技能配置，
 * 生成一个 {@link ActionDecision}。
 * @module
 */

import { Logger } from '@framework/debug/Logger';
import { CharacterState, ActionDecision } from '@game/demo2-rpg/data/RpgGameData';
import { SkillConfigRow } from '@game/demo2-rpg/data/SkillConfigRow';

const TAG = 'EnemyAI';

/**
 * 敌方 AI 决策
 *
 * 策略：
 * 1. 过滤存活的玩家角色
 * 2. 选择 HP 最低的玩家角色作为目标
 * 3. 优先使用高伤害单体攻击技能（MP 足够）；否则用普攻（id=1）
 * 4. 返回 {@link ActionDecision}
 */
export class EnemyAI {
    /**
     * 敌方 AI 决策
     * @param enemy - 当前行动的敌方角色
     * @param playerChars - 所有玩家角色列表
     * @param skills - 技能配置表
     * @returns 行动决策
     */
    static decideAction(
        enemy: CharacterState,
        playerChars: CharacterState[],
        skills: SkillConfigRow[],
    ): ActionDecision {
        // 1. 过滤存活的玩家角色
        const aliveTargets = playerChars.filter((c) => c.isAlive);

        if (aliveTargets.length === 0) {
            Logger.debug(TAG, '无存活目标，返回空决策');
            return { actorId: enemy.id, skillId: 1, targetIds: [] };
        }

        // 2. 选择 HP 最低的目标
        let target = aliveTargets[0];
        for (let i = 1; i < aliveTargets.length; i++) {
            if (aliveTargets[i].hp < target.hp) {
                target = aliveTargets[i];
            }
        }

        // 3. 从敌方技能列表中选择最优单体攻击技能
        const skillId = EnemyAI.pickBestSkill(enemy, skills);

        Logger.debug(TAG, `决策: 技能=${skillId}, 目标=${target.id}`);
        return { actorId: enemy.id, skillId, targetIds: [target.id] };
    }

    /**
     * 选择最优技能
     *
     * 仅考虑 target='single_enemy' 且 effect='none' 的纯伤害技能，
     * 按 damageRate 降序排列，选第一个 MP 足够的；均不满足则回退普攻。
     * @param enemy - 当前敌方角色
     * @param skills - 技能配置表
     * @returns 选中的技能 ID
     */
    private static pickBestSkill(enemy: CharacterState, skills: SkillConfigRow[]): number {
        // 收集敌方拥有的技能配置，仅保留单体攻击类
        const candidates = enemy.skills
            .map((sid) => skills.find((s) => s.id === sid))
            .filter(
                (s): s is SkillConfigRow =>
                    s !== undefined && s.target === 'single_enemy' && s.id !== 1, // 排除普攻，稍后作为回退
            )
            .sort((a, b) => b.damageRate - a.damageRate);

        for (const skill of candidates) {
            if (enemy.mp >= skill.mpCost) {
                return skill.id;
            }
        }

        // 回退普攻
        return 1;
    }
}

/**
 * 战斗系统
 *
 * 负责回合制战斗的核心逻辑：行动顺序、技能执行、伤害/治疗/BUFF 应用、死亡判定与战斗结束检查。
 * @module
 */

import {
    ActionDecision,
    ActionResult,
    BattleEndResult,
    BuffState,
    BuffType,
    CharacterState,
} from '../data/RpgGameData';
import { SkillConfigRow } from '../data/SkillConfigRow';
import { BuffSystem } from './BuffSystem';
import { DamageCalculator } from './DamageCalculator';
import { Logger } from '@framework/debug/Logger';

const TAG = 'BattleSystem';

/**
 * 战斗系统
 *
 * 管理回合制战斗流程，依赖 {@link BuffSystem} 处理 BUFF 逻辑，
 * 依赖 {@link DamageCalculator} 进行数值计算。
 */
export class BattleSystem {
    private _buffSystem: BuffSystem;

    /**
     * 创建战斗系统
     * @param buffSystem - BUFF 系统实例
     */
    constructor(buffSystem: BuffSystem) {
        this._buffSystem = buffSystem;
    }

    /**
     * 获取 BuffSystem 引用
     */
    get buffSystem(): BuffSystem {
        return this._buffSystem;
    }

    /**
     * 按 SPD 降序计算行动顺序（仅存活角色）
     * @param characters - 所有角色列表
     * @returns 按速度排序后的存活角色列表
     */
    calculateTurnOrder(characters: CharacterState[]): CharacterState[] {
        return characters.filter((c) => c.isAlive).sort((a, b) => b.spd - a.spd);
    }

    /**
     * 执行行动
     *
     * 1. 获取技能配置
     * 2. 扣除 MP
     * 3. 根据 target 类型确定目标
     * 4. 根据 effect 类型计算伤害/治疗/BUFF
     * 5. 应用结果（修改 CharacterState）
     * 6. 检查死亡（hp <= 0 → isAlive = false）
     * 7. 返回 ActionResult
     *
     * @param action - 行动决策
     * @param allCharacters - 场上所有角色
     * @param skillTable - 技能配置表
     * @returns 行动结果
     */
    executeAction(
        action: ActionDecision,
        allCharacters: CharacterState[],
        skillTable: SkillConfigRow[],
    ): ActionResult {
        const actor = allCharacters.find((c) => c.id === action.actorId);
        if (!actor) {
            Logger.error(TAG, `找不到行动者 ID=${action.actorId}`);
            return this._emptyResult(action);
        }

        const skill = skillTable.find((s) => s.id === action.skillId);
        if (!skill) {
            Logger.error(TAG, `找不到技能 ID=${action.skillId}`);
            return this._emptyResult(action);
        }

        // 扣除 MP
        actor.mp -= skill.mpCost;

        // 确定目标列表
        const targets = allCharacters.filter((c) => action.targetIds.includes(c.id));

        const result: ActionResult = {
            actorId: action.actorId,
            skillId: action.skillId,
            targetIds: action.targetIds,
            damages: new Map<number, number>(),
            heals: new Map<number, number>(),
            buffsApplied: [],
            effectApplied: skill.name,
        };

        // 获取攻击者 ATK_UP BUFF 加成
        const atkBonus = this._buffSystem.getBuffValue(actor.id, BuffType.ATK_UP);

        for (const target of targets) {
            if (!target.isAlive) {
                continue;
            }

            if (skill.effect === 'heal') {
                // 治疗效果
                this._applyHeal(actor, target, skill, result);
            } else {
                // 伤害效果
                this._applyDamage(actor, target, skill, atkBonus, result);
            }

            // 附加效果
            this._applyEffect(target, skill, result);
        }

        Logger.info(TAG, `${actor.name} 使用 ${skill.name}`);
        return result;
    }

    /**
     * 检查战斗是否结束
     * @param players - 玩家方角色列表
     * @param enemies - 敌方角色列表
     * @returns 战斗结束结果
     */
    checkBattleEnd(players: CharacterState[], enemies: CharacterState[]): BattleEndResult {
        const allEnemiesDead = enemies.every((e) => !e.isAlive);
        if (allEnemiesDead) {
            return { ended: true, victory: true };
        }

        const allPlayersDead = players.every((p) => !p.isAlive);
        if (allPlayersDead) {
            return { ended: true, victory: false };
        }

        return { ended: false, victory: null };
    }

    // ─── 私有方法 ──────────────────────────────────────

    /**
     * 应用伤害
     */
    private _applyDamage(
        actor: CharacterState,
        target: CharacterState,
        skill: SkillConfigRow,
        atkBonus: number,
        result: ActionResult,
    ): void {
        const damage = DamageCalculator.calculateDamageWithBuff(
            actor.atk,
            atkBonus,
            skill.damageRate,
            target.def,
        );
        target.hp -= damage;
        result.damages.set(target.id, damage);

        // 死亡判定
        if (target.hp <= 0) {
            target.isAlive = false;
            Logger.info(TAG, `${target.name} 阵亡`);
        }
    }

    /**
     * 应用治疗
     */
    private _applyHeal(
        actor: CharacterState,
        target: CharacterState,
        skill: SkillConfigRow,
        result: ActionResult,
    ): void {
        const healAmount = DamageCalculator.calculateHeal(actor.atk, skill.damageRate);
        target.hp = Math.min(target.hp + healAmount, target.maxHp);
        result.heals.set(target.id, healAmount);
    }

    /**
     * 应用附加效果（BUFF/眩晕等）
     */
    private _applyEffect(
        target: CharacterState,
        skill: SkillConfigRow,
        result: ActionResult,
    ): void {
        if (skill.effect === 'none' || skill.effect === 'heal' || skill.effectDuration <= 0) {
            return;
        }

        let buff: BuffState | null = null;

        switch (skill.effect) {
            case 'buff_atk':
                buff = {
                    buffType: BuffType.ATK_UP,
                    remainingRounds: skill.effectDuration,
                    value: 10, // 基础 ATK 加成值
                };
                break;
            case 'stun':
                buff = {
                    buffType: BuffType.STUN,
                    remainingRounds: skill.effectDuration,
                    value: 0,
                };
                break;
        }

        if (buff) {
            this._buffSystem.applyBuff(target.id, buff.buffType, buff.remainingRounds, buff.value);
            result.buffsApplied.push({ ...buff });
        }
    }

    /**
     * 生成空的行动结果（异常情况）
     */
    private _emptyResult(action: ActionDecision): ActionResult {
        return {
            actorId: action.actorId,
            skillId: action.skillId,
            targetIds: action.targetIds,
            damages: new Map(),
            heals: new Map(),
            buffsApplied: [],
            effectApplied: '',
        };
    }
}

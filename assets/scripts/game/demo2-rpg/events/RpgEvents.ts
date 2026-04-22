/**
 * Turn-based RPG Demo — 事件键定义
 *
 * 使用框架 EventKey<T> 的幻影类型机制，为所有 RPG 战斗事件提供编译期类型安全。
 * 事件键统一使用 'rpg:' 前缀。
 * @module
 */

import { EventKey } from '@framework/event/EventDefs';

// ─── 战斗行动 ──────────────────────────────────────────

/** 角色发起攻击 */
export const RpgEvents = {
    /** 角色发起攻击 */
    ATTACK: new EventKey<{
        attackerId: number;
        defenderId: number;
        damage: number;
        skillId: number;
    }>('rpg:attack'),

    /** 角色受到伤害 */
    CHARACTER_HURT: new EventKey<{ characterId: number; damage: number; remainingHp: number }>(
        'rpg:character_hurt',
    ),

    /** 角色死亡 */
    CHARACTER_DEAD: new EventKey<{ characterId: number; group: string }>('rpg:character_dead'),

    /** 角色被治愈 */
    CHARACTER_HEALED: new EventKey<{ characterId: number; amount: number; remainingHp: number }>(
        'rpg:character_healed',
    ),

    // ─── 回合控制 ──────────────────────────────────────────

    /** 回合开始 */
    ROUND_START: new EventKey<{ roundNumber: number }>('rpg:round_start'),

    /** 回合结束 */
    ROUND_END: new EventKey<{ roundNumber: number }>('rpg:round_end'),

    // ─── 技能 & Buff ──────────────────────────────────────

    /** 技能使用 */
    SKILL_USED: new EventKey<{ casterId: number; skillId: number; targetIds: number[] }>(
        'rpg:skill_used',
    ),

    /** Buff 施加 */
    BUFF_APPLIED: new EventKey<{ targetId: number; buffType: string; duration: number }>(
        'rpg:buff_applied',
    ),

    /** Buff 过期 */
    BUFF_EXPIRED: new EventKey<{ targetId: number; buffType: string }>('rpg:buff_expired'),

    // ─── 战斗结算 ──────────────────────────────────────────

    /** 战斗胜利 */
    BATTLE_VICTORY: new EventKey<{ expReward: number; goldReward: number }>('rpg:battle_victory'),

    /** 战斗失败 */
    BATTLE_DEFEAT: new EventKey<Record<string, never>>('rpg:battle_defeat'),

    // ─── 关卡 & 流程 ──────────────────────────────────────

    /** 关卡选择 */
    STAGE_SELECTED: new EventKey<{ stageId: number }>('rpg:stage_selected'),

    /** 流程切换 */
    PROCEDURE_CHANGED: new EventKey<{ from: string; to: string }>('rpg:procedure_changed'),
} as const;

/**
 * 技能配置表行类型
 * @module
 */

import { IDataRow } from '@framework/datatable/DataTableDefs';

/** 技能目标类型 */
export type SkillTarget = 'single_enemy' | 'all_enemy' | 'single_ally' | 'all_ally';

/** 技能效果类型 */
export type SkillEffect = 'none' | 'heal' | 'buff_atk' | 'stun';

/**
 * 技能配置行——描述一个技能的属性
 *
 * 对应 DataTable: `skill_config`
 */
export class SkillConfigRow implements IDataRow {
    /** 技能 ID（主键） */
    readonly id: number = 0;
    /** 技能名称 */
    name: string = '';
    /** 消耗 MP */
    mpCost: number = 0;
    /** 伤害/治疗倍率（基于施放者 ATK） */
    damageRate: number = 0;
    /** 目标类型 */
    target: SkillTarget = 'single_enemy';
    /** 附加效果 */
    effect: SkillEffect = 'none';
    /** 效果持续回合数（0 表示无持续效果） */
    effectDuration: number = 0;
    /** 冷却回合数（0 表示无冷却） */
    cooldown: number = 0;

    /**
     * 从原始数据填充字段
     * @param data 一行原始数据（键值对）
     */
    parseRow(data: Record<string, unknown>): void {
        (this as { id: number }).id = Number(data['id'] ?? 0);
        this.name = String(data['name'] ?? '');
        this.mpCost = Number(data['mpCost'] ?? 0);
        this.damageRate = Number(data['damageRate'] ?? 0);
        this.target = (data['target'] as SkillTarget) ?? 'single_enemy';
        this.effect = (data['effect'] as SkillEffect) ?? 'none';
        this.effectDuration = Number(data['effectDuration'] ?? 0);
        this.cooldown = Number(data['cooldown'] ?? 0);
    }
}

// ─── 静态配置数据（8 个技能） ─────────────────────────────

/** 技能配置数据 */
export const SKILL_DATA: Record<string, unknown>[] = [
    {
        id: 1,
        name: '普通攻击',
        mpCost: 0,
        damageRate: 1.0,
        target: 'single_enemy',
        effect: 'none',
        effectDuration: 0,
        cooldown: 0,
    },
    {
        id: 2,
        name: '重击',
        mpCost: 10,
        damageRate: 1.5,
        target: 'single_enemy',
        effect: 'none',
        effectDuration: 0,
        cooldown: 0,
    },
    {
        id: 3,
        name: '火球术',
        mpCost: 20,
        damageRate: 2.0,
        target: 'single_enemy',
        effect: 'none',
        effectDuration: 0,
        cooldown: 2,
    },
    {
        id: 4,
        name: '暴风雪',
        mpCost: 30,
        damageRate: 1.2,
        target: 'all_enemy',
        effect: 'none',
        effectDuration: 0,
        cooldown: 3,
    },
    {
        id: 5,
        name: '治愈之光',
        mpCost: 15,
        damageRate: 1.5,
        target: 'single_ally',
        effect: 'heal',
        effectDuration: 0,
        cooldown: 0,
    },
    {
        id: 6,
        name: '群体治疗',
        mpCost: 25,
        damageRate: 1.0,
        target: 'all_ally',
        effect: 'heal',
        effectDuration: 0,
        cooldown: 3,
    },
    {
        id: 7,
        name: '战吼',
        mpCost: 20,
        damageRate: 0,
        target: 'single_ally',
        effect: 'buff_atk',
        effectDuration: 3,
        cooldown: 3,
    },
    {
        id: 8,
        name: '眩晕打击',
        mpCost: 15,
        damageRate: 1.2,
        target: 'single_enemy',
        effect: 'stun',
        effectDuration: 1,
        cooldown: 2,
    },
];

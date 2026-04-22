/**
 * 伤害计算器
 *
 * 纯函数/静态方法类，无状态。提供伤害、治疗、BUFF 加成等数值计算。
 */
export class DamageCalculator {
    /**
     * 计算伤害
     * @param attackerAtk - 攻击者攻击力
     * @param skillDamageRate - 技能伤害倍率
     * @param defenderDef - 防御者防御力
     * @returns 最终伤害值，最小为 1
     */
    static calculateDamage(
        attackerAtk: number,
        skillDamageRate: number,
        defenderDef: number,
    ): number {
        return Math.max(1, Math.floor(attackerAtk * skillDamageRate - defenderDef));
    }

    /**
     * 计算治疗量
     * @param casterAtk - 施法者攻击力
     * @param skillHealRate - 技能治疗倍率
     * @returns 治疗量
     */
    static calculateHeal(casterAtk: number, skillHealRate: number): number {
        return Math.max(0, Math.floor(casterAtk * skillHealRate));
    }

    /**
     * 考虑 BUFF 加成的伤害计算
     * @param baseAtk - 基础攻击力
     * @param buffAtkBonus - BUFF 攻击力加成
     * @param rate - 技能伤害倍率
     * @param def - 防御者防御力
     * @returns 最终伤害值，最小为 1
     */
    static calculateDamageWithBuff(
        baseAtk: number,
        buffAtkBonus: number,
        rate: number,
        def: number,
    ): number {
        return Math.max(1, Math.floor((baseAtk + buffAtkBonus) * rate - def));
    }
}

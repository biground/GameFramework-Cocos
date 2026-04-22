import { DamageCalculator } from '@game/demo2-rpg/systems/DamageCalculator';

describe('DamageCalculator', () => {
    describe('calculateDamage', () => {
        it('标准伤害计算 (ATK:30 × 1.5 - DEF:10 = 35)', () => {
            expect(DamageCalculator.calculateDamage(30, 1.5, 10)).toBe(35);
        });

        it('0 防御时伤害等于 floor(atk * rate)', () => {
            expect(DamageCalculator.calculateDamage(20, 2.0, 0)).toBe(40);
        });

        it('高防御保底最小伤害为 1', () => {
            expect(DamageCalculator.calculateDamage(10, 1.0, 999)).toBe(1);
        });

        it('防御刚好等于攻击输出时保底为 1', () => {
            expect(DamageCalculator.calculateDamage(10, 1.0, 10)).toBe(1);
        });

        it('浮点精度边界：floor 截断小数', () => {
            // 25 * 1.3 = 32.5 - 10 = 22.5 → floor → 22
            expect(DamageCalculator.calculateDamage(25, 1.3, 10)).toBe(22);
        });

        it('浮点精度边界：极小 rate', () => {
            // 100 * 0.1 = 10 - 5 = 5
            expect(DamageCalculator.calculateDamage(100, 0.1, 5)).toBe(5);
        });

        it('负值攻击力保底 1', () => {
            expect(DamageCalculator.calculateDamage(-5, 1.0, 10)).toBe(1);
        });

        it('负值防御力等同于额外伤害', () => {
            // 10 * 1.0 - (-5) = 15
            expect(DamageCalculator.calculateDamage(10, 1.0, -5)).toBe(15);
        });
    });

    describe('calculateHeal', () => {
        it('标准治疗量计算', () => {
            // 50 * 1.2 = 60
            expect(DamageCalculator.calculateHeal(50, 1.2)).toBe(60);
        });

        it('治疗量 floor 截断小数', () => {
            // 30 * 1.3 = 39.0 (实际可能是 39.00000...04)
            expect(DamageCalculator.calculateHeal(30, 1.3)).toBe(39);
        });

        it('0 攻击力治疗量为 0', () => {
            expect(DamageCalculator.calculateHeal(0, 2.0)).toBe(0);
        });

        it('负值攻击力治疗量保底 0', () => {
            expect(DamageCalculator.calculateHeal(-10, 1.0)).toBe(0);
        });
    });

    describe('calculateDamageWithBuff', () => {
        it('BUFF 加成伤害计算', () => {
            // (20 + 10) * 1.5 - 15 = 45 - 15 = 30
            expect(DamageCalculator.calculateDamageWithBuff(20, 10, 1.5, 15)).toBe(30);
        });

        it('无 BUFF 加成等同于普通伤害', () => {
            expect(DamageCalculator.calculateDamageWithBuff(30, 0, 1.5, 10)).toBe(
                DamageCalculator.calculateDamage(30, 1.5, 10),
            );
        });

        it('高防御加 BUFF 仍保底 1', () => {
            expect(DamageCalculator.calculateDamageWithBuff(5, 3, 1.0, 999)).toBe(1);
        });

        it('浮点精度边界：BUFF 加成后 floor 截断', () => {
            // (10 + 5) * 1.3 = 19.5 - 8 = 11.5 → floor → 11
            expect(DamageCalculator.calculateDamageWithBuff(10, 5, 1.3, 8)).toBe(11);
        });

        it('负值 BUFF 加成（减益）', () => {
            // (50 + (-10)) * 1.0 - 0 = 40
            expect(DamageCalculator.calculateDamageWithBuff(50, -10, 1.0, 0)).toBe(40);
        });
    });
});

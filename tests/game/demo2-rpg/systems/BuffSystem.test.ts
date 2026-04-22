import { BuffSystem } from '@game/demo2-rpg/systems/BuffSystem';
import { BuffType } from '@game/demo2-rpg/data/RpgGameData';

jest.mock('@framework/debug/Logger', () => ({
    Logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('BuffSystem', () => {
    let system: BuffSystem;

    beforeEach(() => {
        system = new BuffSystem();
    });

    // ─── 应用 BUFF 并查询 ────────────────────────────
    describe('applyBuff / getActiveBuffs', () => {
        it('应用 BUFF 后可查询到', () => {
            system.applyBuff(1, BuffType.ATK_UP, 3, 10);

            const buffs = system.getActiveBuffs(1);
            expect(buffs).toHaveLength(1);
            expect(buffs[0]).toEqual({
                buffType: BuffType.ATK_UP,
                remainingRounds: 3,
                value: 10,
            });
        });

        it('可对同一角色施加不同类型 BUFF', () => {
            system.applyBuff(1, BuffType.ATK_UP, 3, 10);
            system.applyBuff(1, BuffType.DEF_UP, 2, 5);

            const buffs = system.getActiveBuffs(1);
            expect(buffs).toHaveLength(2);
        });

        it('无 BUFF 角色返回空数组', () => {
            expect(system.getActiveBuffs(99)).toEqual([]);
        });
    });

    // ─── 同类型 BUFF 刷新持续时间 ────────────────────
    describe('同类型 BUFF 刷新', () => {
        it('同类型 BUFF 刷新持续时间和数值而非叠加', () => {
            system.applyBuff(1, BuffType.ATK_UP, 2, 10);
            system.applyBuff(1, BuffType.ATK_UP, 5, 15);

            const buffs = system.getActiveBuffs(1);
            expect(buffs).toHaveLength(1);
            expect(buffs[0].remainingRounds).toBe(5);
            expect(buffs[0].value).toBe(15);
        });
    });

    // ─── tickBuffs 回合递减 ──────────────────────────
    describe('tickBuffs', () => {
        it('每次 tick 减少 1 回合', () => {
            system.applyBuff(1, BuffType.ATK_UP, 3, 10);
            system.tickBuffs(1);

            const buffs = system.getActiveBuffs(1);
            expect(buffs[0].remainingRounds).toBe(2);
        });

        it('返回过期的 BUFF 列表', () => {
            system.applyBuff(1, BuffType.ATK_UP, 1, 10);
            system.applyBuff(1, BuffType.DEF_UP, 3, 5);

            const expired = system.tickBuffs(1);
            expect(expired).toHaveLength(1);
            expect(expired[0].buffType).toBe(BuffType.ATK_UP);
        });

        it('过期 BUFF 被自动移除', () => {
            system.applyBuff(1, BuffType.STUN, 1, 0);
            system.tickBuffs(1);

            expect(system.getActiveBuffs(1)).toHaveLength(0);
            expect(system.hasBuff(1, BuffType.STUN)).toBe(false);
        });

        it('对无 BUFF 角色 tick 返回空数组', () => {
            expect(system.tickBuffs(99)).toEqual([]);
        });
    });

    // ─── getBuffValue ────────────────────────────────
    describe('getBuffValue', () => {
        it('返回对应 BUFF 的数值', () => {
            system.applyBuff(1, BuffType.ATK_UP, 3, 25);
            expect(system.getBuffValue(1, BuffType.ATK_UP)).toBe(25);
        });

        it('无该 BUFF 时返回 0', () => {
            expect(system.getBuffValue(1, BuffType.DEF_UP)).toBe(0);
        });
    });

    // ─── hasBuff ─────────────────────────────────────
    describe('hasBuff', () => {
        it('存在时返回 true', () => {
            system.applyBuff(1, BuffType.STUN, 2, 0);
            expect(system.hasBuff(1, BuffType.STUN)).toBe(true);
        });

        it('不存在时返回 false', () => {
            expect(system.hasBuff(1, BuffType.STUN)).toBe(false);
        });
    });

    // ─── 多角色隔离 ─────────────────────────────────
    describe('多角色隔离', () => {
        it('不同角色的 BUFF 互不影响', () => {
            system.applyBuff(1, BuffType.ATK_UP, 3, 10);
            system.applyBuff(2, BuffType.DEF_UP, 2, 5);

            expect(system.getActiveBuffs(1)).toHaveLength(1);
            expect(system.getActiveBuffs(1)[0].buffType).toBe(BuffType.ATK_UP);
            expect(system.getActiveBuffs(2)).toHaveLength(1);
            expect(system.getActiveBuffs(2)[0].buffType).toBe(BuffType.DEF_UP);
        });

        it('tick 仅影响指定角色', () => {
            system.applyBuff(1, BuffType.ATK_UP, 1, 10);
            system.applyBuff(2, BuffType.ATK_UP, 1, 10);

            system.tickBuffs(1);

            expect(system.getActiveBuffs(1)).toHaveLength(0);
            expect(system.getActiveBuffs(2)).toHaveLength(1);
        });
    });

    // ─── clearBuffs ─────────────────────────────────
    describe('clearBuffs', () => {
        it('清除指定角色所有 BUFF', () => {
            system.applyBuff(1, BuffType.ATK_UP, 3, 10);
            system.applyBuff(1, BuffType.DEF_UP, 2, 5);
            system.clearBuffs(1);

            expect(system.getActiveBuffs(1)).toEqual([]);
        });

        it('不影响其他角色', () => {
            system.applyBuff(1, BuffType.ATK_UP, 3, 10);
            system.applyBuff(2, BuffType.DEF_UP, 2, 5);
            system.clearBuffs(1);

            expect(system.getActiveBuffs(2)).toHaveLength(1);
        });
    });

    // ─── clearAll ───────────────────────────────────
    describe('clearAll', () => {
        it('清除所有角色的 BUFF', () => {
            system.applyBuff(1, BuffType.ATK_UP, 3, 10);
            system.applyBuff(2, BuffType.DEF_UP, 2, 5);
            system.applyBuff(3, BuffType.STUN, 1, 0);

            system.clearAll();

            expect(system.getActiveBuffs(1)).toEqual([]);
            expect(system.getActiveBuffs(2)).toEqual([]);
            expect(system.getActiveBuffs(3)).toEqual([]);
        });
    });
});

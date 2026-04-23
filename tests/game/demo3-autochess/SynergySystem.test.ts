/**
 * SynergySystem 单元测试
 *
 * 覆盖：calculateSynergies / applySynergyBuffs / removeSynergyBuffs / getActiveSynergies
 */

import { SynergySystem } from '@game/demo3-autochess/systems/SynergySystem';
import {
    ChessPieceRuntimeState,
    ActiveSynergy,
} from '@game/demo3-autochess/data/AutoChessGameData';
import { SynergyConfigRow, SYNERGY_DATA } from '@game/demo3-autochess/data/SynergyConfigRow';

// ─── 辅助工厂 ────────────────────────────────────────

/** 创建默认棋子运行时状态 */
function makePiece(overrides: Partial<ChessPieceRuntimeState> = {}): ChessPieceRuntimeState {
    return {
        id: 1,
        configId: 1,
        name: 'TestPiece',
        race: 'warrior',
        hp: 100,
        maxHp: 100,
        atk: 50,
        atkSpeed: 1.0,
        range: 1,
        star: 1,
        side: 'player',
        position: { row: 0, col: 0 },
        isAlive: true,
        ...overrides,
    };
}

/** 从静态数据加载配置行 */
function loadConfigs(): SynergyConfigRow[] {
    return SYNERGY_DATA.map((raw) => {
        const row = new SynergyConfigRow();
        row.parseRow(raw);
        return row;
    });
}

// ─── 测试套件 ────────────────────────────────────────

describe('SynergySystem', () => {
    let system: SynergySystem;
    let configs: SynergyConfigRow[];

    beforeEach(() => {
        system = new SynergySystem();
        configs = loadConfigs();
    });

    // ─── calculateSynergies ─────────────────────────

    describe('calculateSynergies', () => {
        it('3 个 warrior 棋子达到阈值 → warrior 羁绊 isActive=true', () => {
            const pieces = [
                makePiece({ id: 1, race: 'warrior' }),
                makePiece({ id: 2, race: 'warrior' }),
                makePiece({ id: 3, race: 'warrior' }),
            ];

            const synergies = system.calculateSynergies(pieces, configs);
            const warrior = synergies.find((s) => s.race === 'warrior');

            expect(warrior).toBeDefined();
            expect(warrior!.isActive).toBe(true);
            expect(warrior!.count).toBe(3);
            expect(warrior!.effect).toBe('atk_boost');
            expect(warrior!.value).toBe(20);
        });

        it('2 个 warrior 不足阈值 → warrior 羁绊 isActive=false', () => {
            const pieces = [
                makePiece({ id: 1, race: 'warrior' }),
                makePiece({ id: 2, race: 'warrior' }),
            ];

            const synergies = system.calculateSynergies(pieces, configs);
            const warrior = synergies.find((s) => s.race === 'warrior');

            expect(warrior).toBeDefined();
            expect(warrior!.isActive).toBe(false);
            expect(warrior!.count).toBe(2);
        });

        it('只统计存活棋子', () => {
            const pieces = [
                makePiece({ id: 1, race: 'warrior', isAlive: true }),
                makePiece({ id: 2, race: 'warrior', isAlive: true }),
                makePiece({ id: 3, race: 'warrior', isAlive: false }),
            ];

            const synergies = system.calculateSynergies(pieces, configs);
            const warrior = synergies.find((s) => s.race === 'warrior');

            expect(warrior!.isActive).toBe(false);
            expect(warrior!.count).toBe(2);
        });

        it('多种族同时计算', () => {
            const pieces = [
                makePiece({ id: 1, race: 'warrior' }),
                makePiece({ id: 2, race: 'warrior' }),
                makePiece({ id: 3, race: 'warrior' }),
                makePiece({ id: 4, race: 'mage' }),
                makePiece({ id: 5, race: 'mage' }),
            ];

            const synergies = system.calculateSynergies(pieces, configs);
            const warrior = synergies.find((s) => s.race === 'warrior');
            const mage = synergies.find((s) => s.race === 'mage');

            expect(warrior!.isActive).toBe(true);
            expect(mage!.isActive).toBe(true);
        });

        it('没有匹配的种族 → 该羁绊 count=0, isActive=false', () => {
            const pieces = [makePiece({ id: 1, race: 'unknown' })];

            const synergies = system.calculateSynergies(pieces, configs);
            const warrior = synergies.find((s) => s.race === 'warrior');

            expect(warrior!.count).toBe(0);
            expect(warrior!.isActive).toBe(false);
        });

        it('空棋子列表 → 所有羁绊 isActive=false', () => {
            const synergies = system.calculateSynergies([], configs);

            expect(synergies.length).toBe(configs.length);
            synergies.forEach((s: ActiveSynergy) => {
                expect(s.isActive).toBe(false);
                expect(s.count).toBe(0);
            });
        });
    });

    // ─── applySynergyBuffs / removeSynergyBuffs ────

    describe('applySynergyBuffs', () => {
        it('atk_boost: atk 增加 baseAtk * value / 100', () => {
            const piece = makePiece({ id: 1, race: 'warrior', atk: 50 });
            const synergies: ActiveSynergy[] = [
                {
                    race: 'warrior',
                    count: 3,
                    threshold: 3,
                    effect: 'atk_boost',
                    value: 20,
                    isActive: true,
                },
            ];

            system.applySynergyBuffs([piece], synergies);

            // 50 + 50 * 20 / 100 = 60
            expect(piece.atk).toBe(60);
        });

        it('hp_boost: maxHp 和 hp 都增加', () => {
            const piece = makePiece({ id: 1, race: 'mage', hp: 100, maxHp: 100 });
            const synergies: ActiveSynergy[] = [
                {
                    race: 'mage',
                    count: 2,
                    threshold: 2,
                    effect: 'hp_boost',
                    value: 30,
                    isActive: true,
                },
            ];

            system.applySynergyBuffs([piece], synergies);

            // maxHp: 100 + 100 * 30 / 100 = 130
            // hp: 100 + 30 = 130
            expect(piece.maxHp).toBe(130);
            expect(piece.hp).toBe(130);
        });

        it('spd_boost: atkSpeed 减少（攻击更快）', () => {
            const piece = makePiece({ id: 1, race: 'ranger', atkSpeed: 1.0 });
            const synergies: ActiveSynergy[] = [
                {
                    race: 'ranger',
                    count: 3,
                    threshold: 3,
                    effect: 'spd_boost',
                    value: 25,
                    isActive: true,
                },
            ];

            system.applySynergyBuffs([piece], synergies);

            // 1.0 * (1 - 25 / 100) = 0.75
            expect(piece.atkSpeed).toBeCloseTo(0.75);
        });

        it('不匹配种族的棋子不受影响', () => {
            const piece = makePiece({ id: 1, race: 'mage', atk: 50 });
            const synergies: ActiveSynergy[] = [
                {
                    race: 'warrior',
                    count: 3,
                    threshold: 3,
                    effect: 'atk_boost',
                    value: 20,
                    isActive: true,
                },
            ];

            system.applySynergyBuffs([piece], synergies);

            expect(piece.atk).toBe(50);
        });

        it('未激活的羁绊不应用', () => {
            const piece = makePiece({ id: 1, race: 'warrior', atk: 50 });
            const synergies: ActiveSynergy[] = [
                {
                    race: 'warrior',
                    count: 2,
                    threshold: 3,
                    effect: 'atk_boost',
                    value: 20,
                    isActive: false,
                },
            ];

            system.applySynergyBuffs([piece], synergies);

            expect(piece.atk).toBe(50);
        });

        it('死亡棋子不应用 buff', () => {
            const piece = makePiece({ id: 1, race: 'warrior', atk: 50, isAlive: false });
            const synergies: ActiveSynergy[] = [
                {
                    race: 'warrior',
                    count: 3,
                    threshold: 3,
                    effect: 'atk_boost',
                    value: 20,
                    isActive: true,
                },
            ];

            system.applySynergyBuffs([piece], synergies);

            expect(piece.atk).toBe(50);
        });
    });

    describe('removeSynergyBuffs', () => {
        it('移除后 atk 恢复原始值', () => {
            const piece = makePiece({ id: 1, race: 'warrior', atk: 50 });
            const synergies: ActiveSynergy[] = [
                {
                    race: 'warrior',
                    count: 3,
                    threshold: 3,
                    effect: 'atk_boost',
                    value: 20,
                    isActive: true,
                },
            ];

            system.applySynergyBuffs([piece], synergies);
            expect(piece.atk).toBe(60);

            system.removeSynergyBuffs([piece]);
            expect(piece.atk).toBe(50);
        });

        it('移除后 maxHp 和 hp 恢复（hp 不超过 maxHp）', () => {
            const piece = makePiece({ id: 1, race: 'mage', hp: 100, maxHp: 100 });
            const synergies: ActiveSynergy[] = [
                {
                    race: 'mage',
                    count: 2,
                    threshold: 2,
                    effect: 'hp_boost',
                    value: 30,
                    isActive: true,
                },
            ];

            system.applySynergyBuffs([piece], synergies);
            expect(piece.maxHp).toBe(130);

            system.removeSynergyBuffs([piece]);
            expect(piece.maxHp).toBe(100);
            expect(piece.hp).toBeLessThanOrEqual(piece.maxHp);
        });

        it('移除后 atkSpeed 恢复', () => {
            const piece = makePiece({ id: 1, race: 'ranger', atkSpeed: 1.0 });
            const synergies: ActiveSynergy[] = [
                {
                    race: 'ranger',
                    count: 3,
                    threshold: 3,
                    effect: 'spd_boost',
                    value: 25,
                    isActive: true,
                },
            ];

            system.applySynergyBuffs([piece], synergies);
            expect(piece.atkSpeed).toBeCloseTo(0.75);

            system.removeSynergyBuffs([piece]);
            expect(piece.atkSpeed).toBeCloseTo(1.0);
        });

        it('未应用 buff 的棋子调用 removeSynergyBuffs 不报错', () => {
            const piece = makePiece({ id: 1, race: 'warrior', atk: 50 });

            expect(() => system.removeSynergyBuffs([piece])).not.toThrow();
            expect(piece.atk).toBe(50);
        });

        it('多次 apply + remove 数值稳定', () => {
            const piece = makePiece({ id: 1, race: 'warrior', atk: 50 });
            const synergies: ActiveSynergy[] = [
                {
                    race: 'warrior',
                    count: 3,
                    threshold: 3,
                    effect: 'atk_boost',
                    value: 20,
                    isActive: true,
                },
            ];

            system.applySynergyBuffs([piece], synergies);
            system.removeSynergyBuffs([piece]);
            system.applySynergyBuffs([piece], synergies);
            system.removeSynergyBuffs([piece]);

            expect(piece.atk).toBe(50);
        });
    });

    // ─── getActiveSynergies ─────────────────────────

    describe('getActiveSynergies', () => {
        it('只返回 isActive=true 的羁绊', () => {
            const synergies: ActiveSynergy[] = [
                {
                    race: 'warrior',
                    count: 3,
                    threshold: 3,
                    effect: 'atk_boost',
                    value: 20,
                    isActive: true,
                },
                {
                    race: 'mage',
                    count: 1,
                    threshold: 2,
                    effect: 'hp_boost',
                    value: 30,
                    isActive: false,
                },
                {
                    race: 'ranger',
                    count: 3,
                    threshold: 3,
                    effect: 'spd_boost',
                    value: 25,
                    isActive: true,
                },
            ];

            const active = system.getActiveSynergies(synergies);

            expect(active).toHaveLength(2);
            expect(active.map((s: ActiveSynergy) => s.race)).toEqual(['warrior', 'ranger']);
        });

        it('全部未激活 → 返回空数组', () => {
            const synergies: ActiveSynergy[] = [
                {
                    race: 'warrior',
                    count: 1,
                    threshold: 3,
                    effect: 'atk_boost',
                    value: 20,
                    isActive: false,
                },
            ];

            expect(system.getActiveSynergies(synergies)).toHaveLength(0);
        });

        it('空输入 → 返回空数组', () => {
            expect(system.getActiveSynergies([])).toHaveLength(0);
        });
    });
});

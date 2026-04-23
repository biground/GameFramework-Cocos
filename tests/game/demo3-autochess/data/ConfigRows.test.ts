/**
 * Demo3 配置行类型单元测试
 * 覆盖 ChessPieceConfigRow 和 SynergyConfigRow 的 parseRow + 静态数据
 */

import {
    ChessPieceConfigRow,
    CHESS_PIECE_DATA,
} from '@game/demo3-autochess/data/ChessPieceConfigRow';
import { SynergyConfigRow, SYNERGY_DATA } from '@game/demo3-autochess/data/SynergyConfigRow';

// ═══════════════════════════════════════════════════════
// ChessPieceConfigRow
// ═══════════════════════════════════════════════════════

describe('ChessPieceConfigRow', () => {
    describe('parseRow', () => {
        it('应正确解析完整数据', () => {
            const row = new ChessPieceConfigRow();
            row.parseRow({
                id: 1,
                name: '战士',
                race: 'warrior',
                hp: 100,
                atk: 20,
                atkSpeed: 1.0,
                range: 1,
                cost: 1,
                star2Mult: 2.0,
            });

            expect(row.id).toBe(1);
            expect(row.name).toBe('战士');
            expect(row.race).toBe('warrior');
            expect(row.hp).toBe(100);
            expect(row.atk).toBe(20);
            expect(row.atkSpeed).toBe(1.0);
            expect(row.range).toBe(1);
            expect(row.cost).toBe(1);
            expect(row.star2Mult).toBe(2.0);
        });

        it('缺失字段应使用默认值', () => {
            const row = new ChessPieceConfigRow();
            row.parseRow({ id: 99 });

            expect(row.id).toBe(99);
            expect(row.name).toBe('');
            expect(row.race).toBe('');
            expect(row.hp).toBe(0);
            expect(row.atk).toBe(0);
            expect(row.atkSpeed).toBe(0);
            expect(row.range).toBe(0);
            expect(row.cost).toBe(0);
            expect(row.star2Mult).toBe(2.0);
        });

        it('应将字符串数值正确转换为 number', () => {
            const row = new ChessPieceConfigRow();
            row.parseRow({
                id: '5',
                name: '弓手',
                race: 'ranger',
                hp: '80',
                atk: '15',
                atkSpeed: '0.8',
                range: '3',
                cost: '2',
                star2Mult: '1.8',
            });

            expect(row.id).toBe(5);
            expect(row.hp).toBe(80);
            expect(row.atk).toBe(15);
            expect(row.atkSpeed).toBe(0.8);
            expect(row.range).toBe(3);
            expect(row.cost).toBe(2);
            expect(row.star2Mult).toBe(1.8);
        });
    });

    describe('CHESS_PIECE_DATA', () => {
        it('应至少包含 6 条配置', () => {
            expect(CHESS_PIECE_DATA.length).toBeGreaterThanOrEqual(6);
        });

        it('每条配置应有完整的必要字段', () => {
            const requiredKeys = ['id', 'name', 'race', 'hp', 'atk', 'atkSpeed', 'range', 'cost'];
            for (const data of CHESS_PIECE_DATA) {
                for (const key of requiredKeys) {
                    expect(data).toHaveProperty(key);
                }
            }
        });

        it('id 应唯一', () => {
            const ids = CHESS_PIECE_DATA.map((d) => d['id']);
            expect(new Set(ids).size).toBe(ids.length);
        });

        it('应包含 warrior/mage/ranger/tank 四种种族', () => {
            const races = new Set(CHESS_PIECE_DATA.map((d) => d['race']));
            expect(races.has('warrior')).toBe(true);
            expect(races.has('mage')).toBe(true);
            expect(races.has('ranger')).toBe(true);
            expect(races.has('tank')).toBe(true);
        });

        it('所有棋子可被 parseRow 正确解析', () => {
            for (const data of CHESS_PIECE_DATA) {
                const row = new ChessPieceConfigRow();
                row.parseRow(data);
                expect(row.id).toBeGreaterThan(0);
                expect(row.name.length).toBeGreaterThan(0);
                expect(row.race.length).toBeGreaterThan(0);
                expect(row.hp).toBeGreaterThan(0);
                expect(row.atk).toBeGreaterThan(0);
                expect(row.cost).toBeGreaterThan(0);
            }
        });
    });
});

// ═══════════════════════════════════════════════════════
// SynergyConfigRow
// ═══════════════════════════════════════════════════════

describe('SynergyConfigRow', () => {
    describe('parseRow', () => {
        it('应正确解析完整数据', () => {
            const row = new SynergyConfigRow();
            row.parseRow({
                id: 1,
                race: 'warrior',
                threshold: 3,
                effect: 'atk_boost',
                value: 20,
                desc: '战士×3 ATK+20%',
            });

            expect(row.id).toBe(1);
            expect(row.race).toBe('warrior');
            expect(row.threshold).toBe(3);
            expect(row.effect).toBe('atk_boost');
            expect(row.value).toBe(20);
            expect(row.desc).toBe('战士×3 ATK+20%');
        });

        it('缺失字段应使用默认值', () => {
            const row = new SynergyConfigRow();
            row.parseRow({ id: 10 });

            expect(row.id).toBe(10);
            expect(row.race).toBe('');
            expect(row.threshold).toBe(0);
            expect(row.effect).toBe('');
            expect(row.value).toBe(0);
            expect(row.desc).toBe('');
        });

        it('应将字符串数值正确转换为 number', () => {
            const row = new SynergyConfigRow();
            row.parseRow({
                id: '2',
                race: 'mage',
                threshold: '2',
                effect: 'hp_boost',
                value: '30',
                desc: '法师×2 HP+30%',
            });

            expect(row.id).toBe(2);
            expect(row.threshold).toBe(2);
            expect(row.value).toBe(30);
        });
    });

    describe('SYNERGY_DATA', () => {
        it('应包含 3 条羁绊配置', () => {
            expect(SYNERGY_DATA.length).toBe(3);
        });

        it('每条配置应有完整的必要字段', () => {
            const requiredKeys = ['id', 'race', 'threshold', 'effect', 'value', 'desc'];
            for (const data of SYNERGY_DATA) {
                for (const key of requiredKeys) {
                    expect(data).toHaveProperty(key);
                }
            }
        });

        it('应包含 warrior ATK+20% 羁绊', () => {
            const warrior = SYNERGY_DATA.find(
                (d: Record<string, unknown>) => d['race'] === 'warrior',
            );
            expect(warrior).toBeDefined();
            expect(warrior!['threshold']).toBe(3);
            expect(warrior!['effect']).toBe('atk_boost');
            expect(warrior!['value']).toBe(20);
        });

        it('应包含 mage HP+30% 羁绊', () => {
            const mage = SYNERGY_DATA.find((d: Record<string, unknown>) => d['race'] === 'mage');
            expect(mage).toBeDefined();
            expect(mage!['threshold']).toBe(2);
            expect(mage!['effect']).toBe('hp_boost');
            expect(mage!['value']).toBe(30);
        });

        it('应包含 ranger SPD+25% 羁绊', () => {
            const ranger = SYNERGY_DATA.find(
                (d: Record<string, unknown>) => d['race'] === 'ranger',
            );
            expect(ranger).toBeDefined();
            expect(ranger!['threshold']).toBe(3);
            expect(ranger!['effect']).toBe('spd_boost');
            expect(ranger!['value']).toBe(25);
        });

        it('所有羁绊可被 parseRow 正确解析', () => {
            for (const data of SYNERGY_DATA) {
                const row = new SynergyConfigRow();
                row.parseRow(data);
                expect(row.id).toBeGreaterThan(0);
                expect(row.race.length).toBeGreaterThan(0);
                expect(row.threshold).toBeGreaterThan(0);
                expect(row.value).toBeGreaterThan(0);
            }
        });
    });
});

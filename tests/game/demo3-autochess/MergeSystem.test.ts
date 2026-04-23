/**
 * MergeSystem 单元测试
 *
 * 覆盖场景：
 * - 3 个同名 ★1 棋子合成为 ★2（属性翻倍）
 * - 不足 3 个同名 ★1 返回 null
 * - ★2 棋子不参与合成
 * - 混合名称棋子只合成满足条件的
 * - 空列表返回 null
 * - findMergeCandidates 正确分组
 * - createMergedPiece 属性正确
 */

import { MergeSystem } from '@game/demo3-autochess/systems/MergeSystem';
import { ChessPieceRuntimeState } from '@game/demo3-autochess/data/AutoChessGameData';

/** 创建测试用棋子运行时状态的辅助函数 */
function makePiece(overrides: Partial<ChessPieceRuntimeState> = {}): ChessPieceRuntimeState {
    return {
        id: 1,
        configId: 100,
        name: '战士',
        race: 'warrior',
        hp: 100,
        maxHp: 100,
        atk: 20,
        atkSpeed: 1.0,
        range: 1,
        star: 1,
        side: 'player',
        position: { row: -1, col: -1 },
        isAlive: true,
        ...overrides,
    };
}

describe('MergeSystem', () => {
    let mergeSystem: MergeSystem;

    beforeEach(() => {
        mergeSystem = new MergeSystem();
    });

    // ─── checkAndMerge ─────────────────────────────────

    describe('checkAndMerge', () => {
        it('3 个同名 ★1 棋子应合成为 ★2，属性翻倍', () => {
            const pieces = [
                makePiece({ id: 1, star: 1 }),
                makePiece({ id: 2, star: 1 }),
                makePiece({ id: 3, star: 1 }),
            ];

            const result = mergeSystem.checkAndMerge(pieces, 2);

            expect(result).not.toBeNull();
            expect(result!.mergedPiece.star).toBe(2);
            expect(result!.mergedPiece.name).toBe('战士');
            expect(result!.mergedPiece.hp).toBe(200); // 100 * 2
            expect(result!.mergedPiece.maxHp).toBe(200);
            expect(result!.mergedPiece.atk).toBe(40); // 20 * 2
            expect(result!.consumedIds).toHaveLength(3);
            expect(result!.consumedIds).toEqual(expect.arrayContaining([1, 2, 3]));
        });

        it('不足 3 个同名 ★1 棋子应返回 null', () => {
            const pieces = [makePiece({ id: 1, star: 1 }), makePiece({ id: 2, star: 1 })];

            const result = mergeSystem.checkAndMerge(pieces, 2);

            expect(result).toBeNull();
        });

        it('★2 棋子不参与合成', () => {
            const pieces = [
                makePiece({ id: 1, star: 2 }),
                makePiece({ id: 2, star: 2 }),
                makePiece({ id: 3, star: 2 }),
            ];

            const result = mergeSystem.checkAndMerge(pieces, 2);

            expect(result).toBeNull();
        });

        it('空列表应返回 null', () => {
            const result = mergeSystem.checkAndMerge([], 2);

            expect(result).toBeNull();
        });

        it('混合名称棋子只合成满足 ≥3 条件的', () => {
            const pieces = [
                makePiece({ id: 1, name: '战士', star: 1 }),
                makePiece({ id: 2, name: '战士', star: 1 }),
                makePiece({ id: 3, name: '战士', star: 1 }),
                makePiece({ id: 4, name: '法师', star: 1 }),
                makePiece({ id: 5, name: '法师', star: 1 }),
            ];

            const result = mergeSystem.checkAndMerge(pieces, 2);

            expect(result).not.toBeNull();
            expect(result!.mergedPiece.name).toBe('战士');
            expect(result!.consumedIds).toHaveLength(3);
            // 法师不应被消耗
            expect(result!.consumedIds).not.toContain(4);
            expect(result!.consumedIds).not.toContain(5);
        });

        it('★1 和 ★2 混合时只用 ★1 参与合成', () => {
            const pieces = [
                makePiece({ id: 1, star: 1 }),
                makePiece({ id: 2, star: 2 }),
                makePiece({ id: 3, star: 1 }),
                makePiece({ id: 4, star: 1 }),
            ];

            const result = mergeSystem.checkAndMerge(pieces, 2);

            expect(result).not.toBeNull();
            expect(result!.consumedIds).toEqual(expect.arrayContaining([1, 3, 4]));
            expect(result!.consumedIds).not.toContain(2);
        });

        it('超过 3 个同名 ★1 只取前 3 个', () => {
            const pieces = [
                makePiece({ id: 1, star: 1 }),
                makePiece({ id: 2, star: 1 }),
                makePiece({ id: 3, star: 1 }),
                makePiece({ id: 4, star: 1 }),
            ];

            const result = mergeSystem.checkAndMerge(pieces, 2);

            expect(result).not.toBeNull();
            expect(result!.consumedIds).toHaveLength(3);
            expect(result!.consumedIds).not.toContain(4);
        });
    });

    // ─── createMergedPiece ──────────────────────────────

    describe('createMergedPiece', () => {
        it('应基于原始棋子创建 ★2 版本，属性翻倍', () => {
            const base = makePiece({
                id: 10,
                hp: 80,
                maxHp: 80,
                atk: 15,
                atkSpeed: 1.2,
                range: 2,
                side: 'player',
                position: { row: 1, col: 2 },
            });

            const merged = mergeSystem.createMergedPiece(base, 2);

            expect(merged.star).toBe(2);
            expect(merged.hp).toBe(160); // 80 * 2
            expect(merged.maxHp).toBe(160);
            expect(merged.atk).toBe(30); // 15 * 2
            // 保留原始非数值属性
            expect(merged.name).toBe('战士');
            expect(merged.race).toBe('warrior');
            expect(merged.atkSpeed).toBe(1.2);
            expect(merged.range).toBe(2);
            expect(merged.side).toBe('player');
            expect(merged.position).toEqual({ row: 1, col: 2 });
            expect(merged.isAlive).toBe(true);
        });

        it('应使用传入的 star2Mult 倍率', () => {
            const base = makePiece({ hp: 50, maxHp: 50, atk: 10 });

            const merged = mergeSystem.createMergedPiece(base, 3);

            expect(merged.hp).toBe(150); // 50 * 3
            expect(merged.atk).toBe(30); // 10 * 3
        });
    });

    // ─── findMergeCandidates ────────────────────────────

    describe('findMergeCandidates', () => {
        it('应按 name + star=1 分组，返回 count ≥ 3 的分组', () => {
            const pieces = [
                makePiece({ id: 1, name: '战士', star: 1 }),
                makePiece({ id: 2, name: '战士', star: 1 }),
                makePiece({ id: 3, name: '战士', star: 1 }),
                makePiece({ id: 4, name: '法师', star: 1 }),
                makePiece({ id: 5, name: '法师', star: 1 }),
            ];

            const candidates = mergeSystem.findMergeCandidates(pieces);

            expect(candidates.size).toBe(1);
            expect(candidates.has('战士')).toBe(true);
            expect(candidates.get('战士')).toHaveLength(3);
            expect(candidates.has('法师')).toBe(false);
        });

        it('★2 棋子不计入分组', () => {
            const pieces = [
                makePiece({ id: 1, name: '战士', star: 1 }),
                makePiece({ id: 2, name: '战士', star: 2 }),
                makePiece({ id: 3, name: '战士', star: 1 }),
            ];

            const candidates = mergeSystem.findMergeCandidates(pieces);

            expect(candidates.size).toBe(0);
        });

        it('空列表应返回空 Map', () => {
            const candidates = mergeSystem.findMergeCandidates([]);

            expect(candidates.size).toBe(0);
        });

        it('多个名称都满足条件时都应返回', () => {
            const pieces = [
                makePiece({ id: 1, name: '战士', star: 1 }),
                makePiece({ id: 2, name: '战士', star: 1 }),
                makePiece({ id: 3, name: '战士', star: 1 }),
                makePiece({ id: 4, name: '法师', star: 1, configId: 200 }),
                makePiece({ id: 5, name: '法师', star: 1, configId: 200 }),
                makePiece({ id: 6, name: '法师', star: 1, configId: 200 }),
            ];

            const candidates = mergeSystem.findMergeCandidates(pieces);

            expect(candidates.size).toBe(2);
            expect(candidates.has('战士')).toBe(true);
            expect(candidates.has('法师')).toBe(true);
        });
    });
});

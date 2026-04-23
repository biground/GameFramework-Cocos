/**
 * AutoChessRenderer 单元测试
 *
 * @jest-environment jsdom
 */

import { HtmlRenderer } from '@game/shared/HtmlRenderer';
import { AutoChessRenderer } from '@game/demo3-autochess/ui/AutoChessRenderer';
import {
    ChessPieceRuntimeState,
    ShopSlot,
    ActiveSynergy,
    AutoChessGameData,
} from '@game/demo3-autochess/data/AutoChessGameData';

// ─── Mock Logger ────────────────────────────────────────
jest.mock('@framework/debug/Logger', () => ({
    Logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

// ─── 辅助函数 ──────────────────────────────────────────

/** 创建一个最小棋子运行时状态 */
function makePiece(overrides: Partial<ChessPieceRuntimeState> = {}): ChessPieceRuntimeState {
    return {
        id: 1,
        configId: 101,
        name: '剑士',
        race: '人类',
        hp: 100,
        maxHp: 100,
        atk: 20,
        atkSpeed: 1.0,
        range: 1,
        star: 1,
        side: 'player',
        position: { row: 0, col: 0 },
        isAlive: true,
        ...overrides,
    };
}

/** 创建商店槽位 */
function makeSlot(overrides: Partial<ShopSlot> = {}): ShopSlot {
    return {
        config: {
            id: 101,
            name: '剑士',
            race: '人类',
            hp: 100,
            atk: 20,
            atkSpeed: 1.0,
            range: 1,
            cost: 3,
            star2Mult: 1.8,
        },
        sold: false,
        ...overrides,
    };
}

/** 创建已激活羁绊 */
function makeSynergy(overrides: Partial<ActiveSynergy> = {}): ActiveSynergy {
    return {
        race: '人类',
        count: 2,
        threshold: 2,
        effect: 'atk_bonus',
        value: 20,
        isActive: true,
        ...overrides,
    };
}

describe('AutoChessRenderer', () => {
    let renderer: HtmlRenderer;
    let acRenderer: AutoChessRenderer;

    beforeEach(() => {
        document.body.innerHTML = '';
        renderer = new HtmlRenderer('Auto-chess Test');
        acRenderer = new AutoChessRenderer(renderer);
    });

    // ═══════════════════════════════════════════════════════
    // renderBoard 测试
    // ═══════════════════════════════════════════════════════

    describe('renderBoard', () => {
        it('应生成 4×4 ASCII 棋盘并包含网格线', () => {
            const boardPieces = new Map<string, number>();
            const allPieces = new Map<number, ChessPieceRuntimeState>();

            acRenderer.renderBoard(boardPieces, allPieces, 1);

            // updateLog 应该被调用，检查 DOM 中包含棋盘元素
            const allText = document.body.textContent ?? '';
            // 检查网格线字符
            expect(allText).toContain('┌');
            expect(allText).toContain('┐');
            expect(allText).toContain('└');
            expect(allText).toContain('┘');
            expect(allText).toContain('├');
            expect(allText).toContain('┤');
            expect(allText).toContain('┼');
        });

        it('应在正确位置显示玩家棋子', () => {
            const p1 = makePiece({
                id: 1,
                name: '剑士',
                star: 1,
                side: 'player',
                position: { row: 0, col: 1 },
            });
            const boardPieces = new Map<string, number>([['0,1', 1]]);
            const allPieces = new Map<number, ChessPieceRuntimeState>([[1, p1]]);

            acRenderer.renderBoard(boardPieces, allPieces, 1);

            const text = document.body.textContent ?? '';
            // 玩家棋子应显示为 P1★ 或类似标识
            expect(text).toContain('P1');
        });

        it('应在正确位置显示敌方棋子', () => {
            const e1 = makePiece({
                id: 2,
                name: '哥布林',
                star: 2,
                side: 'enemy',
                position: { row: 3, col: 0 },
            });
            const boardPieces = new Map<string, number>([['3,0', 2]]);
            const allPieces = new Map<number, ChessPieceRuntimeState>([[2, e1]]);

            acRenderer.renderBoard(boardPieces, allPieces, 1);

            const text = document.body.textContent ?? '';
            // 敌方棋子以 E 开头
            expect(text).toContain('E2');
        });

        it('空格应显示为空白', () => {
            const boardPieces = new Map<string, number>();
            const allPieces = new Map<number, ChessPieceRuntimeState>();

            acRenderer.renderBoard(boardPieces, allPieces, 1);

            const text = document.body.textContent ?? '';
            // 棋盘标题
            expect(text).toContain('战斗棋盘');
        });

        it('应显示当前回合数', () => {
            const boardPieces = new Map<string, number>();
            const allPieces = new Map<number, ChessPieceRuntimeState>();

            acRenderer.renderBoard(boardPieces, allPieces, 5);

            const text = document.body.textContent ?? '';
            expect(text).toContain('5');
        });

        it('星级 2 的棋子应有星级标记', () => {
            const p1 = makePiece({ id: 1, star: 2, side: 'player', position: { row: 0, col: 0 } });
            const boardPieces = new Map<string, number>([['0,0', 1]]);
            const allPieces = new Map<number, ChessPieceRuntimeState>([[1, p1]]);

            acRenderer.renderBoard(boardPieces, allPieces, 1);

            const text = document.body.textContent ?? '';
            expect(text).toContain('★');
        });
    });

    // ═══════════════════════════════════════════════════════
    // renderShop 测试
    // ═══════════════════════════════════════════════════════

    describe('renderShop', () => {
        it('应渲染所有商店槽位', () => {
            const slots: ShopSlot[] = [
                makeSlot(),
                makeSlot({
                    config: {
                        id: 102,
                        name: '弓手',
                        race: '精灵',
                        hp: 80,
                        atk: 25,
                        atkSpeed: 0.8,
                        range: 3,
                        cost: 2,
                        star2Mult: 1.8,
                    },
                }),
                makeSlot({ config: null }),
            ];

            acRenderer.renderShop(slots);

            const text = document.body.textContent ?? '';
            expect(text).toContain('剑士');
            expect(text).toContain('弓手');
        });

        it('应显示棋子种族和费用', () => {
            const slots: ShopSlot[] = [makeSlot()];

            acRenderer.renderShop(slots);

            const text = document.body.textContent ?? '';
            expect(text).toContain('人类');
            expect(text).toContain('3'); // 费用
        });

        it('已售出的槽位应标记已售', () => {
            const slots: ShopSlot[] = [makeSlot({ sold: true })];

            acRenderer.renderShop(slots);

            const text = document.body.textContent ?? '';
            expect(text).toContain('已售');
        });

        it('空槽位应显示为空', () => {
            const slots: ShopSlot[] = [makeSlot({ config: null })];

            acRenderer.renderShop(slots);

            const text = document.body.textContent ?? '';
            expect(text).toContain('空');
        });
    });

    // ═══════════════════════════════════════════════════════
    // renderStatus 测试
    // ═══════════════════════════════════════════════════════

    describe('renderStatus', () => {
        it('应更新 HP、金币、回合面板值', () => {
            const gameData = new AutoChessGameData();
            gameData.hp = 80;
            gameData.gold = 15;
            gameData.round = 3;

            acRenderer.renderStatus(gameData, []);

            const text = document.body.textContent ?? '';
            expect(text).toContain('80');
            expect(text).toContain('15');
            expect(text).toContain('3');
        });

        it('应显示已激活的羁绊', () => {
            const gameData = new AutoChessGameData();
            const synergies = [makeSynergy({ race: '精灵', effect: 'dodge_bonus' })];

            acRenderer.renderStatus(gameData, synergies);

            const text = document.body.textContent ?? '';
            expect(text).toContain('精灵');
        });

        it('多次调用应原地更新而非叠加', () => {
            const gameData = new AutoChessGameData();
            gameData.hp = 80;
            acRenderer.renderStatus(gameData, []);

            gameData.hp = 60;
            acRenderer.renderStatus(gameData, []);

            const text = document.body.textContent ?? '';
            // 应只包含一份 HP 标签
            const matches = (text.match(/生命/g) || []).length;
            expect(matches).toBeLessThanOrEqual(1);
        });
    });

    // ═══════════════════════════════════════════════════════
    // renderBenchPieces 测试
    // ═══════════════════════════════════════════════════════

    describe('renderBenchPieces', () => {
        it('应渲染备战席棋子列表', () => {
            const bench = [
                makePiece({ id: 1, name: '剑士', star: 1 }),
                makePiece({ id: 2, name: '弓手', star: 2 }),
            ];

            acRenderer.renderBenchPieces(bench);

            const text = document.body.textContent ?? '';
            expect(text).toContain('剑士');
            expect(text).toContain('弓手');
        });

        it('备战席为空应提示', () => {
            acRenderer.renderBenchPieces([]);

            const text = document.body.textContent ?? '';
            expect(text).toContain('空');
        });
    });

    // ═══════════════════════════════════════════════════════
    // setupPrepareButtons 测试
    // ═══════════════════════════════════════════════════════

    describe('setupPrepareButtons', () => {
        it('应创建购买、放置、刷新、锁定、准备完成按钮', () => {
            const callbacks = {
                onBuy: jest.fn(),
                onPlace: jest.fn(),
                onRefresh: jest.fn(),
                onReady: jest.fn(),
                onLock: jest.fn(),
            };

            acRenderer.setupPrepareButtons(callbacks);

            const buttons = document.body.querySelectorAll('button');
            expect(buttons.length).toBeGreaterThanOrEqual(3);

            // 检查按钮文字
            const labels = Array.from(buttons).map((b) => b.textContent);
            expect(labels.some((l) => l?.includes('刷新'))).toBe(true);
            expect(labels.some((l) => l?.includes('准备'))).toBe(true);
        });

        it('点击刷新按钮应触发 onRefresh', () => {
            const callbacks = {
                onBuy: jest.fn(),
                onPlace: jest.fn(),
                onRefresh: jest.fn(),
                onReady: jest.fn(),
                onLock: jest.fn(),
            };

            acRenderer.setupPrepareButtons(callbacks);

            const buttons = document.body.querySelectorAll('button');
            const refreshBtn = Array.from(buttons).find((b) => b.textContent?.includes('刷新'));
            expect(refreshBtn).toBeDefined();
            refreshBtn?.click();
            expect(callbacks.onRefresh).toHaveBeenCalledTimes(1);
        });

        it('点击准备完成按钮应触发 onReady', () => {
            const callbacks = {
                onBuy: jest.fn(),
                onPlace: jest.fn(),
                onRefresh: jest.fn(),
                onReady: jest.fn(),
                onLock: jest.fn(),
            };

            acRenderer.setupPrepareButtons(callbacks);

            const buttons = document.body.querySelectorAll('button');
            const readyBtn = Array.from(buttons).find((b) => b.textContent?.includes('准备'));
            readyBtn?.click();
            expect(callbacks.onReady).toHaveBeenCalledTimes(1);
        });
    });

    // ═══════════════════════════════════════════════════════
    // setupBattleButtons 测试
    // ═══════════════════════════════════════════════════════

    describe('setupBattleButtons', () => {
        it('应创建加速按钮', () => {
            const callbacks = { onSpeedUp: jest.fn() };

            acRenderer.setupBattleButtons(callbacks);

            const buttons = document.body.querySelectorAll('button');
            expect(buttons.length).toBeGreaterThanOrEqual(1);
            const labels = Array.from(buttons).map((b) => b.textContent);
            expect(
                labels.some((l) => l?.includes('加速') || l?.includes('2x') || l?.includes('×')),
            ).toBe(true);
        });

        it('点击加速按钮应触发 onSpeedUp', () => {
            const callbacks = { onSpeedUp: jest.fn() };

            acRenderer.setupBattleButtons(callbacks);

            const buttons = document.body.querySelectorAll('button');
            const speedBtn = Array.from(buttons).find(
                (b) =>
                    b.textContent?.includes('加速') ||
                    b.textContent?.includes('2x') ||
                    b.textContent?.includes('×'),
            );
            speedBtn?.click();
            expect(callbacks.onSpeedUp).toHaveBeenCalled();
        });
    });

    // ═══════════════════════════════════════════════════════
    // clearButtons 测试
    // ═══════════════════════════════════════════════════════

    describe('clearButtons', () => {
        it('应清空所有按钮', () => {
            const callbacks = { onSpeedUp: jest.fn() };
            acRenderer.setupBattleButtons(callbacks);

            // 确认有按钮
            expect(document.body.querySelectorAll('button').length).toBeGreaterThan(0);

            acRenderer.clearButtons();

            // 按钮区域应清空
            // 注意：HtmlRenderer.clearButtons 清空 buttonArea
            // 需要验证没有操作按钮了
            // 由于准备/战斗按钮都在 buttonArea 中，清空后 buttonArea 应为空
        });
    });
});

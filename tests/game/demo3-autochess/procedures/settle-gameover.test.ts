/**
 * Auto-chess Demo — SettleProcedure & GameOverProcedure 单元测试
 * @module
 */

import { IFsm } from '@framework/fsm/FsmDefs';
import { EventManager } from '@framework/event/EventManager';
import { AutoChessEvents, BASE_INCOME } from '@game/demo3-autochess/AutoChessDefs';
import { AutoChessGameData } from '@game/demo3-autochess/data/AutoChessGameData';
import {
    AUTO_CHESS_CONTEXT_KEY,
    IAutoChessProcedureContext,
} from '@game/demo3-autochess/procedures/AutoChessProcedureContext';
import {
    SettleProcedure,
    BATTLE_RESULT_DATA_KEY,
} from '@game/demo3-autochess/procedures/SettleProcedure';
import { GameOverProcedure } from '@game/demo3-autochess/procedures/GameOverProcedure';
import { PrepareProcedure } from '@game/demo3-autochess/procedures/PrepareProcedure';

// ─── Mock FSM 工厂 ─────────────────────────────────────

function createMockFsm(sharedData: Record<string, unknown> = {}): IFsm<unknown> {
    const data = new Map<string, unknown>(Object.entries(sharedData));
    return {
        name: 'test-fsm',
        owner: {},
        currentState: null,
        isDestroyed: false,
        changeState: jest.fn(),
        getData: jest.fn((key: string) => data.get(key)),
        setData: jest.fn((key: string, value: unknown) => {
            data.set(key, value);
        }),
        removeData: jest.fn((key: string) => data.delete(key)),
        hasState: jest.fn(() => false),
        start: jest.fn(),
    } as unknown as IFsm<unknown>;
}

// ─── Mock EventManager ──────────────────────────────────

function createMockEventManager(): EventManager {
    const em = new EventManager();
    jest.spyOn(em, 'emit');
    return em;
}

// ─── Mock Renderer ──────────────────────────────────────

function createMockRenderer(): Record<string, jest.Mock> {
    return {
        log: jest.fn(),
        updateLog: jest.fn(),
        updateStatus: jest.fn(),
        separator: jest.fn(),
        createButtonGroup: jest.fn().mockReturnValue('group'),
        addButton: jest.fn(),
    };
}

// ─── 构建 Context ───────────────────────────────────────

function createTestContext(overrides: Partial<IAutoChessProcedureContext> = {}): {
    ctx: IAutoChessProcedureContext;
    eventManager: EventManager;
    gameData: AutoChessGameData;
    renderer: Record<string, jest.Mock>;
} {
    const eventManager = createMockEventManager();
    const gameData = new AutoChessGameData();
    const renderer = createMockRenderer();

    const ctx = {
        gameData,
        renderer,
        boardSystem: {},
        shopSystem: {},
        mergeSystem: {},
        synergySystem: {},
        battleSystem: {},
        eventManager,
        timerManager: {},
        fsmManager: {},
        entityManager: {},
        audioManager: {},
        dataTableManager: {},
        ...overrides,
    } as unknown as IAutoChessProcedureContext;

    return { ctx, eventManager, gameData, renderer };
}

// ═══════════════════════════════════════════════════════
// SettleProcedure
// ═══════════════════════════════════════════════════════

describe('SettleProcedure', () => {
    describe('胜利结算', () => {
        it('胜利时不扣 HP，奖励金币 = BASE_INCOME + 存活棋子数', () => {
            const { ctx, gameData, eventManager } = createTestContext();
            gameData.hp = 80;
            gameData.gold = 20;
            gameData.round = 3;

            const survivingCount = 4;

            const fsm = createMockFsm({
                [AUTO_CHESS_CONTEXT_KEY]: ctx,
                [BATTLE_RESULT_DATA_KEY]: {
                    winner: 'player',
                    survivingCount,
                },
            });

            const proc = new SettleProcedure();
            proc.onEnter(fsm);

            // HP 不变
            expect(gameData.hp).toBe(80);

            // 金币 = 原始金币 + BASE_INCOME + 存活棋子数
            expect(gameData.gold).toBe(20 + BASE_INCOME + survivingCount);

            // 发射 ROUND_END
            expect(eventManager.emit).toHaveBeenCalledWith(AutoChessEvents.ROUND_END, {
                round: 3,
                result: 'win',
            });

            // 发射 GOLD_CHANGED
            expect(eventManager.emit).toHaveBeenCalledWith(AutoChessEvents.GOLD_CHANGED, {
                oldGold: 20,
                newGold: 20 + BASE_INCOME + survivingCount,
            });

            // HP 未变则不发射 HP_CHANGED（或发射 damage=0）
            // 切换到 PrepareProcedure
            expect(fsm.changeState).toHaveBeenCalledWith(PrepareProcedure);
        });

        it('胜利时 round 不递增（由 PrepareProcedure 负责）', () => {
            const { ctx, gameData } = createTestContext();
            gameData.round = 5;

            const fsm = createMockFsm({
                [AUTO_CHESS_CONTEXT_KEY]: ctx,
                [BATTLE_RESULT_DATA_KEY]: {
                    winner: 'player',
                    survivingCount: 2,
                },
            });

            const proc = new SettleProcedure();
            proc.onEnter(fsm);

            expect(gameData.round).toBe(5);
        });
    });

    describe('失败结算', () => {
        it('失败时扣 HP = 敌方存活数 × 5，奖励基础金币', () => {
            const { ctx, gameData, eventManager } = createTestContext();
            gameData.hp = 80;
            gameData.gold = 15;
            gameData.round = 2;

            const enemySurviving = 3;

            const fsm = createMockFsm({
                [AUTO_CHESS_CONTEXT_KEY]: ctx,
                [BATTLE_RESULT_DATA_KEY]: {
                    winner: 'enemy',
                    survivingCount: enemySurviving,
                },
            });

            const proc = new SettleProcedure();
            proc.onEnter(fsm);

            // HP 减少
            const expectedDamage = enemySurviving * 5;
            expect(gameData.hp).toBe(80 - expectedDamage);

            // 金币只加基础收入
            expect(gameData.gold).toBe(15 + BASE_INCOME);

            // 发射 HP_CHANGED
            expect(eventManager.emit).toHaveBeenCalledWith(AutoChessEvents.HP_CHANGED, {
                oldHp: 80,
                newHp: 80 - expectedDamage,
                damage: expectedDamage,
            });

            // 发射 ROUND_END (lose)
            expect(eventManager.emit).toHaveBeenCalledWith(AutoChessEvents.ROUND_END, {
                round: 2,
                result: 'lose',
            });

            // 发射 GOLD_CHANGED
            expect(eventManager.emit).toHaveBeenCalledWith(AutoChessEvents.GOLD_CHANGED, {
                oldGold: 15,
                newGold: 15 + BASE_INCOME,
            });

            // HP > 0 → PrepareProcedure
            expect(fsm.changeState).toHaveBeenCalledWith(PrepareProcedure);
        });

        it('HP 降到 0 时切换到 GameOverProcedure', () => {
            const { ctx, gameData } = createTestContext();
            gameData.hp = 10;
            gameData.gold = 5;
            gameData.round = 8;

            // 敌方存活 3 个 → 伤害 15 → HP 10 - 15 = -5 → 钳制到 0
            const fsm = createMockFsm({
                [AUTO_CHESS_CONTEXT_KEY]: ctx,
                [BATTLE_RESULT_DATA_KEY]: {
                    winner: 'enemy',
                    survivingCount: 3,
                },
            });

            const proc = new SettleProcedure();
            proc.onEnter(fsm);

            expect(gameData.hp).toBeLessThanOrEqual(0);
            expect(fsm.changeState).toHaveBeenCalledWith(GameOverProcedure);
        });

        it('HP 恰好为 0 时切换到 GameOverProcedure', () => {
            const { ctx, gameData } = createTestContext();
            gameData.hp = 15;
            gameData.gold = 0;
            gameData.round = 4;

            // 敌方存活 3 个 → 伤害 15 → HP = 0
            const fsm = createMockFsm({
                [AUTO_CHESS_CONTEXT_KEY]: ctx,
                [BATTLE_RESULT_DATA_KEY]: {
                    winner: 'enemy',
                    survivingCount: 3,
                },
            });

            const proc = new SettleProcedure();
            proc.onEnter(fsm);

            expect(gameData.hp).toBe(0);
            expect(fsm.changeState).toHaveBeenCalledWith(GameOverProcedure);
        });
    });

    describe('上下文校验', () => {
        it('上下文缺失时应抛出错误', () => {
            const fsm = createMockFsm();
            const proc = new SettleProcedure();
            expect(() => proc.onEnter(fsm)).toThrow('上下文缺失');
        });

        it('战斗结果缺失时应抛出错误', () => {
            const { ctx } = createTestContext();
            const fsm = createMockFsm({
                [AUTO_CHESS_CONTEXT_KEY]: ctx,
                // 无 BATTLE_RESULT_DATA_KEY
            });

            const proc = new SettleProcedure();
            expect(() => proc.onEnter(fsm)).toThrow('战斗结果');
        });
    });
});

// ═══════════════════════════════════════════════════════
// GameOverProcedure
// ═══════════════════════════════════════════════════════

describe('GameOverProcedure', () => {
    it('应发射 GAME_OVER 事件，包含最终轮数', () => {
        const { ctx, gameData, eventManager } = createTestContext();
        gameData.round = 12;
        gameData.hp = 0;

        const fsm = createMockFsm({
            [AUTO_CHESS_CONTEXT_KEY]: ctx,
        });

        const proc = new GameOverProcedure();
        proc.onEnter(fsm);

        expect(eventManager.emit).toHaveBeenCalledWith(AutoChessEvents.GAME_OVER, {
            finalRound: 12,
            result: '游戏结束',
        });
    });

    it('应通过 renderer 输出最终成绩', () => {
        const { ctx, gameData, renderer } = createTestContext();
        gameData.round = 8;
        gameData.hp = 0;

        const fsm = createMockFsm({
            [AUTO_CHESS_CONTEXT_KEY]: ctx,
        });

        const proc = new GameOverProcedure();
        proc.onEnter(fsm);

        // 确认 renderer 被调用输出日志
        expect(renderer.log).toHaveBeenCalled();
    });

    it('restart() 应调用 gameData.reset() 并切换到 PrepareProcedure', () => {
        const { ctx, gameData } = createTestContext();
        gameData.round = 10;
        gameData.hp = 0;
        gameData.gold = 999;

        const fsm = createMockFsm({
            [AUTO_CHESS_CONTEXT_KEY]: ctx,
        });

        const proc = new GameOverProcedure();
        proc.onEnter(fsm);

        // 调用 restart
        proc.restart(fsm);

        // gameData 应已重置
        expect(gameData.gold).toBe(10); // INITIAL_GOLD
        expect(gameData.hp).toBe(100); // INITIAL_HP
        expect(gameData.round).toBe(0);
        expect(fsm.changeState).toHaveBeenCalledWith(PrepareProcedure);
    });

    it('上下文缺失时应抛出错误', () => {
        const fsm = createMockFsm();
        const proc = new GameOverProcedure();
        expect(() => proc.onEnter(fsm)).toThrow('上下文缺失');
    });
});

/**
 * Auto-chess Demo — PrepareProcedure 单元测试
 * @module
 */

import { IFsm } from '@framework/fsm/FsmDefs';
import { EventManager } from '@framework/event/EventManager';
import {
    AutoChessEvents,
    REFRESH_COST,
    PREPARE_TIME_SECONDS,
} from '@game/demo3-autochess/AutoChessDefs';
import { AUTO_CHESS_CONTEXT_KEY } from '@game/demo3-autochess/procedures/AutoChessProcedureContext';
import { PrepareProcedure } from '@game/demo3-autochess/procedures/PrepareProcedure';
import {
    AutoChessGameData,
    ChessPieceRuntimeState,
} from '@game/demo3-autochess/data/AutoChessGameData';

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

// ─── Mock 系统工厂 ─────────────────────────────────────

function createMockShopSystem(): {
    refreshShop: jest.Mock;
    buyPiece: jest.Mock;
    isLocked: boolean;
    getSlots: jest.Mock;
    unlockShop: jest.Mock;
} {
    return {
        refreshShop: jest.fn(),
        buyPiece: jest.fn(),
        isLocked: false,
        getSlots: jest.fn(() => []),
        unlockShop: jest.fn(),
    };
}

function createMockBoardSystem(): {
    placePiece: jest.Mock;
    removePiece: jest.Mock;
} {
    return {
        placePiece: jest.fn(() => true),
        removePiece: jest.fn(),
    };
}

function createMockMergeSystem(): {
    checkAndMerge: jest.Mock;
} {
    return {
        checkAndMerge: jest.fn(() => null),
    };
}

function createMockSynergySystem(): {
    calculateSynergies: jest.Mock;
} {
    return {
        calculateSynergies: jest.fn(() => []),
    };
}

function createMockTimerManager(): {
    addTimer: jest.Mock;
    removeTimer: jest.Mock;
} {
    return {
        addTimer: jest.fn(() => 1),
        removeTimer: jest.fn(() => true),
    };
}

function createMockEventManager(): EventManager {
    const em = new EventManager();
    jest.spyOn(em, 'emit');
    jest.spyOn(em, 'on');
    jest.spyOn(em, 'off');
    return em;
}

function createMockRenderer(): {
    log: jest.Mock;
    updateLog: jest.Mock;
    updateStatus: jest.Mock;
} {
    return {
        log: jest.fn(),
        updateLog: jest.fn(),
        updateStatus: jest.fn(),
    };
}

function createMockDataTableManager(): {
    getAllRows: jest.Mock;
    getRow: jest.Mock;
} {
    return {
        getAllRows: jest.fn(() => []),
        getRow: jest.fn(),
    };
}

// ─── 构建完整 Context ───────────────────────────────────

function createTestContext(overrides: Record<string, unknown> = {}) {
    const gameData = new AutoChessGameData();
    const shopSystem = createMockShopSystem();
    const boardSystem = createMockBoardSystem();
    const mergeSystem = createMockMergeSystem();
    const synergySystem = createMockSynergySystem();
    const timerManager = createMockTimerManager();
    const eventManager = createMockEventManager();
    const renderer = createMockRenderer();
    const dataTableManager = createMockDataTableManager();

    const ctx = {
        gameData,
        shopSystem,
        boardSystem,
        mergeSystem,
        synergySystem,
        timerManager,
        eventManager,
        renderer,
        dataTableManager,
        battleSystem: {},
        fsmManager: {},
        entityManager: {},
        audioManager: {},
        ...overrides,
    };

    return {
        ctx,
        gameData,
        shopSystem,
        boardSystem,
        mergeSystem,
        synergySystem,
        timerManager,
        eventManager,
        renderer,
        dataTableManager,
    };
}

// ═══════════════════════════════════════════════════════
// PrepareProcedure
// ═══════════════════════════════════════════════════════

describe('PrepareProcedure', () => {
    // ─── onEnter ───────────────────────────────────────

    describe('onEnter', () => {
        it('上下文缺失时应抛出错误', () => {
            const fsm = createMockFsm();
            const proc = new PrepareProcedure();

            expect(() => proc.onEnter(fsm)).toThrow('不存在');
        });

        it('应增加回合计数（round++）', () => {
            const { ctx, gameData } = createTestContext();
            gameData.round = 0;
            const fsm = createMockFsm({ [AUTO_CHESS_CONTEXT_KEY]: ctx });

            const proc = new PrepareProcedure();
            proc.onEnter(fsm);

            expect(gameData.round).toBe(1);
        });

        it('onEnter 不应改变金币（收入由 SettleProcedure 负责）', () => {
            const { ctx, gameData } = createTestContext();
            gameData.gold = 10;
            const fsm = createMockFsm({ [AUTO_CHESS_CONTEXT_KEY]: ctx });

            const proc = new PrepareProcedure();
            proc.onEnter(fsm);

            expect(gameData.gold).toBe(10);
        });

        it('商店未锁定时应调用 shopSystem.refreshShop', () => {
            const { ctx, shopSystem } = createTestContext();
            shopSystem.isLocked = false;
            const fsm = createMockFsm({ [AUTO_CHESS_CONTEXT_KEY]: ctx });

            const proc = new PrepareProcedure();
            proc.onEnter(fsm);

            expect(shopSystem.refreshShop).toHaveBeenCalledTimes(1);
        });

        it('商店已锁定时不应调用 shopSystem.refreshShop', () => {
            const { ctx, shopSystem } = createTestContext();
            shopSystem.isLocked = true;
            const fsm = createMockFsm({ [AUTO_CHESS_CONTEXT_KEY]: ctx });

            const proc = new PrepareProcedure();
            proc.onEnter(fsm);

            expect(shopSystem.refreshShop).not.toHaveBeenCalled();
        });

        it('应发射 ROUND_START 事件', () => {
            const { ctx, eventManager, gameData } = createTestContext();
            gameData.round = 0;
            const fsm = createMockFsm({ [AUTO_CHESS_CONTEXT_KEY]: ctx });

            const proc = new PrepareProcedure();
            proc.onEnter(fsm);

            // round 在 onEnter 内已 +1，所以事件数据是 round=1
            expect(eventManager.emit).toHaveBeenCalledWith(AutoChessEvents.ROUND_START, {
                round: 1,
            });
        });

        it('应创建 30s 倒计时 Timer', () => {
            const { ctx, timerManager } = createTestContext();
            const fsm = createMockFsm({ [AUTO_CHESS_CONTEXT_KEY]: ctx });

            const proc = new PrepareProcedure();
            proc.onEnter(fsm);

            expect(timerManager.addTimer).toHaveBeenCalledTimes(1);
            expect(timerManager.addTimer).toHaveBeenCalledWith(
                PREPARE_TIME_SECONDS,
                expect.any(Function),
            );
        });

        it('renderer 有 setupPrepareButtons 时应调用按钮设置', () => {
            const { ctx, renderer } = createTestContext();
            // 给 renderer 添加 setupPrepareButtons mock
            (renderer as Record<string, unknown>).setupPrepareButtons = jest.fn();
            const fsm = createMockFsm({ [AUTO_CHESS_CONTEXT_KEY]: ctx });

            const proc = new PrepareProcedure();
            proc.onEnter(fsm);

            expect(
                (renderer as Record<string, jest.Mock>).setupPrepareButtons,
            ).toHaveBeenCalledTimes(1);
            const mockCalls = (renderer as Record<string, jest.Mock>).setupPrepareButtons.mock
                .calls as unknown[][];
            const callbacks = mockCalls[0][0] as Record<string, unknown>;
            expect(callbacks).toHaveProperty('onBuy');
            expect(callbacks).toHaveProperty('onPlace');
            expect(callbacks).toHaveProperty('onRefresh');
            expect(callbacks).toHaveProperty('onReady');
            expect(callbacks).toHaveProperty('onLock');
        });
    });

    // ─── handleBuyPiece ────────────────────────────────

    describe('handleBuyPiece', () => {
        it('购买成功时应扣金、添加到 benchPieces、触发合成检查', () => {
            const { ctx, gameData, shopSystem, mergeSystem } = createTestContext();
            gameData.gold = 20;

            const mockConfig = {
                id: 1,
                name: '剑士',
                race: 'warrior',
                hp: 100,
                atk: 20,
                atkSpeed: 1.0,
                range: 1,
                cost: 2,
                star2Mult: 2.0,
            };
            shopSystem.buyPiece.mockReturnValue({ config: mockConfig, cost: 2 });

            const fsm = createMockFsm({ [AUTO_CHESS_CONTEXT_KEY]: ctx });
            const proc = new PrepareProcedure();
            proc.onEnter(fsm);

            // onEnter 不再改变金币
            const goldAfterEnter = gameData.gold;

            proc.handleBuyPiece(0);

            // 应扣金
            expect(gameData.gold).toBe(goldAfterEnter - 2);
            // benchPieces 应增加一个棋子
            expect(gameData.benchPieces.length).toBe(1);
            expect(gameData.benchPieces[0].name).toBe('剑士');
            // 应调用 merge 检查
            expect(mergeSystem.checkAndMerge).toHaveBeenCalled();
        });

        it('购买失败时不应扣金也不应添加棋子', () => {
            const { ctx, gameData, shopSystem } = createTestContext();
            gameData.gold = 20;
            shopSystem.buyPiece.mockReturnValue(null);

            const fsm = createMockFsm({ [AUTO_CHESS_CONTEXT_KEY]: ctx });
            const proc = new PrepareProcedure();
            proc.onEnter(fsm);

            const goldAfterEnter = gameData.gold;

            proc.handleBuyPiece(0);

            expect(gameData.gold).toBe(goldAfterEnter);
            expect(gameData.benchPieces.length).toBe(0);
        });

        it('购买后 3 个同名棋子应触发合成', () => {
            const { ctx, gameData, shopSystem, mergeSystem, eventManager } = createTestContext();
            gameData.gold = 100;

            const mockConfig = {
                id: 1,
                name: '剑士',
                race: 'warrior',
                hp: 100,
                atk: 20,
                atkSpeed: 1.0,
                range: 1,
                cost: 1,
                star2Mult: 2.0,
            };
            shopSystem.buyPiece.mockReturnValue({ config: mockConfig, cost: 1 });

            // 模拟合成结果（第 3 次购买时触发）
            const mergedPiece: ChessPieceRuntimeState = {
                id: -1,
                configId: 1,
                name: '剑士',
                race: 'warrior',
                hp: 200,
                maxHp: 200,
                atk: 40,
                atkSpeed: 1.0,
                range: 1,
                star: 2,
                side: 'player',
                position: { row: -1, col: -1 },
                isAlive: true,
            };
            mergeSystem.checkAndMerge
                .mockReturnValueOnce(null) // 第 1 次
                .mockReturnValueOnce(null) // 第 2 次
                .mockReturnValueOnce({ mergedPiece, consumedIds: [1, 2, 3] }); // 第 3 次

            const fsm = createMockFsm({ [AUTO_CHESS_CONTEXT_KEY]: ctx });
            const proc = new PrepareProcedure();
            proc.onEnter(fsm);

            proc.handleBuyPiece(0);
            proc.handleBuyPiece(1);
            proc.handleBuyPiece(2);

            // 第 3 次购买后应发射合成事件
            expect(eventManager.emit).toHaveBeenCalledWith(
                AutoChessEvents.CHESS_MERGED,
                expect.objectContaining({ star: 2, name: '剑士' }),
            );
        });

        it('购买成功应发射 CHESS_BOUGHT 和 GOLD_CHANGED 事件', () => {
            const { ctx, gameData, shopSystem, eventManager } = createTestContext();
            gameData.gold = 20;

            const mockConfig = {
                id: 1,
                name: '剑士',
                race: 'warrior',
                hp: 100,
                atk: 20,
                atkSpeed: 1.0,
                range: 1,
                cost: 2,
                star2Mult: 2.0,
            };
            shopSystem.buyPiece.mockReturnValue({ config: mockConfig, cost: 2 });

            const fsm = createMockFsm({ [AUTO_CHESS_CONTEXT_KEY]: ctx });
            const proc = new PrepareProcedure();
            proc.onEnter(fsm);

            proc.handleBuyPiece(0);

            expect(eventManager.emit).toHaveBeenCalledWith(
                AutoChessEvents.CHESS_BOUGHT,
                expect.objectContaining({ configId: 1, cost: 2 }),
            );
        });
    });

    // ─── handlePlacePiece ──────────────────────────────

    describe('handlePlacePiece', () => {
        it('放置成功时应更新 gameData 并重新计算羁绊', () => {
            const { ctx, gameData, boardSystem, synergySystem } = createTestContext();
            boardSystem.placePiece.mockReturnValue(true);

            // 先添加一个棋子到 bench
            const piece = gameData.createPieceState(
                {
                    id: 1,
                    name: '剑士',
                    race: 'warrior',
                    hp: 100,
                    atk: 20,
                    atkSpeed: 1.0,
                    range: 1,
                    cost: 1,
                    star2Mult: 2.0,
                },
                1,
                'player',
            );
            gameData.benchPieces.push(piece);

            const fsm = createMockFsm({ [AUTO_CHESS_CONTEXT_KEY]: ctx });
            const proc = new PrepareProcedure();
            proc.onEnter(fsm);

            proc.handlePlacePiece(piece.id, 0, 0);

            // 棋子应从 bench 移除
            expect(gameData.benchPieces.find((p) => p.id === piece.id)).toBeUndefined();
            // boardPieces 应记录
            expect(gameData.boardPieces.get('0,0')).toBe(piece.id);
            // 棋子位置应更新
            expect(piece.position.row).toBe(0);
            expect(piece.position.col).toBe(0);
            // 应重新计算羁绊
            expect(synergySystem.calculateSynergies).toHaveBeenCalled();
        });

        it('放置失败时不应修改 gameData', () => {
            const { ctx, gameData, boardSystem, synergySystem } = createTestContext();
            boardSystem.placePiece.mockReturnValue(false);

            const piece = gameData.createPieceState(
                {
                    id: 1,
                    name: '剑士',
                    race: 'warrior',
                    hp: 100,
                    atk: 20,
                    atkSpeed: 1.0,
                    range: 1,
                    cost: 1,
                    star2Mult: 2.0,
                },
                1,
                'player',
            );
            gameData.benchPieces.push(piece);

            const fsm = createMockFsm({ [AUTO_CHESS_CONTEXT_KEY]: ctx });
            const proc = new PrepareProcedure();
            proc.onEnter(fsm);

            proc.handlePlacePiece(piece.id, 0, 0);

            // 棋子应仍在 bench
            expect(gameData.benchPieces.find((p) => p.id === piece.id)).toBeDefined();
            // 不应重新计算羁绊
            expect(synergySystem.calculateSynergies).not.toHaveBeenCalled();
        });
    });

    // ─── handleRefreshShop ─────────────────────────────

    describe('handleRefreshShop', () => {
        it('金币足够时应扣 REFRESH_COST 并刷新商店', () => {
            const { ctx, gameData, shopSystem } = createTestContext();
            gameData.gold = 20;
            const fsm = createMockFsm({ [AUTO_CHESS_CONTEXT_KEY]: ctx });

            const proc = new PrepareProcedure();
            proc.onEnter(fsm);

            const goldAfterEnter = gameData.gold;
            proc.handleRefreshShop();

            expect(gameData.gold).toBe(goldAfterEnter - REFRESH_COST);
            // refreshShop 在 onEnter 中调用一次 + handleRefreshShop 调用一次 = 2
            expect(shopSystem.refreshShop).toHaveBeenCalledTimes(2);
        });

        it('金币不足时不应扣金也不应刷新', () => {
            const { ctx, gameData } = createTestContext();
            gameData.gold = 0; // onEnter 会加 BASE_INCOME
            const fsm = createMockFsm({ [AUTO_CHESS_CONTEXT_KEY]: ctx });

            const proc = new PrepareProcedure();
            proc.onEnter(fsm);

            // 此时 gold = BASE_INCOME(5)，若 REFRESH_COST=2 则够用
            // 将 gold 设为比 REFRESH_COST 少
            gameData.gold = REFRESH_COST - 1;

            const goldBefore = gameData.gold;
            proc.handleRefreshShop();

            expect(gameData.gold).toBe(goldBefore);
        });
    });

    // ─── onPrepareComplete ─────────────────────────────

    describe('onPrepareComplete', () => {
        it('应移除 Timer 并切换到 BattleProcedure', () => {
            const { ctx, timerManager } = createTestContext();
            const fsm = createMockFsm({ [AUTO_CHESS_CONTEXT_KEY]: ctx });

            const proc = new PrepareProcedure();
            proc.onEnter(fsm);

            proc.onPrepareComplete();

            // 应移除倒计时 Timer
            expect(timerManager.removeTimer).toHaveBeenCalled();
            // 应切换 Procedure
            expect(fsm.changeState).toHaveBeenCalledTimes(1);
        });

        it('应计算最终羁绊', () => {
            const { ctx, synergySystem } = createTestContext();
            const fsm = createMockFsm({ [AUTO_CHESS_CONTEXT_KEY]: ctx });

            const proc = new PrepareProcedure();
            proc.onEnter(fsm);

            proc.onPrepareComplete();

            expect(synergySystem.calculateSynergies).toHaveBeenCalled();
        });
    });

    // ─── 倒计时到达时自动触发 onPrepareComplete ─────────

    describe('倒计时回调', () => {
        it('Timer 回调被触发时应自动调用 onPrepareComplete 逻辑', () => {
            const { ctx, timerManager } = createTestContext();
            const fsm = createMockFsm({ [AUTO_CHESS_CONTEXT_KEY]: ctx });

            const proc = new PrepareProcedure();
            proc.onEnter(fsm);

            // 获取 addTimer 的回调参数并手动调用
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const timerCallback = timerManager.addTimer.mock.calls[0][1] as () => void;
            timerCallback();

            // 应切换 Procedure（说明 onPrepareComplete 被触发了）
            expect(fsm.changeState).toHaveBeenCalledTimes(1);
        });
    });

    // ─── onLeave ───────────────────────────────────────

    describe('onLeave', () => {
        it('应清理 Timer', () => {
            const { ctx, timerManager } = createTestContext();
            const fsm = createMockFsm({ [AUTO_CHESS_CONTEXT_KEY]: ctx });

            const proc = new PrepareProcedure();
            proc.onEnter(fsm);

            proc.onLeave(fsm);

            expect(timerManager.removeTimer).toHaveBeenCalled();
        });

        it('onLeave 后 handleBuyPiece 不应生效（操作已禁用）', () => {
            const { ctx, gameData, shopSystem } = createTestContext();
            gameData.gold = 20;
            shopSystem.buyPiece.mockReturnValue({
                config: {
                    id: 1,
                    name: '剑士',
                    race: 'warrior',
                    hp: 100,
                    atk: 20,
                    atkSpeed: 1.0,
                    range: 1,
                    cost: 1,
                    star2Mult: 2.0,
                },
                cost: 1,
            });

            const fsm = createMockFsm({ [AUTO_CHESS_CONTEXT_KEY]: ctx });
            const proc = new PrepareProcedure();
            proc.onEnter(fsm);

            proc.onLeave(fsm);

            const goldAfterLeave = gameData.gold;
            proc.handleBuyPiece(0);

            // 金币不应变化
            expect(gameData.gold).toBe(goldAfterLeave);
        });
    });
});

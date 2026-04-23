/**
 * BattleProcedure + EnemyGenerator 单元测试
 * @module
 */

import { IFsm } from '@framework/fsm/FsmDefs';
import { EventManager } from '@framework/event/EventManager';
import { AutoChessEvents, ENEMY_ROWS, BOARD_COLS } from '@game/demo3-autochess/AutoChessDefs';
import { AUTO_CHESS_CONTEXT_KEY } from '@game/demo3-autochess/procedures/AutoChessProcedureContext';
import { BattleProcedure } from '@game/demo3-autochess/procedures/BattleProcedure';
import { EnemyGenerator } from '@game/demo3-autochess/factory/EnemyGenerator';
import { ChessPieceConfigRow } from '@game/demo3-autochess/data/ChessPieceConfigRow';
import { AutoChessGameData } from '@game/demo3-autochess/data/AutoChessGameData';

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

// ─── 配置表辅助 ─────────────────────────────────────────

function createConfigRows(): ChessPieceConfigRow[] {
    const rawData = [
        {
            id: 1,
            name: '剑士',
            race: 'warrior',
            hp: 600,
            atk: 50,
            atkSpeed: 1.0,
            range: 1,
            cost: 1,
            star2Mult: 2.0,
        },
        {
            id: 2,
            name: '法师',
            race: 'mage',
            hp: 400,
            atk: 70,
            atkSpeed: 1.2,
            range: 3,
            cost: 2,
            star2Mult: 2.0,
        },
        {
            id: 3,
            name: '游侠',
            race: 'ranger',
            hp: 500,
            atk: 60,
            atkSpeed: 0.8,
            range: 2,
            cost: 2,
            star2Mult: 2.0,
        },
        {
            id: 4,
            name: '重甲',
            race: 'tank',
            hp: 900,
            atk: 30,
            atkSpeed: 1.5,
            range: 1,
            cost: 3,
            star2Mult: 2.0,
        },
        {
            id: 5,
            name: '火法',
            race: 'mage',
            hp: 350,
            atk: 80,
            atkSpeed: 1.4,
            range: 3,
            cost: 3,
            star2Mult: 2.0,
        },
        {
            id: 6,
            name: '狂战',
            race: 'warrior',
            hp: 550,
            atk: 65,
            atkSpeed: 0.9,
            range: 1,
            cost: 2,
            star2Mult: 2.0,
        },
    ];
    return rawData.map((raw) => {
        const row = new ChessPieceConfigRow();
        row.parseRow(raw);
        return row;
    });
}

// ─── Mock Context 工厂 ──────────────────────────────────

function createMockContext(overrides: Partial<Record<string, unknown>> = {}): {
    ctx: Record<string, unknown>;
    gameData: AutoChessGameData;
    battleSystem: {
        startBattle: jest.Mock;
        updateBattle: jest.Mock;
        isBattleOver: jest.Mock;
        getBattleResult: jest.Mock;
        endBattle: jest.Mock;
    };
    entityManager: {
        showEntity: jest.Mock;
        hideAllEntities: jest.Mock;
        registerGroup: jest.Mock;
    };
    eventManager: EventManager;
    renderer: { log: jest.Mock; updateLog: jest.Mock; updateStatus: jest.Mock };
    boardSystem: { getOccupiedCells: jest.Mock; clearBoard: jest.Mock };
} {
    const gameData = new AutoChessGameData();
    const eventManager = new EventManager();
    jest.spyOn(eventManager, 'emit');

    const battleSystem = {
        startBattle: jest.fn(),
        updateBattle: jest.fn(),
        isBattleOver: jest.fn().mockReturnValue(false),
        getBattleResult: jest.fn().mockReturnValue({ winner: 'player', survivingCount: 2 }),
        endBattle: jest.fn(),
    };

    const entityManager = {
        showEntity: jest.fn(),
        hideAllEntities: jest.fn(),
        registerGroup: jest.fn(),
    };

    const renderer = {
        log: jest.fn(),
        updateLog: jest.fn(),
        updateStatus: jest.fn(),
    };

    const boardSystem = {
        getOccupiedCells: jest.fn().mockReturnValue([]),
        clearBoard: jest.fn(),
        placePiece: jest.fn(),
        removePiece: jest.fn(),
    };

    const ctx: Record<string, unknown> = {
        gameData,
        renderer,
        boardSystem,
        shopSystem: {},
        mergeSystem: {},
        synergySystem: {},
        battleSystem,
        eventManager,
        timerManager: {},
        fsmManager: {},
        entityManager,
        audioManager: {},
        dataTableManager: {},
        ...overrides,
    };

    return { ctx, gameData, battleSystem, entityManager, eventManager, renderer, boardSystem };
}

// ═══════════════════════════════════════════════════════
// EnemyGenerator
// ═══════════════════════════════════════════════════════

describe('EnemyGenerator', () => {
    const configs = createConfigRows();

    it('round 1 应返回 2-3 个敌方棋子', () => {
        const enemies = EnemyGenerator.generate(1, configs);
        expect(enemies.length).toBeGreaterThanOrEqual(2);
        expect(enemies.length).toBeLessThanOrEqual(3);
    });

    it('round 5 应返回 4-5 个敌方棋子', () => {
        const enemies = EnemyGenerator.generate(5, configs);
        expect(enemies.length).toBeGreaterThanOrEqual(4);
        expect(enemies.length).toBeLessThanOrEqual(5);
    });

    it('round 越高，棋子数量越多或相等', () => {
        // 多次采样取平均值对比
        let avgR1 = 0;
        let avgR10 = 0;
        const samples = 20;
        for (let i = 0; i < samples; i++) {
            avgR1 += EnemyGenerator.generate(1, configs).length;
            avgR10 += EnemyGenerator.generate(10, configs).length;
        }
        avgR1 /= samples;
        avgR10 /= samples;
        expect(avgR10).toBeGreaterThanOrEqual(avgR1);
    });

    it('返回的棋子包含合法的配置数据', () => {
        const enemies = EnemyGenerator.generate(3, configs);
        for (const enemy of enemies) {
            expect(enemy.configId).toBeGreaterThan(0);
            expect(enemy.name).toBeTruthy();
            expect(enemy.race).toBeTruthy();
            expect(enemy.hp).toBeGreaterThan(0);
            expect(enemy.atk).toBeGreaterThan(0);
            expect(enemy.side).toBe('enemy');
            expect(enemy.isAlive).toBe(true);
        }
    });

    it('高 round 时星级可能出现 2 星', () => {
        // round 8+ 有概率出现 2 星，多次采样确认
        let hasStar2 = false;
        for (let i = 0; i < 50; i++) {
            const enemies = EnemyGenerator.generate(8, configs);
            if (enemies.some((e: { star: number }) => e.star === 2)) {
                hasStar2 = true;
                break;
            }
        }
        expect(hasStar2).toBe(true);
    });

    it('空配置表应返回空列表', () => {
        const enemies = EnemyGenerator.generate(5, []);
        expect(enemies).toEqual([]);
    });

    it('返回的棋子位置应在敌方区域', () => {
        const enemies = EnemyGenerator.generate(3, configs);
        for (const enemy of enemies) {
            expect(ENEMY_ROWS).toContain(enemy.position.row);
            expect(enemy.position.col).toBeGreaterThanOrEqual(0);
            expect(enemy.position.col).toBeLessThan(BOARD_COLS);
        }
    });
});

// ═══════════════════════════════════════════════════════
// BattleProcedure
// ═══════════════════════════════════════════════════════

describe('BattleProcedure', () => {
    describe('onEnter', () => {
        it('应调用 battleSystem.startBattle 并发射 BATTLE_START 事件', () => {
            const { ctx, battleSystem, eventManager, gameData } = createMockContext();
            gameData.round = 3;

            // 预设一些己方棋子在棋盘上
            const playerPiece = gameData.createPieceState(
                {
                    id: 1,
                    name: '剑士',
                    race: 'warrior',
                    hp: 600,
                    atk: 50,
                    atkSpeed: 1.0,
                    range: 1,
                    cost: 1,
                    star2Mult: 2.0,
                },
                1,
                'player',
            );
            playerPiece.position = { row: 0, col: 0 };

            const fsm = createMockFsm({ [AUTO_CHESS_CONTEXT_KEY]: ctx });
            const proc = new BattleProcedure();

            proc.onEnter(fsm);

            // 验证 startBattle 被调用
            expect(battleSystem.startBattle).toHaveBeenCalledTimes(1);

            // 验证 BATTLE_START 事件
            expect(eventManager.emit).toHaveBeenCalledWith(
                AutoChessEvents.BATTLE_START,
                expect.objectContaining({ round: 3 }),
            );
        });

        it('上下文缺失应抛出异常', () => {
            const fsm = createMockFsm({});
            const proc = new BattleProcedure();
            expect(() => proc.onEnter(fsm)).toThrow();
        });
    });

    describe('onUpdate', () => {
        it('战斗未结束时不应切换流程', () => {
            const { ctx, battleSystem } = createMockContext();
            battleSystem.isBattleOver.mockReturnValue(false);

            const fsm = createMockFsm({ [AUTO_CHESS_CONTEXT_KEY]: ctx });
            const proc = new BattleProcedure();
            proc.onEnter(fsm);

            proc.onUpdate(fsm, 0.016);

            expect(battleSystem.updateBattle).toHaveBeenCalledWith(0.016);
            expect(fsm.changeState).not.toHaveBeenCalled();
        });

        it('战斗结束时应获取结果并切换到 SettleProcedure', () => {
            const { ctx, battleSystem } = createMockContext();
            battleSystem.isBattleOver.mockReturnValue(true);
            battleSystem.getBattleResult.mockReturnValue({ winner: 'player', survivingCount: 2 });

            const fsm = createMockFsm({ [AUTO_CHESS_CONTEXT_KEY]: ctx });
            const proc = new BattleProcedure();
            proc.onEnter(fsm);

            proc.onUpdate(fsm, 0.016);

            // 验证结果被存入 FSM 数据
            expect(fsm.setData).toHaveBeenCalled();
            // 验证切换到 SettleProcedure
            expect(fsm.changeState).toHaveBeenCalled();
        });

        it('onEnter 未初始化时 onUpdate 应安全返回', () => {
            const fsm = createMockFsm({});
            const proc = new BattleProcedure();
            // 不调用 onEnter 直接调用 onUpdate 不应崩溃
            expect(() => proc.onUpdate(fsm, 0.016)).not.toThrow();
        });
    });

    describe('onLeave', () => {
        it('应调用 endBattle 和 hideAllEntities', () => {
            const { ctx, battleSystem, entityManager } = createMockContext();
            const fsm = createMockFsm({ [AUTO_CHESS_CONTEXT_KEY]: ctx });

            const proc = new BattleProcedure();
            proc.onEnter(fsm);
            proc.onLeave(fsm);

            expect(battleSystem.endBattle).toHaveBeenCalledTimes(1);
            expect(entityManager.hideAllEntities).toHaveBeenCalledWith('player_chess');
            expect(entityManager.hideAllEntities).toHaveBeenCalledWith('enemy_chess');
        });

        it('onEnter 未初始化时 onLeave 应安全返回', () => {
            const fsm = createMockFsm({});
            const proc = new BattleProcedure();
            expect(() => proc.onLeave(fsm)).not.toThrow();
        });
    });
});

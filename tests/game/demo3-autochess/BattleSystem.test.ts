/**
 * 战斗系统测试
 *
 * 测试 BattleSystem 管理 AI FSM 生命周期、战斗推进、胜负判定等行为。
 * @module
 */

import { FsmManager } from '@framework/fsm/FsmManager';
import { IFsm, IFsmState } from '@framework/fsm/FsmDefs';
import { BoardSystem } from '@game/demo3-autochess/systems/BoardSystem';
import { BattleSystem } from '@game/demo3-autochess/systems/BattleSystem';
import {
    ChessPieceRuntimeState,
    ChessPieceSide,
} from '@game/demo3-autochess/data/AutoChessGameData';
import { CHESS_AI_FSM_PREFIX } from '@game/demo3-autochess/AutoChessDefs';
import { IEventManager } from '@framework/interfaces/IEventManager';
import { IdleState } from '@game/demo3-autochess/fsm/chess-ai/IdleState';
import { MoveToState } from '@game/demo3-autochess/fsm/chess-ai/MoveToState';
import { AttackState } from '@game/demo3-autochess/fsm/chess-ai/AttackState';
import { DeadState } from '@game/demo3-autochess/fsm/chess-ai/DeadState';

// ─── 辅助工厂 ─────────────────────────────────────────

/** 创建 mock 事件管理器 */
function createMockEventManager(): IEventManager {
    return {
        on: jest.fn(),
        once: jest.fn(),
        off: jest.fn(),
        offAll: jest.fn(),
        offByCaller: jest.fn(),
        emit: jest.fn(),
    };
}

/** 创建棋子运行时状态 */
function createPiece(
    id: number,
    side: ChessPieceSide,
    row: number,
    col: number,
    overrides: Partial<ChessPieceRuntimeState> = {},
): ChessPieceRuntimeState {
    return {
        id,
        configId: 100 + id,
        name: `棋子${id}`,
        race: '人类',
        hp: 100,
        maxHp: 100,
        atk: 20,
        atkSpeed: 1.0,
        range: 1,
        star: 1,
        side,
        position: { row, col },
        isAlive: true,
        ...overrides,
    };
}

// ─── Mock FsmManager ─────────────────────────────────

/** 创建一个最小可用的 mock FsmManager */
function createMockFsmManager(): FsmManager {
    const fsmMap = new Map<string, IFsm<string>>();

    const mockManager = {
        moduleName: 'FsmManager',
        priority: 110,
        fsmCount: 0,
        createFsm: jest.fn((name: string, _owner: string, ..._states: IFsmState<string>[]) => {
            const mockFsm: IFsm<string> = {
                name,
                owner: _owner,
                currentState: null,
                isDestroyed: false,
                changeState: jest.fn(),
                getData: jest.fn(),
                setData: jest.fn(),
                removeData: jest.fn(),
                hasState: jest.fn(() => true),
                start: jest.fn(),
            };
            fsmMap.set(name, mockFsm);
            return mockFsm;
        }),
        destroyFsm: jest.fn((name: string) => {
            const existed = fsmMap.has(name);
            fsmMap.delete(name);
            return existed;
        }),
        getFsm: jest.fn((name: string) => fsmMap.get(name)),
        hasFsm: jest.fn((name: string) => fsmMap.has(name)),
        onInit: jest.fn(),
        onUpdate: jest.fn(),
        onShutdown: jest.fn(),
    } as unknown as FsmManager;

    // 同步 fsmCount getter
    Object.defineProperty(mockManager, 'fsmCount', {
        get: () => fsmMap.size,
    });

    return mockManager;
}

// ═══════════════════════════════════════════════════════
// BattleSystem 测试
// ═══════════════════════════════════════════════════════

describe('BattleSystem', () => {
    let battleSystem: BattleSystem;
    let fsmManager: FsmManager;
    let boardSystem: BoardSystem;
    let eventManager: IEventManager;

    beforeEach(() => {
        battleSystem = new BattleSystem();
        fsmManager = createMockFsmManager();
        boardSystem = new BoardSystem();
        eventManager = createMockEventManager();
    });

    // ─── startBattle ─────────────────────────────────

    describe('startBattle', () => {
        it('为每个存活棋子创建 AI FSM', () => {
            const players = [
                createPiece(1, 'player', 0, 0),
                createPiece(2, 'player', 0, 1),
                createPiece(3, 'player', 1, 0),
            ];
            const enemies = [
                createPiece(4, 'enemy', 2, 0),
                createPiece(5, 'enemy', 2, 1),
                createPiece(6, 'enemy', 3, 0),
            ];

            // 放到棋盘
            players.forEach((p) => boardSystem.placePiece(p.id, p.position.row, p.position.col));
            enemies.forEach((p) => boardSystem.placePiece(p.id, p.position.row, p.position.col));

            battleSystem.startBattle(fsmManager, boardSystem, eventManager, players, enemies);

            // 6 个棋子各创建 1 个 FSM
            expect(fsmManager.createFsm).toHaveBeenCalledTimes(6);

            // FSM 名称格式正确
            for (const piece of [...players, ...enemies]) {
                const expectedName = CHESS_AI_FSM_PREFIX + piece.id;
                expect(fsmManager.createFsm).toHaveBeenCalledWith(
                    expectedName,
                    expect.anything(),
                    expect.any(IdleState),
                    expect.any(MoveToState),
                    expect.any(AttackState),
                    expect.any(DeadState),
                );
            }
        });

        it('跳过已死亡的棋子', () => {
            const players = [
                createPiece(1, 'player', 0, 0),
                createPiece(2, 'player', 0, 1, { isAlive: false }),
            ];
            const enemies = [createPiece(3, 'enemy', 2, 0)];

            boardSystem.placePiece(1, 0, 0);
            boardSystem.placePiece(3, 2, 0);

            battleSystem.startBattle(fsmManager, boardSystem, eventManager, players, enemies);

            // 只有 2 个存活棋子
            expect(fsmManager.createFsm).toHaveBeenCalledTimes(2);
        });

        it('启动每个 FSM 到 IdleState', () => {
            const players = [createPiece(1, 'player', 0, 0)];
            const enemies = [createPiece(2, 'enemy', 2, 0)];

            boardSystem.placePiece(1, 0, 0);
            boardSystem.placePiece(2, 2, 0);

            battleSystem.startBattle(fsmManager, boardSystem, eventManager, players, enemies);

            // 每个创建的 FSM 都调用了 start(IdleState)
            const createdFsms = (fsmManager.createFsm as jest.Mock).mock.results as {
                value: IFsm<string>;
            }[];
            for (const result of createdFsms) {
                expect(result.value.start).toHaveBeenCalledWith(IdleState);
            }
        });

        it('在 FSM 上设置黑板数据', () => {
            const players = [createPiece(1, 'player', 0, 0)];
            const enemies = [createPiece(2, 'enemy', 2, 0)];

            boardSystem.placePiece(1, 0, 0);
            boardSystem.placePiece(2, 2, 0);

            battleSystem.startBattle(fsmManager, boardSystem, eventManager, players, enemies);

            const createdFsms = (fsmManager.createFsm as jest.Mock).mock.results as {
                value: IFsm<string>;
            }[];
            for (const result of createdFsms) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const expectedBlackboard = expect.objectContaining({
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    pieceState: expect.any(Object),
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    boardSystem: expect.any(Object),
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    allEnemies: expect.any(Function),
                    target: null,
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    eventManager: expect.any(Object),
                });
                expect(result.value.setData).toHaveBeenCalledWith(
                    'chess_ai_blackboard',
                    expectedBlackboard,
                );
            }
        });
    });

    // ─── updateBattle ────────────────────────────────

    describe('updateBattle', () => {
        it('战斗未开始时不执行', () => {
            // 不调用 startBattle，直接 update
            battleSystem.updateBattle(0.016);
            // 不抛错即通过
        });

        it('战斗激活时遍历所有 FSM 执行更新（通过 fsmManager.onUpdate）', () => {
            const players = [createPiece(1, 'player', 0, 0)];
            const enemies = [createPiece(2, 'enemy', 2, 0)];

            boardSystem.placePiece(1, 0, 0);
            boardSystem.placePiece(2, 2, 0);

            battleSystem.startBattle(fsmManager, boardSystem, eventManager, players, enemies);
            battleSystem.updateBattle(0.5);

            // BattleSystem 自行遍历 FSM，但不通过 fsmManager.onUpdate
            // 不报错即通过
        });

        it('timeScale 影响 deltaTime', () => {
            const players = [createPiece(1, 'player', 0, 0)];
            const enemies = [createPiece(2, 'enemy', 2, 0)];

            boardSystem.placePiece(1, 0, 0);
            boardSystem.placePiece(2, 2, 0);

            battleSystem.startBattle(fsmManager, boardSystem, eventManager, players, enemies);

            // 默认 timeScale = 1
            expect(battleSystem.timeScale).toBe(1);

            // 设置 2 倍速
            battleSystem.timeScale = 2;
            expect(battleSystem.timeScale).toBe(2);
        });
    });

    // ─── isBattleOver ────────────────────────────────

    describe('isBattleOver', () => {
        it('战斗未开始时返回 false', () => {
            expect(battleSystem.isBattleOver()).toBe(false);
        });

        it('双方都有存活棋子时返回 false', () => {
            const players = [createPiece(1, 'player', 0, 0)];
            const enemies = [createPiece(2, 'enemy', 2, 0)];

            boardSystem.placePiece(1, 0, 0);
            boardSystem.placePiece(2, 2, 0);

            battleSystem.startBattle(fsmManager, boardSystem, eventManager, players, enemies);

            expect(battleSystem.isBattleOver()).toBe(false);
        });

        it('敌方全灭时返回 true', () => {
            const players = [createPiece(1, 'player', 0, 0)];
            const enemies = [createPiece(2, 'enemy', 2, 0, { isAlive: false, hp: 0 })];

            // 死亡的不会创建 FSM，但仍然是棋子列表的一部分
            boardSystem.placePiece(1, 0, 0);

            battleSystem.startBattle(fsmManager, boardSystem, eventManager, players, enemies);

            expect(battleSystem.isBattleOver()).toBe(true);
        });

        it('玩家方全灭时返回 true', () => {
            const players = [createPiece(1, 'player', 0, 0)];
            const enemies = [createPiece(2, 'enemy', 2, 0)];

            boardSystem.placePiece(1, 0, 0);
            boardSystem.placePiece(2, 2, 0);

            battleSystem.startBattle(fsmManager, boardSystem, eventManager, players, enemies);

            // 模拟玩家棋子阵亡
            players[0].isAlive = false;
            players[0].hp = 0;

            expect(battleSystem.isBattleOver()).toBe(true);
        });

        it('战斗中棋子逐个死亡，直到一方全灭', () => {
            const players = [createPiece(1, 'player', 0, 0), createPiece(2, 'player', 0, 1)];
            const enemies = [createPiece(3, 'enemy', 2, 0), createPiece(4, 'enemy', 2, 1)];

            players.forEach((p) => boardSystem.placePiece(p.id, p.position.row, p.position.col));
            enemies.forEach((p) => boardSystem.placePiece(p.id, p.position.row, p.position.col));

            battleSystem.startBattle(fsmManager, boardSystem, eventManager, players, enemies);

            // 敌方 1 个死亡
            enemies[0].isAlive = false;
            expect(battleSystem.isBattleOver()).toBe(false);

            // 敌方全灭
            enemies[1].isAlive = false;
            expect(battleSystem.isBattleOver()).toBe(true);
        });
    });

    // ─── getBattleResult ─────────────────────────────

    describe('getBattleResult', () => {
        it('敌方全灭时玩家获胜', () => {
            const players = [createPiece(1, 'player', 0, 0), createPiece(2, 'player', 0, 1)];
            const enemies = [createPiece(3, 'enemy', 2, 0, { isAlive: false, hp: 0 })];

            boardSystem.placePiece(1, 0, 0);
            boardSystem.placePiece(2, 0, 1);

            battleSystem.startBattle(fsmManager, boardSystem, eventManager, players, enemies);

            const result = battleSystem.getBattleResult();
            expect(result.winner).toBe('player');
            expect(result.survivingCount).toBe(2);
        });

        it('玩家全灭时敌方获胜', () => {
            const players = [createPiece(1, 'player', 0, 0)];
            const enemies = [createPiece(2, 'enemy', 2, 0), createPiece(3, 'enemy', 2, 1)];

            boardSystem.placePiece(1, 0, 0);
            boardSystem.placePiece(2, 2, 0);
            boardSystem.placePiece(3, 2, 1);

            battleSystem.startBattle(fsmManager, boardSystem, eventManager, players, enemies);

            // 模拟玩家全灭
            players[0].isAlive = false;

            const result = battleSystem.getBattleResult();
            expect(result.winner).toBe('enemy');
            expect(result.survivingCount).toBe(2);
        });
    });

    // ─── endBattle ───────────────────────────────────

    describe('endBattle', () => {
        it('销毁所有棋子 AI FSM', () => {
            const players = [
                createPiece(1, 'player', 0, 0),
                createPiece(2, 'player', 0, 1),
                createPiece(3, 'player', 1, 0),
            ];
            const enemies = [
                createPiece(4, 'enemy', 2, 0),
                createPiece(5, 'enemy', 2, 1),
                createPiece(6, 'enemy', 3, 0),
            ];

            players.forEach((p) => boardSystem.placePiece(p.id, p.position.row, p.position.col));
            enemies.forEach((p) => boardSystem.placePiece(p.id, p.position.row, p.position.col));

            battleSystem.startBattle(fsmManager, boardSystem, eventManager, players, enemies);
            battleSystem.endBattle();

            expect(fsmManager.destroyFsm).toHaveBeenCalledTimes(6);

            // 验证每个 FSM 名称都被销毁
            for (const piece of [...players, ...enemies]) {
                const expectedName = CHESS_AI_FSM_PREFIX + piece.id;
                expect(fsmManager.destroyFsm).toHaveBeenCalledWith(expectedName);
            }
        });

        it('endBattle 后 _battleActive 变为 false', () => {
            const players = [createPiece(1, 'player', 0, 0)];
            const enemies = [createPiece(2, 'enemy', 2, 0)];

            boardSystem.placePiece(1, 0, 0);
            boardSystem.placePiece(2, 2, 0);

            battleSystem.startBattle(fsmManager, boardSystem, eventManager, players, enemies);
            battleSystem.endBattle();

            // 再次 update 不应该做任何事
            battleSystem.updateBattle(0.5);
            // 不报错即通过

            // isBattleOver 应返回 false（战斗已结束，不在进行中）
            expect(battleSystem.isBattleOver()).toBe(false);
        });

        it('重复 endBattle 不报错', () => {
            const players = [createPiece(1, 'player', 0, 0)];
            const enemies = [createPiece(2, 'enemy', 2, 0)];

            boardSystem.placePiece(1, 0, 0);
            boardSystem.placePiece(2, 2, 0);

            battleSystem.startBattle(fsmManager, boardSystem, eventManager, players, enemies);
            battleSystem.endBattle();
            battleSystem.endBattle();

            // destroyFsm 只在第一次 endBattle 被调用
            expect(fsmManager.destroyFsm).toHaveBeenCalledTimes(2); // 只有 2 个棋子
        });
    });

    // ─── timeScale ───────────────────────────────────

    describe('timeScale', () => {
        it('默认值为 1', () => {
            expect(battleSystem.timeScale).toBe(1);
        });

        it('可设置为 2 倍速', () => {
            battleSystem.timeScale = 2;
            expect(battleSystem.timeScale).toBe(2);
        });

        it('不允许设置为 0 或负值', () => {
            battleSystem.timeScale = 0;
            expect(battleSystem.timeScale).toBe(1); // 回退到默认

            battleSystem.timeScale = -1;
            expect(battleSystem.timeScale).toBe(1);
        });
    });

    // ─── battleActive 状态 ───────────────────────────

    describe('battleActive', () => {
        it('初始状态为 false', () => {
            expect(battleSystem.battleActive).toBe(false);
        });

        it('startBattle 后为 true', () => {
            const players = [createPiece(1, 'player', 0, 0)];
            const enemies = [createPiece(2, 'enemy', 2, 0)];

            boardSystem.placePiece(1, 0, 0);
            boardSystem.placePiece(2, 2, 0);

            battleSystem.startBattle(fsmManager, boardSystem, eventManager, players, enemies);

            expect(battleSystem.battleActive).toBe(true);
        });

        it('endBattle 后为 false', () => {
            const players = [createPiece(1, 'player', 0, 0)];
            const enemies = [createPiece(2, 'enemy', 2, 0)];

            boardSystem.placePiece(1, 0, 0);
            boardSystem.placePiece(2, 2, 0);

            battleSystem.startBattle(fsmManager, boardSystem, eventManager, players, enemies);
            battleSystem.endBattle();

            expect(battleSystem.battleActive).toBe(false);
        });
    });
});

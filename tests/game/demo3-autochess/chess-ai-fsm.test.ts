/**
 * 棋子 AI FSM 测试
 *
 * 测试 4 个 AI 状态（Idle/MoveTo/Attack/Dead）的行为逻辑。
 * @module
 */

import { IFsm } from '@framework/fsm/FsmDefs';
import { BoardSystem } from '@game/demo3-autochess/systems/BoardSystem';
import { ChessPieceRuntimeState } from '@game/demo3-autochess/data/AutoChessGameData';
import { IChessAiBlackboard, ChessAiDataKeys } from '@game/demo3-autochess/fsm/ChessAiFsmDefs';
import { IdleState } from '@game/demo3-autochess/fsm/chess-ai/IdleState';
import { MoveToState } from '@game/demo3-autochess/fsm/chess-ai/MoveToState';
import { AttackState } from '@game/demo3-autochess/fsm/chess-ai/AttackState';
import { DeadState } from '@game/demo3-autochess/fsm/chess-ai/DeadState';
import { AutoChessEvents } from '@game/demo3-autochess/AutoChessDefs';
import { IEventManager } from '@framework/interfaces/IEventManager';

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

/** 创建一个棋子运行时状态 */
function createPieceState(overrides: Partial<ChessPieceRuntimeState> = {}): ChessPieceRuntimeState {
    return {
        id: 1,
        configId: 100,
        name: '战士',
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

/** 创建 mock IFsm<string>，注入黑板数据 */
function createMockFsm(blackboard: IChessAiBlackboard): IFsm<string> {
    const dataMap = new Map<string, unknown>();
    dataMap.set(ChessAiDataKeys.BLACKBOARD, blackboard);

    const mockFsm = {
        name: 'test_chess_ai',
        owner: 'test',
        currentState: null,
        isDestroyed: false,
        changeState: jest.fn(),
        getData: jest.fn((key: string) => dataMap.get(key)),
        setData: jest.fn((key: string, value: unknown) => {
            dataMap.set(key, value);
        }),
        removeData: jest.fn((key: string) => dataMap.delete(key)),
        hasState: jest.fn(() => true),
        start: jest.fn(),
    } as unknown as IFsm<string>;
    return mockFsm;
}

// ═══════════════════════════════════════════════════════
// IdleState 测试
// ═══════════════════════════════════════════════════════

describe('IdleState', () => {
    let boardSystem: BoardSystem;
    let eventManager: IEventManager;

    beforeEach(() => {
        boardSystem = new BoardSystem();
        eventManager = createMockEventManager();
    });

    it('找到攻击范围内的敌人 → 切换到 AttackState', () => {
        // 玩家棋子在 (0,0)，敌人在 (1,0)，范围 1
        const myPiece = createPieceState({
            id: 1,
            side: 'player',
            position: { row: 0, col: 0 },
            range: 1,
        });
        const enemyPiece = createPieceState({ id: 2, side: 'enemy', position: { row: 2, col: 0 } });

        boardSystem.placePiece(1, 0, 0);
        boardSystem.placePiece(2, 2, 0);

        const bb: IChessAiBlackboard = {
            pieceState: myPiece,
            boardSystem,
            allEnemies: () => [enemyPiece],
            target: null,
            eventManager,
        };

        // 范围 1 vs 距离 2，不在范围内 → MoveTo
        const fsm = createMockFsm(bb);
        const state = new IdleState();
        state.onEnter(fsm);

        expect(bb.target).toBe(enemyPiece);
        expect(fsm.changeState).toHaveBeenCalledWith(MoveToState);
    });

    it('找到敌人且在攻击范围内 → 切换到 AttackState', () => {
        // 玩家在 (1,0)，敌人在 (2,0)，范围 1 → 距离 1，在范围内
        const myPiece = createPieceState({
            id: 1,
            side: 'player',
            position: { row: 1, col: 0 },
            range: 1,
        });
        const enemyPiece = createPieceState({ id: 2, side: 'enemy', position: { row: 2, col: 0 } });

        boardSystem.placePiece(1, 1, 0);
        boardSystem.placePiece(2, 2, 0);

        const bb: IChessAiBlackboard = {
            pieceState: myPiece,
            boardSystem,
            allEnemies: () => [enemyPiece],
            target: null,
            eventManager,
        };

        const fsm = createMockFsm(bb);
        const state = new IdleState();
        state.onEnter(fsm);

        expect(bb.target).toBe(enemyPiece);
        expect(fsm.changeState).toHaveBeenCalledWith(AttackState);
    });

    it('无存活敌人 → 保持 Idle，不切换', () => {
        const myPiece = createPieceState({ id: 1, side: 'player', position: { row: 0, col: 0 } });

        boardSystem.placePiece(1, 0, 0);

        const bb: IChessAiBlackboard = {
            pieceState: myPiece,
            boardSystem,
            allEnemies: () => [],
            target: null,
            eventManager,
        };

        const fsm = createMockFsm(bb);
        const state = new IdleState();
        state.onEnter(fsm);

        expect(bb.target).toBeNull();
        expect(fsm.changeState).not.toHaveBeenCalled();
    });

    it('多个敌人时选择最近的', () => {
        const myPiece = createPieceState({
            id: 1,
            side: 'player',
            position: { row: 0, col: 0 },
            range: 1,
        });
        const farEnemy = createPieceState({ id: 2, side: 'enemy', position: { row: 3, col: 3 } });
        const nearEnemy = createPieceState({ id: 3, side: 'enemy', position: { row: 2, col: 0 } });

        boardSystem.placePiece(1, 0, 0);
        boardSystem.placePiece(2, 3, 3);
        boardSystem.placePiece(3, 2, 0);

        const bb: IChessAiBlackboard = {
            pieceState: myPiece,
            boardSystem,
            allEnemies: () => [farEnemy, nearEnemy],
            target: null,
            eventManager,
        };

        const fsm = createMockFsm(bb);
        const state = new IdleState();
        state.onEnter(fsm);

        expect(bb.target).toBe(nearEnemy);
    });
});

// ═══════════════════════════════════════════════════════
// MoveToState 测试
// ═══════════════════════════════════════════════════════

describe('MoveToState', () => {
    let boardSystem: BoardSystem;
    let eventManager: IEventManager;

    beforeEach(() => {
        boardSystem = new BoardSystem();
        eventManager = createMockEventManager();
    });

    it('朝目标移动一步，距离减小', () => {
        // 玩家在 (0,0)，目标在 (2,0)，范围 1
        const myPiece = createPieceState({
            id: 1,
            side: 'player',
            position: { row: 0, col: 0 },
            range: 1,
        });
        const enemyPiece = createPieceState({ id: 2, side: 'enemy', position: { row: 2, col: 0 } });

        boardSystem.placePiece(1, 0, 0);
        boardSystem.placePiece(2, 2, 0);

        const bb: IChessAiBlackboard = {
            pieceState: myPiece,
            boardSystem,
            allEnemies: () => [enemyPiece],
            target: enemyPiece,
            eventManager,
        };

        const fsm = createMockFsm(bb);
        const state = new MoveToState();
        state.onUpdate(fsm, 0.5);

        // 应移动到 (1,0)
        expect(myPiece.position.row).toBe(1);
        expect(myPiece.position.col).toBe(0);
    });

    it('移动到攻击范围内 → 切换到 AttackState', () => {
        // 玩家在 (0,0)，目标在 (2,0)，范围 2
        // 移动到 (1,0) 后距离=1，在范围 2 内 → Attack
        const myPiece = createPieceState({
            id: 1,
            side: 'player',
            position: { row: 0, col: 0 },
            range: 2,
        });
        const enemyPiece = createPieceState({ id: 2, side: 'enemy', position: { row: 2, col: 0 } });

        boardSystem.placePiece(1, 0, 0);
        boardSystem.placePiece(2, 2, 0);

        const bb: IChessAiBlackboard = {
            pieceState: myPiece,
            boardSystem,
            allEnemies: () => [enemyPiece],
            target: enemyPiece,
            eventManager,
        };

        const fsm = createMockFsm(bb);
        const state = new MoveToState();
        state.onUpdate(fsm, 0.5);

        expect(fsm.changeState).toHaveBeenCalledWith(AttackState);
    });

    it('目标死亡 → 回到 IdleState 重新寻敌', () => {
        const myPiece = createPieceState({
            id: 1,
            side: 'player',
            position: { row: 0, col: 0 },
            range: 1,
        });
        const deadEnemy = createPieceState({
            id: 2,
            side: 'enemy',
            position: { row: 2, col: 0 },
            isAlive: false,
        });

        boardSystem.placePiece(1, 0, 0);

        const bb: IChessAiBlackboard = {
            pieceState: myPiece,
            boardSystem,
            allEnemies: () => [deadEnemy],
            target: deadEnemy,
            eventManager,
        };

        const fsm = createMockFsm(bb);
        const state = new MoveToState();
        state.onUpdate(fsm, 0.5);

        expect(fsm.changeState).toHaveBeenCalledWith(IdleState);
    });

    it('自身 HP<=0 → 切换到 DeadState', () => {
        const myPiece = createPieceState({
            id: 1,
            side: 'player',
            position: { row: 0, col: 0 },
            hp: 0,
        });
        const enemyPiece = createPieceState({ id: 2, side: 'enemy', position: { row: 2, col: 0 } });

        boardSystem.placePiece(1, 0, 0);
        boardSystem.placePiece(2, 2, 0);

        const bb: IChessAiBlackboard = {
            pieceState: myPiece,
            boardSystem,
            allEnemies: () => [enemyPiece],
            target: enemyPiece,
            eventManager,
        };

        const fsm = createMockFsm(bb);
        const state = new MoveToState();
        state.onUpdate(fsm, 0.5);

        expect(fsm.changeState).toHaveBeenCalledWith(DeadState);
    });
});

// ═══════════════════════════════════════════════════════
// AttackState 测试
// ═══════════════════════════════════════════════════════

describe('AttackState', () => {
    let boardSystem: BoardSystem;
    let eventManager: IEventManager;

    beforeEach(() => {
        boardSystem = new BoardSystem();
        eventManager = createMockEventManager();
    });

    it('冷却完毕时对目标造成伤害并发射 CHESS_ATTACK 事件', () => {
        const myPiece = createPieceState({
            id: 1,
            side: 'player',
            position: { row: 1, col: 0 },
            atk: 25,
            atkSpeed: 1.0,
            range: 1,
        });
        const enemyPiece = createPieceState({
            id: 2,
            side: 'enemy',
            position: { row: 2, col: 0 },
            hp: 100,
        });

        boardSystem.placePiece(1, 1, 0);
        boardSystem.placePiece(2, 2, 0);

        const bb: IChessAiBlackboard = {
            pieceState: myPiece,
            boardSystem,
            allEnemies: () => [enemyPiece],
            target: enemyPiece,
            eventManager,
        };

        const fsm = createMockFsm(bb);
        const state = new AttackState();

        // 初始冷却为 0（可以立即攻击）
        state.onEnter(fsm);
        state.onUpdate(fsm, 0.5);

        expect(enemyPiece.hp).toBe(75); // 100 - 25
        expect(eventManager.emit).toHaveBeenCalledWith(AutoChessEvents.CHESS_ATTACK, {
            attackerId: 1,
            defenderId: 2,
            damage: 25,
        });
    });

    it('冷却未完毕时不攻击，递减冷却', () => {
        const myPiece = createPieceState({
            id: 1,
            side: 'player',
            position: { row: 1, col: 0 },
            atk: 25,
            atkSpeed: 1.0,
            range: 1,
        });
        const enemyPiece = createPieceState({
            id: 2,
            side: 'enemy',
            position: { row: 2, col: 0 },
            hp: 100,
        });

        boardSystem.placePiece(1, 1, 0);
        boardSystem.placePiece(2, 2, 0);

        const bb: IChessAiBlackboard = {
            pieceState: myPiece,
            boardSystem,
            allEnemies: () => [enemyPiece],
            target: enemyPiece,
            eventManager,
        };

        const fsm = createMockFsm(bb);
        const state = new AttackState();

        // 先攻击一次触发冷却
        state.onEnter(fsm);
        state.onUpdate(fsm, 0.5);
        expect(enemyPiece.hp).toBe(75);

        // 冷却期间不攻击（只过了 0.3s，冷却 1.0s）
        state.onUpdate(fsm, 0.3);
        expect(enemyPiece.hp).toBe(75); // 没变
    });

    it('目标死亡 → 回到 IdleState', () => {
        const myPiece = createPieceState({
            id: 1,
            side: 'player',
            position: { row: 1, col: 0 },
            atk: 150,
            atkSpeed: 1.0,
            range: 1,
        });
        const enemyPiece = createPieceState({
            id: 2,
            side: 'enemy',
            position: { row: 2, col: 0 },
            hp: 100,
        });

        boardSystem.placePiece(1, 1, 0);
        boardSystem.placePiece(2, 2, 0);

        const bb: IChessAiBlackboard = {
            pieceState: myPiece,
            boardSystem,
            allEnemies: () => [enemyPiece],
            target: enemyPiece,
            eventManager,
        };

        const fsm = createMockFsm(bb);
        const state = new AttackState();

        state.onEnter(fsm);
        state.onUpdate(fsm, 0.5);

        // 伤害 150 > HP 100，目标死亡
        expect(enemyPiece.hp).toBe(0);
        expect(enemyPiece.isAlive).toBe(false);
        expect(fsm.changeState).toHaveBeenCalledWith(IdleState);
    });

    it('自身 HP<=0 → 切换到 DeadState', () => {
        const myPiece = createPieceState({
            id: 1,
            side: 'player',
            position: { row: 1, col: 0 },
            hp: 0,
            atk: 20,
            atkSpeed: 1.0,
            range: 1,
        });
        const enemyPiece = createPieceState({
            id: 2,
            side: 'enemy',
            position: { row: 2, col: 0 },
            hp: 100,
        });

        boardSystem.placePiece(1, 1, 0);
        boardSystem.placePiece(2, 2, 0);

        const bb: IChessAiBlackboard = {
            pieceState: myPiece,
            boardSystem,
            allEnemies: () => [enemyPiece],
            target: enemyPiece,
            eventManager,
        };

        const fsm = createMockFsm(bb);
        const state = new AttackState();

        state.onEnter(fsm);
        state.onUpdate(fsm, 0.5);

        expect(fsm.changeState).toHaveBeenCalledWith(DeadState);
    });

    it('目标离开攻击范围 → 切换到 MoveToState', () => {
        const myPiece = createPieceState({
            id: 1,
            side: 'player',
            position: { row: 0, col: 0 },
            atk: 20,
            atkSpeed: 1.0,
            range: 1,
        });
        // 目标距离 3，超出范围 1
        const enemyPiece = createPieceState({
            id: 2,
            side: 'enemy',
            position: { row: 3, col: 0 },
            hp: 100,
        });

        boardSystem.placePiece(1, 0, 0);
        boardSystem.placePiece(2, 3, 0);

        const bb: IChessAiBlackboard = {
            pieceState: myPiece,
            boardSystem,
            allEnemies: () => [enemyPiece],
            target: enemyPiece,
            eventManager,
        };

        const fsm = createMockFsm(bb);
        const state = new AttackState();

        state.onEnter(fsm);
        state.onUpdate(fsm, 0.5);

        expect(fsm.changeState).toHaveBeenCalledWith(MoveToState);
    });
});

// ═══════════════════════════════════════════════════════
// DeadState 测试
// ═══════════════════════════════════════════════════════

describe('DeadState', () => {
    let boardSystem: BoardSystem;
    let eventManager: IEventManager;

    beforeEach(() => {
        boardSystem = new BoardSystem();
        eventManager = createMockEventManager();
    });

    it('进入死亡状态 → 标记 isAlive=false 并发射 CHESS_KILLED 事件', () => {
        const myPiece = createPieceState({ id: 1, side: 'player', hp: 0, isAlive: true });

        const bb: IChessAiBlackboard = {
            pieceState: myPiece,
            boardSystem,
            allEnemies: () => [],
            target: null,
            eventManager,
        };

        const fsm = createMockFsm(bb);
        const state = new DeadState();
        state.onEnter(fsm);

        expect(myPiece.isAlive).toBe(false);
        expect(eventManager.emit).toHaveBeenCalledWith(AutoChessEvents.CHESS_KILLED, {
            pieceId: 1,
            killerPieceId: 0,
        });
    });

    it('有攻击者时使用攻击者 ID', () => {
        const myPiece = createPieceState({ id: 5, side: 'enemy', hp: 0, isAlive: true });
        const killer = createPieceState({ id: 3 });

        const bb: IChessAiBlackboard = {
            pieceState: myPiece,
            boardSystem,
            allEnemies: () => [],
            target: killer,
            eventManager,
        };

        const fsm = createMockFsm(bb);
        const state = new DeadState();
        state.onEnter(fsm);

        expect(myPiece.isAlive).toBe(false);
        expect(eventManager.emit).toHaveBeenCalledWith(AutoChessEvents.CHESS_KILLED, {
            pieceId: 5,
            killerPieceId: 3,
        });
    });

    it('死亡状态不切换到任何其他状态', () => {
        const myPiece = createPieceState({ id: 1, hp: 0 });

        const bb: IChessAiBlackboard = {
            pieceState: myPiece,
            boardSystem,
            allEnemies: () => [],
            target: null,
            eventManager,
        };

        const fsm = createMockFsm(bb);
        const state = new DeadState();
        state.onEnter(fsm);
        state.onUpdate(fsm, 0.5);

        expect(fsm.changeState).not.toHaveBeenCalled();
    });
});

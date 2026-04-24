/**
 * Auto-chess Demo — LaunchProcedure & PreloadProcedure 单元测试
 * @module
 */

import { IFsm } from '@framework/fsm/FsmDefs';
import { EventManager } from '@framework/event/EventManager';
import { AutoChessEvents } from '@game/demo3-autochess/AutoChessDefs';

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

// ─── Mock DataTableManager ──────────────────────────────

function createMockDataTableManager(): { createTableFromRawData: jest.Mock } {
    return {
        createTableFromRawData: jest.fn(),
    };
}

// ─── Mock EntityManager ─────────────────────────────────

function createMockEntityManager(): { registerGroup: jest.Mock } {
    return {
        registerGroup: jest.fn(),
    };
}

// ─── Mock EventManager ──────────────────────────────────

function createMockEventManager(): EventManager {
    const em = new EventManager();
    jest.spyOn(em, 'emit');
    return em;
}

import { LaunchProcedure } from '@game/demo3-autochess/procedures/LaunchProcedure';
import { PreloadProcedure } from '@game/demo3-autochess/procedures/PreloadProcedure';
import { AUTO_CHESS_CONTEXT_KEY } from '@game/demo3-autochess/procedures/AutoChessProcedureContext';

// ─── 构建 Context ───────────────────────────────────────

function createMockContext(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        gameData: {},
        renderer: { log: jest.fn(), updateLog: jest.fn(), updateStatus: jest.fn() },
        boardSystem: {},
        shopSystem: {},
        mergeSystem: {},
        synergySystem: {},
        battleSystem: {},
        eventManager: createMockEventManager(),
        timerManager: {},
        fsmManager: {},
        entityManager: createMockEntityManager(),
        audioManager: {},
        dataTableManager: createMockDataTableManager(),
        ...overrides,
    };
}

// ═══════════════════════════════════════════════════════
// LaunchProcedure
// ═══════════════════════════════════════════════════════

describe('LaunchProcedure', () => {
    it('应发射 PHASE_CHANGED 事件并切换到 PreloadProcedure', () => {
        const ctx = createMockContext();
        const fsm = createMockFsm({
            [AUTO_CHESS_CONTEXT_KEY]: ctx,
        });

        const proc = new LaunchProcedure();
        proc.onEnter(fsm);

        // 验证事件发射
        expect((ctx['eventManager'] as EventManager).emit).toHaveBeenCalledWith(
            AutoChessEvents.PHASE_CHANGED,
            { from: 'Launch', to: 'Preload' },
        );

        // 验证切换到 PreloadProcedure
        expect(fsm.changeState).toHaveBeenCalledWith(PreloadProcedure);
    });

    it('上下文缺失时应抛出错误', () => {
        const fsm = createMockFsm(); // 无上下文
        const proc = new LaunchProcedure();

        expect(() => proc.onEnter(fsm)).toThrow('不存在');
    });
});

// ═══════════════════════════════════════════════════════
// PreloadProcedure
// ═══════════════════════════════════════════════════════

describe('PreloadProcedure', () => {
    it('应注册 2 张配置表并注册 2 个实体分组，最后切换到 PrepareProcedure', () => {
        const ctx = createMockContext();
        const fsm = createMockFsm({
            [AUTO_CHESS_CONTEXT_KEY]: ctx,
        });

        const proc = new PreloadProcedure();
        proc.onEnter(fsm);

        // 验证 2 张配置表注册
        const dtMgr = ctx['dataTableManager'] as { createTableFromRawData: jest.Mock };
        expect(dtMgr.createTableFromRawData).toHaveBeenCalledTimes(2);

        const tableNames = dtMgr.createTableFromRawData.mock.calls.map(
            (call: unknown[]) => call[0],
        );
        expect(tableNames).toContain('chess_piece_config');
        expect(tableNames).toContain('synergy_config');

        // 验证 2 个实体分组注册
        const entityMgr = ctx['entityManager'] as { registerGroup: jest.Mock };
        expect(entityMgr.registerGroup).toHaveBeenCalledTimes(2);

        const groupNames = entityMgr.registerGroup.mock.calls.map((call: unknown[]) => call[0]);
        expect(groupNames).toContain('player_chess');
        expect(groupNames).toContain('enemy_chess');

        // 验证切换（PrepareProcedure 尚未实现，但 changeState 应被调用）
        expect(fsm.changeState).toHaveBeenCalledTimes(1);
    });

    it('上下文缺失时应抛出错误', () => {
        const fsm = createMockFsm(); // 无上下文
        const proc = new PreloadProcedure();

        expect(() => proc.onEnter(fsm)).toThrow('不存在');
    });

    it('每张配置表应传入表名和原始数据数组', () => {
        const ctx = createMockContext();
        const fsm = createMockFsm({
            [AUTO_CHESS_CONTEXT_KEY]: ctx,
        });

        const proc = new PreloadProcedure();
        proc.onEnter(fsm);

        const dtMgr = ctx['dataTableManager'] as { createTableFromRawData: jest.Mock };
        for (const call of dtMgr.createTableFromRawData.mock.calls as unknown[][]) {
            expect(call.length).toBeGreaterThanOrEqual(2);
            expect(typeof call[0]).toBe('string');
            expect(Array.isArray(call[1])).toBe(true);
        }
    });

    it('应发射 PHASE_CHANGED 事件', () => {
        const ctx = createMockContext();
        const fsm = createMockFsm({
            [AUTO_CHESS_CONTEXT_KEY]: ctx,
        });

        const proc = new PreloadProcedure();
        proc.onEnter(fsm);

        expect((ctx['eventManager'] as EventManager).emit).toHaveBeenCalledWith(
            AutoChessEvents.PHASE_CHANGED,
            { from: 'Preload', to: 'Prepare' },
        );
    });
});

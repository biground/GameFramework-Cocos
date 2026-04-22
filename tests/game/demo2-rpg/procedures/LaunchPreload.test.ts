/**
 * RPG Demo — LaunchProcedure & PreloadProcedure 单元测试
 * @module
 */

import { LaunchProcedure } from '@game/demo2-rpg/procedures/LaunchProcedure';
import { PreloadProcedure } from '@game/demo2-rpg/procedures/PreloadProcedure';
import {
    IRpgProcedureContext,
    RPG_PROCEDURE_CONTEXT_KEY,
} from '@game/demo2-rpg/procedures/RpgProcedureContext';
import { RpgEvents } from '@game/demo2-rpg/events/RpgEvents';
import { EventManager } from '@framework/event/EventManager';
import { IFsm } from '@framework/fsm/FsmDefs';

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
    } as unknown as IFsm<unknown>;
}

// ─── Mock DataTableManager ──────────────────────────────

function createMockDataTableManager(): { createTableFromRawData: jest.Mock } {
    return {
        createTableFromRawData: jest.fn(),
    };
}

// ─── Mock EventManager ──────────────────────────────────

function createMockEventManager(): EventManager {
    const em = new EventManager();
    jest.spyOn(em, 'emit');
    return em;
}

// ─── 构建 IRpgProcedureContext ──────────────────────────

function createMockContext(overrides: Partial<IRpgProcedureContext> = {}): IRpgProcedureContext {
    return {
        gameData: {},
        renderer: {} as IRpgProcedureContext['renderer'],
        battleSystem: {},
        buffSystem: {},
        damageCalculator: {},
        enemyAI: {},
        eventManager: createMockEventManager(),
        timerManager: {} as IRpgProcedureContext['timerManager'],
        fsmManager: {} as IRpgProcedureContext['fsmManager'],
        entityManager: {} as IRpgProcedureContext['entityManager'],
        audioManager: {} as IRpgProcedureContext['audioManager'],
        uiManager: {} as IRpgProcedureContext['uiManager'],
        dataTableManager:
            createMockDataTableManager() as unknown as IRpgProcedureContext['dataTableManager'],
        referencePool: {} as IRpgProcedureContext['referencePool'],
        ...overrides,
    };
}

// ═══════════════════════════════════════════════════════
// LaunchProcedure
// ═══════════════════════════════════════════════════════

describe('LaunchProcedure', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('应发射 PROCEDURE_CHANGED 事件并切换到 PreloadProcedure', () => {
        const ctx = createMockContext();
        const fsm = createMockFsm({
            [RPG_PROCEDURE_CONTEXT_KEY]: ctx,
        });

        const proc = new LaunchProcedure();
        proc.onEnter(fsm);

        // 验证事件发射
        expect(ctx.eventManager.emit).toHaveBeenCalledWith(RpgEvents.PROCEDURE_CHANGED, {
            from: 'Launch',
            to: 'Preload',
        });

        // setTimeout 后切换流程
        jest.runAllTimers();
        expect(fsm.changeState).toHaveBeenCalledWith(PreloadProcedure);
    });

    it('上下文缺失时应抛出错误', () => {
        const fsm = createMockFsm(); // 无上下文
        const proc = new LaunchProcedure();

        expect(() => proc.onEnter(fsm)).toThrow('上下文缺失');
    });
});

// ═══════════════════════════════════════════════════════
// PreloadProcedure
// ═══════════════════════════════════════════════════════

describe('PreloadProcedure', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('应注册 4 张配置表并切换到 LobbyProcedure', () => {
        const ctx = createMockContext();
        const fsm = createMockFsm({
            [RPG_PROCEDURE_CONTEXT_KEY]: ctx,
        });

        const proc = new PreloadProcedure();
        proc.onEnter(fsm);

        // 验证 4 张配置表注册
        const dtMgr = ctx.dataTableManager as unknown as { createTableFromRawData: jest.Mock };
        expect(dtMgr.createTableFromRawData).toHaveBeenCalledTimes(4);

        // 验证表名
        const tableNames = dtMgr.createTableFromRawData.mock.calls.map(
            (call: unknown[]) => call[0],
        );
        expect(tableNames).toContain('character_config');
        expect(tableNames).toContain('monster_config');
        expect(tableNames).toContain('skill_config');
        expect(tableNames).toContain('stage_config');

        // 验证事件发射
        expect(ctx.eventManager.emit).toHaveBeenCalledWith(RpgEvents.PROCEDURE_CHANGED, {
            from: 'Preload',
            to: 'Lobby',
        });

        // setTimeout 后切换流程
        jest.runAllTimers();

        // LobbyProcedure 尚未实现，但 changeState 应被调用
        expect(fsm.changeState).toHaveBeenCalledTimes(1);
    });

    it('上下文缺失时应抛出错误', () => {
        const fsm = createMockFsm(); // 无上下文
        const proc = new PreloadProcedure();

        expect(() => proc.onEnter(fsm)).toThrow('上下文缺失');
    });

    it('每张配置表应传入对应的原始数据', () => {
        const ctx = createMockContext();
        const fsm = createMockFsm({
            [RPG_PROCEDURE_CONTEXT_KEY]: ctx,
        });

        const proc = new PreloadProcedure();
        proc.onEnter(fsm);

        const dtMgr = ctx.dataTableManager as unknown as { createTableFromRawData: jest.Mock };
        // 每次调用应有 2 个参数：表名和原始数据
        for (const call of dtMgr.createTableFromRawData.mock.calls as unknown[][]) {
            expect(call.length).toBeGreaterThanOrEqual(2);
            expect(typeof call[0]).toBe('string');
            // 原始数据应为数组
            expect(Array.isArray(call[1])).toBe(true);
        }
    });
});

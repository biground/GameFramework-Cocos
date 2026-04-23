/**
 * @jest-environment jsdom
 */

/**
 * TurnBasedRpgDemo 单元测试
 * @module
 */

import { GameModule } from '@framework/core/GameModule';
import { ProcedureManager } from '@framework/procedure/ProcedureManager';
import { DataTableManager } from '@framework/datatable/DataTableManager';
import { TurnBasedRpgDemo } from '@game/demo2-rpg/TurnBasedRpgDemo';
import { LaunchProcedure } from '@game/demo2-rpg/procedures/LaunchProcedure';
import { LobbyProcedure } from '@game/demo2-rpg/procedures/LobbyProcedure';

// 每个测试结束后清理框架状态
afterEach(() => {
    GameModule.shutdownAll();
    jest.restoreAllMocks();
    jest.useRealTimers();
});

describe('TurnBasedRpgDemo', () => {
    const createDemo = (): TurnBasedRpgDemo => new TurnBasedRpgDemo();

    describe('start()', () => {
        it('完整执行不抛错', () => {
            jest.useFakeTimers();
            const demo = createDemo();
            expect(() => demo.start()).not.toThrow();
            demo.shutdown();
        });

        it('启动后主循环正在运行', () => {
            jest.useFakeTimers();
            const demo = createDemo();
            demo.start();
            expect(demo.isRunning).toBe(true);
            demo.shutdown();
        });
    });

    describe('setupProcedures()', () => {
        it('注册所有 Procedure（Launch/Preload/Lobby/BattlePrep/Battle/Settle）', () => {
            jest.useFakeTimers();
            const demo = createDemo();
            // bootstrap 内部调用 setupProcedures 和 setupDataTables
            demo.bootstrap();

            const procMgr = GameModule.getModule<ProcedureManager>('ProcedureManager');
            // 验证初始化完成（currentProcedure 为 null 因未 startProcedure）
            expect(procMgr.currentProcedure).toBeNull();

            // startProcedure 不抛错说明 Procedure 已注册
            expect(() => procMgr.startProcedure(LaunchProcedure)).not.toThrow();
            // Launch → Preload → Lobby 同步链式转换（Fsm 重入保护 pending 队列）
            expect(procMgr.currentProcedure).toBeInstanceOf(LobbyProcedure);

            demo.shutdown();
        });
    });

    describe('setupDataTables()', () => {
        it('DataTable 在 PreloadProcedure 中注册（bootstrap 后需等待 Procedure 流转）', () => {
            jest.useFakeTimers();
            const demo = createDemo();
            demo.bootstrap();

            const dtMgr = GameModule.getModule<DataTableManager>('DataTableManager');

            // bootstrap 后 setupDataTables 是空操作，表尚不存在
            expect(dtMgr.hasTable('character_config')).toBe(false);

            // 启动 Procedure 并推进 setTimeout 链：Launch → Preload（注册表） → Lobby
            const procMgr = GameModule.getModule<ProcedureManager>('ProcedureManager');
            procMgr.startProcedure(LaunchProcedure);
            jest.runAllTimers(); // Launch → Preload
            jest.runAllTimers(); // Preload → Lobby

            expect(dtMgr.hasTable('character_config')).toBe(true);
            expect(dtMgr.hasTable('monster_config')).toBe(true);
            expect(dtMgr.hasTable('skill_config')).toBe(true);
            expect(dtMgr.hasTable('stage_config')).toBe(true);

            demo.shutdown();
        });
    });

    describe('主循环', () => {
        it('startMainLoop 后 isRunning 为 true，shutdown 后为 false', () => {
            jest.useFakeTimers();
            const demo = createDemo();
            demo.start();
            expect(demo.isRunning).toBe(true);
            demo.shutdown();
            expect(demo.isRunning).toBe(false);
        });
    });
});

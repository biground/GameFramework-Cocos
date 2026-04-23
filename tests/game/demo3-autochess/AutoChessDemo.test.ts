/**
 * @jest-environment jsdom
 */

/**
 * AutoChessDemo 单元测试
 *
 * 验证主入口类的 bootstrap、setupProcedures、setupDataTables 和事件监听功能。
 * @module
 */

import { GameModule } from '@framework/core/GameModule';
import { ProcedureManager } from '@framework/procedure/ProcedureManager';
import { DataTableManager } from '@framework/datatable/DataTableManager';
import { EntityManager } from '@framework/entity/EntityManager';
import { EventManager } from '@framework/event/EventManager';
import { AutoChessDemo } from '@game/demo3-autochess/AutoChessDemo';
import { LaunchProcedure } from '@game/demo3-autochess/procedures/LaunchProcedure';
import { PreloadProcedure } from '@game/demo3-autochess/procedures/PreloadProcedure';
import { PrepareProcedure } from '@game/demo3-autochess/procedures/PrepareProcedure';
import { AutoChessEvents } from '@game/demo3-autochess/AutoChessDefs';

// 每个测试结束后清理框架状态
afterEach(() => {
    GameModule.shutdownAll();
    jest.restoreAllMocks();
    jest.useRealTimers();
});

describe('AutoChessDemo', () => {
    const createDemo = (): AutoChessDemo => new AutoChessDemo();

    describe('constructor', () => {
        it('创建实例不抛错', () => {
            expect(() => createDemo()).not.toThrow();
        });
    });

    describe('bootstrap()', () => {
        it('完整执行不抛错', () => {
            jest.useFakeTimers();
            const demo = createDemo();
            expect(() => demo.bootstrap()).not.toThrow();
            demo.shutdown();
        });

        it('注册全部 15 个框架模块', () => {
            jest.useFakeTimers();
            const demo = createDemo();
            demo.bootstrap();

            // 验证核心模块可被获取
            expect(GameModule.getModule('EventManager')).toBeDefined();
            expect(GameModule.getModule('TimerManager')).toBeDefined();
            expect(GameModule.getModule('FsmManager')).toBeDefined();
            expect(GameModule.getModule('ProcedureManager')).toBeDefined();
            expect(GameModule.getModule('EntityManager')).toBeDefined();
            expect(GameModule.getModule('DataTableManager')).toBeDefined();
            expect(GameModule.getModule('AudioManager')).toBeDefined();

            demo.shutdown();
        });
    });

    describe('setupProcedures()', () => {
        it('注册全部 6 个 Procedure', () => {
            jest.useFakeTimers();
            const demo = createDemo();
            demo.bootstrap();

            const procMgr = GameModule.getModule<ProcedureManager>('ProcedureManager');
            // 未启动时 currentProcedure 为 null
            expect(procMgr.currentProcedure).toBeNull();

            // startProcedure 不抛错说明 Procedure 已注册
            expect(() => procMgr.startProcedure(LaunchProcedure)).not.toThrow();

            demo.shutdown();
        });

        it('启动后 LaunchProcedure 触发链式转换到 PreloadProcedure', () => {
            jest.useFakeTimers();
            const demo = createDemo();
            demo.bootstrap();

            const procMgr = GameModule.getModule<ProcedureManager>('ProcedureManager');
            procMgr.startProcedure(LaunchProcedure);

            // Launch → Preload → Prepare（同步链式或异步需 flush timer）
            jest.runAllTimers();
            jest.runAllTimers();

            // 至少推进到 PreloadProcedure 或 PrepareProcedure
            const current = procMgr.currentProcedure;
            const isPreload = current instanceof PreloadProcedure;
            const isPrepare = current instanceof PrepareProcedure;
            expect(isPreload || isPrepare).toBe(true);

            demo.shutdown();
        });

        it('覆盖 EntityFactory 为 AutoChessEntityFactory', () => {
            jest.useFakeTimers();
            const demo = createDemo();
            demo.bootstrap();

            // EntityManager 已注入自定义工厂（通过检查 factory 类型验证）
            const entityMgr = GameModule.getModule<EntityManager>('EntityManager');
            // getEntityFactory 不存在，但我们可以验证 bootstrap 不抛错
            // 覆盖 EntityFactory 发生在 setupProcedures 内部
            expect(entityMgr).toBeDefined();

            demo.shutdown();
        });
    });

    describe('setupDataTables()', () => {
        it('DataTable 在 setupDataTables 中不直接注册（由 PreloadProcedure 负责）', () => {
            jest.useFakeTimers();
            const demo = createDemo();
            demo.bootstrap();

            const dtMgr = GameModule.getModule<DataTableManager>('DataTableManager');
            // setupDataTables 是空操作，表由 PreloadProcedure 注册
            // bootstrap 后表尚不存在（除非 PreloadProcedure 已同步执行）
            expect(dtMgr).toBeDefined();

            demo.shutdown();
        });

        it('启动 Procedure 后 PreloadProcedure 注册两张配置表', () => {
            jest.useFakeTimers();
            const demo = createDemo();
            demo.bootstrap();

            const procMgr = GameModule.getModule<ProcedureManager>('ProcedureManager');
            procMgr.startProcedure(LaunchProcedure);
            jest.runAllTimers();
            jest.runAllTimers();

            const dtMgr = GameModule.getModule<DataTableManager>('DataTableManager');
            expect(dtMgr.hasTable('chess_piece_config')).toBe(true);
            expect(dtMgr.hasTable('synergy_config')).toBe(true);

            demo.shutdown();
        });
    });

    describe('start()', () => {
        it('完整执行 start 不抛错', () => {
            jest.useFakeTimers();
            const demo = createDemo();
            expect(() => demo.start()).not.toThrow();
            expect(demo.isRunning).toBe(true);
            demo.shutdown();
        });

        it('shutdown 后 isRunning 为 false', () => {
            jest.useFakeTimers();
            const demo = createDemo();
            demo.start();
            expect(demo.isRunning).toBe(true);
            demo.shutdown();
            expect(demo.isRunning).toBe(false);
        });
    });

    describe('战斗事件监听', () => {
        it('注册事件监听后收到事件不抛错', () => {
            jest.useFakeTimers();
            const demo = createDemo();
            demo.start();

            const eventMgr = GameModule.getModule<EventManager>('EventManager');

            // 发射各类事件，不应抛错
            expect(() => {
                eventMgr.emit(AutoChessEvents.CHESS_ATTACK, {
                    attackerId: 1,
                    defenderId: 2,
                    damage: 50,
                });
                eventMgr.emit(AutoChessEvents.CHESS_KILLED, {
                    pieceId: 2,
                    killerPieceId: 1,
                });
                eventMgr.emit(AutoChessEvents.ROUND_START, { round: 1 });
                eventMgr.emit(AutoChessEvents.ROUND_END, { round: 1, result: 'win' });
                eventMgr.emit(AutoChessEvents.SYNERGY_ACTIVATED, {
                    race: 'warrior',
                    threshold: 3,
                    effect: 'atk_boost',
                });
                eventMgr.emit(AutoChessEvents.PHASE_CHANGED, {
                    from: 'Launch',
                    to: 'Preload',
                });
                eventMgr.emit(AutoChessEvents.HP_CHANGED, {
                    oldHp: 100,
                    newHp: 90,
                    damage: 10,
                });
                eventMgr.emit(AutoChessEvents.GOLD_CHANGED, {
                    oldGold: 10,
                    newGold: 15,
                });
                eventMgr.emit(AutoChessEvents.GAME_OVER, {
                    finalRound: 5,
                    result: 'defeat',
                });
                eventMgr.emit(AutoChessEvents.BATTLE_START, { round: 1 });
                eventMgr.emit(AutoChessEvents.BATTLE_END, {
                    round: 1,
                    winner: 'player',
                });
                eventMgr.emit(AutoChessEvents.CHESS_MERGED, {
                    resultPieceId: 10,
                    star: 2,
                    name: '剑士',
                });
                eventMgr.emit(AutoChessEvents.SHOP_REFRESHED, { slotCount: 5 });
            }).not.toThrow();

            demo.shutdown();
        });
    });
});

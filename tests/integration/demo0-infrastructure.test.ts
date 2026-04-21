/**
 * @jest-environment jsdom
 */

/**
 * Demo 0 基础设施集成测试
 *
 * 验证 DemoBase 的完整生命周期：
 * - 15 个框架模块的 bootstrap 注册
 * - 主循环驱动
 * - Mock 策略注入
 * - HtmlRenderer DOM 集成
 * - shutdown 清理
 */

import { DemoBase } from '@game/shared/DemoBase';
import { HtmlRenderer } from '@game/shared/HtmlRenderer';
import { GameModule } from '@framework/core/GameModule';
import { EventManager } from '@framework/event/EventManager';
import { TimerManager } from '@framework/timer/TimerManager';
import { FsmManager } from '@framework/fsm/FsmManager';
import { ProcedureManager } from '@framework/procedure/ProcedureManager';
import { ResourceManager } from '@framework/resource/ResourceManager';
import { AudioManager } from '@framework/audio/AudioManager';
import { SceneManager } from '@framework/scene/SceneManager';
import { UIManager } from '@framework/ui/UIManager';
import { EntityManager } from '@framework/entity/EntityManager';
import { NetworkManager } from '@framework/network/NetworkManager';
import { DataTableManager } from '@framework/datatable/DataTableManager';
import { LocalizationManager } from '@framework/i18n/LocalizationManager';
import { HotUpdateManager } from '@framework/hotupdate/HotUpdateManager';
import { DebugManager } from '@framework/debug/DebugManager';

// Mock Logger — 同时满足静态方法和 new 实例化（bootstrap 中 new Logger()）
jest.mock('@framework/debug/Logger', () => {
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    class MockLogger {
        moduleName = 'Logger';
        priority = 0;
        onInit = jest.fn();
        onUpdate = jest.fn();
        onShutdown = jest.fn();

        static debug = jest.fn();
        static info = jest.fn();
        static warn = jest.fn();
        static error = jest.fn();
    }
    return { Logger: MockLogger };
});

/** 测试用 DemoBase 子类 */
class TestDemo extends DemoBase {
    setupProceduresCalled = false;
    setupDataTablesCalled = false;

    constructor() {
        super('集成测试 Demo');
    }

    setupProcedures(): void {
        this.setupProceduresCalled = true;
    }

    setupDataTables(): void {
        this.setupDataTablesCalled = true;
    }

    /** 暴露 htmlRenderer 给测试用 */
    getRenderer(): HtmlRenderer {
        return this.htmlRenderer;
    }
}

/**
 * DemoBase bootstrap 注册的全部 15 个模块名称
 */
const ALL_MODULE_NAMES = [
    'Logger',
    'EventManager',
    'TimerManager',
    'ResourceManager',
    'NetworkManager',
    'FsmManager',
    'HotUpdateManager',
    'EntityManager',
    'UIManager',
    'AudioManager',
    'SceneManager',
    'ProcedureManager',
    'DataTableManager',
    'LocalizationManager',
    'DebugManager',
];

describe('Demo 0 基础设施集成测试', () => {
    let demo: TestDemo;

    beforeEach(() => {
        GameModule.shutdownAll();
        demo = new TestDemo();
    });

    afterEach(() => {
        demo.shutdown();
        document.body.innerHTML = '';
    });

    // ─── 场景 1：全部模块初始化 ────────────────────────

    describe('全部模块初始化', () => {
        it('bootstrap 后全部 15 个模块均可通过 hasModule 检测到', () => {
            demo.bootstrap();

            for (const name of ALL_MODULE_NAMES) {
                expect(GameModule.hasModule(name)).toBe(true);
            }
        });

        it('各模块类型正确', () => {
            demo.bootstrap();

            expect(GameModule.getModule('EventManager')).toBeInstanceOf(EventManager);
            expect(GameModule.getModule('TimerManager')).toBeInstanceOf(TimerManager);
            expect(GameModule.getModule('FsmManager')).toBeInstanceOf(FsmManager);
            expect(GameModule.getModule('ProcedureManager')).toBeInstanceOf(ProcedureManager);
            expect(GameModule.getModule('ResourceManager')).toBeInstanceOf(ResourceManager);
            expect(GameModule.getModule('AudioManager')).toBeInstanceOf(AudioManager);
            expect(GameModule.getModule('SceneManager')).toBeInstanceOf(SceneManager);
            expect(GameModule.getModule('UIManager')).toBeInstanceOf(UIManager);
            expect(GameModule.getModule('EntityManager')).toBeInstanceOf(EntityManager);
            expect(GameModule.getModule('NetworkManager')).toBeInstanceOf(NetworkManager);
            expect(GameModule.getModule('DataTableManager')).toBeInstanceOf(DataTableManager);
            expect(GameModule.getModule('LocalizationManager')).toBeInstanceOf(LocalizationManager);
            expect(GameModule.getModule('HotUpdateManager')).toBeInstanceOf(HotUpdateManager);
            expect(GameModule.getModule('DebugManager')).toBeInstanceOf(DebugManager);
        });

        it('子类扩展点 setupProcedures 和 setupDataTables 被调用', () => {
            demo.bootstrap();
            expect(demo.setupProceduresCalled).toBe(true);
            expect(demo.setupDataTablesCalled).toBe(true);
        });
    });

    // ─── 场景 2：主循环模拟 ────────────────────────────

    describe('主循环模拟', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('startMainLoop 后 GameModule.update 被周期性驱动', () => {
            demo.bootstrap();
            const updateSpy = jest.spyOn(GameModule, 'update');

            demo.startMainLoop(10); // 10fps → 100ms 间隔
            jest.advanceTimersByTime(500); // 500ms → 至少 4 次调用

            expect(updateSpy).toHaveBeenCalled();
            expect(updateSpy.mock.calls.length).toBeGreaterThanOrEqual(4);

            // 每次调用的 deltaTime 参数均 >= 0
            for (const call of updateSpy.mock.calls) {
                expect(call[0]).toBeGreaterThanOrEqual(0);
            }

            updateSpy.mockRestore();
        });

        it('stopMainLoop 后不再驱动 update', () => {
            demo.bootstrap();
            const updateSpy = jest.spyOn(GameModule, 'update');

            demo.startMainLoop(10);
            jest.advanceTimersByTime(200);
            const countBefore = updateSpy.mock.calls.length;

            demo.stopMainLoop();
            jest.advanceTimersByTime(500);
            const countAfter = updateSpy.mock.calls.length;

            expect(countAfter).toBe(countBefore);
            expect(demo.isRunning).toBe(false);

            updateSpy.mockRestore();
        });
    });

    // ─── 场景 3：Mock 策略注入验证 ─────────────────────

    describe('Mock 策略注入验证', () => {
        beforeEach(() => {
            demo.bootstrap();
        });

        it('ResourceManager 使用 MockResourceLoader（loadAsset 不抛"未设置"异常）', () => {
            const resMgr = GameModule.getModule<ResourceManager>('ResourceManager');

            // loadAsset 不抛异常 → 说明 loader 已注入
            expect(() => {
                resMgr.loadAsset('test/asset.png', 'test-owner', {
                    onSuccess: () => {
                        /* noop */
                    },
                });
            }).not.toThrow();
        });

        it('AudioManager 使用 MockAudioPlayer（playMusic/playSound 不抛异常）', () => {
            const audioMgr = GameModule.getModule<AudioManager>('AudioManager');

            // playMusic 不抛"未设置 audioPlayer"异常 → MockAudioPlayer 已注入
            expect(() => {
                audioMgr.playMusic('bgm_test');
            }).not.toThrow();

            expect(() => {
                audioMgr.playSound('sfx_click');
            }).not.toThrow();
        });

        it('DataTableManager 使用 MockDataTableParser（createTableFromRawData 可解析数据）', () => {
            const dtMgr = GameModule.getModule<DataTableManager>('DataTableManager');

            const testData = JSON.stringify([
                { id: 1, name: '测试1' },
                { id: 2, name: '测试2' },
            ]);

            // createTableFromRawData 不抛"未设置 Parser"异常 → MockDataTableParser 已注入
            expect(() => {
                dtMgr.createTableFromRawData('TestTable', testData);
            }).not.toThrow();

            expect(dtMgr.hasTable('TestTable')).toBe(true);
        });
    });

    // ─── 场景 4：HtmlRenderer 集成 ────────────────────

    describe('HtmlRenderer 集成', () => {
        it('bootstrap 后 DOM 中存在 HtmlRenderer 创建的元素', () => {
            demo.bootstrap();

            // HtmlRenderer 构造时在 document.body 中插入了根容器
            const allElements = document.body.querySelectorAll('div');
            expect(allElements.length).toBeGreaterThan(0);

            // 标题文本应包含构造时传入的 title
            expect(document.body.innerHTML).toContain('集成测试 Demo');
        });

        it('HtmlRenderer 日志方法可正常调用并写入 DOM', () => {
            demo.bootstrap();
            const renderer = demo.getRenderer();

            expect(() => {
                renderer.log('测试日志消息', '#4CAF50');
            }).not.toThrow();

            expect(document.body.innerHTML).toContain('测试日志消息');
        });
    });

    // ─── 场景 5：shutdown 清理 ─────────────────────────

    describe('shutdown 清理', () => {
        it('shutdown 后主循环停止', () => {
            jest.useFakeTimers();
            demo.bootstrap();
            demo.startMainLoop(10);
            expect(demo.isRunning).toBe(true);

            demo.shutdown();
            expect(demo.isRunning).toBe(false);

            jest.useRealTimers();
        });

        it('shutdown 后所有模块被清理', () => {
            demo.bootstrap();

            for (const name of ALL_MODULE_NAMES) {
                expect(GameModule.hasModule(name)).toBe(true);
            }

            demo.shutdown();

            for (const name of ALL_MODULE_NAMES) {
                expect(GameModule.hasModule(name)).toBe(false);
            }
        });

        it('shutdown 后 getModule 抛出异常', () => {
            demo.bootstrap();
            demo.shutdown();

            expect(() => {
                GameModule.getModule('EventManager');
            }).toThrow();
        });
    });
});

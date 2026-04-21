/**
 * @jest-environment jsdom
 */
import { DemoBase } from '@game/shared/DemoBase';
import { GameModule } from '@framework/core/GameModule';
import { EventManager } from '@framework/event/EventManager';

// Mock Logger — 既作为静态方法容器，又可被 new 实例化（DemoBase.bootstrap 中 new Logger()）
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
        super('测试 Demo');
    }

    setupProcedures(): void {
        this.setupProceduresCalled = true;
    }

    setupDataTables(): void {
        this.setupDataTablesCalled = true;
    }
}

describe('DemoBase', () => {
    let demo: TestDemo;

    beforeEach(() => {
        // 清理单例状态
        GameModule.shutdownAll();
        demo = new TestDemo();
    });

    afterEach(() => {
        demo.shutdown();
        document.body.innerHTML = '';
    });

    describe('bootstrap()', () => {
        it('应成功完成初始化不抛异常', () => {
            expect(() => demo.bootstrap()).not.toThrow();
        });

        it('bootstrap 后可通过 getModule 获取 EventManager', () => {
            demo.bootstrap();
            // EventManager 在 bootstrap 中已注册
            expect(GameModule.hasModule('EventManager')).toBe(true);
            const em = GameModule.getModule<EventManager>('EventManager');
            expect(em).toBeInstanceOf(EventManager);
        });

        it('bootstrap 过程中调用 setupProcedures 和 setupDataTables', () => {
            demo.bootstrap();
            expect(demo.setupProceduresCalled).toBe(true);
            expect(demo.setupDataTablesCalled).toBe(true);
        });

        it('重复 bootstrap 不抛异常（内部先 shutdownAll 再重建）', () => {
            demo.bootstrap();
            expect(() => demo.bootstrap()).not.toThrow();
        });
    });

    describe('startMainLoop / stopMainLoop', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            demo.bootstrap();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('startMainLoop 后 isRunning 为 true', () => {
            demo.startMainLoop(30);
            expect(demo.isRunning).toBe(true);
        });

        it('stopMainLoop 后 isRunning 为 false', () => {
            demo.startMainLoop(30);
            demo.stopMainLoop();
            expect(demo.isRunning).toBe(false);
        });

        it('主循环驱动 GameModule.update', () => {
            const updateSpy = jest.spyOn(GameModule, 'update');

            demo.startMainLoop(30);
            // 推进足够的时间触发多次 interval（30fps → ~33ms 间隔）
            jest.advanceTimersByTime(200);

            expect(updateSpy).toHaveBeenCalled();
            // 200ms / 33ms ≈ 6 次
            expect(updateSpy.mock.calls.length).toBeGreaterThanOrEqual(3);

            updateSpy.mockRestore();
        });

        it('重复调用 startMainLoop 不会创建多个定时器', () => {
            demo.startMainLoop(30);
            demo.startMainLoop(30); // 应被忽略
            jest.advanceTimersByTime(100);
            // 不应抛异常，且仍在运行
            expect(demo.isRunning).toBe(true);
        });
    });

    describe('shutdown()', () => {
        it('shutdown 停止主循环并清理模块', () => {
            jest.useFakeTimers();
            demo.bootstrap();
            demo.startMainLoop(30);

            demo.shutdown();

            expect(demo.isRunning).toBe(false);
            // 模块已清理
            expect(GameModule.hasModule('EventManager')).toBe(false);

            jest.useRealTimers();
        });

        it('未启动主循环时 shutdown 也不抛异常', () => {
            demo.bootstrap();
            expect(() => demo.shutdown()).not.toThrow();
        });
    });
});

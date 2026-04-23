/**
 * @jest-environment jsdom
 */
import 'reflect-metadata';
import { DemoBase } from '@game/shared/DemoBase';
import { GameModule } from '@framework/core/GameModule';
import { EventManager } from '@framework/event/EventManager';
import { Container } from '@framework/di/Container';
import { SERVICE_KEYS } from '@framework/di/ServiceKeys';
import { MockResourceLoader } from '@game/shared/MockResourceLoader';
import { IResourceLoader } from '@framework/resource/ResourceDefs';

// Mock Logger
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
        super('DI 测试 Demo');
    }

    setupProcedures(): void {
        this.setupProceduresCalled = true;
    }

    setupDataTables(): void {
        this.setupDataTablesCalled = true;
    }
}

/** 自定义策略子类，用于验证策略覆盖 */
class CustomResourceLoader implements IResourceLoader {
    loadAsset(_path: string, callbacks: { onSuccess?: (asset: unknown) => void }): void {
        callbacks.onSuccess?.({ custom: true });
    }
    releaseAsset(_path: string): void {
        /* noop */
    }
}

/** 覆盖策略绑定的子类 */
class CustomStrategyDemo extends DemoBase {
    setupProcedures(): void {
        /* noop */
    }
    setupDataTables(): void {
        /* noop */
    }

    protected bindStrategies(container: Container): void {
        super.bindStrategies(container);
        // 覆盖 ResourceLoader
        container.bind(SERVICE_KEYS.ResourceLoader).toValue(new CustomResourceLoader());
    }
}

describe('DemoBase.bootstrapWithDI()', () => {
    let demo: TestDemo;

    beforeEach(() => {
        GameModule.shutdownAll();
        demo = new TestDemo();
    });

    afterEach(() => {
        demo.shutdown();
        document.body.innerHTML = '';
    });

    // ─── 基本功能 ──────────────────────────────────────

    it('应成功完成 DI 初始化不抛异常', () => {
        expect(() => demo.bootstrapWithDI()).not.toThrow();
    });

    it('返回 Container 实例', () => {
        const container = demo.bootstrapWithDI();
        expect(container).toBeInstanceOf(Container);
    });

    it('container getter 返回与 bootstrapWithDI 相同的实例', () => {
        const returned = demo.bootstrapWithDI();
        expect(demo.container).toBe(returned);
    });

    // ─── 模块注册 ──────────────────────────────────────

    it('所有 15 个模块都应注册到 GameModule', () => {
        demo.bootstrapWithDI();

        const moduleNames = [
            'Logger',
            'EventManager',
            'TimerManager',
            'FsmManager',
            'ProcedureManager',
            'ResourceManager',
            'AudioManager',
            'SceneManager',
            'UIManager',
            'EntityManager',
            'NetworkManager',
            'DataTableManager',
            'LocalizationManager',
            'HotUpdateManager',
            'DebugManager',
        ];

        for (const name of moduleNames) {
            expect(GameModule.hasModule(name)).toBe(true);
        }
    });

    it('通过容器解析的模块与 GameModule 中注册的是同一实例', () => {
        const container = demo.bootstrapWithDI();

        const diEventMgr = container.resolve(SERVICE_KEYS.EventManager);
        const gmEventMgr = GameModule.getModule<EventManager>('EventManager');
        expect(diEventMgr).toBe(gmEventMgr);
    });

    // ─── 策略注入 ──────────────────────────────────────

    it('容器应包含所有策略绑定', () => {
        const container = demo.bootstrapWithDI();

        expect(container.has(SERVICE_KEYS.ResourceLoader)).toBe(true);
        expect(container.has(SERVICE_KEYS.AudioPlayer)).toBe(true);
        expect(container.has(SERVICE_KEYS.SceneLoader)).toBe(true);
        expect(container.has(SERVICE_KEYS.UIFormFactory)).toBe(true);
        expect(container.has(SERVICE_KEYS.EntityFactory)).toBe(true);
        expect(container.has(SERVICE_KEYS.DataTableParser)).toBe(true);
        expect(container.has(SERVICE_KEYS.HotUpdateAdapter)).toBe(true);
        expect(container.has(SERVICE_KEYS.VersionComparator)).toBe(true);
    });

    it('ResourceLoader 策略默认为 MockResourceLoader', () => {
        const container = demo.bootstrapWithDI();
        const loader = container.resolve(SERVICE_KEYS.ResourceLoader);
        expect(loader).toBeInstanceOf(MockResourceLoader);
    });

    // ─── 子类扩展点 ──────────────────────────────────────

    it('bootstrapWithDI 调用 setupProcedures 和 setupDataTables', () => {
        demo.bootstrapWithDI();
        expect(demo.setupProceduresCalled).toBe(true);
        expect(demo.setupDataTablesCalled).toBe(true);
    });

    // ─── 策略覆盖 ──────────────────────────────────────

    it('子类可通过重写 bindStrategies 替换策略实现', () => {
        const customDemo = new CustomStrategyDemo('自定义策略 Demo');
        const container = customDemo.bootstrapWithDI();

        const loader = container.resolve(SERVICE_KEYS.ResourceLoader);
        expect(loader).toBeInstanceOf(CustomResourceLoader);

        customDemo.shutdown();
    });

    // ─── GameModule.update 兼容性 ──────────────────────

    it('DI 初始化后 GameModule.update 不抛异常', () => {
        demo.bootstrapWithDI();
        expect(() => GameModule.update(0.016)).not.toThrow();
    });

    // ─── shutdown 清理 ──────────────────────────────────

    it('shutdown 清理容器和模块', () => {
        demo.bootstrapWithDI();
        demo.shutdown();

        expect(demo.container).toBeNull();
        expect(GameModule.hasModule('EventManager')).toBe(false);
    });

    // ─── 与 bootstrap 互不干扰 ──────────────────────────

    it('bootstrap 后 container 仍为 null', () => {
        demo.bootstrap();
        expect(demo.container).toBeNull();
    });

    it('可以在 bootstrapWithDI 后再 bootstrap（重置模式）', () => {
        demo.bootstrapWithDI();
        expect(demo.container).not.toBeNull();

        demo.shutdown();
        demo.bootstrap();
        expect(demo.container).toBeNull();
        expect(GameModule.hasModule('EventManager')).toBe(true);
    });

    // ─── HotUpdateManager 依赖注入 ──────────────────────

    it('HotUpdateManager 应正确接收 EventManager 依赖', () => {
        const container = demo.bootstrapWithDI();

        const hotUpdate = container.resolve(SERVICE_KEYS.HotUpdateManager);
        expect(hotUpdate).toBeTruthy();
        expect(GameModule.hasModule('HotUpdateManager')).toBe(true);
    });

    // ─── 单例语义 ──────────────────────────────────────

    it('容器中模块绑定应为单例（多次 resolve 同一实例）', () => {
        const container = demo.bootstrapWithDI();

        const em1 = container.resolve(SERVICE_KEYS.EventManager);
        const em2 = container.resolve(SERVICE_KEYS.EventManager);
        expect(em1).toBe(em2);
    });
});

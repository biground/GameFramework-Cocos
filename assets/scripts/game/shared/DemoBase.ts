import { ModuleBase } from '@framework/core/ModuleBase';
import { GameModule } from '@framework/core/GameModule';
import { Logger } from '@framework/debug/Logger';
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
import { Container } from '@framework/di/Container';
import { SERVICE_KEYS } from '@framework/di/ServiceKeys';
import { HtmlRenderer } from './HtmlRenderer';
import { MockResourceLoader } from './MockResourceLoader';
import { MockAudioPlayer } from './MockAudioPlayer';
import { MockSceneLoader } from './MockSceneLoader';
import { MockUIFormFactory } from './MockUIFormFactory';
import { MockEntityFactory } from './MockEntityFactory';
import { MockDataTableParser } from './MockDataTableParser';
import { MockHotUpdateAdapter } from './MockHotUpdateAdapter';
import { MockVersionComparator } from './MockVersionComparator';

/**
 * Demo 抽象基类
 * 所有 Demo 示例的基类，提供框架模块初始化、Mock 策略注入、主循环和生命周期管理
 *
 * @description
 * bootstrap() 按优先级注册全部 17 个框架模块并注入 Mock 策略，
 * startMainLoop() 用 setInterval 模拟引擎 update 驱动。
 * 子类只需实现 setupProcedures() 和 setupDataTables() 即可聚焦业务逻辑。
 */
export abstract class DemoBase {
    private static readonly TAG = 'DemoBase';

    /** HTML 渲染器，用于 Demo 日志和 UI 展示 */
    protected htmlRenderer: HtmlRenderer;

    /** DI 容器（仅 bootstrapWithDI 模式下可用） */
    protected _container: Container | null = null;

    /** 主循环定时器句柄 */
    private _mainLoopTimer: ReturnType<typeof setInterval> | null = null;

    /** 上一帧时间戳（毫秒） */
    private _lastFrameTime: number = 0;

    /** 是否正在运行 */
    private _isRunning: boolean = false;

    /**
     * 构造 Demo 实例
     * @param title Demo 标题，用于 HtmlRenderer 展示
     */
    constructor(title: string) {
        this.htmlRenderer = new HtmlRenderer(title);
    }

    /**
     * 获取 Demo 运行状态
     * @returns 是否正在运行
     */
    public get isRunning(): boolean {
        return this._isRunning;
    }

    // ─── 抽象方法 ──────────────────────────────────────

    /**
     * 子类实现：注册 Procedure 并启动流程
     * @description 在 bootstrap 完成后调用，子类应在此注册流程链并启动入口流程
     */
    abstract setupProcedures(): void;

    /**
     * 子类实现：注册 DataTable 数据
     * @description 在 bootstrap 完成后调用，子类应在此加载和注册数据表
     */
    abstract setupDataTables(): void;

    // ─── 核心生命周期 ──────────────────────────────────

    /**
     * 初始化框架所有模块，注入 Mock 策略
     *
     * @description
     * 按优先级注册全部 17 个框架模块（Logger → DebugManager），
     * 注册后注入各模块所需的 Mock 策略实现，
     * 最后调用子类的 setupProcedures() 和 setupDataTables()。
     *
     * 注意：GameModule.register() 内部会立即调用 onInit()，
     * 因此策略注入必须在 register 之后进行。
     */
    bootstrap(): void {
        Logger.info(DemoBase.TAG, '开始 bootstrap...');

        // 1. 清理之前的状态
        GameModule.shutdownAll();

        // 2. 创建模块实例
        const logger = new Logger();
        const eventManager = new EventManager();
        const timerManager = new TimerManager();
        const fsmManager = new FsmManager();
        const procedureManager = new ProcedureManager();
        const resourceManager = new ResourceManager();
        const audioManager = new AudioManager();
        const sceneManager = new SceneManager();
        const uiManager = new UIManager();
        const entityManager = new EntityManager();
        const networkManager = new NetworkManager();
        const dataTableManager = new DataTableManager();
        const localizationManager = new LocalizationManager();
        const hotUpdateManager = new HotUpdateManager(eventManager);
        const debugManager = new DebugManager();

        // 3. 按优先级注册模块（register 内部会调用 onInit）
        //    基础设施层 (0-99)
        GameModule.register(logger); // priority 0
        GameModule.register(eventManager); // priority 10
        GameModule.register(timerManager); // priority 10

        //    核心服务层 (100-199)
        GameModule.register(resourceManager); // priority 100
        GameModule.register(networkManager); // priority 110
        GameModule.register(fsmManager); // priority 110
        GameModule.register(hotUpdateManager); // priority 150
        GameModule.register(entityManager); // priority 180

        //    业务模块层 (200-399)
        GameModule.register(uiManager); // priority 200
        GameModule.register(audioManager); // priority 210
        GameModule.register(sceneManager); // priority 220
        GameModule.register(procedureManager); // priority 300
        GameModule.register(dataTableManager); // priority 300
        GameModule.register(localizationManager); // priority 350

        //    调试层 (400+)
        GameModule.register(debugManager); // priority 400

        Logger.info(DemoBase.TAG, '所有模块注册完成，开始注入 Mock 策略...');

        // 4. 注入 Mock 策略（必须在 register/onInit 之后）
        resourceManager.setResourceLoader(new MockResourceLoader());
        audioManager.setAudioPlayer(new MockAudioPlayer());
        sceneManager.setSceneLoader(new MockSceneLoader());
        uiManager.setUIFormFactory(new MockUIFormFactory());
        entityManager.setEntityFactory(new MockEntityFactory());
        dataTableManager.setParser(new MockDataTableParser());
        hotUpdateManager.setAdapter(new MockHotUpdateAdapter());
        hotUpdateManager.setComparator(new MockVersionComparator());

        // 5. 设置跨模块引用
        networkManager.setEventManager(eventManager);
        localizationManager.setEventManager(eventManager);

        Logger.info(DemoBase.TAG, 'Mock 策略注入完成');

        // 6. 子类扩展点
        this.setupProcedures();
        this.setupDataTables();

        Logger.info(DemoBase.TAG, 'bootstrap 完成，共注册 15 个模块');
    }

    // ─── DI 容器模式 ──────────────────────────────────

    /**
     * 使用 DI 容器初始化框架（可选替代 bootstrap）
     *
     * @description
     * 与 bootstrap() 功能等价，但通过 Container 管理模块和策略的绑定关系。
     * 子类可重写 bindStrategies() 来替换 Mock 策略实现。
     *
     * @returns 已配置的 DI 容器
     */
    bootstrapWithDI(): Container {
        Logger.info(DemoBase.TAG, '开始 bootstrapWithDI...');

        // 1. 清理之前的状态
        GameModule.shutdownAll();

        // 2. 创建并配置容器
        const container = new Container();
        this.bindModules(container);
        this.bindStrategies(container);

        // 3. 从容器解析模块并注册到 GameModule
        this._assembleFromContainer(container);

        // 4. 子类扩展点
        this.setupProcedures();
        this.setupDataTables();

        this._container = container;
        Logger.info(DemoBase.TAG, 'bootstrapWithDI 完成，共注册 15 个模块');
        return container;
    }

    /**
     * 绑定模块实现到容器
     * 子类可重写以替换模块实现
     * @param container DI 容器
     */
    protected bindModules(container: Container): void {
        container
            .bind(SERVICE_KEYS.Logger)
            .toFactory(() => new Logger())
            .inSingletonScope();
        container
            .bind(SERVICE_KEYS.EventManager)
            .toFactory(() => new EventManager())
            .inSingletonScope();
        container
            .bind(SERVICE_KEYS.TimerManager)
            .toFactory(() => new TimerManager())
            .inSingletonScope();
        container
            .bind(SERVICE_KEYS.FsmManager)
            .toFactory(() => new FsmManager())
            .inSingletonScope();
        container
            .bind(SERVICE_KEYS.ProcedureManager)
            .toFactory(() => new ProcedureManager())
            .inSingletonScope();
        container
            .bind(SERVICE_KEYS.ResourceManager)
            .toFactory(() => new ResourceManager())
            .inSingletonScope();
        container
            .bind(SERVICE_KEYS.AudioManager)
            .toFactory(() => new AudioManager())
            .inSingletonScope();
        container
            .bind(SERVICE_KEYS.SceneManager)
            .toFactory(() => new SceneManager())
            .inSingletonScope();
        container
            .bind(SERVICE_KEYS.UIManager)
            .toFactory(() => new UIManager())
            .inSingletonScope();
        container
            .bind(SERVICE_KEYS.EntityManager)
            .toFactory(() => new EntityManager())
            .inSingletonScope();
        container
            .bind(SERVICE_KEYS.NetworkManager)
            .toFactory(() => new NetworkManager())
            .inSingletonScope();
        container
            .bind(SERVICE_KEYS.DataTableManager)
            .toFactory(() => new DataTableManager())
            .inSingletonScope();
        container
            .bind(SERVICE_KEYS.LocalizationManager)
            .toFactory(() => new LocalizationManager())
            .inSingletonScope();
        container
            .bind(SERVICE_KEYS.HotUpdateManager)
            .toFactory(() => {
                const em = container.resolve(SERVICE_KEYS.EventManager) as EventManager;
                return new HotUpdateManager(em);
            })
            .inSingletonScope();
        container
            .bind(SERVICE_KEYS.DebugManager)
            .toFactory(() => new DebugManager())
            .inSingletonScope();
    }

    /**
     * 绑定策略实现到容器
     * 子类可重写以使用不同的策略实现（如替换 Mock 为真实引擎适配器）
     * @param container DI 容器
     */
    protected bindStrategies(container: Container): void {
        container
            .bind(SERVICE_KEYS.ResourceLoader)
            .toFactory(() => new MockResourceLoader())
            .inSingletonScope();
        container
            .bind(SERVICE_KEYS.AudioPlayer)
            .toFactory(() => new MockAudioPlayer())
            .inSingletonScope();
        container
            .bind(SERVICE_KEYS.SceneLoader)
            .toFactory(() => new MockSceneLoader())
            .inSingletonScope();
        container
            .bind(SERVICE_KEYS.UIFormFactory)
            .toFactory(() => new MockUIFormFactory())
            .inSingletonScope();
        container
            .bind(SERVICE_KEYS.EntityFactory)
            .toFactory(() => new MockEntityFactory())
            .inSingletonScope();
        container
            .bind(SERVICE_KEYS.DataTableParser)
            .toFactory(() => new MockDataTableParser())
            .inSingletonScope();
        container
            .bind(SERVICE_KEYS.HotUpdateAdapter)
            .toFactory(() => new MockHotUpdateAdapter())
            .inSingletonScope();
        container
            .bind(SERVICE_KEYS.VersionComparator)
            .toFactory(() => new MockVersionComparator())
            .inSingletonScope();
    }

    /**
     * 从容器解析所有模块，注册到 GameModule 并注入策略
     * @param container DI 容器
     */
    private _assembleFromContainer(container: Container): void {
        // 解析模块实例（接口类型，实际为 ModuleBase 子类实例）
        const logger = container.resolve(SERVICE_KEYS.Logger);
        const eventManager = container.resolve(SERVICE_KEYS.EventManager);
        const timerManager = container.resolve(SERVICE_KEYS.TimerManager);
        const fsmManager = container.resolve(SERVICE_KEYS.FsmManager);
        const procedureManager = container.resolve(SERVICE_KEYS.ProcedureManager);
        const resourceManager = container.resolve(SERVICE_KEYS.ResourceManager);
        const audioManager = container.resolve(SERVICE_KEYS.AudioManager);
        const sceneManager = container.resolve(SERVICE_KEYS.SceneManager);
        const uiManager = container.resolve(SERVICE_KEYS.UIManager);
        const entityManager = container.resolve(SERVICE_KEYS.EntityManager);
        const networkManager = container.resolve(SERVICE_KEYS.NetworkManager);
        const dataTableManager = container.resolve(SERVICE_KEYS.DataTableManager);
        const localizationManager = container.resolve(SERVICE_KEYS.LocalizationManager);
        const hotUpdateManager = container.resolve(SERVICE_KEYS.HotUpdateManager);
        const debugManager = container.resolve(SERVICE_KEYS.DebugManager);

        // 按优先级注册模块
        // 注意：resolve 返回接口类型，但实际实例均为 ModuleBase 子类
        const modules: ModuleBase[] = [
            logger,
            eventManager as unknown as ModuleBase,
            timerManager as unknown as ModuleBase,
            resourceManager as unknown as ModuleBase,
            networkManager as unknown as ModuleBase,
            fsmManager as unknown as ModuleBase,
            hotUpdateManager as unknown as ModuleBase,
            entityManager as unknown as ModuleBase,
            uiManager as unknown as ModuleBase,
            audioManager as unknown as ModuleBase,
            sceneManager as unknown as ModuleBase,
            procedureManager as unknown as ModuleBase,
            dataTableManager,
            localizationManager as unknown as ModuleBase,
            debugManager,
        ];
        for (const mod of modules) {
            GameModule.register(mod);
        }

        Logger.info(DemoBase.TAG, '所有模块注册完成，开始注入策略...');

        // 注入策略
        resourceManager.setResourceLoader(container.resolve(SERVICE_KEYS.ResourceLoader));
        audioManager.setAudioPlayer(container.resolve(SERVICE_KEYS.AudioPlayer));
        sceneManager.setSceneLoader(container.resolve(SERVICE_KEYS.SceneLoader));
        uiManager.setUIFormFactory(container.resolve(SERVICE_KEYS.UIFormFactory));
        entityManager.setEntityFactory(container.resolve(SERVICE_KEYS.EntityFactory));
        dataTableManager.setParser(container.resolve(SERVICE_KEYS.DataTableParser));
        hotUpdateManager.setAdapter(container.resolve(SERVICE_KEYS.HotUpdateAdapter));
        hotUpdateManager.setComparator(container.resolve(SERVICE_KEYS.VersionComparator));

        // 设置跨模块引用
        (networkManager as NetworkManager).setEventManager(eventManager);
        (localizationManager as LocalizationManager).setEventManager(eventManager);

        Logger.info(DemoBase.TAG, '策略注入完成');
    }

    /**
     * 启动主循环（setInterval 模拟引擎 update）
     * @param fps 帧率，默认 30
     */
    startMainLoop(fps: number = 30): void {
        if (this._mainLoopTimer !== null) {
            Logger.warn(DemoBase.TAG, '主循环已在运行，请先 stopMainLoop');
            return;
        }
        this._isRunning = true;
        this._lastFrameTime = Date.now();
        const interval = 1000 / fps;

        this._mainLoopTimer = setInterval(() => {
            const now = Date.now();
            const dt = (now - this._lastFrameTime) / 1000; // 秒
            this._lastFrameTime = now;
            GameModule.update(dt);
        }, interval);

        Logger.info(DemoBase.TAG, `主循环已启动, fps=${fps}, interval=${interval.toFixed(1)}ms`);
    }

    /**
     * 停止主循环
     */
    stopMainLoop(): void {
        if (this._mainLoopTimer !== null) {
            clearInterval(this._mainLoopTimer);
            this._mainLoopTimer = null;
            this._isRunning = false;
            Logger.info(DemoBase.TAG, '主循环已停止');
        }
    }

    /**
     * 获取已注册模块的类型安全快捷方法
     * @template T 模块类型，必须继承 ModuleBase
     * @param name 模块名称
     * @returns 模块实例
     */
    protected getModule<T extends ModuleBase>(name: string): T {
        return GameModule.getModule<T>(name);
    }

    /**
     * 获取 DI 容器（仅 bootstrapWithDI 模式下可用）
     * @returns DI 容器，未使用 DI 模式时返回 null
     */
    public get container(): Container | null {
        return this._container;
    }

    /**
     * 关闭框架，停止主循环并销毁所有模块
     */
    shutdown(): void {
        Logger.info(DemoBase.TAG, '开始关闭...');
        this.stopMainLoop();
        GameModule.shutdownAll();
        if (this._container) {
            this._container.clear();
            this._container = null;
        }
        Logger.info(DemoBase.TAG, '关闭完成');
    }
}

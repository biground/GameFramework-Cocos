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
     * 关闭框架，停止主循环并销毁所有模块
     */
    shutdown(): void {
        Logger.info(DemoBase.TAG, '开始关闭...');
        this.stopMainLoop();
        GameModule.shutdownAll();
        Logger.info(DemoBase.TAG, '关闭完成');
    }
}

import { ModuleBase } from '../core/ModuleBase';
import { Logger } from './Logger';
import { IDebugDataSource, DebugSnapshot, DebugManagerConfig } from './DebugDefs';

/**
 * 调试管理器
 * 负责管理调试数据源的注册与注销，定时采集调试数据并格式化输出
 *
 * 设计说明：
 * - 通过 IDebugDataSource 接口实现可扩展的数据采集
 * - 支持注册/注销 DataSource，按名称唯一标识
 * - 支持定时采集（通过 collectInterval 控制节流）
 * - 使用 Logger 输出，禁止直接使用 console
 *
 * @example
 * ```typescript
 * const debugMgr = GameModule.getModule<DebugManager>('DebugManager');
 * debugMgr.registerDataSource(new ModuleDataSource());
 * const snapshot = debugMgr.collectAll();
 * ```
 */
export class DebugManager extends ModuleBase {
    private static readonly TAG = 'DebugManager';

    /** 已注册的数据源映射表 */
    private _dataSources: Map<string, IDebugDataSource> = new Map();

    /** 上次采集时间戳（秒） */
    private _lastCollectTime: number = 0;

    /** 管理器配置 */
    private _config: DebugManagerConfig = {
        collectInterval: 1,
    };

    /** 模块名称 */
    public get moduleName(): string {
        return 'DebugManager';
    }

    /** 模块优先级（业务模块层，确保在其他模块之后初始化） */
    public get priority(): number {
        return 400;
    }

    // ─── 生命周期 ────────────────────────────────

    /** 模块初始化 */
    public onInit(): void {
        Logger.info(DebugManager.TAG, `初始化, collectInterval=${this._config.collectInterval}`);
    }

    /**
     * 每帧更新
     * @param deltaTime 时间增量（秒）
     */
    public onUpdate(deltaTime: number): void {
        this._lastCollectTime += deltaTime;
        if (this._lastCollectTime >= this._config.collectInterval) {
            this._lastCollectTime = 0;
            this.collectAll();
        }
    }

    /** 模块销毁 */
    public onShutdown(): void {
        Logger.info(DebugManager.TAG, `调试管理器关闭, 清理 ${this._dataSources.size} 个数据源`);
        this._dataSources.clear();
        this._lastCollectTime = 0;
    }

    // ─── 公共 API ────────────────────────────────

    /**
     * 注册调试数据源
     * 同名数据源不允许重复注册，重复注册时使用 Logger.warn 输出警告
     * @param source 数据源实例
     */
    public registerDataSource(source: IDebugDataSource): void {
        if (this._dataSources.has(source.name)) {
            Logger.warn(DebugManager.TAG, `数据源 "${source.name}" 已注册，忽略重复注册`);
            return;
        }
        this._dataSources.set(source.name, source);
        Logger.info(DebugManager.TAG, `注册数据源: ${source.name}`);
    }

    /**
     * 注销调试数据源
     * @param name 数据源名称
     * @returns 是否成功注销（名称不存在时返回 false）
     */
    public unregisterDataSource(name: string): boolean {
        if (!this._dataSources.has(name)) {
            return false;
        }
        this._dataSources.delete(name);
        Logger.info(DebugManager.TAG, `注销数据源: ${name}`);
        return true;
    }

    /**
     * 采集所有已注册数据源的数据，生成完整快照
     * @returns 调试数据快照
     */
    public collectAll(): DebugSnapshot {
        const snapshot: DebugSnapshot = {
            timestamp: Date.now(),
            sections: [],
        };
        for (const source of this._dataSources.values()) {
            snapshot.sections.push(source.collect());
        }
        return snapshot;
    }

    /**
     * 获取格式化后的快照字符串，用于控制台输出
     * 格式示例：
     * ```
     * === Debug Snapshot [12:34:56.789] ===
     * [Modules]
     *   模块数量: 5
     *   已排序: true
     * [Events]
     *   事件类型数: 3
     * ===================================
     * ```
     * @returns 控制台友好的格式化字符串
     */
    public getSnapshot(): string {
        const snapshot = this.collectAll();
        const date = new Date(snapshot.timestamp);
        const h = String(date.getHours()).padStart(2, '0');
        const m = String(date.getMinutes()).padStart(2, '0');
        const s = String(date.getSeconds()).padStart(2, '0');
        const ms = String(date.getMilliseconds()).padStart(3, '0');
        const timeStr = `${h}:${m}:${s}.${ms}`;

        const lines: string[] = [];
        lines.push(`=== Debug Snapshot [${timeStr}] ===`);

        if (snapshot.sections.length === 0) {
            lines.push('(无数据源)');
        } else {
            for (const section of snapshot.sections) {
                lines.push(`[${section.title}]`);
                for (const entry of section.entries) {
                    lines.push(`  ${entry.label}: ${entry.value}`);
                }
            }
        }

        lines.push('===================================');
        return lines.join('\n');
    }

    /**
     * 获取指定名称的数据源
     * @param name 数据源名称
     * @returns 数据源实例，不存在时返回 undefined
     */
    public getDataSource(name: string): IDebugDataSource | undefined {
        return this._dataSources.get(name);
    }
}

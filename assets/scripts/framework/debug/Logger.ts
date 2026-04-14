import { ModuleBase } from '../core/ModuleBase';
import { LogLevel } from './LoggerDefs';

/**
 * 日志管理器
 * 提供统一的日志输出、级别过滤、格式化功能
 *
 * 设计要点：
 * - 静态 API + ModuleBase 混合：Logger.warn() 便捷调用，同时走框架生命周期
 * - 级别过滤：Debug < Info < Warn < Error < None
 * - 格式化输出：[级别][模块名] 消息内容
 * - 性能优先：使用 rest params 避免模板字符串的提前求值
 */
export class Logger extends ModuleBase {
    // ─── 静态单例引用 ──────────────────────────
    private static _instance: Logger | null = null;

    // ─── 静态默认级别（实例化前的降级配置） ────
    private static _defaultLevel: LogLevel = LogLevel.Debug;

    // ─── 实例属性 ──────────────────────────────
    private _level: LogLevel = LogLevel.Debug;

    public get moduleName(): string {
        return 'Logger';
    }

    public get priority(): number {
        return 0;
    }

    // ─── 生命周期 ────────────────────────────

    /** 初始化，注册静态实例引用 */
    public onInit(): void {
        // TODO: 注册静态实例引用
        void Logger._instance;
        void Logger._defaultLevel;
    }

    /** 销毁，清理静态实例引用 */
    public onShutdown(): void {
        // TODO: 清理静态实例引用，重置级别
    }

    // ─── 实例方法 ────────────────────────────

    /** 设置日志级别 */
    public setLogLevel(level: LogLevel): void {
        this._level = level;
    }

    /** 获取当前日志级别 */
    public getLogLevel(): LogLevel {
        return this._level;
    }

    // ─── 静态 API ───────────────────────────

    /** 输出 Debug 级别日志 */
    public static debug(_tag: string, ..._args: unknown[]): void {
        // TODO: 实现
    }

    /** 输出 Info 级别日志 */
    public static info(_tag: string, ..._args: unknown[]): void {
        // TODO: 实现
    }

    /** 输出 Warn 级别日志 */
    public static warn(_tag: string, ..._args: unknown[]): void {
        // TODO: 实现
    }

    /** 输出 Error 级别日志 */
    public static error(_tag: string, ..._args: unknown[]): void {
        // TODO: 实现
    }

    /** 设置日志级别（静态） */
    public static setLevel(_level: LogLevel): void {
        // TODO: 实现
    }

    /** 获取日志级别（静态） */
    public static getLevel(): LogLevel {
        // TODO: 实现
        return LogLevel.Debug;
    }

    /** 检查 Debug 级别是否启用（用于惰性求值守卫） */
    public static get isDebugEnabled(): boolean {
        // TODO: 实现
        return true;
    }
}

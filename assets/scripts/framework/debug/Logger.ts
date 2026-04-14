/* eslint-disable no-console */
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
        Logger._instance = this;
    }

    /** 销毁，清理静态实例引用，重置级别 */
    public onShutdown(): void {
        Logger._instance = null;
        Logger._defaultLevel = LogLevel.Debug;
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

    // ─── 静态常量（避免热路径对象分配） ─────────

    /** 日志级别 → 标签映射 */
    private static readonly _levelLabels: Record<LogLevel, string> = {
        [LogLevel.Debug]: 'DEBUG',
        [LogLevel.Info]: 'INFO',
        [LogLevel.Warn]: 'WARN',
        [LogLevel.Error]: 'ERROR',
        [LogLevel.None]: '',
    };

    /** 日志级别 → console 方法名映射（避免捕获引用导致 mock 失效） */
    private static readonly _consoleMethodNames: Record<
        LogLevel,
        'debug' | 'info' | 'warn' | 'error' | null
    > = {
        [LogLevel.Debug]: 'debug',
        [LogLevel.Info]: 'info',
        [LogLevel.Warn]: 'warn',
        [LogLevel.Error]: 'error',
        [LogLevel.None]: null,
    };

    // ─── 核心日志方法 ─────────────────────────

    /**
     * 日志输出的内部实现
     * @param level - 日志级别
     * @param tag - 模块标签
     * @param args - 日志参数（rest params 避免模板字符串提前求值）
     */
    private static _log(level: LogLevel, tag: string, ...args: unknown[]): void {
        const currentLevel = Logger._instance ? Logger._instance._level : Logger._defaultLevel;
        if (level < currentLevel) {
            return;
        }

        const prefix = `[${Logger._levelLabels[level]}][${tag}]`;
        const methodName = Logger._consoleMethodNames[level];
        if (methodName) {
            console[methodName](prefix, ...args);
        }
    }

    // ─── 静态 API ───────────────────────────

    /** 输出 Debug 级别日志 */
    public static debug(tag: string, ...args: unknown[]): void {
        Logger._log(LogLevel.Debug, tag, ...args);
    }

    /** 输出 Info 级别日志 */
    public static info(tag: string, ...args: unknown[]): void {
        Logger._log(LogLevel.Info, tag, ...args);
    }

    /** 输出 Warn 级别日志 */
    public static warn(tag: string, ...args: unknown[]): void {
        Logger._log(LogLevel.Warn, tag, ...args);
    }

    /** 输出 Error 级别日志 */
    public static error(tag: string, ...args: unknown[]): void {
        Logger._log(LogLevel.Error, tag, ...args);
    }

    /** 设置日志级别（静态） */
    public static setLevel(level: LogLevel): void {
        if (Logger._instance) {
            Logger._instance._level = level;
        }
        Logger._defaultLevel = level;
    }

    /** 获取日志级别（静态） */
    public static getLevel(): LogLevel {
        return Logger._instance ? Logger._instance._level : Logger._defaultLevel;
    }

    /** 检查 Debug 级别是否启用（用于惰性求值守卫） */
    public static get isDebugEnabled(): boolean {
        const currentLevel = Logger._instance ? Logger._instance._level : Logger._defaultLevel;
        return LogLevel.Debug >= currentLevel;
    }
}

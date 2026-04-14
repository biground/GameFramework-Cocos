/* eslint-disable no-console */
import { ModuleBase } from '../core/ModuleBase';
import { LogLevel, LogEntry, ILogOutput } from './LoggerDefs';

/**
 * 默认控制台输出策略
 * 支持颜色编码（浏览器环境）和格式化输出
 */
export class ConsoleLogOutput implements ILogOutput {
    /** 是否启用颜色 */
    private _colorEnabled: boolean = true;

    /** 日志级别 → 颜色样式 */
    private static readonly _colorStyles: Record<LogLevel, string> = {
        [LogLevel.Debug]: 'color: #888',
        [LogLevel.Info]: 'color: #2196F3',
        [LogLevel.Warn]: 'color: #FF9800',
        [LogLevel.Error]: 'color: #F44336; font-weight: bold',
        [LogLevel.None]: '',
    };

    /** 日志级别 → 标签映射 */
    private static readonly _levelLabels: Record<LogLevel, string> = {
        [LogLevel.Debug]: 'DEBUG',
        [LogLevel.Info]: 'INFO',
        [LogLevel.Warn]: 'WARN',
        [LogLevel.Error]: 'ERROR',
        [LogLevel.None]: '',
    };

    /** 日志级别 → console 方法名 */
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

    /** 设置是否启用颜色 */
    public setColorEnabled(enabled: boolean): void {
        this._colorEnabled = enabled;
    }

    /** 获取是否启用颜色 */
    public get colorEnabled(): boolean {
        return this._colorEnabled;
    }

    /** 格式化时间戳为 HH:MM:SS.mmm */
    private _formatTimestamp(timestamp: number): string {
        const date = new Date(timestamp);
        const h = String(date.getHours()).padStart(2, '0');
        const m = String(date.getMinutes()).padStart(2, '0');
        const s = String(date.getSeconds()).padStart(2, '0');
        const ms = String(date.getMilliseconds()).padStart(3, '0');
        return `${h}:${m}:${s}.${ms}`;
    }

    /** 输出日志条目到控制台 */
    public log(entry: LogEntry): void {
        const methodName = ConsoleLogOutput._consoleMethodNames[entry.level];
        if (!methodName) {
            return;
        }

        const time = this._formatTimestamp(entry.timestamp);
        const levelLabel = ConsoleLogOutput._levelLabels[entry.level];
        const parts: unknown[] = [];

        if (this._colorEnabled) {
            parts.push(
                `%c[${time}][${levelLabel}][${entry.tag}]`,
                ConsoleLogOutput._colorStyles[entry.level],
            );
        } else {
            parts.push(`[${time}][${levelLabel}][${entry.tag}]`);
        }

        parts.push(...entry.args);
        if (entry.stack) {
            parts.push('\n' + entry.stack);
        }

        console[methodName](...parts);
    }
}

/**
 * 日志管理器
 * 提供统一的日志输出、级别过滤、Tag 过滤、可插拔输出、历史缓冲功能
 *
 * 设计要点：
 * - 静态 API + ModuleBase 混合：Logger.warn() 便捷调用，同时走框架生命周期
 * - 级别过滤：Debug < Info < Warn < Error < None
 * - Tag 过滤：按模块标签开关日志
 * - ILogOutput 策略：可插拔输出目标（控制台/文件/远程）
 * - 历史缓冲：环形缓冲区保留最近 N 条日志
 * - 时间戳 + 错误堆栈：自动附带诊断信息
 * - 性能优先：rest params 避免模板字符串提前求值
 */
export class Logger extends ModuleBase {
    // ─── 静态单例引用 ──────────────────────────
    private static _instance: Logger | null = null;

    // ─── 静态默认级别（实例化前的降级配置） ────
    private static _defaultLevel: LogLevel = LogLevel.Debug;

    // ─── 实例属性 ──────────────────────────────
    private _level: LogLevel = LogLevel.Debug;

    // ─── 输出策略 ──────────────────────────────
    private _outputs: ILogOutput[] = [];

    // ─── Tag 过滤 ──────────────────────────────
    private _disabledTags: Set<string> = new Set();

    // ─── 历史缓冲（环形缓冲区） ────────────────
    private _history: LogEntry[] = [];
    private _historyHead: number = 0;
    private _historyCapacity: number = 100;
    private _historyCount: number = 0;

    public get moduleName(): string {
        return 'Logger';
    }

    public get priority(): number {
        return 0;
    }

    // ─── 生命周期 ────────────────────────────

    /** 初始化，注册静态实例引用，添加默认控制台输出 */
    public onInit(): void {
        Logger._instance = this;
        this._outputs.push(new ConsoleLogOutput());
        this._history = new Array<LogEntry>(this._historyCapacity);
    }

    /** 销毁，清理静态实例引用，重置所有状态 */
    public onShutdown(): void {
        Logger._instance = null;
        Logger._defaultLevel = LogLevel.Debug;
        this._level = LogLevel.Debug;
        this._outputs = [];
        this._disabledTags.clear();
        this._history = [];
        this._historyHead = 0;
        this._historyCount = 0;
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

    // ─── 核心日志方法 ─────────────────────────

    /**
     * 日志输出的内部实现
     * @param level - 日志级别
     * @param tag - 模块标签
     * @param args - 日志参数
     */
    private static _log(level: LogLevel, tag: string, ...args: unknown[]): void {
        const inst = Logger._instance;
        const currentLevel = inst ? inst._level : Logger._defaultLevel;

        // 级别过滤
        if (level < currentLevel) {
            return;
        }

        // Tag 过滤
        if (inst && inst._disabledTags.has(tag)) {
            return;
        }

        // 构建日志条目
        const entry: LogEntry = {
            level,
            tag,
            timestamp: Date.now(),
            args,
        };

        // Error 级别自动附带调用栈
        if (level === LogLevel.Error) {
            entry.stack = new Error().stack;
        }

        // 写入历史缓冲
        if (inst) {
            inst._writeHistory(entry);
        }

        // 分发到所有输出
        if (inst && inst._outputs.length > 0) {
            for (const output of inst._outputs) {
                output.log(entry);
            }
        }
    }

    /** 写入环形缓冲区 */
    private _writeHistory(entry: LogEntry): void {
        this._history[this._historyHead] = entry;
        this._historyHead = (this._historyHead + 1) % this._historyCapacity;
        if (this._historyCount < this._historyCapacity) {
            this._historyCount++;
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

    /** 检查 Debug 级别是否启用 */
    public static get isDebugEnabled(): boolean {
        const currentLevel = Logger._instance ? Logger._instance._level : Logger._defaultLevel;
        return LogLevel.Debug >= currentLevel;
    }

    // ─── Tag 过滤 API ───────────────────────

    /** 禁用指定 tag 的日志输出 */
    public static disableTag(tag: string): void {
        Logger._instance?._disabledTags.add(tag);
    }

    /** 启用指定 tag 的日志输出 */
    public static enableTag(tag: string): void {
        Logger._instance?._disabledTags.delete(tag);
    }

    /** 批量禁用指定 tag */
    public static disableTags(tags: string[]): void {
        if (!Logger._instance) return;
        for (const tag of tags) {
            Logger._instance._disabledTags.add(tag);
        }
    }

    /** 启用所有 tag（清除过滤列表） */
    public static enableAllTags(): void {
        Logger._instance?._disabledTags.clear();
    }

    /** 获取已禁用的 tag 列表 */
    public static getDisabledTags(): string[] {
        return Logger._instance ? Array.from(Logger._instance._disabledTags) : [];
    }

    // ─── ILogOutput API ─────────────────────

    /** 添加输出策略 */
    public static addOutput(output: ILogOutput): void {
        Logger._instance?._outputs.push(output);
    }

    /** 移除输出策略 */
    public static removeOutput(output: ILogOutput): void {
        if (!Logger._instance) return;
        const idx = Logger._instance._outputs.indexOf(output);
        if (idx >= 0) {
            Logger._instance._outputs.splice(idx, 1);
        }
    }

    /** 获取所有输出策略 */
    public static getOutputs(): readonly ILogOutput[] {
        return Logger._instance ? Logger._instance._outputs : [];
    }

    /** 清除所有输出（含默认 Console） */
    public static clearOutputs(): void {
        if (Logger._instance) {
            Logger._instance._outputs = [];
        }
    }

    // ─── 历史缓冲 API ──────────────────────

    /** 获取日志历史（按时序排列） */
    public static getHistory(): LogEntry[] {
        if (!Logger._instance) return [];
        const inst = Logger._instance;
        const result: LogEntry[] = [];

        if (inst._historyCount < inst._historyCapacity) {
            // 未满：从 0 到 head
            for (let i = 0; i < inst._historyCount; i++) {
                result.push(inst._history[i]);
            }
        } else {
            // 已满：从 head 绕一圈
            for (let i = 0; i < inst._historyCapacity; i++) {
                const idx = (inst._historyHead + i) % inst._historyCapacity;
                result.push(inst._history[idx]);
            }
        }
        return result;
    }

    /** 清空历史缓冲 */
    public static clearHistory(): void {
        if (!Logger._instance) return;
        Logger._instance._history = new Array<LogEntry>(Logger._instance._historyCapacity);
        Logger._instance._historyHead = 0;
        Logger._instance._historyCount = 0;
    }

    /** 设置历史缓冲容量 */
    public static setHistoryCapacity(capacity: number): void {
        if (!Logger._instance || capacity <= 0) return;
        Logger._instance._historyCapacity = capacity;
        Logger.clearHistory();
    }

    /** 获取当前历史条目数 */
    public static getHistoryCount(): number {
        return Logger._instance ? Logger._instance._historyCount : 0;
    }
}

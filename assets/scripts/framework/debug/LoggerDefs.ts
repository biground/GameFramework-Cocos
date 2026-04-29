/**
 * 框架调试标志
 * - 开发环境: true（输出所有日志）
 * - 生产环境: false（仅保留 warn/error，debug/info 被裁剪）
 *
 * Cocos Creator 构建时通过 Define 宏替换为 false
 * Jest 测试时默认为 true
 */
declare global {
    // eslint-disable-next-line no-var
    var GFC_DEBUG: boolean;
}

/**
 * 日志级别枚举
 * 数值越大级别越高，用于过滤控制
 */
export enum LogLevel {
    /** 调试信息，仅开发环境使用 */
    Debug = 0,
    /** 一般信息 */
    Info = 1,
    /** 警告，不致命但需注意 */
    Warn = 2,
    /** 错误，必须处理 */
    Error = 3,
    /** 关闭所有日志 */
    None = 4,
}

/**
 * 日志条目
 * 结构化的日志记录，供 ILogOutput 和历史缓冲使用
 */
export interface LogEntry {
    /** 日志级别 */
    level: LogLevel;
    /** 模块标签 */
    tag: string;
    /** 时间戳（毫秒，Date.now()） */
    timestamp: number;
    /** 日志参数 */
    args: unknown[];
    /** 调用栈（仅 Error 级别自动附带） */
    stack?: string;
}

/**
 * 日志输出策略接口
 * 实现此接口可将日志输出到不同目标（控制台、文件、远程服务器等）
 */
export interface ILogOutput {
    /**
     * 输出一条日志
     * @param entry - 结构化日志条目
     */
    log(entry: LogEntry): void;
}

/**
 * 带 tag 绑定的轻量日志器
 *
 * 由 {@link Logger.createTagLogger} 创建。
 * 内部使用 `console.*.bind()` 实现——DevTools 调用栈将正确指向
 * 实际调用 `log.debug(...)` 的业务代码行，而非 Logger.ts 内部。
 *
 * ⚠️ 不经过 Logger 的级别过滤、Tag 过滤、ILogOutput 插件和历史缓冲。
 * 适用于开发调试；生产日志仍推荐使用 `Logger.info(TAG, ...)` 静态 API。
 */
export interface TaggedLogger {
    /** 该 logger 绑定的模块 tag */
    readonly tag: string;
    /** Debug 级别，调用栈精确指向业务调用方 */
    readonly debug: (...args: unknown[]) => void;
    /** Info 级别，调用栈精确指向业务调用方 */
    readonly info: (...args: unknown[]) => void;
    /** Warn 级别，调用栈精确指向业务调用方 */
    readonly warn: (...args: unknown[]) => void;
    /** Error 级别，调用栈精确指向业务调用方 */
    readonly error: (...args: unknown[]) => void;
}

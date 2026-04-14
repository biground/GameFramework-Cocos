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

/**
 * 调试管理器类型定义
 */

/**
 * 调试数据条目
 */
export interface DebugEntry {
    /** 标签 */
    label: string;
    /** 值 */
    value: string;
}

/**
 * 调试数据分区
 */
export interface DebugSectionData {
    /** 分区标题 */
    title: string;
    /** 数据条目列表 */
    entries: DebugEntry[];
}

/**
 * 调试数据源接口
 */
export interface IDebugDataSource {
    /** 数据源名称 */
    readonly name: string;
    /** 采集调试数据 */
    collect(): DebugSectionData;
}

/**
 * 调试数据快照
 */
export interface DebugSnapshot {
    /** 采集时间戳 */
    timestamp: number;
    /** 各数据源的分区数据 */
    sections: DebugSectionData[];
}

/**
 * 调试管理器配置
 */
export interface DebugManagerConfig {
    /** 采集间隔（秒） */
    collectInterval: number;
}

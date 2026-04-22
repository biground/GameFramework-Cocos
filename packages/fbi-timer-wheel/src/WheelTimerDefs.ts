/**
 * 时间轮定时器 - 类型定义
 *
 * 与堆实现不同：
 * - slotIndex: timer 当前所在的格子索引
 * - remainingRounds: 超范围 delay 需要经过的完整圈数
 */

/** 时间轮中的定时器条目 */
export interface IWheelTimerEntry {
    /** 唯一标识 */
    id: number;
    /** 回调间隔（秒） */
    delay: number;
    /** 触发回调 */
    callback: () => void;
    /** 剩余重复次数（-1 = 无限） */
    repeat: number;
    /** 是否受 timeScale 影响 */
    useTimeScale: boolean;
    /** 标签（用于批量操作） */
    tag?: string;
    /** 当前所在的 slot 索引 */
    slotIndex: number;
    /** 剩余圈数（delay 超过一圈范围时 > 0） */
    remainingRounds: number;
    /** 已标记为删除 */
    removed: boolean;
}

/** 暂停中的定时器 */
export interface IPausedWheelEntry {
    /** 唯一标识 */
    id: number;
    /** 回调间隔（秒） */
    delay: number;
    /** 触发回调 */
    callback: () => void;
    /** 剩余重复次数 */
    repeat: number;
    /** 是否受 timeScale 影响 */
    useTimeScale: boolean;
    /** 标签 */
    tag?: string;
    /** 暂停时剩余的触发时间（秒） */
    remainingTime: number;
}

/** 时间轮构造参数 */
export interface ITimingWheelOptions {
    /** 每个 slot 的时间粒度（秒），默认 0.1 */
    tickInterval?: number;
    /** 格子数量，默认 256（范围 = tickInterval × wheelSize） */
    wheelSize?: number;
}

// ─── 常量 ──────────────────────────────────────────────

/** 无限重复标记 */
export const TIMER_REPEAT_FOREVER = -1;

// ─── 数据结构 ──────────────────────────────────────────

/**
 * 定时器配置选项
 */
export interface ITimerOptions {
    /**
     * 重复次数
     * - 0: 一次性定时器（默认）
     * - N (>0): 重复 N 次后自动移除
     * - -1: 无限重复，直到手动移除
     */
    repeat?: number;

    /**
     * 首次触发前的延迟时间（秒）
     * 默认等于 delay 参数
     * 用于实现"立即触发一次 + 后续按间隔重复"的模式：设为 0
     */
    initialDelay?: number;

    /**
     * 是否受时间缩放影响
     * 默认 true；设为 false 则使用真实时间（如 UI 动画）
     */
    useTimeScale?: boolean;

    /**
     * 可选标签，用于按标签批量操作
     * 示例：'combat' / 'ui-anim' / 'buff'
     */
    tag?: string;
}

/**
 * 定时器内部数据结构
 * 由 TimerManager 内部使用，外部不应直接操作
 */
export interface ITimerEntry {
    /** 唯一标识 */
    readonly id: number;
    /** 触发间隔（秒） */
    readonly delay: number;
    /** 触发回调 */
    readonly callback: () => void;
    /** 剩余重复次数（-1 = 无限） */
    repeat: number;
    /** 已累积时间（秒） */
    elapsed: number;
    /** 当前触发的目标时间（首次可能和 delay 不同） */
    currentDelay: number;
    /** 是否暂停 */
    paused: boolean;
    /** 是否已标记删除 */
    removed: boolean;
    /** 是否受时间缩放影响 */
    useTimeScale: boolean;
    /** 可选标签 */
    tag: string | null;
}

/**
 * 定时器信息（只读外部视图）
 */
export interface ITimerInfo {
    /** 唯一标识 */
    readonly id: number;
    /** 触发间隔 */
    readonly delay: number;
    /** 已累积时间 */
    readonly elapsed: number;
    /** 剩余重复次数 */
    readonly repeat: number;
    /** 是否暂停 */
    readonly paused: boolean;
    /** 标签 */
    readonly tag: string | null;
}

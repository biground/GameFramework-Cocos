/**
 * 堆定时器内部条目
 * 和数组版 ITimerEntry 的关键区别：使用绝对到期时间 expireTime 而非累积 elapsed
 */
export interface IHeapTimerEntry {
    /** 唯一标识 */
    readonly id: number;
    /** 触发间隔（秒）*/
    readonly delay: number;
    /** 触发回调 */
    readonly callback: () => void;
    /** 剩余重复次数（-1 = 无限） */
    repeat: number;
    /** 到期绝对时间（秒）——堆按此字段排序 */
    expireTime: number;
    /** 是否受时间缩放影响 */
    useTimeScale: boolean;
    /** 可选标签 */
    tag: string | null;
    /** 在堆数组中的索引（用于 O(1) 定位 + O(log n) 调整） */
    heapIndex: number;
}

/**
 * 暂停中的定时器条目
 * pause 时从堆取出，记录剩余时间；resume 时重算 expireTime 再入堆
 */
export interface IPausedTimerEntry {
    /** 唯一标识 */
    readonly id: number;
    /** 触发间隔（秒）*/
    readonly delay: number;
    /** 触发回调 */
    readonly callback: () => void;
    /** 剩余重复次数 */
    repeat: number;
    /** 暂停时的剩余时间（expireTime - pauseTime） */
    remainingTime: number;
    /** 是否受时间缩放影响 */
    useTimeScale: boolean;
    /** 可选标签 */
    tag: string | null;
}

import { ITimerInfo, ITimerOptions } from '../timer/TimerDefs';

/**
 * 定时器管理器接口
 * 提供统一的定时器创建、管理、暂停/恢复和时间缩放能力
 */
export interface ITimerManager {
    /**
     * 全局时间缩放系数
     * 1.0 = 正常速度, 0.5 = 慢动作, 2.0 = 加速
     */
    timeScale: number;

    /**
     * 当前活跃定时器数量
     */
    readonly activeCount: number;

    // ─── 创建 & 移除 ──────────────────────────────────

    /**
     * 添加一个定时器
     * @param delay 触发间隔（秒），必须 > 0
     * @param callback 触发时执行的回调
     * @param options 可选配置（重复次数、初始延迟、时间缩放、标签）
     * @returns 定时器 ID，用于后续操作
     */
    addTimer(delay: number, callback: () => void, options?: ITimerOptions): number;

    /**
     * 移除指定定时器
     * @param id 定时器 ID
     * @returns 是否成功移除
     */
    removeTimer(id: number): boolean;

    /**
     * 移除所有定时器
     */
    removeAllTimers(): void;

    /**
     * 按标签移除定时器
     * @param tag 标签
     * @returns 移除的数量
     */
    removeTimersByTag(tag: string): number;

    // ─── 暂停 & 恢复 ──────────────────────────────────

    /**
     * 暂停指定定时器
     * @param id 定时器 ID
     * @returns 是否成功暂停
     */
    pauseTimer(id: number): boolean;

    /**
     * 恢复指定定时器
     * @param id 定时器 ID
     * @returns 是否成功恢复
     */
    resumeTimer(id: number): boolean;

    /**
     * 暂停所有定时器
     */
    pauseAllTimers(): void;

    /**
     * 恢复所有定时器
     */
    resumeAllTimers(): void;

    /**
     * 按标签暂停定时器
     * @param tag 标签
     * @returns 暂停的数量
     */
    pauseTimersByTag(tag: string): number;

    /**
     * 按标签恢复定时器
     * @param tag 标签
     * @returns 恢复的数量
     */
    resumeTimersByTag(tag: string): number;

    // ─── 查询 ──────────────────────────────────────────

    /**
     * 获取定时器信息
     * @param id 定时器 ID
     * @returns 定时器信息，不存在时返回 null
     */
    getTimerInfo(id: number): ITimerInfo | null;

    /**
     * 是否存在指定定时器
     * @param id 定时器 ID
     */
    hasTimer(id: number): boolean;
}

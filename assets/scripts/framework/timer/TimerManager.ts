import { ModuleBase } from '../core/ModuleBase';
import { Logger } from '../debug/Logger';
import { ITimerEntry, ITimerInfo, ITimerOptions } from './TimerDefs';
import { ITimerManager } from '../interfaces/ITimerManager';

/**
 * 定时器管理器
 *
 * 管理所有游戏内定时器的创建、更新、暂停/恢复和销毁。
 * 支持单次触发、有限重复、无限重复、时间缩放和标签分组。
 *
 * 遍历安全：回调中调用 removeTimer 使用标记删除 + 延迟清理，
 * 不会破坏当前帧的遍历。
 *
 * @example
 * ```typescript
 * const timerMgr = GameEntry.getModule<TimerManager>('TimerManager');
 * // 3 秒后触发一次
 * const id = timerMgr.addTimer(3, () => console.log('done'));
 * // 每 1 秒触发，无限重复
 * timerMgr.addTimer(1, () => tick(), { repeat: -1 });
 * // 暂停
 * timerMgr.pauseTimer(id);
 * ```
 */
export class TimerManager extends ModuleBase implements ITimerManager {
    private static readonly TAG = 'TimerManager';

    // ─── ModuleBase ────────────────────────────────────

    public get moduleName(): string {
        return 'TimerManager';
    }

    public get priority(): number {
        return 10;
    }

    // ─── 内部状态 ──────────────────────────────────────

    /** 定时器列表（顺序遍历用） */
    private _timers: ITimerEntry[] = [];

    /** id → entry 的哈希索引，O(1) 查找 */
    private _timerMap: Map<number, ITimerEntry> = new Map();

    /** 活跃定时器计数缓存 */
    private _activeCount = 0;

    /** 下一个可用 ID */
    private _nextId = 1;

    /** 全局时间缩放 */
    private _timeScale = 1.0;

    /** 当前是否在 update 遍历中 */
    private _updating = false;

    /** 遍历期间是否有定时器被标记删除 */
    private _hasRemoved = false;

    // ─── ITimerManager 属性 ────────────────────────────

    /** 全局时间缩放系数 */
    public get timeScale(): number {
        return this._timeScale;
    }

    public set timeScale(value: number) {
        if (value < 0) {
            Logger.error(TimerManager.TAG, 'timeScale 不能为负数');
            return;
        }
        this._timeScale = value;
    }

    /** 当前活跃定时器数量（O(1) 缓存） */
    public get activeCount(): number {
        return this._activeCount;
    }

    // ─── 生命周期 ──────────────────────────────────────

    public onInit(): void {
        Logger.debug(TimerManager.TAG, '初始化完成');
    }

    public onUpdate(deltaTime: number): void {
        if (this._timers.length === 0) {
            return;
        }

        this._updating = true;

        // 保存遍历前的长度，本帧新加的 Timer 不参与遍历
        const count = this._timers.length;
        for (let i = 0; i < count; i++) {
            const timer = this._timers[i];

            // 跳过已删除或已暂停的
            if (timer.removed || timer.paused) {
                continue;
            }

            // 计算实际 dt
            const dt = timer.useTimeScale ? deltaTime * this._timeScale : deltaTime;
            timer.elapsed += dt;

            // 检查是否触发
            if (timer.elapsed >= timer.currentDelay) {
                // 触发回调
                timer.callback();

                // 处理重复逻辑
                if (timer.removed) {
                    // 回调中可能调用了 removeTimer
                    continue;
                }

                if (timer.repeat === 0) {
                    // 一次性定时器，标记删除
                    timer.removed = true;
                    this._hasRemoved = true;
                    this._activeCount--;
                } else {
                    // 重复定时器
                    if (timer.repeat > 0) {
                        timer.repeat--;
                    }
                    // 重置 elapsed（保留溢出量以保证精度）
                    timer.elapsed -= timer.currentDelay;
                    // 后续使用 delay 而非 initialDelay
                    timer.currentDelay = timer.delay;
                }
            }
        }

        this._updating = false;

        // 延迟清理已标记删除的定时器
        if (this._hasRemoved) {
            this._cleanupRemoved();
        }
    }

    public onShutdown(): void {
        this._timers.length = 0;
        this._timerMap.clear();
        this._activeCount = 0;
        this._nextId = 1;
        this._updating = false;
        this._hasRemoved = false;
        this._timeScale = 1.0;
        Logger.debug(TimerManager.TAG, '已关闭');
    }

    // ─── 创建 & 移除 ──────────────────────────────────

    public addTimer(delay: number, callback: () => void, options?: ITimerOptions): number {
        if (delay <= 0) {
            Logger.error(TimerManager.TAG, 'delay 必须大于 0');
            throw new Error('[TimerManager] delay 必须大于 0');
        }
        if (!callback) {
            Logger.error(TimerManager.TAG, 'callback 不能为空');
            throw new Error('[TimerManager] callback 不能为空');
        }

        const repeat = options?.repeat ?? 0;
        const initialDelay = options?.initialDelay ?? delay;
        const useTimeScale = options?.useTimeScale ?? true;
        const tag = options?.tag ?? null;

        if (initialDelay < 0) {
            Logger.error(TimerManager.TAG, 'initialDelay 不能为负数');
            throw new Error('[TimerManager] initialDelay 不能为负数');
        }

        const id = this._nextId++;
        const entry: ITimerEntry = {
            id,
            delay,
            callback,
            repeat,
            elapsed: 0,
            currentDelay: initialDelay,
            paused: false,
            removed: false,
            useTimeScale,
            tag,
        };

        this._timers.push(entry);
        this._timerMap.set(id, entry);
        this._activeCount++;
        Logger.debug(TimerManager.TAG, `添加定时器 #${id}, delay=${delay}, repeat=${repeat}`);
        return id;
    }

    public removeTimer(id: number): boolean {
        const timer = this._findTimer(id);
        if (!timer) {
            return false;
        }

        timer.removed = true;
        this._activeCount--;

        if (this._updating) {
            this._hasRemoved = true;
        } else {
            this._cleanupRemoved();
        }

        return true;
    }

    public removeAllTimers(): void {
        if (this._updating) {
            // 遍历中：标记全部删除
            for (let i = 0; i < this._timers.length; i++) {
                this._timers[i].removed = true;
            }
            this._hasRemoved = true;
        } else {
            this._timers.length = 0;
            this._timerMap.clear();
        }
        this._activeCount = 0;
    }

    public removeTimersByTag(tag: string): number {
        let count = 0;
        for (let i = 0; i < this._timers.length; i++) {
            const timer = this._timers[i];
            if (!timer.removed && timer.tag === tag) {
                timer.removed = true;
                count++;
            }
        }

        if (count > 0) {
            this._activeCount -= count;
            if (this._updating) {
                this._hasRemoved = true;
            } else {
                this._cleanupRemoved();
            }
        }

        return count;
    }

    // ─── 暂停 & 恢复 ──────────────────────────────────

    public pauseTimer(id: number): boolean {
        const timer = this._findTimer(id);
        if (!timer || timer.paused) {
            return false;
        }
        timer.paused = true;
        return true;
    }

    public resumeTimer(id: number): boolean {
        const timer = this._findTimer(id);
        if (!timer || !timer.paused) {
            return false;
        }
        timer.paused = false;
        return true;
    }

    public pauseAllTimers(): void {
        for (let i = 0; i < this._timers.length; i++) {
            if (!this._timers[i].removed) {
                this._timers[i].paused = true;
            }
        }
    }

    public resumeAllTimers(): void {
        for (let i = 0; i < this._timers.length; i++) {
            if (!this._timers[i].removed) {
                this._timers[i].paused = false;
            }
        }
    }

    public pauseTimersByTag(tag: string): number {
        let count = 0;
        for (let i = 0; i < this._timers.length; i++) {
            const timer = this._timers[i];
            if (!timer.removed && !timer.paused && timer.tag === tag) {
                timer.paused = true;
                count++;
            }
        }
        return count;
    }

    public resumeTimersByTag(tag: string): number {
        let count = 0;
        for (let i = 0; i < this._timers.length; i++) {
            const timer = this._timers[i];
            if (!timer.removed && timer.paused && timer.tag === tag) {
                timer.paused = false;
                count++;
            }
        }
        return count;
    }

    // ─── 查询 ──────────────────────────────────────────

    public getTimerInfo(id: number): ITimerInfo | null {
        const timer = this._findTimer(id);
        if (!timer) {
            return null;
        }
        return {
            id: timer.id,
            delay: timer.delay,
            elapsed: timer.elapsed,
            repeat: timer.repeat,
            paused: timer.paused,
            tag: timer.tag,
        };
    }

    public hasTimer(id: number): boolean {
        return this._findTimer(id) !== null;
    }

    // ─── 内部方法 ──────────────────────────────────────

    /**
     * 查找指定 ID 的活跃定时器（O(1) Map 查找）
     */
    private _findTimer(id: number): ITimerEntry | null {
        const timer = this._timerMap.get(id);
        if (timer && !timer.removed) {
            return timer;
        }
        return null;
    }

    /**
     * 清理所有标记删除的定时器（swap-and-pop，O(n) 单遍扫描）
     */
    private _cleanupRemoved(): void {
        const timers = this._timers;
        let writeIdx = 0;

        for (let readIdx = 0; readIdx < timers.length; readIdx++) {
            if (timers[readIdx].removed) {
                // 从 Map 中移除
                this._timerMap.delete(timers[readIdx].id);
            } else {
                if (readIdx !== writeIdx) {
                    timers[writeIdx] = timers[readIdx];
                }
                writeIdx++;
            }
        }

        timers.length = writeIdx;
        this._hasRemoved = false;
    }
}

import { ModuleBase } from '@framework/core/ModuleBase';
import { Logger } from '@framework/debug/Logger';
import { ITimerManager } from '@framework/interfaces/ITimerManager';
import { ITimerInfo, ITimerOptions } from '@framework/timer/TimerDefs';
import { TIMER_REPEAT_FOREVER } from '@framework/timer/TimerDefs';
import { IWheelTimerEntry, IPausedWheelEntry, ITimingWheelOptions } from './WheelTimerDefs';

/**
 * 时间轮定时器管理器
 *
 * 原理：把时间切成 wheelSize 个等距 slot，timer 根据 delay 直接计算
 * 放入哪个 slot——添加 O(1)，每帧只遍历当前 slot——触发 O(k/N)。
 *
 * 适用场景：海量定时器（千级以上），精度要求不高（tickInterval 级别）。
 *
 * 注册方式：
 * ```ts
 * GameModule.register('TimerManager',
 *   new WheelTimerManager({ tickInterval: 0.1, wheelSize: 256 }),
 *   { allowReplace: true });
 * ```
 */
export class WheelTimerManager extends ModuleBase implements ITimerManager {
    /** 模块名 */
    readonly moduleName = 'WheelTimerManager';

    /** 优先级：200（业务模块级别） */
    public get priority(): number {
        return 200;
    }

    // ─── 配置 ──────────────────────────────────────────

    /** 每个 slot 的时间粒度（秒） */
    private readonly _tickInterval: number;
    /** 格子数量 */
    private readonly _wheelSize: number;

    // ─── 状态 ──────────────────────────────────────────

    /** 时间轮数组，每个 slot 是一个 entry 数组 */
    private _wheel: IWheelTimerEntry[][] = [];
    /** 当前 slot 指针 */
    private _currentSlot = 0;
    /** 原始累积时间（秒），用于计算 tick 总数 */
    private _rawAccumulator = 0;
    /** 已处理的 tick 总数 */
    private _processedTicks = 0;
    /** 全局时间缩放 */
    private _timeScale = 1.0;
    /** ID 生成器 */
    private _nextId = 1;
    /** 活跃计数 */
    private _activeCount = 0;

    /** id → 活跃 entry 的映射（O(1) 查找） */
    private _activeMap: Map<number, IWheelTimerEntry> = new Map();
    /** id → 暂停 entry 的映射 */
    private _pausedMap: Map<number, IPausedWheelEntry> = new Map();
    /** 当前是否在 onUpdate 的 slot 遍历中 */
    private _updating = false;

    // ─── 构造 ──────────────────────────────────────────

    constructor(options?: ITimingWheelOptions) {
        super();
        this._tickInterval = options?.tickInterval ?? 0.1;
        this._wheelSize = options?.wheelSize ?? 256;

        if (this._tickInterval <= 0) {
            throw new Error('[WheelTimerManager] tickInterval 必须 > 0');
        }
        if (this._wheelSize <= 0 || !Number.isInteger(this._wheelSize)) {
            throw new Error('[WheelTimerManager] wheelSize 必须为正整数');
        }
    }

    // ─── 生命周期 ──────────────────────────────────────

    onInit(): void {
        this._wheel = [];
        for (let i = 0; i < this._wheelSize; i++) {
            this._wheel.push([]);
        }
        this._currentSlot = 0;
        this._rawAccumulator = 0;
        this._processedTicks = 0;
        this._timeScale = 1.0;
        this._nextId = 1;
        this._activeCount = 0;
        this._activeMap.clear();
        this._pausedMap.clear();
    }

    onUpdate(deltaTime: number): void {
        const scaledDt = deltaTime * this._timeScale;
        this._rawAccumulator += scaledDt;

        // 用累积时间除以 tickInterval 计算应该到达的 tick 总数
        // +epsilon 修正浮点误差（0.3/0.1 = 2.999... → 应为 3）
        const targetTicks = Math.floor(this._rawAccumulator / this._tickInterval + 1e-10);

        while (this._processedTicks < targetTicks) {
            this._processedTicks++;
            this._currentSlot = (this._currentSlot + 1) % this._wheelSize;
            this._tickSlot();
        }
    }

    onShutdown(): void {
        for (let i = 0; i < this._wheelSize; i++) {
            this._wheel[i].length = 0;
        }
        this._activeMap.clear();
        this._pausedMap.clear();
        this._activeCount = 0;
        this._timeScale = 1.0;
        this._rawAccumulator = 0;
        this._processedTicks = 0;
        this._currentSlot = 0;
    }

    // ─── timeScale ──────────────────────────────────────

    get timeScale(): number {
        return this._timeScale;
    }

    set timeScale(value: number) {
        if (value < 0) {
            Logger.warn('[WheelTimerManager] timeScale 不能为负，忽略');
            return;
        }
        this._timeScale = value;
    }

    // ─── activeCount ─────────────────────────────────────

    get activeCount(): number {
        return this._activeCount;
    }

    // ─── 创建 & 移除 ──────────────────────────────────

    addTimer(delay: number, callback: () => void, options?: ITimerOptions): number {
        if (delay <= 0) {
            Logger.error('[WheelTimerManager] delay 必须 > 0');
            throw new Error('[WheelTimerManager] delay 必须 > 0');
        }
        if (!callback) {
            Logger.error('[WheelTimerManager] callback 不能为空');
            throw new Error('[WheelTimerManager] callback 不能为空');
        }

        const repeat = options?.repeat ?? 0;
        const initialDelay = options?.initialDelay ?? delay;
        const useTimeScale = options?.useTimeScale ?? true;
        const tag = options?.tag;

        if (initialDelay < 0) {
            Logger.error('[WheelTimerManager] initialDelay 不得为负');
            throw new Error('[WheelTimerManager] initialDelay 不得为负');
        }

        const id = this._nextId++;
        const { slotIndex, rounds } = this._calcSlot(initialDelay);

        const entry: IWheelTimerEntry = {
            id,
            delay,
            callback,
            repeat,
            useTimeScale,
            tag,
            slotIndex,
            remainingRounds: rounds,
            removed: false,
        };

        this._wheel[slotIndex].push(entry);
        this._activeMap.set(id, entry);
        this._activeCount++;

        return id;
    }

    removeTimer(id: number): boolean {
        // 先查活跃
        const entry = this._activeMap.get(id);
        if (entry) {
            entry.removed = true;
            this._activeMap.delete(id);
            this._activeCount--;
            // 如果不在遍历中，直接从 slot 移除
            if (!this._updating) {
                this._removeFromSlot(entry);
            }
            return true;
        }

        // 再查暂停
        if (this._pausedMap.has(id)) {
            this._pausedMap.delete(id);
            this._activeCount--;
            return true;
        }

        return false;
    }

    removeAllTimers(): void {
        for (let i = 0; i < this._wheelSize; i++) {
            const slot = this._wheel[i];
            for (const entry of slot) {
                entry.removed = true;
            }
            if (!this._updating) {
                slot.length = 0;
            }
        }
        this._activeMap.clear();
        this._pausedMap.clear();
        this._activeCount = 0;
    }

    removeTimersByTag(tag: string): number {
        let removed = 0;

        // 活跃的
        for (const [id, entry] of this._activeMap) {
            if (entry.tag === tag) {
                entry.removed = true;
                this._activeMap.delete(id);
                this._activeCount--;
                if (!this._updating) {
                    this._removeFromSlot(entry);
                }
                removed++;
            }
        }

        // 暂停的
        for (const [id, pausedEntry] of this._pausedMap) {
            if (pausedEntry.tag === tag) {
                this._pausedMap.delete(id);
                this._activeCount--;
                removed++;
            }
        }

        return removed;
    }

    // ─── 暂停 & 恢复 ──────────────────────────────────

    pauseTimer(id: number): boolean {
        const entry = this._activeMap.get(id);
        if (!entry) {
            return false;
        }

        // 计算剩余时间：remainingRounds × wheelSize × tickInterval + 距当前 slot 的格数 × tickInterval
        const slotsAhead =
            (entry.slotIndex - this._currentSlot + this._wheelSize) % this._wheelSize;
        const remainingTime =
            (entry.remainingRounds * this._wheelSize + slotsAhead) * this._tickInterval;

        const paused: IPausedWheelEntry = {
            id: entry.id,
            delay: entry.delay,
            callback: entry.callback,
            repeat: entry.repeat,
            useTimeScale: entry.useTimeScale,
            tag: entry.tag,
            remainingTime,
        };

        // 从轮中移除
        entry.removed = true;
        this._activeMap.delete(id);
        if (!this._updating) {
            this._removeFromSlot(entry);
        }

        this._pausedMap.set(id, paused);
        // activeCount 不变（从 active 转 paused 仍算"活跃"）
        return true;
    }

    resumeTimer(id: number): boolean {
        const pausedEntry = this._pausedMap.get(id);
        if (!pausedEntry) {
            return false;
        }

        this._pausedMap.delete(id);

        // 重新计算 slot
        const { slotIndex, rounds } = this._calcSlot(pausedEntry.remainingTime);

        const entry: IWheelTimerEntry = {
            id: pausedEntry.id,
            delay: pausedEntry.delay,
            callback: pausedEntry.callback,
            repeat: pausedEntry.repeat,
            useTimeScale: pausedEntry.useTimeScale,
            tag: pausedEntry.tag,
            slotIndex,
            remainingRounds: rounds,
            removed: false,
        };

        this._wheel[slotIndex].push(entry);
        this._activeMap.set(entry.id, entry);
        return true;
    }

    pauseAllTimers(): void {
        // 复制 keys 避免遍历中修改
        const ids = [...this._activeMap.keys()];
        for (const id of ids) {
            this.pauseTimer(id);
        }
    }

    resumeAllTimers(): void {
        const ids = [...this._pausedMap.keys()];
        for (const id of ids) {
            this.resumeTimer(id);
        }
    }

    pauseTimersByTag(tag: string): number {
        let count = 0;
        const ids = [...this._activeMap.keys()];
        for (const id of ids) {
            const entry = this._activeMap.get(id);
            if (entry && entry.tag === tag) {
                this.pauseTimer(id);
                count++;
            }
        }
        return count;
    }

    resumeTimersByTag(tag: string): number {
        let count = 0;
        const ids = [...this._pausedMap.keys()];
        for (const id of ids) {
            const pausedEntry = this._pausedMap.get(id);
            if (pausedEntry && pausedEntry.tag === tag) {
                this.resumeTimer(id);
                count++;
            }
        }
        return count;
    }

    // ─── 查询 ──────────────────────────────────────────

    getTimerInfo(id: number): ITimerInfo | null {
        const entry = this._activeMap.get(id);
        if (entry) {
            // 估算已过时间：delay 减去剩余时间
            const slotsAhead =
                (entry.slotIndex - this._currentSlot + this._wheelSize) % this._wheelSize;
            const remainingTime =
                (entry.remainingRounds * this._wheelSize + slotsAhead) * this._tickInterval;
            // elapsed 是第一次触发已经过去的时间
            const elapsed = entry.delay - remainingTime;
            return {
                id: entry.id,
                delay: entry.delay,
                elapsed: Math.max(0, elapsed),
                repeat: entry.repeat,
                paused: false,
                tag: entry.tag ?? null,
            };
        }

        const pausedEntry = this._pausedMap.get(id);
        if (pausedEntry) {
            const elapsed = pausedEntry.delay - pausedEntry.remainingTime;
            return {
                id: pausedEntry.id,
                delay: pausedEntry.delay,
                elapsed: Math.max(0, elapsed),
                repeat: pausedEntry.repeat,
                paused: true,
                tag: pausedEntry.tag ?? null,
            };
        }

        return null;
    }

    hasTimer(id: number): boolean {
        return this._activeMap.has(id) || this._pausedMap.has(id);
    }

    // ─── 内部方法 ──────────────────────────────────────

    /**
     * 处理当前 slot 的所有定时器
     */
    private _tickSlot(): void {
        const slot = this._wheel[this._currentSlot];
        this._updating = true;

        // 快照长度——遍历中新添加的不在本轮处理
        const count = slot.length;

        for (let i = 0; i < count; i++) {
            const entry = slot[i];

            // 已标记删除，跳过
            if (entry.removed) {
                continue;
            }

            // 还有剩余圈数，递减后跳过
            if (entry.remainingRounds > 0) {
                entry.remainingRounds--;
                continue;
            }

            // 触发！
            entry.callback();

            // 检查是否在回调中被删除了
            if (entry.removed || !this._activeMap.has(entry.id)) {
                continue;
            }

            // 处理重复
            if (entry.repeat === 0) {
                // 一次性，移除
                entry.removed = true;
                this._activeMap.delete(entry.id);
                this._activeCount--;
            } else {
                // 减少重复次数（TIMER_REPEAT_FOREVER = -1 永远不会到 0）
                if (entry.repeat !== TIMER_REPEAT_FOREVER) {
                    entry.repeat--;
                }

                // 重新放入轮中
                const { slotIndex, rounds } = this._calcSlot(entry.delay);
                entry.removed = true; // 标记旧的，创建新 entry
                this._activeMap.delete(entry.id);

                const newEntry: IWheelTimerEntry = {
                    id: entry.id,
                    delay: entry.delay,
                    callback: entry.callback,
                    repeat: entry.repeat,
                    useTimeScale: entry.useTimeScale,
                    tag: entry.tag,
                    slotIndex,
                    remainingRounds: rounds,
                    removed: false,
                };

                this._wheel[slotIndex].push(newEntry);
                this._activeMap.set(newEntry.id, newEntry);
            }
        }

        this._updating = false;

        // 清理：过滤掉已删除的 entry
        this._cleanupSlot(this._currentSlot);
    }

    /**
     * 计算 delay 对应的 slot 索引和圈数
     */
    private _calcSlot(delay: number): { slotIndex: number; rounds: number } {
        // -epsilon 修正浮点误差（如 0.30000000000000004 / 0.1 = 3.00000004 → ceil 不应变成 4）
        const rawTicks = delay / this._tickInterval;
        const ticks = Math.max(1, Math.ceil(rawTicks - 1e-10));
        const slotOffset = ticks % this._wheelSize;
        const slotIndex = (this._currentSlot + slotOffset) % this._wheelSize;

        // advance-first 模式下，slotOffset=0 意味着需要整圈才能回到 currentSlot
        // 第一次回来时 rounds 已经消耗了一圈，所以 rounds 要减 1
        let rounds: number;
        if (slotOffset === 0) {
            rounds = Math.floor(ticks / this._wheelSize) - 1;
        } else {
            rounds = Math.floor(ticks / this._wheelSize);
        }

        return { slotIndex, rounds };
    }

    /**
     * 从 slot 数组中移除指定 entry
     */
    private _removeFromSlot(entry: IWheelTimerEntry): void {
        const slot = this._wheel[entry.slotIndex];
        const idx = slot.indexOf(entry);
        if (idx !== -1) {
            // swap-and-pop O(1)
            const last = slot.length - 1;
            if (idx !== last) {
                slot[idx] = slot[last];
            }
            slot.pop();
        }
    }

    /**
     * 清理 slot 中所有 removed 的 entry（双指针紧凑）
     */
    private _cleanupSlot(slotIndex: number): void {
        const slot = this._wheel[slotIndex];
        let writeIdx = 0;

        for (let readIdx = 0; readIdx < slot.length; readIdx++) {
            if (!slot[readIdx].removed) {
                if (writeIdx !== readIdx) {
                    slot[writeIdx] = slot[readIdx];
                }
                writeIdx++;
            }
        }

        slot.length = writeIdx;
    }
}

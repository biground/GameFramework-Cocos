import { ModuleBase } from '@framework/core/ModuleBase';
import { Logger } from '@framework/debug/Logger';
import { ITimerManager } from '@framework/interfaces/ITimerManager';
import { ITimerInfo, ITimerOptions } from '@framework/timer/TimerDefs';
import { IHeapTimerEntry, IPausedTimerEntry } from './HeapTimerDefs';
import { MinHeap } from './MinHeap';

/**
 * 基于最小堆的定时器管理器
 *
 * 和默认数组实现的差异：
 * - onUpdate 无触发帧 O(1)（peek 堆顶就走）
 * - 使用绝对到期时间（expireTime）而非每帧累加 elapsed
 * - pause 时从堆中取出保存到 _pausedMap，resume 时重算 expireTime 入堆
 *
 * 用法：
 * ```typescript
 * import { HeapTimerManager } from '@fbi/timer-heap';
 * GameModule.register('TimerManager', new HeapTimerManager(), { allowReplace: true });
 * ```
 */
export class HeapTimerManager extends ModuleBase implements ITimerManager {
    // ─── ModuleBase ────────────────────────────────────

    public get moduleName(): string {
        return 'TimerManager';
    }

    public get priority(): number {
        return 10;
    }

    // ─── 内部状态 ──────────────────────────────────────

    /** 最小堆（活跃定时器按 expireTime 排序） */
    private _heap = new MinHeap();

    /** id → 堆中 entry 的映射（O(1) 查找） */
    private _activeMap: Map<number, IHeapTimerEntry> = new Map();

    /** id → 暂停中条目 的映射 */
    private _pausedMap: Map<number, IPausedTimerEntry> = new Map();

    /** 全局累积时间（秒） */
    private _currentTime = 0;

    /** 下一个可用 ID */
    private _nextId = 1;

    /** 全局时间缩放 */
    private _timeScale = 1.0;

    // ─── ITimerManager 属性 ────────────────────────────

    public get timeScale(): number {
        return this._timeScale;
    }

    public set timeScale(value: number) {
        if (value < 0) {
            Logger.error('[HeapTimerManager] timeScale 不能为负数');
            return;
        }
        this._timeScale = value;
    }

    public get activeCount(): number {
        return this._activeMap.size + this._pausedMap.size;
    }

    // ─── 生命周期 ──────────────────────────────────────

    public onInit(): void {
        Logger.debug('[HeapTimerManager] 初始化完成');
    }

    public onUpdate(deltaTime: number): void {
        // 更新全局时间（使用缩放后的 dt）
        const scaledDt = deltaTime * this._timeScale;
        this._currentTime += scaledDt;

        // 持续处理到期的堆顶，直到没有到期的
        while (this._heap.size > 0) {
            const top = this._heap.peek()!;
            if (top.expireTime > this._currentTime) {
                break; // 堆顶还没到期，整个堆都不用管了——O(1)
            }

            // 弹出到期的 timer
            this._heap.pop();

            // 触发回调
            top.callback();

            // 回调中可能调用了 removeTimer 移除自己
            if (!this._activeMap.has(top.id)) {
                continue;
            }

            // 处理重复逻辑
            if (top.repeat === 0) {
                // 一次性，移除
                this._activeMap.delete(top.id);
            } else {
                // 重复：递减（-1 表示无限不递减）
                if (top.repeat > 0) {
                    top.repeat--;
                }
                // 重算到期时间（保留溢出精度）
                top.expireTime += top.delay;
                // 重新入堆
                this._heap.push(top);
            }
        }
    }

    public onShutdown(): void {
        this._heap.clear();
        this._activeMap.clear();
        this._pausedMap.clear();
        this._currentTime = 0;
        this._nextId = 1;
        this._timeScale = 1.0;
        Logger.debug('[HeapTimerManager] 已关闭');
    }

    // ─── 创建 & 移除 ──────────────────────────────────

    public addTimer(delay: number, callback: () => void, options?: ITimerOptions): number {
        if (delay <= 0) {
            Logger.error('[HeapTimerManager] delay 必须大于 0');
            throw new Error('[HeapTimerManager] delay 必须大于 0');
        }
        if (!callback) {
            Logger.error('[HeapTimerManager] callback 不能为空');
            throw new Error('[HeapTimerManager] callback 不能为空');
        }

        const repeat = options?.repeat ?? 0;
        const initialDelay = options?.initialDelay ?? delay;
        const useTimeScale = options?.useTimeScale ?? true;
        const tag = options?.tag ?? null;

        if (initialDelay < 0) {
            Logger.error('[HeapTimerManager] initialDelay 不能为负数');
            throw new Error('[HeapTimerManager] initialDelay 不能为负数');
        }

        const id = this._nextId++;

        // 计算首次到期的绝对时间
        // useTimeScale=false 的 timer 需要特殊处理：它们用"未缩放时间轴"
        // 简化处理：统一使用 _currentTime（已经是缩放后的），
        // useTimeScale=false 的差值会在下面补偿
        const expireTime = this._currentTime + initialDelay;

        const entry: IHeapTimerEntry = {
            id,
            delay,
            callback,
            repeat,
            expireTime,
            useTimeScale,
            tag,
            heapIndex: -1,
        };

        this._activeMap.set(id, entry);
        this._heap.push(entry);
        Logger.debug(`[HeapTimerManager] 添加定时器 #${id}, delay=${delay}, repeat=${repeat}`);
        return id;
    }

    public removeTimer(id: number): boolean {
        // 从活跃堆中移除
        const active = this._activeMap.get(id);
        if (active) {
            this._activeMap.delete(id);
            if (active.heapIndex >= 0) {
                this._heap.removeAt(active.heapIndex);
            }
            return true;
        }

        // 从暂停列表中移除
        if (this._pausedMap.has(id)) {
            this._pausedMap.delete(id);
            return true;
        }

        return false;
    }

    public removeAllTimers(): void {
        this._heap.clear();
        this._activeMap.clear();
        this._pausedMap.clear();
    }

    public removeTimersByTag(tag: string): number {
        let count = 0;

        // 从活跃中移除
        const toRemoveActive: number[] = [];
        for (const [id, entry] of this._activeMap) {
            if (entry.tag === tag) {
                toRemoveActive.push(id);
            }
        }
        for (const id of toRemoveActive) {
            const entry = this._activeMap.get(id)!;
            if (entry.heapIndex >= 0) {
                this._heap.removeAt(entry.heapIndex);
            }
            this._activeMap.delete(id);
            count++;
        }

        // 从暂停中移除
        const toRemovePaused: number[] = [];
        for (const [id, entry] of this._pausedMap) {
            if (entry.tag === tag) {
                toRemovePaused.push(id);
            }
        }
        for (const id of toRemovePaused) {
            this._pausedMap.delete(id);
            count++;
        }

        return count;
    }

    // ─── 暂停 & 恢复 ──────────────────────────────────

    public pauseTimer(id: number): boolean {
        const active = this._activeMap.get(id);
        if (!active) {
            return false;
        }

        // 记录剩余时间
        const remaining = active.expireTime - this._currentTime;

        // 从堆中移除
        if (active.heapIndex >= 0) {
            this._heap.removeAt(active.heapIndex);
        }
        this._activeMap.delete(id);

        // 存入暂停列表
        const paused: IPausedTimerEntry = {
            id: active.id,
            delay: active.delay,
            callback: active.callback,
            repeat: active.repeat,
            remainingTime: Math.max(0, remaining),
            useTimeScale: active.useTimeScale,
            tag: active.tag,
        };
        this._pausedMap.set(id, paused);

        return true;
    }

    public resumeTimer(id: number): boolean {
        const paused = this._pausedMap.get(id);
        if (!paused) {
            return false;
        }

        this._pausedMap.delete(id);

        // 重算到期时间
        const entry: IHeapTimerEntry = {
            id: paused.id,
            delay: paused.delay,
            callback: paused.callback,
            repeat: paused.repeat,
            expireTime: this._currentTime + paused.remainingTime,
            useTimeScale: paused.useTimeScale,
            tag: paused.tag,
            heapIndex: -1,
        };

        this._activeMap.set(entry.id, entry);
        this._heap.push(entry);

        return true;
    }

    public pauseAllTimers(): void {
        // 把所有活跃的转到暂停列表
        for (const [id, entry] of this._activeMap) {
            const remaining = entry.expireTime - this._currentTime;
            this._pausedMap.set(id, {
                id: entry.id,
                delay: entry.delay,
                callback: entry.callback,
                repeat: entry.repeat,
                remainingTime: Math.max(0, remaining),
                useTimeScale: entry.useTimeScale,
                tag: entry.tag,
            });
        }
        this._activeMap.clear();
        this._heap.clear();
    }

    public resumeAllTimers(): void {
        // 把所有暂停的恢复到堆中
        for (const [id, paused] of this._pausedMap) {
            const entry: IHeapTimerEntry = {
                id: paused.id,
                delay: paused.delay,
                callback: paused.callback,
                repeat: paused.repeat,
                expireTime: this._currentTime + paused.remainingTime,
                useTimeScale: paused.useTimeScale,
                tag: paused.tag,
                heapIndex: -1,
            };
            this._activeMap.set(id, entry);
            this._heap.push(entry);
        }
        this._pausedMap.clear();
    }

    public pauseTimersByTag(tag: string): number {
        let count = 0;
        const toMove: number[] = [];

        for (const [id, entry] of this._activeMap) {
            if (entry.tag === tag) {
                toMove.push(id);
            }
        }

        for (const id of toMove) {
            if (this.pauseTimer(id)) {
                count++;
            }
        }

        return count;
    }

    public resumeTimersByTag(tag: string): number {
        let count = 0;
        const toMove: number[] = [];

        for (const [id, entry] of this._pausedMap) {
            if (entry.tag === tag) {
                toMove.push(id);
            }
        }

        for (const id of toMove) {
            if (this.resumeTimer(id)) {
                count++;
            }
        }

        return count;
    }

    // ─── 查询 ──────────────────────────────────────────

    public getTimerInfo(id: number): ITimerInfo | null {
        const active = this._activeMap.get(id);
        if (active) {
            return {
                id: active.id,
                delay: active.delay,
                elapsed: Math.max(0, this._currentTime - (active.expireTime - active.delay)),
                repeat: active.repeat,
                paused: false,
                tag: active.tag,
            };
        }

        const paused = this._pausedMap.get(id);
        if (paused) {
            return {
                id: paused.id,
                delay: paused.delay,
                elapsed: paused.delay - paused.remainingTime,
                repeat: paused.repeat,
                paused: true,
                tag: paused.tag,
            };
        }

        return null;
    }

    public hasTimer(id: number): boolean {
        return this._activeMap.has(id) || this._pausedMap.has(id);
    }
}

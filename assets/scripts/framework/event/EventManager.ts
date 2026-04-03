import { ModuleBase } from '../core/ModuleBase';
import { EventKey, EventCallback, EventBinding } from './EventDefs';

/**
 * 事件管理器
 * 提供发布-订阅模式的跨模块事件通信机制
 *
 * 设计说明：
 * - 所有跨模块通信必须通过 EventManager，禁止模块间直接引用
 * - 支持 on / once / off / offAll / offByCaller / emit 六个核心 API
 * - 使用 EventKey<T> 实现编译期类型安全的事件系统
 * - emit 过程中 once 回调在本轮遍历结束后才移除，保证遍历安全
 *
 * @example
 * ```typescript
 * const SCORE_CHANGED = new EventKey<number>('score_changed');
 * const eventMgr = GameEntry.getModule<EventManager>('EventManager');
 * eventMgr.on(SCORE_CHANGED, (score) => { ... }); // score 自动推断为 number
 * eventMgr.emit(SCORE_CHANGED, 100); // 必须传 number，否则编译报错
 * ```
 */
export class EventManager extends ModuleBase {
    /** 事件监听器映射表：EventKey → EventBinding 数组 */
    private _eventMap: Map<EventKey<unknown>, EventBinding<unknown>[]> = new Map();

    /** 模块名称 */
    public get moduleName(): string {
        return 'EventManager';
    }

    /** 模块优先级（基础设施层） */
    public get priority(): number {
        return 10;
    }

    /** 模块初始化 */
    public onInit(): void {}

    /** 模块销毁，清理所有事件监听 */
    public onShutdown(): void {
        this.offAll();
    }

    /**
     * 注册事件绑定（内部实现）
     * on 和 once 共用此方法，区别在于 once 参数
     * @template T 事件数据类型
     * @param key 事件键
     * @param callback 回调函数
     * @param caller 回调的 this 上下文（可选）
     * @param once 是否为一次性事件
     */
    private _bindEvent<T>(
        key: EventKey<T>,
        callback: EventCallback<T>,
        caller?: unknown,
        once: boolean = false,
    ): void {
        let bindings = this._eventMap.get(key) as EventBinding<T>[] | undefined;
        if (!bindings) {
            bindings = [];
            this._eventMap.set(key, bindings as EventBinding<unknown>[]);
        }

        for (let i = 0; i < bindings.length; i++) {
            const binding = bindings[i];
            if (binding.callback === callback && binding.caller === caller) {
                return;
            }
        }

        bindings.push({
            callback,
            caller,
            once,
        });
    }

    /**
     * 注册事件监听
     * 同一 callback + caller 组合不能重复注册（静默忽略）
     * @template T 事件数据类型
     * @param key 事件键
     * @param callback 回调函数
     * @param caller 回调的 this 上下文（可选）
     */
    public on<T>(key: EventKey<T>, callback: EventCallback<T>, caller?: unknown): void {
        this._bindEvent(key, callback, caller, false);
    }

    /**
     * 注册一次性事件监听，触发后自动移除
     * @template T 事件数据类型
     * @param key 事件键
     * @param callback 回调函数
     * @param caller 回调的 this 上下文（可选）
     */
    public once<T>(key: EventKey<T>, callback: EventCallback<T>, caller?: unknown): void {
        this._bindEvent(key, callback, caller, true);
    }

    /**
     * 移除指定事件的指定回调（需要 callback + caller 精确匹配）
     * @template T 事件数据类型
     * @param key 事件键
     * @param callback 要移除的回调函数
     * @param caller 回调的 this 上下文（可选）
     */
    public off<T>(key: EventKey<T>, callback: EventCallback<T>, caller?: unknown): void {
        const bindings = this._eventMap.get(key) as EventBinding<T>[] | undefined;
        if (!bindings || bindings.length === 0) {
            return;
        }

        for (let i = 0; i < bindings.length; i++) {
            const binding = bindings[i];
            if (binding.callback === callback && binding.caller === caller) {
                bindings.splice(i, 1);
                if (bindings.length === 0) {
                    this._eventMap.delete(key);
                }
                return;
            }
        }
    }

    /**
     * 清除事件监听
     * - 不传参数：清除所有事件的所有监听
     * - 传事件键：清除该事件的所有监听
     * @param key 事件键（可选）
     */
    public offAll(key?: EventKey<unknown>): void {
        if (key) {
            this._eventMap.delete(key);
        } else {
            this._eventMap.clear();
        }
    }

    /**
     * 移除某个 caller 注册的所有事件监听
     * 用于对象销毁时批量清理，防止内存泄漏
     * @param caller 要清理的调用者
     */
    public offByCaller(caller: unknown): void {
        for (const [key, bindings] of this._eventMap.entries()) {
            const filtered = bindings.filter((b) => b.caller !== caller);
            if (filtered.length === 0) {
                this._eventMap.delete(key);
            } else {
                this._eventMap.set(key, filtered);
            }
        }
    }

    /**
     * 触发事件，按注册顺序调用所有监听回调
     * once 类型的回调在本轮遍历结束后自动移除
     *
     * 类型约束：
     * - EventKey<void> 的事件不需要传 data
     * - EventKey<T> 的事件必须传入 T 类型的 data
     *
     * @template T 事件数据类型
     * @param key 事件键
     * @param args 事件数据（void 事件无需传参，其他事件必传）
     */
    public emit<T>(key: EventKey<T>, ...args: [T] extends [void] ? [] : [data: T]): void {
        const bindings = this._eventMap.get(key) as EventBinding<T>[] | undefined;
        if (!bindings || bindings.length === 0) {
            return;
        }

        const data = (args as unknown[])[0] as T;
        const onceBindings: EventBinding<T>[] = [];
        const snapshot = [...bindings];
        for (const binding of snapshot) {
            binding.callback.call(binding.caller, data);
            if (binding.once) {
                onceBindings.push(binding);
            }
        }

        for (const binding of onceBindings) {
            this.off(key, binding.callback, binding.caller);
        }
    }
}

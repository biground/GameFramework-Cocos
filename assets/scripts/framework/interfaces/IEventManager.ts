import { EventKey, EventCallback } from '../event/EventDefs';

/**
 * 事件管理器接口
 * 定义事件系统的公共契约，业务层应依赖此接口而非 EventManager 实现类
 *
 * 任何实现此接口的模块都可以通过插件机制替换默认的 EventManager
 */
export interface IEventManager {
    /**
     * 注册事件监听
     * @template T 事件数据类型
     * @param key 事件键
     * @param callback 回调函数
     * @param caller 回调的 this 上下文（可选）
     */
    on<T>(key: EventKey<T>, callback: EventCallback<T>, caller?: unknown): void;

    /**
     * 注册一次性事件监听，触发后自动移除
     * @template T 事件数据类型
     * @param key 事件键
     * @param callback 回调函数
     * @param caller 回调的 this 上下文（可选）
     */
    once<T>(key: EventKey<T>, callback: EventCallback<T>, caller?: unknown): void;

    /**
     * 移除指定事件的指定回调
     * @template T 事件数据类型
     * @param key 事件键
     * @param callback 回调函数
     * @param caller 回调的 this 上下文（可选）
     */
    off<T>(key: EventKey<T>, callback: EventCallback<T>, caller?: unknown): void;

    /**
     * 清除事件监听
     * @param key 事件键（可选，不传则清除全部）
     */
    offAll(key?: EventKey<unknown>): void;

    /**
     * 移除某个 caller 注册的所有事件监听
     * @param caller 要清理的调用者
     */
    offByCaller(caller: unknown): void;

    /**
     * 触发事件
     * @template T 事件数据类型
     * @param key 事件键
     * @param args 事件数据（void 类型事件无需传参）
     */
    emit<T>(key: EventKey<T>, ...args: [T] extends [void] ? [] : [data: T]): void;
}

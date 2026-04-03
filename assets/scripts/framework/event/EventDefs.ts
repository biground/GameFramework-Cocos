/**
 * 类型化的事件键
 * 泛型 T 携带事件数据类型信息，让 on/emit 在编译期类型联动
 *
 * @template T 事件数据类型，无数据事件用 void（默认值）
 * @example
 * ```typescript
 * // 带数据的事件
 * const SCORE_CHANGED = new EventKey<number>('score_changed');
 * // 无数据的事件
 * const GAME_START = new EventKey('game_start');
 * ```
 */
export class EventKey<T = void> {
    /** 幻影属性，确保不同 T 的 EventKey 在结构类型上不兼容 */
    declare private readonly _phantom: T;

    /** 事件描述（仅用于调试） */
    public readonly description: string;

    constructor(description: string) {
        this.description = description;
    }
}

/**
 * 事件回调函数类型
 * @template T 事件数据类型
 */
export type EventCallback<T> = (eventData: T) => void;

/**
 * 事件绑定信息（内部使用）
 * 存储回调函数、调用者上下文和是否为一次性监听
 * @template T 事件数据类型
 */
export interface EventBinding<T> {
    /** 回调函数 */
    callback: EventCallback<T>;
    /** 回调的 this 上下文，用于精确取消监听 */
    caller: unknown;
    /** 是否为一次性监听，触发后自动移除 */
    once: boolean;
}

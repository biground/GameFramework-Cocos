/**
 * 服务标识符
 * 类似 EventKey<T>，用 phantom type 携带服务类型信息
 * DI 容器通过 ServiceKey 实现类型安全的 bind/resolve
 *
 * @template T 服务类型
 *
 * @example
 * ```typescript
 * interface ILogger { info(msg: string): void; }
 * const ILogger = new ServiceKey<ILogger>('ILogger');
 *
 * container.bind(ILogger).to(ConsoleLogger);
 * const logger = container.resolve(ILogger); // 类型自动推断为 ILogger
 * ```
 */
export class ServiceKey<T> {
    /** 幻影属性，确保不同 T 的 ServiceKey 在结构类型上不兼容 */
    declare private readonly _phantom: T;

    /** 服务描述（用于调试和错误信息） */
    public readonly description: string;

    constructor(description: string) {
        this.description = description;
    }
}

/**
 * 服务生命周期
 */
export enum Lifecycle {
    /** 单例：整个容器生命周期内只创建一个实例 */
    Singleton = 'singleton',
    /** 瞬态：每次 resolve 都创建新实例 */
    Transient = 'transient',
}

/**
 * 可注入的构造函数类型
 * @template T 实例类型
 */
export type Newable<T> = new (...args: never[]) => T;

/**
 * 服务绑定配置（内部使用）
 * @template T 服务类型
 */
export interface ServiceBinding<T> {
    /** 服务标识符 */
    key: ServiceKey<T>;
    /** 生命周期 */
    lifecycle: Lifecycle;
    /** 工厂函数（优先级高于 ctor） */
    factory?: () => T;
    /** 构造函数 */
    ctor?: Newable<T>;
    /** 单例缓存 */
    instance?: T;
    /** 释放函数（用于清理资源） */
    dispose?: () => void;
}

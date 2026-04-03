import { ServiceKey, Lifecycle, Newable } from './DITypes';

/**
 * 装饰器元数据键
 * 用 Symbol 避免和其他库冲突
 */
const _INJECTABLE_METADATA_KEY = Symbol('gfc:injectable');
const _INJECT_METADATA_KEY = Symbol('gfc:inject');
void _INJECTABLE_METADATA_KEY;
void _INJECT_METADATA_KEY;

/**
 * @Injectable 类装饰器
 * 标记一个类为可注入的，并声明其生命周期
 *
 * @param lifecycle 生命周期（默认 Transient）
 *
 * @example
 * ```typescript
 * @Injectable(Lifecycle.Singleton)
 * class ConsoleLogger implements ILogger {
 *     info(msg: string): void { ... }
 * }
 * ```
 */
export function Injectable(_lifecycle: Lifecycle = Lifecycle.Transient): ClassDecorator {
    // TODO: 实现
    // 提示：
    // 1. 使用 Reflect.defineMetadata 存储生命周期信息
    // 2. 后续 Container 扫描注册时读取此元数据
    throw new Error('TODO: 实现 @Injectable 装饰器');
}

/**
 * @Inject 参数装饰器
 * 标记构造函数参数需要从容器中注入的服务标识符
 *
 * @template T 服务类型
 * @param key 要注入的服务标识符
 *
 * @example
 * ```typescript
 * class GameService {
 *     constructor(
 *         @Inject(ILogger) private logger: ILogger,
 *         @Inject(IConfig) private config: IConfig,
 *     ) {}
 * }
 * ```
 */
export function Inject<T>(_key: ServiceKey<T>): ParameterDecorator {
    // TODO: 实现
    // 提示：
    // 1. 使用 Reflect.defineMetadata 在目标类上存储参数索引 → ServiceKey 的映射
    // 2. Container.resolve() 创建实例时读取此映射，自动注入依赖
    throw new Error('TODO: 实现 @Inject 装饰器');
}

/**
 * 获取类的 @Injectable 元数据
 * @param target 目标类
 * @returns 生命周期，如果未标记则返回 undefined
 */
export function getInjectableMetadata(_target: Newable<unknown>): Lifecycle | undefined {
    // TODO: 实现
    throw new Error('TODO: 实现 getInjectableMetadata');
}

/**
 * 获取类构造函数参数的 @Inject 元数据
 * @param target 目标类
 * @returns 参数索引 → ServiceKey 的映射
 */
export function getInjectMetadata(
    _target: Newable<unknown>,
): Map<number, ServiceKey<unknown>> | undefined {
    // TODO: 实现
    throw new Error('TODO: 实现 getInjectMetadata');
}

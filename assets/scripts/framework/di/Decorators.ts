import { ServiceKey, Lifecycle, Newable } from './DITypes';
import 'reflect-metadata';

/**
 * 装饰器元数据键
 * 用 Symbol 避免和其他库冲突
 */
const _INJECTABLE_METADATA_KEY = Symbol('gfc:injectable');
const _INJECT_METADATA_KEY = Symbol('gfc:inject');

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
export function Injectable(lifecycle: Lifecycle = Lifecycle.Transient) {
    return <T extends Newable<unknown>>(target: T): void => {
        Reflect.defineMetadata(_INJECTABLE_METADATA_KEY, lifecycle, target);
    };
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
export function Inject<T>(key: ServiceKey<T>): ParameterDecorator {
    return (
        target: object,
        _propertyKey: string | symbol | undefined,
        parameterIndex: number,
    ): void => {
        const metadataTarget = typeof target === 'function' ? target : target.constructor;
        let injectMap = Reflect.getOwnMetadata(_INJECT_METADATA_KEY, metadataTarget) as
            | Map<number, ServiceKey<unknown>>
            | undefined;

        if (!injectMap) {
            injectMap = new Map<number, ServiceKey<unknown>>();
            Reflect.defineMetadata(_INJECT_METADATA_KEY, injectMap, metadataTarget);
        }

        injectMap.set(parameterIndex, key as ServiceKey<unknown>);
    };
}

/**
 * 获取类的 @Injectable 元数据
 * @param target 目标类
 * @returns 生命周期，如果未标记则返回 undefined
 */
export function getInjectableMetadata(target: Newable<unknown>): Lifecycle | undefined {
    return Reflect.getOwnMetadata(_INJECTABLE_METADATA_KEY, target) as Lifecycle | undefined;
}

/**
 * 获取类构造函数参数的 @Inject 元数据
 * @param target 目标类
 * @returns 参数索引 → ServiceKey 的映射
 */
export function getInjectMetadata(
    target: Newable<unknown>,
): Map<number, ServiceKey<unknown>> | undefined {
    return Reflect.getOwnMetadata(_INJECT_METADATA_KEY, target) as
        | Map<number, ServiceKey<unknown>>
        | undefined;
}

import { Logger } from '../debug/Logger';
import { ServiceKey, Lifecycle, ServiceBinding, Newable } from './DITypes';
import { getInjectMetadata } from './Decorators';

/**
 * IoC 容器（控制反转容器）
 * 管理服务的注册、解析和生命周期
 *
 * 设计说明：
 * - 使用 ServiceKey<T> 实现类型安全的 bind/resolve
 * - 支持单例（Singleton）和瞬态（Transient）两种生命周期
 * - 支持构造函数绑定和工厂函数绑定
 * - 支持子容器（层级容器），子容器可覆盖父容器的绑定
 *
 * @example
 * ```typescript
 * const container = new Container();
 *
 * // 绑定接口到实现
 * container.bind(ILogger).to(ConsoleLogger).inSingletonScope();
 *
 * // 绑定工厂函数
 * container.bind(IConfig).toFactory(() => loadConfig()).inSingletonScope();
 *
 * // 解析服务
 * const logger = container.resolve(ILogger);
 * ```
 */
export class Container {
    private static readonly TAG = 'Container';

    /** 服务绑定映射表 */
    private _bindings: Map<ServiceKey<unknown>, ServiceBinding<unknown>> = new Map();
    /** 父容器（用于层级查找） */
    private _parent: Container | null = null;
    /** 解析栈，用于检测循环依赖 */
    private _resolutionStack: Set<ServiceKey<unknown>> = new Set();

    /**
     * 创建容器
     * @param parent 父容器（可选）
     */
    constructor(parent?: Container) {
        if (parent) {
            this._parent = parent;
        }
    }

    /**
     * 绑定服务标识符，返回绑定构建器用于链式配置
     * @template T 服务类型
     * @param key 服务标识符
     * @returns 绑定构建器
     */
    public bind<T>(key: ServiceKey<T>): BindingBuilder<T> {
        // 提示：返回一个 BindingBuilder 实例，让用户链式调用 .to() / .toFactory() / .inSingletonScope()
        const binding: ServiceBinding<T> = {
            key,
            lifecycle: Lifecycle.Transient, // 默认生命周期
        };
        this._bindings.set(key, binding as ServiceBinding<unknown>);
        Logger.debug(Container.TAG, `绑定服务: ${key.description}`);
        return new BindingBuilder<T>(binding);
    }

    /**
     * 解析服务实例
     * - 如果当前容器有绑定，按生命周期返回实例
     * - 如果当前容器没有，向父容器查找
     * - 都没有则抛出错误
     * @template T 服务类型
     * @param key 服务标识符
     * @returns 服务实例
     * @throws {Error} 如果服务未绑定
     */
    public resolve<T>(key: ServiceKey<T>): T {
        Logger.debug(Container.TAG, `解析服务: ${key.description}`);
        const binding = this._bindings.get(key) as ServiceBinding<T> | undefined;
        if (!binding) {
            if (this._parent) {
                Logger.debug(Container.TAG, `委托父容器解析: ${key.description}`);
                return this._parent.resolve(key);
            }
            throw new Error(`Service not bound: ${key.description}`);
        }

        if (binding.lifecycle === Lifecycle.Singleton && binding.instance !== undefined) {
            Logger.debug(Container.TAG, `单例缓存命中: ${key.description}`);
            return binding.instance;
        }

        // 循环依赖检测
        if (this._resolutionStack.has(key)) {
            const chain = [...this._resolutionStack].map((k) => k.description).join(' → ');
            throw new Error(
                `[Container] Circular dependency detected: ${chain} → ${key.description}`,
            );
        }

        this._resolutionStack.add(key);
        try {
            let instance: T;
            if (binding.factory) {
                instance = binding.factory();
            } else if (binding.ctor) {
                const args = this._resolveConstructorArgs(binding.ctor);
                instance = new (binding.ctor as new (...args: unknown[]) => T)(...args);
            } else {
                throw new Error(`Invalid binding for service: ${key.description}`);
            }

            if (binding.lifecycle === Lifecycle.Singleton) {
                binding.instance = instance;
            }
            return instance;
        } finally {
            this._resolutionStack.delete(key);
        }
    }

    /**
     * 检查服务是否已绑定（包括父容器）
     * @template T 服务类型
     * @param key 服务标识符
     * @returns 是否已绑定
     */
    public has<T>(key: ServiceKey<T>): boolean {
        return this._bindings.has(key) || (this._parent?.has(key) ?? false);
    }

    /**
     * 解除服务绑定（仅当前容器）
     * @template T 服务类型
     * @param key 服务标识符
     */
    public unbind<T>(key: ServiceKey<T>): void {
        Logger.debug(Container.TAG, `解除绑定: ${key.description}`);
        const binding = this._bindings.get(key) as ServiceBinding<T> | undefined;
        if (binding && binding.dispose) {
            binding.dispose();
        }
        this._bindings.delete(key);
    }

    /**
     * 创建子容器
     * 子容器继承父容器的所有绑定，且可以覆盖
     * @returns 子容器
     */
    public createChild(): Container {
        Logger.debug(Container.TAG, '创建子容器');
        return new Container(this);
    }

    /**
     * 清除所有绑定和缓存
     */
    public clear(): void {
        Logger.debug(Container.TAG, `清除所有绑定, count=${this._bindings.size}`);
        for (const binding of this._bindings.values()) {
            if (binding.dispose) {
                binding.dispose();
            }
        }
        this._bindings.clear();
    }

    /**
     * 读取构造函数的 @Inject 元数据，递归解析依赖
     * @param ctor 目标构造函数
     * @returns 按参数顺序排列的依赖实例数组
     */
    private _resolveConstructorArgs(ctor: Newable<unknown>): unknown[] {
        const injectMap = getInjectMetadata(ctor);
        if (!injectMap || injectMap.size === 0) {
            return [];
        }

        const args: unknown[] = [];
        for (const [index, serviceKey] of injectMap) {
            args[index] = this.resolve(serviceKey);
        }
        return args;
    }
}

/**
 * 绑定构建器（链式 API）
 * 用于配置服务绑定的目标和生命周期
 *
 * @template T 服务类型
 *
 * @example
 * ```typescript
 * container.bind(ILogger).to(ConsoleLogger).inSingletonScope();
 * container.bind(IConfig).toFactory(() => loadConfig()).inTransientScope();
 * ```
 */
export class BindingBuilder<T> {
    /** 当前正在构建的绑定配置 */
    private _binding: ServiceBinding<T>;

    constructor(binding: ServiceBinding<T>) {
        this._binding = binding;
    }

    /**
     * 绑定到具体实现类
     * @param ctor 实现类的构造函数
     * @returns this（链式调用）
     */
    public to(ctor: Newable<T>): this {
        this._binding.ctor = ctor;
        this._binding.factory = undefined;
        this._binding.instance = undefined;
        return this;
    }

    /**
     * 绑定到工厂函数
     * @param factory 工厂函数
     * @returns this（链式调用）
     */
    public toFactory(factory: () => T): this {
        this._binding.factory = factory;
        this._binding.ctor = undefined;
        this._binding.instance = undefined;
        return this;
    }

    /**
     * 绑定到已有实例（自动设为单例）
     * @param instance 已有的服务实例
     * @returns this（链式调用）
     */
    public toValue(instance: T): this {
        this._binding.instance = instance;
        this._binding.lifecycle = Lifecycle.Singleton;
        this._binding.factory = undefined;
        this._binding.ctor = undefined;
        return this;
    }

    /**
     * 设置为单例生命周期
     * @returns this（链式调用）
     */
    public inSingletonScope(): this {
        this._binding.lifecycle = Lifecycle.Singleton;
        return this;
    }

    /**
     * 设置为瞬态生命周期（默认）
     * @returns this（链式调用）
     */
    public inTransientScope(): this {
        this._binding.lifecycle = Lifecycle.Transient;
        return this;
    }

    /**
     * 设置释放函数（当绑定被 unbind 或 clear 时调用）
     * @param dispose 释放函数
     * @returns
     */
    public onDispose(dispose: () => void): this {
        this._binding.dispose = dispose;
        return this;
    }
}

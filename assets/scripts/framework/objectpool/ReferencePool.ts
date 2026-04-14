import { ModuleBase } from '../core/ModuleBase';
import { IPoolable, Constructor, PoolStats } from './PoolDefs';
import { ObjectPool } from './ObjectPool';
import { Logger } from '../debug/Logger';

/**
 * 引用池管理器（框架模块）
 * 全局管理多类型的对象池，通过构造函数类型自动路由到对应的 ObjectPool
 *
 * 设计说明：
 * - 继承 ModuleBase，作为框架基础设施模块注册
 * - 内部维护 Map<Constructor, ObjectPool>，按类型自动创建和管理池子
 * - 业务层通过 ReferencePool 统一访问，无需手动管理单个 ObjectPool
 *
 * @example
 * ```typescript
 * const pool = GameEntry.getModule<ReferencePool>('ReferencePool');
 * const bullet = pool.acquire(Bullet);
 * // ... 使用 bullet ...
 * pool.release(bullet);
 * ```
 */
export class ReferencePool extends ModuleBase {
    private static readonly TAG = 'ReferencePool';
    /** 多类型对象池映射表：Constructor → ObjectPool */
    private _poolMap: Map<Constructor<IPoolable>, ObjectPool<IPoolable>> = new Map();

    /** 模块名称 */
    public get moduleName(): string {
        return 'ReferencePool';
    }

    /** 模块优先级（基础设施层，在 EventManager 之后） */
    public get priority(): number {
        return 20;
    }

    /** 模块初始化 */
    public onInit(): void {
        Logger.info(ReferencePool.TAG, '引用池管理器初始化');
    }

    /** 模块销毁，清空所有对象池并释放映射表 */
    public onShutdown(): void {
        Logger.info(ReferencePool.TAG, `引用池管理器关闭, 清理 ${this._poolMap.size} 个池`);
        this.clearAll();
        this._poolMap.clear();
    }

    /**
     * 从对应类型的对象池中获取对象
     * 如果该类型的池子不存在，自动创建
     * @template T 池化对象类型
     * @param ctor 对象构造函数
     * @returns 池化对象实例
     */
    public acquire<T extends IPoolable>(ctor: Constructor<T>): T {
        const pool = this._getOrCreatePool(ctor);
        return pool.acquire();
    }

    /**
     * 将对象回收到对应类型的池子中
     * 通过 obj.constructor 找到对应池子
     * @template T 池化对象类型
     * @param obj 要回收的对象
     */
    public release<T extends IPoolable>(obj: T): void {
        const ctor = obj.constructor as Constructor<T>;
        const pool = this._poolMap.get(ctor as Constructor<IPoolable>) as ObjectPool<T> | undefined;
        if (!pool) {
            return;
        }
        pool.release(obj);
    }

    /**
     * 清空指定类型的对象池
     * @template T 池化对象类型
     * @param ctor 对象构造函数
     */
    public clearPool<T extends IPoolable>(ctor: Constructor<T>): void {
        const pool = this._poolMap.get(ctor as Constructor<IPoolable>) as ObjectPool<T> | undefined;
        if (pool) {
            pool.clear();
        }
    }

    /**
     * 清空所有对象池
     */
    public clearAll(): void {
        this._poolMap.forEach((pool) => pool.clear());
    }

    /**
     * 获取指定类型池的统计信息
     * @template T 池化对象类型
     * @param ctor 对象构造函数
     * @returns 统计信息，如果池不存在返回 undefined
     */
    public getStats<T extends IPoolable>(ctor: Constructor<T>): PoolStats | undefined {
        const pool = this._poolMap.get(ctor as Constructor<IPoolable>) as ObjectPool<T> | undefined;
        if (pool) {
            return pool.stats;
        }
        return undefined;
    }

    /**
     * 设置指定类型池的容量上限
     * 如果该类型的池子不存在，自动创建
     * @template T 池化对象类型
     * @param ctor 对象构造函数
     * @param maxSize 容量上限
     */
    public setMaxSize<T extends IPoolable>(ctor: Constructor<T>, maxSize: number): void {
        const pool = this._getOrCreatePool(ctor);
        pool.maxSize = maxSize;
    }

    /**
     * 获取或创建指定类型的对象池（内部方法）
     * @template T 池化对象类型
     * @param ctor 对象构造函数
     * @returns 对应的 ObjectPool
     */
    private _getOrCreatePool<T extends IPoolable>(ctor: Constructor<T>): ObjectPool<T> {
        const key = ctor as Constructor<IPoolable>;
        let pool = this._poolMap.get(key);
        if (!pool) {
            pool = new ObjectPool(ctor) as ObjectPool<IPoolable>;
            this._poolMap.set(key, pool);
            Logger.debug(ReferencePool.TAG, `自动创建对象池: ${ctor.name}`);
        }
        return pool as ObjectPool<T>;
    }
}

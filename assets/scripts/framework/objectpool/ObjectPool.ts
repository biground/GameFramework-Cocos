import { IPoolable, Constructor, PoolStats } from './PoolDefs';
import { Logger } from '../debug/Logger';

/**
 * 泛型单类型对象池
 * 管理某一种具体类型的对象的创建、回收和复用
 *
 * 设计说明：
 * - 内部使用数组栈模式（push/pop），O(1) 的取出和回收
 * - 池子有容量上限（maxSize），超出上限的对象直接丢弃
 * - 所有对象必须实现 IPoolable 接口，确保 onSpawn/onRecycle 生命周期
 *
 * @template T 池化对象类型，必须实现 IPoolable 接口
 *
 * @example
 * ```typescript
 * class Bullet implements IPoolable {
 *     onSpawn(): void { this.active = true; }
 *     onRecycle(): void { this.active = false; this.damage = 0; }
 * }
 * const pool = new ObjectPool(Bullet, 32);
 * const bullet = pool.acquire();
 * pool.release(bullet);
 * ```
 */
export class ObjectPool<T extends IPoolable> {
    private static readonly TAG = 'ObjectPool';
    /** 对象构造函数 */
    private _ctor: Constructor<T>;
    /** 空闲对象栈 */
    private _freeList: T[] = [];
    /** 空闲对象查重集合，O(1) 替代 includes 的 O(n) */
    private _freeSet: Set<T> = new Set();
    /** 池子容量上限 */
    private _maxSize: number;
    /** 累计创建对象数 */
    private _totalCreated: number = 0;
    /** 当前使用中对象数 */
    private _usedCount: number = 0;

    /**
     * 创建对象池
     * @param ctor 对象构造函数
     * @param maxSize 池子容量上限（默认 64）
     */
    constructor(ctor: Constructor<T>, maxSize: number = 64) {
        this._ctor = ctor;
        this._maxSize = maxSize;
    }

    /**
     * 设置池子容量上限
     * @param maxSize 新的容量上限
     */
    public set maxSize(maxSize: number) {
        this._maxSize = maxSize;
    }

    /**
     * 从池中获取一个对象
     * - 池中有空闲对象：取出并调用 onSpawn()
     * - 池中无空闲对象：创建新对象并调用 onSpawn()
     * @returns 可用的池化对象
     */
    public acquire(): T {
        let obj = this._freeList.pop();
        if (obj !== undefined) {
            this._freeSet.delete(obj);
        } else {
            obj = new this._ctor();
            this._totalCreated++;
            Logger.debug(
                ObjectPool.TAG,
                `新建对象: ${this._ctor.name}, totalCreated=${this._totalCreated}`,
            );
        }
        this._usedCount++;
        obj.onSpawn();
        return obj;
    }

    /**
     * 将对象回收入池
     * - 先调用 onRecycle() 清理状态
     * - 池未满则入池，池满则丢弃
     * - 防止重复 release 同一对象
     * @param obj 要回收的对象
     */
    public release(obj: T): void {
        if (this._freeSet.has(obj)) {
            Logger.warn(ObjectPool.TAG, `重复 release 被忽略: ${this._ctor.name}`);
            return;
        }

        obj.onRecycle();
        if (this._usedCount > 0) {
            this._usedCount--;
        }

        if (this._freeList.length < this._maxSize) {
            this._freeList.push(obj);
            this._freeSet.add(obj);
        } else {
            Logger.debug(ObjectPool.TAG, `池满丢弃: ${this._ctor.name}, maxSize=${this._maxSize}`);
        }
    }

    /**
     * 预热：创建指定数量的对象放入池中
     * 实际创建数量不超过 maxSize - 当前空闲数
     * @param count 预热数量
     */
    public preload(count: number): void {
        const canCreate = this._maxSize - this._freeList.length;
        const createCount = count < canCreate ? count : canCreate;
        Logger.debug(ObjectPool.TAG, `预热: ${this._ctor.name}, count=${createCount}`);
        for (let i = 0; i < createCount; i++) {
            this._freeList.push(new this._ctor());
            this._totalCreated++;
        }
    }

    /**
     * 清空池中所有空闲对象
     */
    public clear(): void {
        Logger.debug(ObjectPool.TAG, `清空池: ${this._ctor.name}, freed=${this._freeList.length}`);
        this._freeList.length = 0;
        this._freeSet.clear();
    }

    /**
     * 获取当前池的统计信息
     */
    public get stats(): PoolStats {
        return {
            freeCount: this._freeList.length,
            usedCount: this._usedCount,
            totalCreated: this._totalCreated,
        };
    }
}

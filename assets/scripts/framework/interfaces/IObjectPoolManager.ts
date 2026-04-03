import { IPoolable, Constructor, PoolStats } from '../objectpool/PoolDefs';

/**
 * 对象池管理器接口
 * 定义对象池系统的公共契约，业务层应依赖此接口而非 ReferencePool 实现类
 *
 * 任何实现此接口的模块都可以通过插件机制替换默认的 ReferencePool
 * 例如：gfc-fast-pool 可以提供基于 Int32Array 侵入式空闲链表的高性能实现
 */
export interface IObjectPoolManager {
    /**
     * 从对应类型的对象池中获取对象
     * @template T 池化对象类型
     * @param ctor 对象构造函数
     * @returns 池化对象实例
     */
    acquire<T extends IPoolable>(ctor: Constructor<T>): T;

    /**
     * 将对象回收到对应类型的池子中
     * @template T 池化对象类型
     * @param obj 要回收的对象
     */
    release<T extends IPoolable>(obj: T): void;

    /**
     * 清空指定类型的对象池
     * @template T 池化对象类型
     * @param ctor 对象构造函数
     */
    clearPool<T extends IPoolable>(ctor: Constructor<T>): void;

    /**
     * 清空所有对象池
     */
    clearAll(): void;

    /**
     * 获取指定类型池的统计信息
     * @template T 池化对象类型
     * @param ctor 对象构造函数
     * @returns 统计信息，如果池不存在返回 undefined
     */
    getStats<T extends IPoolable>(ctor: Constructor<T>): PoolStats | undefined;

    /**
     * 设置指定类型池的容量上限
     * @template T 池化对象类型
     * @param ctor 对象构造函数
     * @param maxSize 容量上限
     */
    setMaxSize<T extends IPoolable>(ctor: Constructor<T>, maxSize: number): void;
}

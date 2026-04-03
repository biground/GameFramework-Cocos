/**
 * 可池化对象接口
 * 所有需要使用对象池管理的对象必须实现此接口
 */
export interface IPoolable {
    /** 从池中取出时调用（重置/初始化对象状态） */
    onSpawn(): void;
    /** 回收入池时调用（清理对象状态，防止脏数据残留） */
    onRecycle(): void;
}

/**
 * 构造函数类型
 * 用于对象池通过构造函数动态创建对象
 * @template T 对象类型
 */
export type Constructor<T> = new (...args: unknown[]) => T;

/**
 * 对象池统计信息
 */
export interface PoolStats {
    /** 空闲对象数 */
    freeCount: number;
    /** 使用中对象数 */
    usedCount: number;
    /** 累计创建数 */
    totalCreated: number;
}

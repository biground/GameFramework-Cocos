import { IPoolable } from '../../assets/scripts/framework/objectpool/PoolDefs';
import { ObjectPool } from '../../assets/scripts/framework/objectpool/ObjectPool';
import { ReferencePool } from '../../assets/scripts/framework/objectpool/ReferencePool';
import { GameModule } from '../../assets/scripts/framework/core/GameModule';

/** 测试用的可池化对象 */
class MockPoolable implements IPoolable {
    public spawnCount = 0;
    public recycleCount = 0;
    public data = '';

    onSpawn(): void {
        this.spawnCount++;
    }

    onRecycle(): void {
        this.recycleCount++;
        this.data = '';
    }
}

/** 另一种可池化对象，用于测试多类型 */
class AnotherPoolable implements IPoolable {
    public active = false;

    onSpawn(): void {
        this.active = true;
    }

    onRecycle(): void {
        this.active = false;
    }
}

// ===================== ObjectPool 测试 =====================

describe('ObjectPool', () => {
    it('1. acquire 从空池获取：创建新对象并调用 onSpawn', () => {
        const pool = new ObjectPool(MockPoolable);
        const obj = pool.acquire();

        expect(obj).toBeInstanceOf(MockPoolable);
        expect(obj.spawnCount).toBe(1);
        expect(pool.stats.totalCreated).toBe(1);
        expect(pool.stats.usedCount).toBe(1);
        expect(pool.stats.freeCount).toBe(0);
    });

    it('2. release + acquire：回收后再获取，复用同一对象', () => {
        const pool = new ObjectPool(MockPoolable);
        const obj1 = pool.acquire();
        pool.release(obj1);
        const obj2 = pool.acquire();

        expect(obj2).toBe(obj1);
    });

    it('3. onSpawn 和 onRecycle 调用时机正确', () => {
        const pool = new ObjectPool(MockPoolable);
        const obj = pool.acquire();
        expect(obj.spawnCount).toBe(1);
        expect(obj.recycleCount).toBe(0);

        pool.release(obj);
        expect(obj.recycleCount).toBe(1);
    });

    it('4. 池满时 release：超出 maxSize 的对象被丢弃', () => {
        const pool = new ObjectPool(MockPoolable, 2);
        const a = pool.acquire();
        const b = pool.acquire();
        const c = pool.acquire();

        pool.release(a);
        pool.release(b);
        pool.release(c);

        expect(pool.stats.freeCount).toBe(2);
    });

    it('5. preload：预热指定数量的对象', () => {
        const pool = new ObjectPool(MockPoolable, 8);
        pool.preload(3);

        expect(pool.stats.freeCount).toBe(3);
        expect(pool.stats.totalCreated).toBe(3);
    });

    it('6. preload 不超过 maxSize', () => {
        const pool = new ObjectPool(MockPoolable, 4);
        pool.preload(10);

        expect(pool.stats.freeCount).toBe(4);
        expect(pool.stats.totalCreated).toBe(4);
    });

    it('7. clear：清空池后 freeCount 为 0', () => {
        const pool = new ObjectPool(MockPoolable);
        const obj = pool.acquire();
        pool.release(obj);
        expect(pool.stats.freeCount).toBe(1);

        pool.clear();
        expect(pool.stats.freeCount).toBe(0);
    });

    it('8. stats：统计信息准确', () => {
        const pool = new ObjectPool(MockPoolable);
        const obj1 = pool.acquire();
        pool.acquire();
        pool.release(obj1);

        expect(pool.stats.freeCount).toBe(1);
        expect(pool.stats.usedCount).toBe(1);
        expect(pool.stats.totalCreated).toBe(2);
    });

    it('9. 防止重复 release 同一对象', () => {
        const pool = new ObjectPool(MockPoolable);
        const obj = pool.acquire();

        pool.release(obj);
        pool.release(obj);

        expect(pool.stats.freeCount).toBe(1);
    });
});

// ===================== ReferencePool 测试 =====================

describe('ReferencePool', () => {
    let refPool: ReferencePool;

    beforeEach(() => {
        refPool = new ReferencePool();
        GameModule.register(refPool);
    });

    afterEach(() => {
        GameModule.shutdownAll();
    });

    it('10. 自动为不同类型创建独立的池子', () => {
        const mock1 = refPool.acquire(MockPoolable);
        const another1 = refPool.acquire(AnotherPoolable);
        refPool.release(mock1);
        refPool.release(another1);

        const mock2 = refPool.acquire(MockPoolable);
        const another2 = refPool.acquire(AnotherPoolable);

        expect(mock2).toBe(mock1);
        expect(another2).toBe(another1);
        expect(mock2).toBeInstanceOf(MockPoolable);
        expect(another2).toBeInstanceOf(AnotherPoolable);
    });

    it('11. 不同类型的对象互不干扰', () => {
        const mock = refPool.acquire(MockPoolable);
        refPool.release(mock);

        const another = refPool.acquire(AnotherPoolable);
        expect(another).toBeInstanceOf(AnotherPoolable);
        expect((another as unknown) === (mock as unknown)).toBe(false);
    });

    it('12. clearAll：清空所有池子', () => {
        const mock = refPool.acquire(MockPoolable);
        const another = refPool.acquire(AnotherPoolable);
        refPool.release(mock);
        refPool.release(another);

        expect(refPool.getStats(MockPoolable)?.freeCount).toBe(1);
        expect(refPool.getStats(AnotherPoolable)?.freeCount).toBe(1);

        refPool.clearAll();

        expect(refPool.getStats(MockPoolable)?.freeCount).toBe(0);
        expect(refPool.getStats(AnotherPoolable)?.freeCount).toBe(0);
    });
});

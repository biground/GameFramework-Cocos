# ObjectPool（对象池）

## 职责

提供泛型对象池和全局引用池管理器，管理对象的创建、回收和复用，降低频繁创建销毁对象带来的 GC 压力。框架规范要求：**频繁创建销毁的对象必须走对象池**。
**不负责**对象的业务逻辑，也不管理引擎层资源（节点、纹理等由 Runtime 层处理）。

## 对外 API

```typescript
// === IPoolable（可池化对象接口） ===
interface IPoolable {
    onSpawn(): void;     // 从池中取出时调用
    onRecycle(): void;   // 回收入池时调用
}

// === ObjectPool<T>（单类型对象池） ===
ObjectPool<T extends IPoolable>.acquire(): T           // 获取对象（池中取出或新建）
ObjectPool<T extends IPoolable>.release(obj: T): void  // 回收对象
ObjectPool<T extends IPoolable>.preload(count): void   // 预热
ObjectPool<T extends IPoolable>.clear(): void           // 清空空闲对象
ObjectPool<T extends IPoolable>.maxSize: number         // 容量上限（setter）
ObjectPool<T extends IPoolable>.stats: PoolStats        // 统计信息（getter）

// === ReferencePool（全局引用池管理器，priority = 20） ===
ReferencePool.acquire<T>(ctor: Constructor<T>): T           // 按类型获取对象
ReferencePool.release<T>(obj: T): void                      // 回收对象
ReferencePool.clearPool<T>(ctor: Constructor<T>): void      // 清空指定类型池
ReferencePool.clearAll(): void                               // 清空所有池
ReferencePool.getStats<T>(ctor: Constructor<T>): PoolStats? // 获取统计
ReferencePool.setMaxSize<T>(ctor, maxSize): void            // 设置容量上限

// === 类型定义 ===
type Constructor<T> = new (...args: unknown[]) => T;
interface PoolStats { freeCount: number; usedCount: number; totalCreated: number; }
```

## 设计决策

| 决策         | 选择                                  | 原因                                                |
| ------------ | ------------------------------------- | --------------------------------------------------- |
| 取出/回收    | 数组栈 push/pop                       | O(1) 操作，简单高效                                 |
| 防重复入池   | `Set<T>` 查重（`_freeSet`）           | O(1) 替代 `includes` 的 O(n)，重复 release 静默忽略 |
| 容量上限     | `maxSize` 限制空闲池大小              | 池满时丢弃对象，防止内存无限增长                    |
| 生命周期钩子 | `IPoolable.onSpawn()` / `onRecycle()` | 取出时重置状态，回收时清理脏数据                    |
| 全局管理     | `ReferencePool` 按 Constructor 路由   | 业务层统一入口，无需手动管理单个 ObjectPool         |
| 预热         | `preload(count)`                      | 避免运行时首次获取的创建峰值                        |

## 依赖

- **Core**（`ModuleBase`）— ReferencePool 继承 ModuleBase
- **Logger** — 日志输出

## 被谁依赖

- **EntityManager** — 实体分组内部使用对象池复用
- **Network** — 网络消息对象池化
- Game 层频繁创建销毁的对象（子弹、特效、消息等）
- 业务层通过 `IObjectPoolManager` 接口使用

## 已知限制

- `ObjectPool` 仅支持无参构造函数（`new ctor()`），不支持带参构建
- 池化对象的 `onRecycle` 中如果状态重置不完整，复用时可能携带脏数据
- 统计信息中 `usedCount` 依赖正确配对的 acquire/release 调用
- 不支持对象过期淘汰（超时未使用的空闲对象不会自动销毁）

## 关联测试

- `tests/objectpool/objectpool.test.ts`
- `tests/objectpool/reference-pool.test.ts`

## 状态

✅ 已完成 — 核心功能就绪，通过全部单元测试

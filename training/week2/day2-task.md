# 📋 Week 2 Day 2 — 任务卡片

## 🗓️ 日期：2026-03-30（周一·下午场）

## 🎯 主题：对象池 — ObjectPool + ReferencePool

---

## 📖 知识准备（编码前先了解）

1. **为什么需要对象池？**
    - 游戏中频繁创建/销毁对象（子弹、特效、UI 元素）会触发 GC，导致卡顿
    - 对象池预先创建一批对象，用完回收而非销毁，避免内存分配和 GC 压力
    - 这是游戏框架最基础的性能优化模式

2. **ObjectPool vs ReferencePool 的区别**
    - `ObjectPool<T>`：泛型单类型对象池，管理某一种具体类型的对象（如 BulletPool）
    - `ReferencePool`：全局引用池管理器，作为 `ModuleBase` 注册到框架中，内部管理多个 ObjectPool
    - 关系：`ReferencePool` 内部用 `Map<Constructor<T>, ObjectPool<T>>` 管理多类型

3. **IPoolable 接口**
    - 所有可池化的对象必须实现 `IPoolable` 接口
    - `onSpawn()`: 从池中取出时调用（重置/初始化）
    - `onRecycle()`: 回收入池时调用（清理状态）
    - 这两个方法是对象池安全性的关键——防止脏数据残留

4. **设计要点**
    - 池子有容量上限（maxSize），超出上限的对象直接丢弃
    - 需要统计信息：池中空闲数量、已使用数量、总创建数量
    - 预热机制（preload/warmup）：游戏启动时预先填充对象

---

## 🔨 编码任务

### 任务 1：定义接口和类型

**文件路径**：`assets/scripts/framework/objectpool/PoolDefs.ts`

**需求**：

- 定义 `IPoolable` 接口：
    - `onSpawn(): void` — 从池中取出时调用
    - `onRecycle(): void` — 回收入池时调用
- 定义 `Constructor<T>` 类型：`new (...args: unknown[]) => T`
    - 用于从构造函数动态创建对象
- 定义 `PoolStats` 接口（池子统计信息）：
    - `freeCount: number` — 空闲对象数
    - `usedCount: number` — 使用中对象数
    - `totalCreated: number` — 累计创建数

**约束**：

- ⚠️ 不能使用 `any`
- ⚠️ 不能引入 `cc` 命名空间

### 任务 2：实现 `ObjectPool<T>`

**文件路径**：`assets/scripts/framework/objectpool/ObjectPool.ts`

**需求**：

- 这是一个**普通类**（不继承 ModuleBase），管理单类型对象
- 泛型约束：`T extends IPoolable`
- 构造参数：
    - `ctor: Constructor<T>` — 对象构造函数
    - `maxSize: number` — 池子容量上限（默认 64）
- 核心 API：
    - `acquire(): T`
        - 池中有空闲对象：取出并调用 `onSpawn()`
        - 池中无空闲对象：用 `ctor` 创建新对象并调用 `onSpawn()`
    - `release(obj: T): void`
        - 调用 `onRecycle()` 清理对象状态
        - 如果池未满：回收入池
        - 如果池已满：直接丢弃（不入池）
    - `preload(count: number): void`
        - 预热：创建指定数量的对象放入池中（不超过 maxSize）
    - `clear(): void`
        - 清空池中所有空闲对象
    - `get stats(): PoolStats`
        - 返回当前统计信息

**内部存储**：用数组 `T[]` 作为空闲池（栈模式，push/pop）

**约束**：

- ⚠️ `release` 时必须先调用 `onRecycle()` 再入池
- ⚠️ `acquire` 时必须在返回前调用 `onSpawn()`
- ⚠️ 不能将同一个对象重复 release（防御性编程：检查是否已在池中）
- ⚠️ 不能依赖 `cc` 命名空间
- ✅ 所有 public API 必须有中文 JSDoc 注释

### 任务 3：实现 `ReferencePool`（框架模块）

**文件路径**：`assets/scripts/framework/objectpool/ReferencePool.ts`

**需求**：

- 继承 `ModuleBase`
- `moduleName`: `"ReferencePool"`
- `priority`: `20`（基础设施层，在 EventManager 之后）
- 核心 API：
    - `acquire<T extends IPoolable>(ctor: Constructor<T>): T`
        - 从对应类型的对象池中获取对象
        - 如果该类型的池子不存在，自动创建
    - `release<T extends IPoolable>(obj: T): void`
        - 将对象回收到对应类型的池子中
        - 通过 `obj.constructor` 找到对应池子
    - `clearPool<T extends IPoolable>(ctor: Constructor<T>): void`
        - 清空指定类型的对象池
    - `clearAll(): void`
        - 清空所有对象池
    - `getStats<T extends IPoolable>(ctor: Constructor<T>): PoolStats | undefined`
        - 获取指定类型池的统计信息
    - `setMaxSize<T extends IPoolable>(ctor: Constructor<T>, maxSize: number): void`
        - 设置指定类型池的容量上限
- 内部用 `Map<Constructor<IPoolable>, ObjectPool<IPoolable>>` 管理多类型

**约束**：

- ⚠️ 不能依赖 `cc` 命名空间
- ✅ 所有 public API 必须有中文 JSDoc 注释

### 任务 4：编写单元测试

**文件路径**：`tests/objectpool/object-pool.test.ts`

**需求**：至少覆盖以下测试用例：

**ObjectPool 测试：**

1. `acquire` 从空池获取：创建新对象并调用 `onSpawn`
2. `release` + `acquire`：回收后再获取，复用同一对象
3. `onSpawn` 和 `onRecycle` 调用时机正确
4. 池满时 `release`：超出 maxSize 的对象被丢弃
5. `preload`：预热指定数量的对象
6. `preload` 不超过 maxSize
7. `clear`：清空池后 freeCount 为 0
8. `stats`：统计信息准确
9. 防止重复 release 同一对象

**ReferencePool 测试：** 10. 自动为不同类型创建独立的池子 11. 不同类型的对象互不干扰 12. `clearAll`：清空所有池子

---

## 🧠 思考题（编码完成后回答）

1. **对象池的 `acquire` 用数组的 `pop()` 而不是 `shift()` 取对象，为什么？性能差多少？**

2. **如果一个对象被 `acquire` 后忘记 `release`，就是"对象泄漏"。有什么机制可以检测或防止这种情况？（提示：弱引用、超时回收、调试模式追踪）**

3. **ReferencePool 用 `obj.constructor` 来找到对应的池子，如果对象是子类实例（继承链），`obj.constructor` 指向子类构造函数。这会导致什么问题？你怎么处理？**

---

## ✅ 验收清单

- [ ] `PoolDefs.ts` 接口和类型定义完成
- [ ] `ObjectPool.ts` 实现完成（acquire/release/preload/clear/stats）
- [ ] `ReferencePool.ts` 实现完成，继承 `ModuleBase`
- [ ] 至少 12 个测试用例
- [ ] 所有测试通过（`npm test`）
- [ ] 代码中没有 `any` 类型
- [ ] 代码中没有 `cc` 命名空间引用
- [ ] 所有 public API 有中文 JSDoc 注释
- [ ] `git commit` 使用规范格式

---

## ⏰ 预计耗时

- 知识准备：15 分钟
- 编码：2-3 小时
- 测试：1 小时
- 思考题：30 分钟

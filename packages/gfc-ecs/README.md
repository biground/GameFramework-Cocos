# @gfc/ecs

> GameFramework-Cocos 的高性能 ECS 插件，基于 SparseSet 架构。Generational Entity ID、32-bit 组件掩码、查询缓存、命令缓冲区——为游戏逻辑提供数据驱动的开发范式。

## 安装

`@gfc/ecs` 是 GameFramework-Cocos 的独立插件包，位于 `packages/gfc-ecs/`。

```jsonc
// package.json
{
  "peerDependencies": {
    "@gfc/core": ">=0.1.0"
  }
}
```

在项目中直接引用：

```typescript
import { EcsWorld, ComponentType, SystemPhase } from '@gfc/ecs';
```

## 快速开始

### 1. 定义组件

组件是纯数据（Plain Object），通过 `ComponentType<T>` 注册。`ComponentType` 使用 phantom type 确保类型安全——编译期自动推断组件数据类型。

```typescript
import { ComponentType } from '@gfc/ecs';

// 每个 ComponentType 实例自动分配唯一 typeId
// phantom type <T> 确保 addComponent / getComponent 的数据类型正确
interface Position { x: number; y: number; }
interface Velocity { dx: number; dy: number; }
interface Health { current: number; max: number; }

const Position = new ComponentType<Position>('Position');
const Velocity = new ComponentType<Velocity>('Velocity');
const Health   = new ComponentType<Health>('Health');
```

### 2. 创建世界和实体

```typescript
import { EcsWorld } from '@gfc/ecs';

const world = new EcsWorld();

// 创建实体，返回 Generational Entity ID
const player = world.createEntity();
world.addComponent(player, Position, { x: 100, y: 200 });
world.addComponent(player, Velocity, { dx: 0, dy: 0 });
world.addComponent(player, Health, { current: 100, max: 100 });

const bullet = world.createEntity();
world.addComponent(bullet, Position, { x: 0, y: 0 });
world.addComponent(bullet, Velocity, { dx: 10, dy: 0 });
// bullet 没有 Health 组件——这就是 ECS 组合优于继承的核心
```

### 3. 编写 System

System 实现 `ISystem` 接口，在 `update()` 中处理游戏逻辑：

```typescript
import { ISystem, IEcsWorldAccess, SystemPhase, QueryHandle } from '@gfc/ecs';

class MovementSystem implements ISystem {
    readonly name = 'MovementSystem';
    readonly priority = 0;
    readonly phase = SystemPhase.Update;
    enabled = true;

    private _queryHandle!: QueryHandle;
    private _world!: IEcsWorldAccess;

    onInit(world: IEcsWorldAccess): void {
        this._world = world;
        // 注册缓存查询——每帧自动按需刷新
        this._queryHandle = world.registerQuery({
            all: [Position, Velocity],
        });
    }

    update(deltaTime: number): void {
        const entities = this._world.resolveQuery(this._queryHandle);
        for (const entityId of entities) {
            const pos = this._world.getComponent(entityId, Position)!;
            const vel = this._world.getComponent(entityId, Velocity)!;
            pos.x += vel.dx * deltaTime;
            pos.y += vel.dy * deltaTime;
        }
    }
}
```

### 4. 运行游戏循环

```typescript
const world = new EcsWorld();

// 创建实体 & 添加组件（如上）...

// 注册 System
world.addSystem(new MovementSystem());

// 游戏循环（通常由引擎 update 驱动）
function gameLoop(dt: number) {
    world.update(dt); // 依次执行所有 System，帧末自动 flush 命令缓冲区
}

// 退出时销毁
world.destroy();
```

---

## 特性指南

### 实体生命周期与 Generational ID

Entity ID 采用 **20-bit index + 12-bit generation** 的打包布局：

```
┌─────────────┬──────────────────┐
│ generation   │     index        │
│  (12 bit)    │    (20 bit)      │
└─────────────┴──────────────────┘
  高位                        低位
```

**为什么需要 generation？**

当实体被销毁后，其 index 会被回收复用。如果其他代码仍持有旧 ID，可能指向一个全新的实体（**ABA 问题**）。generation 在每次回收时自动递增，确保旧 ID 不会匹配到新实体。

**什么时候关注：**

- 当你在 System 之外存储了 `EcsEntityId`（比如"目标实体"引用），读取前必须用 `isAlive()` 验证：

```typescript
// ❌ 危险：target 可能已被销毁并复用
const pos = world.getComponent(this.targetId, Position);

// ✅ 安全：先验证再使用
if (world.isAlive(this.targetId)) {
    const pos = world.getComponent(this.targetId, Position);
    // ...
}
```

- `getComponent()` / `hasComponent()` 内部已做 `isAlive` 检查，不存活时安全返回 `undefined` / `false`
- `addComponent()` / `removeComponent()` 对已销毁实体会抛出异常——这是设计意图，强制调用方先检查

**容量说明：**
- 最大同时存活实体数：2^20 = 1,048,576
- 同一 index 最大复用次数：2^12 = 4,096（超出后 generation 归零，理论上可能碰撞）

---

### 组件管理与位掩码

每个 `ComponentType` 在构造时自动分配递增的 `typeId`。每个实体维护一个 **32-bit 组件掩码**，第 N 位为 1 表示拥有 `typeId = N` 的组件。

查询时用位运算一步完成多组件匹配：

```typescript
// 内部原理（用户不需要手动操作）：
// entity.mask & queryAllMask === queryAllMask
// 一次位运算 = O(1) 判断实体是否同时拥有 Position + Velocity
```

**限制：最多 32 种 ComponentType。** 超出时 `new ComponentType()` 会抛出异常。

> 32 种在实际游戏项目中通常够用（Position、Velocity、Health、Sprite、Collider...），如果真不够说明可能需要拆分 ECS world 或重新设计组件粒度。

---

### 查询系统

ECS 查询用于找到"同时满足指定组件条件"的所有实体。提供三种方式：

#### 即时查询：`query()`

最简单的查询——传入必须拥有的组件类型列表：

```typescript
// 找到所有同时拥有 Position 和 Velocity 的实体
const movers = world.query(Position, Velocity);
```

内部策略：以 **最小 storage** 为遍历起点，避免全量扫描。

#### 高级查询：`queryAdvanced()`

支持 `all` / `none` / `any` 三种条件组合：

```typescript
// 有 Position 和 Velocity，没有 Frozen，且至少有 Health 或 Shield
const targets = world.queryAdvanced({
    all:  [Position, Velocity],
    none: [Frozen],
    any:  [Health, Shield],
});
```

| 条件 | 含义 | 为空时 |
|------|------|--------|
| `all` | 必须全部拥有 | 无 all 约束 |
| `none` | 必须全部不拥有 | 无排除 |
| `any` | 至少拥有一个 | 无 any 约束 |

**候选集策略：**
- 有 `all` → 最小 all storage 作为遍历起点
- 无 `all` 有 `any` → 合并所有 any storage 的实体作为候选
- 纯 `none` → 遍历全部存活实体（**慎用**，性能差）

#### 缓存查询：`registerQuery()` / `resolveQuery()`

每帧都要调用的查询，注册为缓存查询可避免重复计算：

```typescript
class DamageSystem implements ISystem {
    // ... name, priority, enabled ...
    private _handle!: QueryHandle;
    private _world!: IEcsWorldAccess;

    onInit(world: IEcsWorldAccess): void {
        this._world = world;
        // 注册一次，后续每帧自动按需刷新
        this._handle = world.registerQuery({
            all: [Position, Health],
            none: [Invincible],
        });
    }

    update(deltaTime: number): void {
        // O(1) 缓存命中 / 自动重算
        const entities = this._world.resolveQuery(this._handle);
        for (const id of entities) {
            // ...
        }
    }

    onDestroy(): void {
        // 不再需要时注销，防止内存泄漏
        this._world.removeQuery(this._handle);
    }
}
```

**精确脏标记：** 当组件增删时，只有涉及该 `typeId` 的已注册查询才会被标记为脏。无关查询保持缓存不变。

**何时用哪种：**

| 场景 | 推荐 |
|------|------|
| System 每帧执行的查询 | `registerQuery` + `resolveQuery` |
| 一次性查询（调试/初始化） | `query()` 或 `queryAdvanced()` |

---

### 命令缓冲区

System 运行期间直接创建/销毁实体可能导致迭代器失效或查询缓存错乱。CommandBuffer 解决这个问题——**System 里不直接改世界状态，而是写入延迟命令，帧末统一执行。**

```typescript
class SpawnOnDeathSystem implements ISystem {
    readonly name = 'SpawnOnDeathSystem';
    readonly priority = 10;
    enabled = true;

    private _world!: IEcsWorldAccess;
    private _handle!: QueryHandle;

    onInit(world: IEcsWorldAccess): void {
        this._world = world;
        this._handle = world.registerQuery({ all: [Health, Position] });
    }

    update(deltaTime: number): void {
        const entities = this._world.resolveQuery(this._handle);
        for (const id of entities) {
            const hp = this._world.getComponent(id, Health)!;
            if (hp.current <= 0) {
                const pos = this._world.getComponent(id, Position)!;

                // 延迟销毁——不会破坏当前迭代
                this._world.commands.destroyEntity(id);

                // 延迟创建——返回临时 ID（负数）
                const lootId = this._world.commands.createEntity();
                // 临时 ID 可以继续用于后续延迟操作
                this._world.commands.addComponent(lootId, Position, { x: pos.x, y: pos.y });
            }
        }
        // 不需要手动 flush——world.update() 帧末自动执行
    }
}
```

**临时 ID 原理：**
- `commands.createEntity()` 返回**负数**临时 ID（从 -2 递减，-1 保留为 `INVALID_ENTITY`）
- flush 时按命令入队顺序执行，遇到 CreateEntity 分配真实 ID 并建立映射
- 后续命令中的临时 ID 自动替换为真实 ID

**auto-flush 时机：** `world.update()` 在所有 System 执行完毕后自动 flush。无需手动调用。

---

### System Phase 调度

System 按 `SystemPhase` 分组执行，同 phase 内按 `priority` 升序排列：

```
PreUpdate(0) → Update(100) → PostUpdate(200) → LateUpdate(300)
```

| Phase | 值 | 适合放什么 | 示例 |
|-------|----|-----------|------|
| `PreUpdate` | 0 | 输入处理、帧准备、网络接收 | InputSystem |
| `Update` | 100 | 核心游戏逻辑（默认值） | MovementSystem, CombatSystem |
| `PostUpdate` | 200 | 物理计算、碰撞检测 | PhysicsSystem, CollisionSystem |
| `LateUpdate` | 300 | 相机跟随、UI 同步、渲染准备 | CameraFollowSystem, HudSyncSystem |

```typescript
class InputSystem implements ISystem {
    readonly name = 'InputSystem';
    readonly priority = 0;
    readonly phase = SystemPhase.PreUpdate; // 在所有逻辑之前
    enabled = true;
    update(dt: number) { /* 读取输入 */ }
}

class CameraFollowSystem implements ISystem {
    readonly name = 'CameraFollowSystem';
    readonly priority = 0;
    readonly phase = SystemPhase.LateUpdate; // 在所有逻辑之后
    enabled = true;
    update(dt: number) { /* 跟随目标实体 */ }
}
```

不指定 `phase` 时默认为 `SystemPhase.Update`。

---

## API 速查

### EcsWorld — 世界容器

| 方法 | 用途 | 返回 |
|------|------|------|
| `createEntity()` | 创建实体（优先复用回收 index） | `EcsEntityId` |
| `destroyEntity(id)` | 销毁实体（回收 index，递增 generation） | `void` |
| `isAlive(id)` | 验证实体是否存活 | `boolean` |
| `entityCount` | 当前存活实体数量（getter） | `number` |
| `addComponent(id, type, data)` | 添加组件（不存活则抛异常） | `void` |
| `removeComponent(id, type)` | 移除组件（不存活则抛异常） | `void` |
| `getComponent(id, type)` | 获取组件数据（不存活返回 undefined） | `T \| undefined` |
| `hasComponent(id, type)` | 是否拥有组件（不存活返回 false） | `boolean` |
| `query(...types)` | 即时查询（all 语义） | `readonly EcsEntityId[]` |
| `queryAdvanced(descriptor)` | 高级查询（all/none/any） | `readonly EcsEntityId[]` |
| `registerQuery(descriptor)` | 注册缓存查询 | `QueryHandle` |
| `resolveQuery(handle)` | 解析缓存查询（脏时自动重算） | `readonly EcsEntityId[]` |
| `removeQuery(handle)` | 删除已注册的查询 | `boolean` |
| `addSystem(system)` | 注册 System（立即调用 onInit） | `void` |
| `removeSystem(system)` | 移除 System | `void` |
| `update(deltaTime)` | 执行所有 System + flush 命令缓冲区 | `void` |
| `commands` | 命令缓冲区（getter） | `ICommandBuffer` |
| `destroy()` | 销毁整个世界 | `void` |

### ICommandBuffer — 命令缓冲区

| 方法 | 用途 | 返回 |
|------|------|------|
| `createEntity()` | 延迟创建（返回临时负数 ID） | `EcsEntityId` |
| `destroyEntity(id)` | 延迟销毁（支持临时 ID） | `void` |
| `addComponent(id, type, data)` | 延迟添加组件（支持临时 ID） | `void` |
| `removeComponent(id, type)` | 延迟移除组件 | `void` |

### QueryDescriptor — 查询条件

| 字段 | 类型 | 含义 |
|------|------|------|
| `all?` | `ComponentType<unknown>[]` | 必须全部拥有 |
| `none?` | `ComponentType<unknown>[]` | 必须全部不拥有 |
| `any?` | `ComponentType<unknown>[]` | 至少拥有一个 |

### ComponentType\<T\> — 组件类型标识

| 属性/构造 | 说明 |
|----------|------|
| `new ComponentType<T>(name)` | 创建组件类型，自动分配 typeId |
| `.typeId` | 唯一数字标识（0 ~ 31） |
| `.name` | 调试用描述名 |

### SystemPhase — 执行阶段枚举

| 枚举值 | 数值 | 用途 |
|--------|------|------|
| `PreUpdate` | 0 | 输入处理、帧准备 |
| `Update` | 100 | 主逻辑更新（默认） |
| `PostUpdate` | 200 | 物理、碰撞检测 |
| `LateUpdate` | 300 | 相机跟随、UI 同步 |

### 工具函数

| 函数 | 用途 |
|------|------|
| `packEntityId(index, generation)` | 打包 Entity ID |
| `entityIndex(id)` | 提取 index 部分 |
| `entityGeneration(id)` | 提取 generation 部分 |
| `buildComponentMask(...types)` | 构建组件掩码 |

---

## 已知限制

| 限制 | 原因 | 影响 |
|------|------|------|
| **最多 32 种 ComponentType** | JS 位运算限制在 32-bit 整数 | 超出时 `new ComponentType()` 抛异常。实际项目中通常足够；如果不够需拆分 world 或合并组件 |
| **纯 none 查询遍历全部 slot** | 没有 `all` 或 `any` 约束时无法缩小候选集 | 避免使用纯 `none` 查询，或搭配 `all` / `any` 缩小范围 |
| **generation 有限回绕** | 12-bit generation 最大 4096 次复用 | 同一 index 被回收 4096 次后 generation 归零，极端情况下 `isAlive` 可能误判。实际场景几乎不会遇到 |
| **ComponentType typeId 全局递增** | 静态计数器，跨 world 共享 | 多个 EcsWorld 实例共享 typeId 空间，注意总量不超过 32 |

---

## 测试

```bash
# 运行 gfc-ecs 全部测试
npx jest packages/gfc-ecs --no-coverage

# 运行单个测试文件
npx jest packages/gfc-ecs/tests/ecs-world.test.ts

# 查看覆盖率
npx jest packages/gfc-ecs --coverage
```

## 许可

MIT — 详见项目根目录 [LICENSE](../../LICENSE)。

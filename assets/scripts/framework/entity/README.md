# Entity（实体管理）

## 职责

统一管理游戏实体的分组注册、创建/显示、隐藏/回收和生命周期驱动。通过 `IEntityFactory` 策略注入隔离引擎依赖，内部使用对象池复用实体实例，降低 GC 压力。
**不负责**具体实体的业务逻辑（由 `EntityBase` 子类实现），也不负责渲染和物理（由 Runtime 层桥接）。

## 对外 API

```typescript
// === EntityManager（实体管理器，priority = 180） ===
EntityManager.setEntityFactory(factory: IEntityFactory): void      // 设置实体工厂
EntityManager.registerGroup(groupName: string): void               // 注册实体分组
EntityManager.showEntity(groupName, data?, callbacks?): EntityBase // 显示实体
EntityManager.hideEntity(entity: EntityBase): void                 // 隐藏实体
EntityManager.hideAllEntities(groupName?: string): void            // 隐藏所有实体
EntityManager.getEntitiesByGroup(groupName): readonly EntityBase[] // 获取分组内活跃实体
EntityManager.hasEntity(entityId: EntityId): boolean               // 查询实体是否活跃

// === EntityBase（实体抽象基类） ===
EntityBase.entityId: EntityId      // readonly，实体 ID
EntityBase.groupName: string       // readonly，所属分组
EntityBase.isActive: boolean       // readonly，是否活跃
EntityBase.onShow(data?): void     // 生命周期：显示时调用
EntityBase.onHide(): void          // 生命周期：隐藏时调用
EntityBase.onUpdate(deltaTime): void // 生命周期：每帧更新

// === EntityGroup（实体分组，内部使用） ===
EntityGroup.showEntity(entityId, data?): EntityBase  // 取出/创建实体
EntityGroup.hideEntity(entity): void                  // 回收实体到等待池
EntityGroup.update(deltaTime): void                   // 驱动活跃实体更新
EntityGroup.destroyAll(): void                        // 销毁所有实体
EntityGroup.getActiveEntities(): readonly EntityBase[] // 活跃实体快照

// === 类型定义 ===
type EntityId = number;
interface IEntityFactory { createEntity(groupName): EntityBase; destroyEntity(entity): void; }
interface ShowEntityCallbacks { onSuccess?; onFailure?; }
```

## 设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 分组管理 | `Map<groupName, EntityGroup>` | 同类实体共享对象池，按组批量操作 |
| 工厂策略 | `IEntityFactory` 接口注入 | Framework 层不依赖引擎 API，Runtime 层提供 Cocos 实现 |
| ID 分配 | 管理器自增 `_nextEntityId` | 全局唯一、简单高效，无需外部协调 |
| 对象池复用 | EntityGroup 内部 `_waitingList` | 优先从等待池取出复用，减少实例创建和 GC |
| 快照遍历 | `update` 中 `slice()` 活跃列表 | 防止 onUpdate 中 show/hide 修改列表导致遍历异常 |
| Priority | 180 | 在 UIManager（200）之前更新，确保 UI 读到当帧最新实体状态 |

## 依赖

- **Core**（`ModuleBase`）— EntityManager 继承 ModuleBase
- **Logger** — 日志输出

## 被谁依赖

- Game 层业务代码通过 `IEntityManager` 接口使用
- Runtime 层提供 `IEntityFactory` 的引擎实现

## 已知限制

- 实体 ID 为简单自增数字，不支持分布式场景
- EntityGroup 的 `_activeList` 使用 `indexOf` + `splice` 隐藏实体，大量实体时可能有性能瓶颈
- 不支持实体层级关系（父子实体）
- 不支持实体组件模式（ECS），如需 ECS 请参考 `packages/gfc-ecs`

## 关联测试

- `tests/entity/`

## 状态

✅ 已完成 — 核心功能就绪，通过全部单元测试

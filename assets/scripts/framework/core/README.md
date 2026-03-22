# Core（框架核心）

## 职责
提供框架的核心基础设施：模块基类、模块注册表、框架入口。
**不负责**任何具体业务功能，只管理模块的注册、获取和生命周期驱动。

## 对外 API

```typescript
// === GameEntry（框架入口，门面模式） ===
GameEntry.registerModule(module: ModuleBase): void   // 注册模块
GameEntry.getModule<T extends ModuleBase>(name: string): T  // 获取模块
GameEntry.update(deltaTime: number): void            // 驱动所有模块更新
GameEntry.shutdown(): void                           // 关闭所有模块

// === ModuleBase（模块基类） ===
abstract get moduleName(): string    // 模块名称
abstract get priority(): number      // 执行优先级（越小越先）
abstract onInit(): void              // 初始化
onUpdate(deltaTime: number): void    // 每帧更新（默认空实现）
abstract onShutdown(): void          // 销毁

// === GameModule（模块管理器） ===
GameModule.register(module: ModuleBase): void
GameModule.getModule<T extends ModuleBase>(name: string): T
GameModule.hasModule(name: string): boolean
GameModule.update(deltaTime: number): void
GameModule.shutdownAll(): void
```

## 设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 模块存储 | 静态 Map + 排序数组 | Map O(1) 查找 + 数组保证有序遍历 |
| 排序策略 | 脏标记（dirty flag） | 避免每帧排序，只在 register 后排序一次 |
| GameEntry | 门面模式（Facade） | 对外提供简洁统一的 API |
| 错误处理 | 找不到模块时 throw Error | 强制调用方处理错误，避免静默失败 |

## 依赖
- 无（最底层模块）

## 被谁依赖
- 所有其他模块都通过 Core 注册和管理

## 已知限制
- GameModule 使用静态方法，不支持多实例（如主框架 + 子框架场景）
- 模块间的初始化依赖顺序完全由 priority 数值控制，没有自动依赖解析

## 关联测试
- `tests/core/game-module.test.ts`

## 状态
🟡 开发中 — 骨架已建立，等待大圆实现

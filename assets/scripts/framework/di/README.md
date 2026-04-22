# DI（依赖注入 / IoC 容器）

## 职责

提供类型安全的 IoC（控制反转）容器，管理服务的注册、解析和生命周期。通过 `ServiceKey<T>` 幻影类型实现编译期类型约束，支持装饰器驱动的自动注入。
**不负责**模块的注册与驱动（由 `GameModule` / `GameEntry` 负责），也不管理模块生命周期。

## 对外 API

```typescript
// === ServiceKey<T>（服务标识符，幻影类型） ===
class ServiceKey<T> {
    readonly description: string;
    constructor(description: string);
}

// === Lifecycle（生命周期枚举） ===
enum Lifecycle {
    Singleton = 'singleton',   // 整个容器生命周期内只创建一个实例
    Transient = 'transient',   // 每次 resolve 都创建新实例
}

// === Container（IoC 容器） ===
Container.bind<T>(key: ServiceKey<T>): BindingBuilder<T>   // 绑定服务
Container.resolve<T>(key: ServiceKey<T>): T                // 解析服务
Container.has<T>(key: ServiceKey<T>): boolean              // 检查是否已绑定
Container.unbind<T>(key: ServiceKey<T>): void              // 解除绑定
Container.createChild(): Container                          // 创建子容器
Container.clear(): void                                     // 清除所有绑定

// === BindingBuilder<T>（链式绑定构建器） ===
BindingBuilder<T>.to(ctor: Newable<T>): this               // 绑定到构造函数
BindingBuilder<T>.toFactory(factory: () => T): this        // 绑定到工厂函数
BindingBuilder<T>.toValue(instance: T): this               // 绑定到已有实例
BindingBuilder<T>.inSingletonScope(): this                 // 设为单例
BindingBuilder<T>.inTransientScope(): this                 // 设为瞬态（默认）
BindingBuilder<T>.onDispose(dispose: () => void): this     // 设置释放回调

// === 装饰器 ===
@Injectable(lifecycle?: Lifecycle)                          // 标记类为可注入
@Inject(key: ServiceKey<T>)                                // 标记构造函数参数需注入
```

## 设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 类型安全 | `ServiceKey<T>` 幻影类型 | 编译期保证 bind/resolve 类型一致，无需运行时转换 |
| 生命周期 | Singleton + Transient | 覆盖绝大多数游戏场景，不引入复杂的 Scoped 作用域 |
| 循环依赖检测 | `_resolutionStack` 栈检测 | 在 resolve 递归时检测环，提供清晰的依赖链错误信息 |
| 层级容器 | 子容器向父容器查找 | 支持测试替换和模块隔离，子容器可覆盖父容器绑定 |
| 装饰器注入 | reflect-metadata + `@Inject` | 减少手动接线代码，构造函数参数自动解析依赖 |
| 链式 API | BindingBuilder 模式 | `.bind(key).to(Impl).inSingletonScope()` 可读性好 |

## 依赖

- 无框架模块依赖（独立的 IoC 基础设施）
- 依赖 `reflect-metadata`（装饰器元数据）
- 使用 `Logger` 输出调试日志

## 被谁依赖

- 可被任何需要依赖注入的模块或业务代码使用
- 与 `GameModule` 模块系统互补：GameModule 管理模块生命周期，Container 管理服务依赖

## 已知限制

- 不支持 Scoped 生命周期（如 Request Scope）
- `@Inject` 仅支持构造函数参数注入，不支持属性注入
- 循环依赖检测在单次 resolve 调用链内有效，跨异步调用无法检测
- 子容器的 unbind 仅影响自身，不影响父容器

## 关联测试

- `tests/di/container.test.ts`
- `tests/di/decorators.test.ts`

## 状态

✅ 已完成 — 核心功能就绪，通过全部单元测试

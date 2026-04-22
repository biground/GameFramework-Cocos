# Event（事件系统）

## 职责

提供发布-订阅模式的跨模块事件通信机制，使用 `EventKey<T>` 幻影类型实现编译期类型安全。所有跨模块通信**必须**通过 EventManager，禁止模块间直接引用。
**不负责**业务逻辑，也不提供事件过滤、事件队列或异步事件能力。

## 对外 API

```typescript
// === EventKey<T>（事件键，幻影类型） ===
class EventKey<T = void> {
    readonly description: string;
    constructor(description: string);
}

// === EventManager（事件管理器，priority = 10） ===
EventManager.on<T>(key: EventKey<T>, callback: EventCallback<T>, caller?: unknown): void
EventManager.once<T>(key: EventKey<T>, callback: EventCallback<T>, caller?: unknown): void
EventManager.off<T>(key: EventKey<T>, callback: EventCallback<T>, caller?: unknown): void
EventManager.offAll(key?: EventKey<unknown>): void
EventManager.offByCaller(caller: unknown): void
EventManager.emit<T>(key: EventKey<T>, ...args): void

// === 类型定义 ===
type EventCallback<T> = (eventData: T) => void;
interface EventBinding<T> { callback; caller; once; _removed?; }
```

## 设计决策

| 决策          | 选择                           | 原因                                                |
| ------------- | ------------------------------ | --------------------------------------------------- |
| 类型安全      | `EventKey<T>` 幻影类型         | `on(KEY, cb)` 和 `emit(KEY, data)` 编译期类型联动   |
| void 事件     | `emit<void>(key)` 无需传参     | 条件类型 `[T] extends [void] ? [] : [data: T]` 区分 |
| 快照遍历      | `_emitDepth` 嵌套深度计数      | emit 过程中 off 仅标记 `_removed`，遍历完后才清理   |
| once 延迟移除 | 标记 `_removed` 在遍历后清理   | 保证同一轮 emit 中 once 回调仅触发一次且不影响遍历  |
| 重复注册      | callback + caller 精确匹配去重 | 静默忽略重复注册，避免意外多次触发                  |
| offByCaller   | 按 caller 批量移除             | 对象销毁时一次性清理所有监听，防止内存泄漏          |

## 依赖

- **Core**（`ModuleBase`）— EventManager 继承 ModuleBase
- **Logger** — 日志输出

## 被谁依赖

- **几乎所有模块** — 跨模块通信的唯一合法通道
- **LocalizationManager** — 语言切换事件广播
- **ProcedureManager** — 流程切换通知
- **UIManager** — UI 事件处理
- 业务层通过 `IEventManager` 接口使用

## 已知限制

- 不支持事件优先级（监听按注册顺序触发）
- 不支持异步事件或事件队列
- 不支持事件冒泡/捕获
- `EventBinding` 的 caller 是 `unknown` 类型，无编译期约束

## 关联测试

- `tests/event/event-manager.test.ts`

## 状态

✅ 已完成 — 核心功能就绪，通过全部单元测试

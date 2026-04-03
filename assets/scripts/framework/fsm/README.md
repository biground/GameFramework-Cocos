# FSM（有限状态机）

## 职责

管理有限状态机的创建、驱动和销毁，提供类型安全的状态切换与跨状态数据共享。
**不负责**具体状态的业务逻辑，也不提供层级状态机（HFSM）或并行状态机能力。

## 对外 API

```typescript
// === FsmManager（状态机管理器，priority 110） ===
FsmManager.createFsm<T>(name: string, owner: T, ...states: IFsmState<T>[]): IFsm<T>
FsmManager.destroyFsm(name: string): boolean
FsmManager.getFsm(name: string): IFsm<unknown> | undefined
FsmManager.hasFsm(name: string): boolean
FsmManager.fsmCount: number  // getter

// === IFsm<T>（状态机实例） ===
IFsm<T>.name: string                  // readonly
IFsm<T>.owner: T                      // readonly
IFsm<T>.currentState: IFsmState<T> | null  // readonly
IFsm<T>.isDestroyed: boolean          // readonly
IFsm<T>.changeState<TState>(stateType: Constructor<TState>): void
IFsm<T>.getData<V>(key: string): V | undefined
IFsm<T>.setData<V>(key: string, value: V): void
IFsm<T>.removeData(key: string): boolean
IFsm<T>.hasState<TState>(stateType: Constructor<TState>): boolean

// === Fsm<T>（状态机实现，仅 FsmManager 内部使用） ===
Fsm<T>.start<TState>(stateType: Constructor<TState>): void  // 启动状态机
Fsm<T>.update(deltaTime: number): void       // 由 FsmManager 每帧驱动
Fsm<T>.shutdown(): void                      // 由 FsmManager 调用

// === FsmState<T>（状态基类） ===
abstract class FsmState<T> implements IFsmState<T>
  onInit(fsm): void          // 默认空实现
  onEnter(fsm): void         // 默认空实现
  onUpdate(fsm, deltaTime): void  // 默认空实现
  onLeave(fsm): void         // 默认空实现
  onDestroy(fsm): void       // 默认空实现
  protected changeState<TState>(fsm, stateType): void  // 便捷切换方法
```

## 设计决策

| 决策             | 选择                                       | 原因                                                    |
| ---------------- | ------------------------------------------ | ------------------------------------------------------- |
| 反递归保护       | `_isChangingState` 标志位                  | 防止 onEnter/onLeave 中触发 changeState 导致栈溢出      |
| 状态注册方式     | Constructor 类型作为 Map key               | 支持 `changeState<IdleState>(IdleState)` 式类型安全调用 |
| 跨状态数据共享   | 黑板模式（`Map<string, unknown>`）         | 状态间解耦，无需直接引用其他状态实例                    |
| 状态基类         | `FsmState` 抽象类，生命周期默认空实现      | 子类只需覆盖关心的回调，减少样板代码                    |
| 关闭流程         | 先 onLeave 当前状态，再 onDestroy 所有状态 | 保证当前状态正确退出，所有状态都得到清理机会            |
| changeState 容错 | try/finally 确保 `_isChangingState` 复位   | 即便 onLeave/onEnter 抛异常，标志位也能正确恢复         |

## 依赖

- **Core**（`ModuleBase`）— FsmManager 继承 ModuleBase 实现模块化接入

## 被谁依赖

- **ProcedureManager**（待实现）— 基于 FSM 实现流程管理

## 已知限制

- 不支持层级/嵌套状态机（Hierarchical FSM）
- 无状态切换历史记录或日志追踪
- 黑板数据无类型约束（`Map<string, unknown>`），取值需调用方自行断言类型
- 同一 FsmManager 中状态机名称必须唯一，不支持同名状态机

## 关联测试

- `tests/fsm/fsm.test.ts`
- `tests/fsm/fsm-manager.test.ts`

## 状态

✅ 已完成 — 核心功能就绪，通过全部单元测试

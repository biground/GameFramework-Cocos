# FSM（有限状态机）

## 职责

管理有限状态机的创建、驱动和销毁，提供类型安全的状态切换与跨状态数据共享。
**不负责**具体状态的业务逻辑，也不提供层级状态机（HFSM）或并行状态机能力。

## 对外 API

```typescript
// === FsmManager（状态机管理器，priority 110） ===
FsmManager.createFsm<T, TBlackboard = Record<string, unknown>>(
    name: string, owner: T, ...states: IFsmState<T, TBlackboard>[]
): IFsm<T, TBlackboard>
FsmManager.destroyFsm(name: string): boolean
FsmManager.getFsm(name: string): IFsm<unknown> | undefined
FsmManager.hasFsm(name: string): boolean
FsmManager.fsmCount: number  // getter

// === IFsm<T, TBlackboard>（状态机实例） ===
IFsm<T, TBlackboard>.name: string                               // readonly
IFsm<T, TBlackboard>.owner: T                                   // readonly
IFsm<T, TBlackboard>.currentState: IFsmState<T, TBlackboard> | null  // readonly
IFsm<T, TBlackboard>.isDestroyed: boolean                       // readonly
IFsm<T, TBlackboard>.blackboard: TBlackboard                    // readonly，类型安全的黑板
IFsm<T, TBlackboard>.changeState<TState>(stateType: Constructor<TState>): void
IFsm<T, TBlackboard>.getData<V>(key: string): V | undefined
IFsm<T, TBlackboard>.setData<V>(key: string, value: V): void
IFsm<T, TBlackboard>.removeData(key: string): boolean
IFsm<T, TBlackboard>.hasState<TState>(stateType: Constructor<TState>): boolean
IFsm<T, TBlackboard>.setBlackboard(data: TBlackboard): void

// === Fsm<T, TBlackboard>（状态机实现，仅 FsmManager 内部使用） ===
Fsm<T, TBlackboard>.start<TState>(stateType: Constructor<TState>): void
Fsm<T, TBlackboard>.update(deltaTime: number): void
Fsm<T, TBlackboard>.shutdown(): void

// === FsmState<T, TBlackboard>（状态基类） ===
abstract class FsmState<T, TBlackboard = Record<string, unknown>> implements IFsmState<T, TBlackboard>
  onInit(fsm): void          // 默认空实现
  onEnter(fsm): void         // 默认空实现
  onUpdate(fsm, deltaTime): void  // 默认空实现
  onLeave(fsm): void         // 默认空实现
  onDestroy(fsm): void       // 默认空实现
  protected changeState<TState>(fsm, stateType): void  // 便捷切换方法
```

## 黑板（Blackboard）

FSM 支持类型安全的黑板机制，通过第二个泛型参数 `TBlackboard` 指定黑板数据结构。
黑板用于替代松散的 `getData/setData`（`Map<string, unknown>`），提供编译期类型约束。

### 用法

```typescript
// 1. 定义黑板接口
interface IBattleBlackboard {
    target: Enemy | null;
    damage: number;
    cooldown: number;
}

// 2. 创建 FSM 时传入双泛型
const fsm = fsmManager.createFsm<string, IBattleBlackboard>(
    'battle_ai',
    'hero',
    new IdleState(),
    new AttackState(),
);

// 3. 设置黑板数据（类型安全）
fsm.setBlackboard({ target: null, damage: 0, cooldown: 1.0 });

// 4. 在状态中直接访问（无需类型断言）
class AttackState extends FsmState<string, IBattleBlackboard> {
    onEnter(fsm: IFsm<string, IBattleBlackboard>): void {
        const bb = fsm.blackboard; // 类型为 IBattleBlackboard
        if (bb.target) {
            bb.target.takeDamage(bb.damage);
        }
    }
}
```

### 向后兼容

- 不指定 `TBlackboard` 时默认为 `Record<string, unknown>`，与旧代码完全兼容
- `getData/setData` 依然可用作轻量级跨状态通信

## 设计决策

| 决策             | 选择                                       | 原因                                                    |
| ---------------- | ------------------------------------------ | ------------------------------------------------------- |
| 反递归保护       | `_isChangingState` 标志位                  | 防止 onEnter/onLeave 中触发 changeState 导致栈溢出      |
| 状态注册方式     | Constructor 类型作为 Map key               | 支持 `changeState<IdleState>(IdleState)` 式类型安全调用 |
| 跨状态数据共享   | 黑板模式（类型安全 `TBlackboard` + 兼容 `Map<string, unknown>`）         | 类型安全的黑板用于结构化数据，getData/setData 用于轻量级临时通信 |
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
- 黑板 `TBlackboard` 泛型参数提供编译期类型约束，`getData/setData` 保留作为兼容 API
- 同一 FsmManager 中状态机名称必须唯一，不支持同名状态机

## 关联测试

- `tests/fsm/fsm.test.ts`
- `tests/fsm/fsm-manager.test.ts`

## 状态

✅ 已完成 — 核心功能就绪，通过全部单元测试

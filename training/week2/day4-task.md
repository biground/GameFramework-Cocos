# 📋 Week 2 Day 4 — 任务卡片

## 🗓️ 日期：2026-04-04

## 🎯 主题：FSM — 有限状态机

---

## 📖 知识准备（编码前先了解）

1. **为什么游戏框架需要 FSM？**
    - 游戏中大量逻辑本质是状态转换：角色从 Idle → Run → Jump → Fall → Idle
    - 没有 FSM 时代码充斥着 `if/else` 嵌套和布尔标记，维护困难
    - FSM 将每个状态封装为独立对象，状态转换逻辑清晰可控
    - 后续 `ProcedureManager`（流程管理器）就是建立在 FSM 之上的

2. **FSM 的核心组件**
    - `IFsm<T>`：有限状态机接口，T 是持有者类型（如 Character、GameEntry）
    - `FsmState<T>`：状态基类，每个具体状态继承它
    - `FsmManager`：状态机管理器，作为 `ModuleBase` 注册到框架
    - 关系：`FsmManager` 管理多个 `IFsm<T>` 实例

3. **状态生命周期**
    - `onInit(fsm)` — 状态初始化（状态机创建时调用）
    - `onEnter(fsm)` — 进入状态
    - `onUpdate(fsm, deltaTime)` — 状态内每帧更新
    - `onLeave(fsm)` — 离开状态
    - `onDestroy(fsm)` — 状态销毁
    - 切换状态时的调用顺序：`当前状态.onLeave()` → `新状态.onEnter()`

4. **设计要点**
    - FSM 需要一个"持有者"概念（owner），描述这个状态机服务于谁
    - 状态之间通过 `changeState<TState>()` 切换，用泛型确定目标状态类型
    - 需要防止在 `onEnter` 中立即 `changeState` 导致的无限递归
    - 可以携带数据（blackboard / data 字典）供各状态共享

---

## 🔨 编码任务

### 任务 1：定义 FSM 接口和类型

**文件路径**：`assets/scripts/framework/fsm/FsmDefs.ts`

**需求**：

- 定义 `IFsmState<T>` 接口（状态的生命周期方法）
- 定义 `IFsm<T>` 接口（状态机本身的接口）
    - `readonly name: string` — 状态机名称
    - `readonly owner: T` — 持有者
    - `readonly currentState: IFsmState<T> | null` — 当前状态
    - `changeState<TState extends IFsmState<T>>(stateType: Constructor<TState>): void`
    - `getData<V>(key: string): V | undefined` — 获取共享数据
    - `setData<V>(key: string, value: V): void` — 设置共享数据
    - `removeData(key: string): boolean` — 移除共享数据

### 任务 2：实现 `FsmState<T>` 基类

**文件路径**：`assets/scripts/framework/fsm/FsmState.ts`

**需求**：

- 抽象基类，提供默认空实现和 `changeState` 便捷方法
- 子类只需 override 关心的生命周期方法

### 任务 3：实现 `Fsm<T>` 状态机

**文件路径**：`assets/scripts/framework/fsm/Fsm.ts`

**需求**：

- 构造参数：`name`, `owner`, `states[]`
- `start<TState>(stateType)` — 以某个状态启动
- `changeState<TState>(stateType)` — 切换到指定类型的状态
- `update(deltaTime)` — 驱动当前状态的 `onUpdate`
- `shutdown()` — 销毁状态机，调用所有状态的 `onDestroy`
- 内部维护状态 Map：`Constructor<FsmState<T>>` → `FsmState<T>` 实例

### 任务 4：实现 `FsmManager` 模块

**文件路径**：`assets/scripts/framework/fsm/FsmManager.ts`

**需求**：

- 继承 `ModuleBase`，priority 在 100-199 区间（核心服务层）
- `createFsm<T>(name, owner, ...states): IFsm<T>` — 创建状态机
- `destroyFsm(name): boolean` — 销毁状态机
- `getFsm(name): IFsm<unknown> | undefined` — 获取状态机
- `onUpdate(deltaTime)` — 驱动所有状态机更新
- `onShutdown()` — 销毁所有状态机

---

## 🧪 测试要求

在 `tests/fsm/` 下创建测试文件，至少覆盖：

1. 创建状态机，初始化状态
2. 启动状态机，验证进入初始状态
3. 切换状态，验证 onLeave → onEnter 调用顺序
4. update 驱动，验证 onUpdate 被调用
5. shutdown 销毁，验证 onDestroy 调用
6. getData / setData 共享数据
7. FsmManager 管理多个状态机
8. 重复创建同名状态机应报错

---

## 💡 思考题（编码后讨论）

1. **FSM vs 行为树（Behavior Tree）有什么区别？各自适用什么场景？**
2. **如果状态 A 的 `onEnter` 里立即调用 `changeState(B)`，B 的 `onEnter` 又调用 `changeState(A)`，会发生什么？你的实现如何防范？**
3. **为什么 FSM 的 owner 用泛型 T？不能直接用 `unknown` 吗？**

---

## ✅ 验收标准

1. `npm test` 全绿
2. `npm run lint` 无错误
3. FSM 测试至少 8 个用例通过
4. 所有 public API 有中文 JSDoc

# Procedure（流程管理器）

## 职责

管理游戏全局流程的切换与驱动，将游戏的不同阶段（启动、热更、主界面、战斗等）封装为独立的流程对象。
**不负责**具体流程的业务逻辑，也不提供异步过渡、子流程栈或并行流程能力。

## 对外 API

```typescript
// === ProcedureManager（流程管理器，priority 300） ===
ProcedureManager.initialize(...procedures: ProcedureBase[]): void  // 注册流程列表
ProcedureManager.startProcedure<T>(entryProcedure: Constructor<T>): void  // 启动入口流程
ProcedureManager.hasProcedure<T>(procedureType: Constructor<T>): boolean  // 检查流程是否存在
ProcedureManager.currentProcedure: ProcedureBase | null  // 当前流程实例（getter）

// === ProcedureBase（流程基类） ===
abstract class ProcedureBase extends FsmState<unknown>
  onInit(fsm): void          // 流程初始化
  onEnter(fsm): void         // 进入流程
  onUpdate(fsm, deltaTime): void  // 流程内每帧更新
  onLeave(fsm): void         // 离开流程
  onDestroy(fsm): void       // 流程销毁
  protected changeProcedure<T>(fsm, procedureType): void  // 便捷切换方法
  protected getContext<T>(fsm, key): T  // 从 FSM 数据中获取类型安全的上下文
```

## getContext 便捷方法

`ProcedureBase.getContext<T>(fsm, key)` 封装了 `fsm.getData<T>(key)` 并添加 null 检查，
失败时通过 Logger 输出错误并抛出异常，避免流程中散落的空值判断。

### 用法

```typescript
class BattleProcedure extends ProcedureBase {
    onEnter(fsm: IFsm<unknown>): void {
        // 获取流程上下文（类型安全 + 自动空值守卫）
        const ctx = this.getContext<IBattleContext>(fsm, 'battleContext');
        // ctx 保证非空，可直接使用
        ctx.renderer.showBattleUI();
    }
}
```

## 设计决策

| 决策                     | 选择                                                  | 原因                                             |
| ------------------------ | ----------------------------------------------------- | ------------------------------------------------ |
| 内部驱动方式             | 直接持有 Fsm\<ProcedureManager\> 实例                 | 只需一个专用状态机，不需要经 FsmManager 注册管理 |
| ProcedureBase 泛型       | FsmState\<unknown\> 而非 FsmState\<ProcedureManager\> | 避免循环引用，保持类型简洁                       |
| initialize 与 start 分离 | 先 initialize 注册流程，再 startProcedure 启动        | 允许在注册后、启动前做额外配置                   |

## 依赖

- FSM（概念依赖，直接 `new Fsm<T>()`，不通过 FsmManager）

## 被谁依赖

- Game 层业务流程（ProcedureLaunch、ProcedureMenu 等）

## 已知限制

- 线性单流程，不支持子流程嵌套或并行分支
- 流程切换是同步的，不支持异步过渡（加载画面）
- 未来拓展：异步 changeProcedure、子流程栈、canEnter/canLeave 守卫

## 关联测试

- 测试文件路径：`tests/procedure/procedure-manager.test.ts`
- 测试数量：13 个（初始化、启动、切换、驱动、销毁、模块属性）

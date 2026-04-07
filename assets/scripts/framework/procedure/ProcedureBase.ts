import { FsmState } from '../fsm/FsmState';
import { IFsm, Constructor, IFsmState } from '../fsm/FsmDefs';

/**
 * 流程基类
 * 所有游戏流程必须继承此类，每个流程对应一个游戏阶段
 *
 * 设计说明：
 * - ProcedureBase 继承 FsmState，本质上就是一个状态机状态
 * - ProcedureManager 内部持有的 FSM 的 owner 就是 ProcedureManager 自身
 * - 子类覆写 onEnter/onUpdate/onLeave 实现具体流程逻辑
 * - 通过 changeProcedure() 切换到下一个流程
 *
 * @example
 * ```typescript
 * class ProcedureLaunch extends ProcedureBase {
 *     onEnter(fsm: IFsm<unknown>): void {
 *         // 启动时检查版本...
 *         this.changeProcedure(fsm, ProcedureCheckVersion);
 *     }
 * }
 * ```
 */
export abstract class ProcedureBase extends FsmState<unknown> {
    /**
     * 便捷方法：切换到下一个流程
     * @template T 目标流程类型
     * @param fsm 所属状态机
     * @param procedureType 目标流程的构造函数
     */
    protected changeProcedure<T extends IFsmState<unknown>>(
        fsm: IFsm<unknown>,
        procedureType: Constructor<T>,
    ): void {
        this.changeState(fsm, procedureType);
    }
}

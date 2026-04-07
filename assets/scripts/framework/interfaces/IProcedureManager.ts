import { Constructor } from '../fsm/FsmDefs';
import { ProcedureBase } from '../procedure/ProcedureBase';

/**
 * 流程管理器接口
 * 定义游戏流程管理的公共契约，业务层应依赖此接口而非 ProcedureManager 实现类
 *
 * 任何实现此接口的模块都可以通过插件机制替换默认的 ProcedureManager
 */
export interface IProcedureManager {
    /** 当前流程实例（未启动时为 null） */
    readonly currentProcedure: ProcedureBase | null;

    /**
     * 启动流程管理器，进入入口流程
     * @template T 入口流程类型
     * @param entryProcedure 入口流程的构造函数
     */
    startProcedure<T extends ProcedureBase>(entryProcedure: Constructor<T>): void;

    /**
     * 检查是否包含指定类型的流程
     * @template T 流程类型
     * @param procedureType 流程的构造函数
     * @returns 是否包含该流程
     */
    hasProcedure<T extends ProcedureBase>(procedureType: Constructor<T>): boolean;
}

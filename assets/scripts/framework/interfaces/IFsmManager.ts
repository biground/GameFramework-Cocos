import { IFsm, IFsmState } from '../fsm/FsmDefs';

/**
 * 有限状态机管理器接口
 * 定义状态机系统的公共契约，业务层应依赖此接口而非 FsmManager 实现类
 *
 * 任何实现此接口的模块都可以通过插件机制替换默认的 FsmManager
 */
export interface IFsmManager {
    /** 已创建的状态机数量 */
    readonly fsmCount: number;

    /**
     * 创建有限状态机
     * @template T 状态机持有者类型
     * @template TBlackboard 黑板数据类型，默认 Record<string, unknown>
     * @param name 状态机名称（同名状态机不可重复创建）
     * @param owner 状态机持有者
     * @param states 状态机包含的状态列表（至少一个）
     * @returns 创建的状态机实例
     */
    createFsm<T, TBlackboard = Record<string, unknown>>(
        name: string,
        owner: T,
        ...states: IFsmState<T, TBlackboard>[]
    ): IFsm<T, TBlackboard>;

    /**
     * 销毁有限状态机
     * @param name 状态机名称
     * @returns 是否成功销毁
     */
    destroyFsm(name: string): boolean;

    /**
     * 获取有限状态机
     * @param name 状态机名称
     * @returns 状态机实例，不存在时返回 undefined
     */
    getFsm(name: string): IFsm<unknown> | undefined;

    /**
     * 检查是否存在指定名称的状态机
     * @param name 状态机名称
     * @returns 是否存在
     */
    hasFsm(name: string): boolean;
}

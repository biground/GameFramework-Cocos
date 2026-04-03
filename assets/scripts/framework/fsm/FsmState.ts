import { IFsm, IFsmState, Constructor } from './FsmDefs';

/**
 * 有限状态机状态基类
 * 提供默认的空生命周期实现，子类按需覆盖
 *
 * @template T 状态机持有者类型
 */
export abstract class FsmState<T> implements IFsmState<T> {
    /**
     * 状态初始化（状态机创建时调用）
     * @param _fsm 所属状态机
     */
    onInit(_fsm: IFsm<T>): void {}

    /**
     * 进入状态
     * @param _fsm 所属状态机
     */
    onEnter(_fsm: IFsm<T>): void {}

    /**
     * 状态内每帧更新
     * @param _fsm 所属状态机
     * @param _deltaTime 帧间隔时间（秒）
     */
    onUpdate(_fsm: IFsm<T>, _deltaTime: number): void {}

    /**
     * 离开状态
     * @param _fsm 所属状态机
     */
    onLeave(_fsm: IFsm<T>): void {}

    /**
     * 状态销毁
     * @param _fsm 所属状态机
     */
    onDestroy(_fsm: IFsm<T>): void {}

    /**
     * 便捷方法：在状态内部切换到另一个状态
     * @param fsm 所属状态机
     * @param stateType 目标状态的构造函数
     */
    protected changeState<TState extends IFsmState<T>>(
        fsm: IFsm<T>,
        stateType: Constructor<TState>,
    ): void {
        fsm.changeState(stateType);
    }
}

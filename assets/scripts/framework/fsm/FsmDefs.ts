/**
 * 构造函数类型
 * 用于状态机通过构造函数动态识别状态类型
 * @template T 对象类型
 */
export type Constructor<T> = new (...args: never[]) => T;

/**
 * 有限状态机状态接口
 * 定义状态的完整生命周期回调，所有状态必须实现此接口
 *
 * @template T 状态机持有者类型
 */
export interface IFsmState<T> {
    /**
     * 状态初始化（状态机创建时调用）
     * @param fsm 所属状态机
     */
    onInit(fsm: IFsm<T>): void;

    /**
     * 进入状态
     * @param fsm 所属状态机
     */
    onEnter(fsm: IFsm<T>): void;

    /**
     * 状态内每帧更新
     * @param fsm 所属状态机
     * @param deltaTime 帧间隔时间（秒）
     */
    onUpdate(fsm: IFsm<T>, deltaTime: number): void;

    /**
     * 离开状态
     * @param fsm 所属状态机
     */
    onLeave(fsm: IFsm<T>): void;

    /**
     * 状态销毁
     * @param fsm 所属状态机
     */
    onDestroy(fsm: IFsm<T>): void;
}

/**
 * 有限状态机接口
 * 定义状态机的公共契约，支持状态切换、共享数据存取
 *
 * @template T 状态机持有者类型
 */
export interface IFsm<T> {
    /** 状态机名称 */
    readonly name: string;

    /** 持有者 */
    readonly owner: T;

    /** 当前状态（未启动时为 null） */
    readonly currentState: IFsmState<T> | null;

    /** 是否已销毁 */
    readonly isDestroyed: boolean;

    /**
     * 切换到指定类型的状态
     * @template TState 目标状态类型
     * @param stateType 目标状态的构造函数
     */
    changeState<TState extends IFsmState<T>>(stateType: Constructor<TState>): void;

    /**
     * 获取共享数据
     * @template V 数据值类型
     * @param key 数据键
     * @returns 数据值，不存在时返回 undefined
     */
    getData<V>(key: string): V | undefined;

    /**
     * 设置共享数据
     * @template V 数据值类型
     * @param key 数据键
     * @param value 数据值
     */
    setData<V>(key: string, value: V): void;

    /**
     * 移除共享数据
     * @param key 数据键
     * @returns 是否成功移除
     */
    removeData(key: string): boolean;

    /**
     * 检查是否包含指定类型的状态
     * @template TState 状态类型
     * @param stateType 状态的构造函数
     * @returns 是否包含该类型的状态
     */
    hasState<TState extends IFsmState<T>>(stateType: Constructor<TState>): boolean;
}

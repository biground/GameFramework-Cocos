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
 * @template TBlackboard 黑板数据类型，默认 Record<string, unknown>
 */
export interface IFsmState<T, TBlackboard = Record<string, unknown>> {
    /**
     * 状态初始化（状态机创建时调用）
     * @param fsm 所属状态机
     */
    onInit(fsm: IFsm<T, TBlackboard>): void;

    /**
     * 进入状态
     * @param fsm 所属状态机
     */
    onEnter(fsm: IFsm<T, TBlackboard>): void;

    /**
     * 状态内每帧更新
     * @param fsm 所属状态机
     * @param deltaTime 帧间隔时间（秒）
     */
    onUpdate(fsm: IFsm<T, TBlackboard>, deltaTime: number): void;

    /**
     * 离开状态
     * @param fsm 所属状态机
     */
    onLeave(fsm: IFsm<T, TBlackboard>): void;

    /**
     * 状态销毁
     * @param fsm 所属状态机
     */
    onDestroy(fsm: IFsm<T, TBlackboard>): void;
}

/**
 * 有限状态机接口
 * 定义状态机的公共契约，支持状态切换、共享数据存取和类型安全的黑板
 *
 * @template T 状态机持有者类型
 * @template TBlackboard 黑板数据类型，默认 Record<string, unknown>
 */
export interface IFsm<T, TBlackboard = Record<string, unknown>> {
    /** 状态机名称 */
    readonly name: string;

    /** 持有者 */
    readonly owner: T;

    /** 当前状态（未启动时为 null） */
    readonly currentState: IFsmState<T, TBlackboard> | null;

    /** 是否已销毁 */
    readonly isDestroyed: boolean;

    /** 类型安全的黑板数据，编译期约束字段类型 */
    readonly blackboard: TBlackboard;

    /**
     * 切换到指定类型的状态
     * @template TState 目标状态类型
     * @param stateType 目标状态的构造函数
     */
    changeState<TState extends IFsmState<T, TBlackboard>>(stateType: Constructor<TState>): void;

    /**
     * 获取共享数据（旧版兼容 API）
     * @template V 数据值类型
     * @param key 数据键
     * @returns 数据值，不存在时返回 undefined
     */
    getData<V>(key: string): V | undefined;

    /**
     * 设置共享数据（旧版兼容 API）
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
    hasState<TState extends IFsmState<T, TBlackboard>>(stateType: Constructor<TState>): boolean;

    /**
     * 启动状态机，进入指定的初始状态
     * @template TState 初始状态类型
     * @param stateType 初始状态的构造函数
     */
    start<TState extends IFsmState<T, TBlackboard>>(stateType: Constructor<TState>): void;

    /**
     * 设置完整的黑板对象（替换当前黑板）
     * @param data 新的黑板数据
     */
    setBlackboard(data: TBlackboard): void;
}

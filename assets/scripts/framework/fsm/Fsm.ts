import { IFsm, IFsmState, Constructor } from './FsmDefs';

/**
 * 有限状态机
 * 管理一组状态的切换、更新和共享数据，支持反递归保护
 *
 * @template T 状态机持有者类型
 */
export class Fsm<T> implements IFsm<T> {
    private _name: string;
    private _owner: T;
    private _states: Map<Constructor<IFsmState<T>>, IFsmState<T>>;
    private _currentState: IFsmState<T> | null = null;
    private _dataMap: Map<string, unknown> = new Map();
    private _isDestroyed: boolean = false;
    private _isChangingState: boolean = false;

    /**
     * 创建有限状态机
     * @param name 状态机名称（不可为空）
     * @param owner 持有者（不可为 null/undefined）
     * @param states 初始状态列表（不可为空，不可包含重复类型）
     */
    constructor(name: string, owner: T, states: IFsmState<T>[]) {
        if (!name) {
            throw new Error('[FSM] 状态机名称不能为空');
        }
        if (owner == null) {
            throw new Error('[FSM] 状态机持有者不能为空');
        }
        if (!states || states.length === 0) {
            throw new Error('[FSM] 状态列表不能为空');
        }

        this._name = name;
        this._owner = owner;
        this._states = new Map();

        for (const state of states) {
            const ctor = state.constructor as Constructor<IFsmState<T>>;
            if (this._states.has(ctor)) {
                throw new Error(`[FSM] 状态机 "${name}" 存在重复状态类型: ${ctor.name}`);
            }
            this._states.set(ctor, state);
        }

        // 初始化所有状态
        for (const state of this._states.values()) {
            state.onInit(this);
        }
    }

    /** 状态机名称 */
    get name(): string {
        return this._name;
    }

    /** 持有者 */
    get owner(): T {
        return this._owner;
    }

    /** 当前状态（未启动时为 null） */
    get currentState(): IFsmState<T> | null {
        return this._currentState;
    }

    /** 是否已销毁 */
    get isDestroyed(): boolean {
        return this._isDestroyed;
    }

    /**
     * 启动状态机，进入指定的初始状态
     * @param stateType 初始状态的构造函数
     */
    start<TState extends IFsmState<T>>(stateType: Constructor<TState>): void {
        if (this._isDestroyed) {
            throw new Error(`[FSM] 状态机 "${this._name}" 已销毁，无法启动`);
        }
        if (this._currentState !== null) {
            throw new Error(`[FSM] 状态机 "${this._name}" 已启动，不可重复启动`);
        }
        const state = this._states.get(stateType as unknown as Constructor<IFsmState<T>>);
        if (!state) {
            throw new Error(`[FSM] 状态机 "${this._name}" 不包含状态: ${stateType.name}`);
        }
        this._currentState = state;
        this._currentState.onEnter(this);
    }

    /**
     * 切换到指定类型的状态
     * @param stateType 目标状态的构造函数
     */
    changeState<TState extends IFsmState<T>>(stateType: Constructor<TState>): void {
        if (this._currentState === null) {
            throw new Error(`[FSM] 状态机 "${this._name}" 尚未启动，无法切换状态`);
        }
        if (this._isChangingState) {
            throw new Error(`[FSM] 状态机 "${this._name}" 正在切换状态中，禁止递归切换`);
        }
        const targetState = this._states.get(stateType as unknown as Constructor<IFsmState<T>>);
        if (!targetState) {
            throw new Error(`[FSM] 状态机 "${this._name}" 不包含状态: ${stateType.name}`);
        }

        this._isChangingState = true;
        try {
            this._currentState.onLeave(this);
            this._currentState = targetState;
            this._currentState.onEnter(this);
        } finally {
            this._isChangingState = false;
        }
    }

    /**
     * 驱动当前状态更新（由 FsmManager 调用）
     * @param deltaTime 帧间隔时间（秒）
     */
    update(deltaTime: number): void {
        if (this._isDestroyed || this._currentState === null) {
            return;
        }
        this._currentState.onUpdate(this, deltaTime);
    }

    /**
     * 关闭状态机，销毁所有状态（由 FsmManager 调用）
     */
    shutdown(): void {
        if (this._isDestroyed) {
            return;
        }
        if (this._currentState !== null) {
            this._currentState.onLeave(this);
        }
        for (const state of this._states.values()) {
            state.onDestroy(this);
        }
        this._states.clear();
        this._dataMap.clear();
        this._currentState = null;
        this._isDestroyed = true;
    }

    /**
     * 获取共享数据
     * @param key 数据键
     * @returns 数据值，不存在时返回 undefined
     */
    getData<V>(key: string): V | undefined {
        return this._dataMap.get(key) as V | undefined;
    }

    /**
     * 设置共享数据
     * @param key 数据键
     * @param value 数据值
     */
    setData<V>(key: string, value: V): void {
        this._dataMap.set(key, value);
    }

    /**
     * 移除共享数据
     * @param key 数据键
     * @returns 是否成功移除
     */
    removeData(key: string): boolean {
        return this._dataMap.delete(key);
    }

    /**
     * 检查是否包含指定类型的状态
     * @param stateType 状态的构造函数
     * @returns 是否包含该类型的状态
     */
    hasState<TState extends IFsmState<T>>(stateType: Constructor<TState>): boolean {
        return this._states.has(stateType as unknown as Constructor<IFsmState<T>>);
    }
}

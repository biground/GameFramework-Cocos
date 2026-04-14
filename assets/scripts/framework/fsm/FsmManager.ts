import { ModuleBase } from '../core/ModuleBase';
import { IFsm, IFsmState } from './FsmDefs';
import { Fsm } from './Fsm';
import { IFsmManager } from '../interfaces/IFsmManager';
import { Logger } from '../debug/Logger';

/**
 * 有限状态机管理器
 * 负责状态机的创建、获取、销毁和统一驱动更新
 *
 * 设计说明：
 * - 所有状态机通过 FsmManager 统一管理，禁止业务层直接 new Fsm
 * - onUpdate 每帧驱动所有状态机的 update
 * - onShutdown 时按序关闭并清理所有状态机
 *
 * @example
 * ```typescript
 * const fsmMgr = GameEntry.getModule<FsmManager>('FsmManager');
 * const fsm = fsmMgr.createFsm('hero', hero, new IdleState(), new RunState());
 * fsm.start(IdleState);
 * ```
 */
export class FsmManager extends ModuleBase implements IFsmManager {
    private static readonly TAG = 'FsmManager';

    /** 状态机映射表：name → Fsm 实例 */
    private _fsmMap: Map<string, Fsm<unknown>> = new Map();

    /** 模块名称 */
    public get moduleName(): string {
        return 'FsmManager';
    }

    /** 模块优先级（核心服务层） */
    public get priority(): number {
        return 110;
    }

    /** 已创建的状态机数量 */
    public get fsmCount(): number {
        return this._fsmMap.size;
    }

    /** 模块初始化 */
    public onInit(): void {
        Logger.info(FsmManager.TAG, '状态机管理器初始化');
    }

    /**
     * 每帧驱动所有状态机更新
     * @param deltaTime 帧间隔时间（秒）
     */
    public onUpdate(deltaTime: number): void {
        for (const fsm of this._fsmMap.values()) {
            fsm.update(deltaTime);
        }
    }

    /** 模块销毁，关闭并清理所有状态机 */
    public onShutdown(): void {
        Logger.info(FsmManager.TAG, `状态机管理器关闭, 销毁 ${this._fsmMap.size} 个状态机`);
        for (const fsm of this._fsmMap.values()) {
            fsm.shutdown();
        }
        this._fsmMap.clear();
    }

    /**
     * 创建有限状态机
     * @template T 状态机持有者类型
     * @param name 状态机名称（同名状态机不可重复创建）
     * @param owner 状态机持有者
     * @param states 状态机包含的状态列表（至少一个）
     * @returns 创建的状态机实例
     */
    public createFsm<T>(name: string, owner: T, ...states: IFsmState<T>[]): IFsm<T> {
        if (this._fsmMap.has(name)) {
            Logger.error(FsmManager.TAG, `已存在同名状态机: "${name}"`);
            throw new Error(`[FsmManager] 已存在同名状态机: "${name}"`);
        }
        if (states.length === 0) {
            Logger.error(FsmManager.TAG, `创建状态机 "${name}" 时状态列表不能为空`);
            throw new Error(`[FsmManager] 创建状态机 "${name}" 时状态列表不能为空`);
        }
        const fsm = new Fsm<T>(name, owner, states);
        this._fsmMap.set(name, fsm as unknown as Fsm<unknown>);
        Logger.debug(FsmManager.TAG, `创建状态机: ${name}, states=${states.length}`);
        return fsm;
    }

    /**
     * 销毁有限状态机
     * @param name 状态机名称
     * @returns 是否成功销毁
     */
    public destroyFsm(name: string): boolean {
        const fsm = this._fsmMap.get(name);
        if (!fsm) {
            Logger.debug(FsmManager.TAG, `状态机不存在，忽略销毁: ${name}`);
            return false;
        }
        fsm.shutdown();
        this._fsmMap.delete(name);
        Logger.debug(FsmManager.TAG, `销毁状态机: ${name}`);
        return true;
    }

    /**
     * 获取有限状态机
     * @param name 状态机名称
     * @returns 状态机实例，不存在时返回 undefined
     */
    public getFsm(name: string): IFsm<unknown> | undefined {
        return this._fsmMap.get(name);
    }

    /**
     * 检查是否存在指定名称的状态机
     * @param name 状态机名称
     * @returns 是否存在
     */
    public hasFsm(name: string): boolean {
        return this._fsmMap.has(name);
    }
}

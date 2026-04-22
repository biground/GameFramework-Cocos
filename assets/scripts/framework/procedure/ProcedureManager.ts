import { ModuleBase } from '../core/ModuleBase';
import { Constructor, IFsmState } from '../fsm/FsmDefs';
import { Fsm } from '../fsm/Fsm';
import { ProcedureBase } from './ProcedureBase';
import { IProcedureManager } from '../interfaces/IProcedureManager';
import { Logger } from '../debug/Logger';

/**
 * 流程管理器
 * 管理游戏全局流程的切换，内部通过 FSM 驱动
 *
 * 设计说明：
 * - 继承 ModuleBase 作为上层逻辑模块注册到框架
 * - 内部持有一个 Fsm<ProcedureManager>，每个 Procedure 就是一个 FsmState
 * - ProcedureManager 本身是 FSM 的 owner
 * - 流程切换完全委托给内部 FSM，ProcedureManager 只负责初始化和驱动
 *
 * 典型流程链：
 * ProcedureLaunch → ProcedureCheckVersion → ProcedureLoadResources → ProcedureMainMenu → ProcedureGame
 *
 * @example
 * ```typescript
 * const procMgr = GameEntry.getModule<ProcedureManager>('ProcedureManager');
 * procMgr.initialize(new ProcedureLaunch(), new ProcedureMainMenu(), new ProcedureGame());
 * procMgr.startProcedure(ProcedureLaunch);
 * ```
 */
export class ProcedureManager extends ModuleBase implements IProcedureManager {
    private static readonly TAG = 'ProcedureManager';

    /** 内部状态机实例 */
    private _procedureFsm: Fsm<ProcedureManager> | null = null;

    /** 模块名称 */
    public get moduleName(): string {
        return 'ProcedureManager';
    }

    /** 模块优先级（上层逻辑层） */
    public get priority(): number {
        return 300;
    }

    /** 当前流程实例（未启动时为 null） */
    public get currentProcedure(): ProcedureBase | null {
        if (!this._procedureFsm) {
            return null;
        }
        return this._procedureFsm.currentState as ProcedureBase | null;
    }

    /**
     * 注册流程列表（必须在 startProcedure 之前调用）
     * @param procedures 要注册的流程实例列表（至少一个）
     */
    public initialize(...procedures: ProcedureBase[]): void {
        if (procedures.length === 0) {
            Logger.error(ProcedureManager.TAG, '初始化失败：procedures 不能为空');
            throw new Error('[ProcedureManager] 初始化失败：procedures 不能为空');
        }
        if (this._procedureFsm) {
            Logger.error(ProcedureManager.TAG, '初始化失败：不允许重复初始化');
            throw new Error('[ProcedureManager] 初始化失败：不允许重复初始化');
        }

        this._procedureFsm = new Fsm<ProcedureManager>(
            '__procedure__',
            this,
            procedures as unknown as IFsmState<ProcedureManager>[],
        );
        Logger.info(ProcedureManager.TAG, `注册 ${procedures.length} 个流程`);
    }

    /**
     * 在内部 FSM 上设置共享数据（必须在 startProcedure 之前调用）
     * @param key 数据键
     * @param value 数据值
     */
    public setData<V>(key: string, value: V): void {
        if (!this._procedureFsm) {
            Logger.error(ProcedureManager.TAG, 'setData 失败：请先调用 initialize');
            throw new Error('[ProcedureManager] setData 失败：请先调用 initialize');
        }
        this._procedureFsm.setData(key, value);
    }

    /**
     * 启动流程管理器，进入入口流程
     * @template T 入口流程类型
     * @param entryProcedure 入口流程的构造函数
     */
    public startProcedure<T extends ProcedureBase>(entryProcedure: Constructor<T>): void {
        if (!this._procedureFsm) {
            Logger.error(ProcedureManager.TAG, '启动失败：请先调用 initialize 初始化流程');
            throw new Error('[ProcedureManager] 启动失败：请先调用 initialize 初始化流程');
        }
        Logger.info(ProcedureManager.TAG, `启动入口流程: ${entryProcedure.name}`);
        this._procedureFsm.start(
            entryProcedure as unknown as Constructor<IFsmState<ProcedureManager>>,
        );
    }

    /**
     * 检查是否包含指定类型的流程
     * @template T 流程类型
     * @param procedureType 流程的构造函数
     * @returns 是否包含该流程
     */
    public hasProcedure<T extends ProcedureBase>(procedureType: Constructor<T>): boolean {
        if (!this._procedureFsm) {
            return false;
        }
        return this._procedureFsm.hasState(
            procedureType as unknown as Constructor<IFsmState<ProcedureManager>>,
        );
    }

    /** 模块初始化 */
    public onInit(): void {
        Logger.info(ProcedureManager.TAG, '流程管理器初始化');
    }

    /**
     * 每帧驱动内部 FSM 更新
     * @param deltaTime 帧间隔时间（秒）
     */
    public onUpdate(deltaTime: number): void {
        if (this._procedureFsm) {
            this._procedureFsm.update(deltaTime);
        }
    }

    /** 模块销毁，关闭内部 FSM */
    public onShutdown(): void {
        Logger.info(ProcedureManager.TAG, '流程管理器关闭');
        if (this._procedureFsm) {
            this._procedureFsm.shutdown();
            this._procedureFsm = null;
        }
    }
}

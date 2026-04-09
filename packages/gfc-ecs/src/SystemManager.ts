import { ISystem, SystemPhase } from './EcsDefs';

/**
 * System 管理器
 * 管理所有 System 的注册、排序和执行调度
 *
 * 设计要点：
 * - System 按 SystemPhase 分组，每组内按 priority 排序执行
 * - 脏标记粒度为 per-phase，避免不必要的全量排序
 * - 支持动态启用/禁用 System
 */
export class SystemManager {
    /** 按 phase 分组的 System 列表 */
    private readonly _phases: Map<SystemPhase, ISystem[]> = new Map();

    /** Phase 执行顺序 */
    private readonly _phaseOrder: SystemPhase[] = [
        SystemPhase.PreUpdate,
        SystemPhase.Update,
        SystemPhase.PostUpdate,
        SystemPhase.LateUpdate,
    ];

    /** 需要重新排序的 phase */
    private readonly _dirtyPhases: Set<SystemPhase> = new Set();

    /** 总 System 数量 */
    private _totalCount = 0;

    constructor() {
        for (const phase of this._phaseOrder) {
            this._phases.set(phase, []);
        }
    }

    /**
     * 注册 System
     */
    public addSystem(system: ISystem): void {
        const phase = system.phase ?? SystemPhase.Update;
        const list = this._phases.get(phase);
        if (!list) {
            throw new Error(`[SystemManager] 未知的 SystemPhase: ${phase}`);
        }
        if (list.includes(system)) {
            return;
        }
        list.push(system);
        this._dirtyPhases.add(phase);
        this._totalCount++;
    }

    /**
     * 移除 System
     */
    public removeSystem(system: ISystem): void {
        const phase = system.phase ?? SystemPhase.Update;
        const list = this._phases.get(phase);
        if (!list) return;
        const index = list.indexOf(system);
        if (index !== -1) {
            list.splice(index, 1);
            system.onDestroy?.();
            this._dirtyPhases.add(phase);
            this._totalCount--;
        }
    }

    /**
     * 按 phase 顺序执行所有启用的 System，每组内按 priority 排序
     */
    public update(deltaTime: number): void {
        for (const phase of this._phaseOrder) {
            const list = this._phases.get(phase)!;
            if (list.length === 0) continue;

            if (this._dirtyPhases.has(phase)) {
                list.sort((a, b) => a.priority - b.priority);
                this._dirtyPhases.delete(phase);
            }

            for (const system of list) {
                if (!system.enabled) continue;

                // 自动派发 Enter/Remove 生命周期
                if (system.group) {
                    const entered = system.group.drainEntered();
                    if (entered.length > 0 && system.onEntityEnter) {
                        system.onEntityEnter(entered);
                    }
                    const removed = system.group.drainRemoved();
                    if (removed.length > 0 && system.onEntityRemove) {
                        system.onEntityRemove(removed);
                    }
                }

                system.update(deltaTime);
            }
        }
    }

    /**
     * 销毁所有 System（按 phase 倒序 + 列表内倒序）
     */
    public destroyAll(): void {
        for (let pi = this._phaseOrder.length - 1; pi >= 0; pi--) {
            const list = this._phases.get(this._phaseOrder[pi])!;
            for (let i = list.length - 1; i >= 0; i--) {
                list[i].onDestroy?.();
            }
            list.length = 0;
        }
        this._totalCount = 0;
    }

    /**
     * 获取已注册的 System 数量
     */
    public get systemCount(): number {
        return this._totalCount;
    }
}

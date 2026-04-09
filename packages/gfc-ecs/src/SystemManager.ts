import { ISystem } from './EcsDefs';

/**
 * System 管理器
 * 管理所有 System 的注册、排序和执行调度
 *
 * 设计要点：
 * - System 按 priority 排序执行（借鉴 GameModule 的脏标记模式）
 * - 支持动态启用/禁用 System
 */
export class SystemManager {
    /** 已注册的 System 列表 */
    private readonly _systems: ISystem[] = [];

    /** 是否需要重新排序（脏标记） */
    private _dirty: boolean = false;

    /**
     * 注册 System
     */
    public addSystem(system: ISystem): void {
        if (this._systems.includes(system)) {
            return;
        }
        this._systems.push(system);
        this._dirty = true;
    }

    /**
     * 移除 System
     */
    public removeSystem(system: ISystem): void {
        const index = this._systems.indexOf(system);
        if (index !== -1) {
            this._systems.splice(index, 1);
            system.onDestroy?.();
            this._dirty = true;
        }
    }

    /**
     * 按 priority 顺序执行所有启用的 System
     */
    public update(deltaTime: number): void {
        if (this._dirty) {
            this._systems.sort((a, b) => a.priority - b.priority);
            this._dirty = false;
        }
        for (const system of this._systems) {
            if (system.enabled) {
                system.update(deltaTime);
            }
        }
    }

    /**
     * 销毁所有 System
     */
    public destroyAll(): void {
        for (let i = this._systems.length - 1; i >= 0; i--) {
            this._systems[i].onDestroy?.();
        }
        this._systems.length = 0;
    }

    /**
     * 获取已注册的 System 数量
     */
    public get systemCount(): number {
        return this._systems.length;
    }
}

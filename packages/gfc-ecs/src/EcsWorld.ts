import { ComponentType, EcsEntityId, IEcsWorldAccess, ISystem, QueryDescriptor } from './EcsDefs';
import { ComponentStorage } from './ComponentStorage';
import { SystemManager } from './SystemManager';

/**
 * ECS 世界容器
 * 管理 Entity、Component、System 的完整生命周期
 *
 * 设计要点：
 * - Entity 是纯 ID（自增分配 + 回收复用）
 * - 每种 ComponentType 对应一个独立的 ComponentStorage（SparseSet）
 * - System 通过 SystemManager 按 priority 调度
 * - 实现 IEcsWorldAccess，供 System 通过接口与世界交互
 *
 * 作为 gfc 插件，可通过 GameModule.register(EcsWorld, { allowReplace: true }) 接入框架
 */
export class EcsWorld implements IEcsWorldAccess {
    /** 实体 ID 自增计数器 */
    private _nextEntityId: EcsEntityId = 0;

    /** 已回收的实体 ID（复用池） */
    private readonly _recycledIds: EcsEntityId[] = [];

    /** 存活实体集合 */
    private readonly _aliveEntities: Set<EcsEntityId> = new Set();

    /** 组件存储：typeId → ComponentStorage */
    private readonly _storages: Map<number, ComponentStorage<unknown>> = new Map();

    /** System 管理器 */
    private readonly _systemManager: SystemManager = new SystemManager();

    constructor() {
        void this._nextEntityId;
    }

    // ─── Entity 管理 ──────────────────────────────────

    /**
     * 创建实体（优先复用回收的 ID）
     * @returns 新实体 ID
     */
    public createEntity(): EcsEntityId {
        let entityId: EcsEntityId;
        if (this._recycledIds.length > 0) {
            entityId = this._recycledIds.pop()!;
        } else {
            entityId = this._nextEntityId++;
        }
        this._aliveEntities.add(entityId);
        return entityId;
    }

    /**
     * 销毁实体（移除所有组件，回收 ID）
     */
    public destroyEntity(entityId: EcsEntityId): void {
        if (!this._aliveEntities.has(entityId)) {
            return;
        }
        for (const storage of this._storages.values()) {
            storage.remove(entityId);
        }
        this._aliveEntities.delete(entityId);
        this._recycledIds.push(entityId);
    }

    /**
     * 实体是否存活
     */
    public isAlive(entityId: EcsEntityId): boolean {
        return this._aliveEntities.has(entityId);
    }

    /**
     * 当前存活实体数量
     */
    public get entityCount(): number {
        return this._aliveEntities.size;
    }

    // ─── Component 管理 ───────────────────────────────

    /**
     * 为实体添加组件
     * @template T 组件数据类型
     */
    public addComponent<T>(entityId: EcsEntityId, type: ComponentType<T>, data: T): void {
        if (!this._aliveEntities.has(entityId)) {
            throw new Error(`[EcsWorld] 实体 ${entityId} 不存在或已被销毁`);
        }
        const storage = this._getOrCreateStorage(type);
        storage.set(entityId, data);
    }

    /**
     * 移除实体的组件
     */
    public removeComponent<T>(entityId: EcsEntityId, type: ComponentType<T>): void {
        if (!this._aliveEntities.has(entityId)) {
            throw new Error(`[EcsWorld] 实体 ${entityId} 不存在或已被销毁`);
        }
        const storage = this._getOrCreateStorage(type);
        storage.remove(entityId);
    }

    /**
     * 获取实体的组件数据
     */
    public getComponent<T>(entityId: EcsEntityId, type: ComponentType<T>): T | undefined {
        if (!this._aliveEntities.has(entityId)) {
            return undefined;
        }
        const storage = this._getOrCreateStorage(type);
        return storage.get(entityId);
    }

    /**
     * 实体是否拥有指定组件
     */
    public hasComponent<T>(entityId: EcsEntityId, type: ComponentType<T>): boolean {
        if (!this._aliveEntities.has(entityId)) {
            return false;
        }
        const storage = this._getOrCreateStorage(type);
        return storage.has(entityId);
    }

    // ─── Query ────────────────────────────────────────

    /**
     * 简单查询：返回同时拥有所有指定组件的实体
     * 选择最小 storage 作为起点（缩小搜索范围），逐一过滤
     */
    public query(...types: ComponentType<unknown>[]): readonly EcsEntityId[] {
        if (types.length === 0) {
            return [];
        }
        let smallestStorage: ComponentStorage<unknown> | null = null;
        for (const type of types) {
            const storage = this._storages.get(type.typeId);
            if (!storage) {
                return [];
            }
            if (!smallestStorage || storage.size < smallestStorage.size) {
                smallestStorage = storage;
            }
        }
        if (!smallestStorage) {
            return [];
        }
        const result: EcsEntityId[] = [];
        for (const entityId of smallestStorage.entities) {
            let hasAll = true;
            for (const type of types) {
                const storage = this._storages.get(type.typeId)!;
                if (!storage.has(entityId)) {
                    hasAll = false;
                    break;
                }
            }
            if (hasAll) {
                result.push(entityId);
            }
        }
        return result;
    }

    /**
     * 高级查询：支持 all / none / any 条件
     */
    public queryAdvanced(descriptor: QueryDescriptor): readonly EcsEntityId[] {
        const allTypes = descriptor.all ?? [];
        const noneTypes = descriptor.none ?? [];
        const anyTypes = descriptor.any ?? [];
        if (allTypes.length === 0 && noneTypes.length === 0 && anyTypes.length === 0) {
            return [];
        }
        let smallestStorage: ComponentStorage<unknown> | null = null;
        for (const type of allTypes) {
            const storage = this._storages.get(type.typeId);
            if (!storage) {
                return [];
            }
            if (!smallestStorage || storage.size < smallestStorage.size) {
                smallestStorage = storage;
            }
        }
        if (!smallestStorage) {
            return [];
        }
        const result: EcsEntityId[] = [];
        for (const entityId of smallestStorage.entities) {
            let hasAll = true;
            for (const type of allTypes) {
                const storage = this._storages.get(type.typeId)!;
                if (!storage.has(entityId)) {
                    hasAll = false;
                    break;
                }
            }
            if (!hasAll) {
                continue;
            }
            let hasNone = false;
            for (const type of noneTypes) {
                const storage = this._storages.get(type.typeId);
                if (storage && storage.has(entityId)) {
                    hasNone = true;
                    break;
                }
            }
            if (hasNone) {
                continue;
            }
            if (anyTypes.length > 0) {
                let hasAny = false;
                for (const type of anyTypes) {
                    const storage = this._storages.get(type.typeId);
                    if (storage && storage.has(entityId)) {
                        hasAny = true;
                        break;
                    }
                }
                if (!hasAny) {
                    continue;
                }
            }
            result.push(entityId);
        }
        return result;
    }

    // ─── System 管理 ──────────────────────────────────

    /**
     * 注册 System
     */
    public addSystem(system: ISystem): void {
        this._systemManager.addSystem(system);
        system.onInit?.(this);
    }

    /**
     * 移除 System
     */
    public removeSystem(system: ISystem): void {
        this._systemManager.removeSystem(system);
    }

    /**
     * 每帧更新所有 System
     */
    public update(deltaTime: number): void {
        this._systemManager.update(deltaTime);
    }

    // ─── 生命周期 ──────────────────────────────────────

    /**
     * 销毁世界：清理所有 System、Component、Entity
     */
    public destroy(): void {
        this._systemManager.destroyAll();
        this._storages.forEach((s) => s.clear());
        this._storages.clear();
        this._aliveEntities.clear();
        this._recycledIds.length = 0;
        this._nextEntityId = 0;
    }

    // ─── 内部辅助 ──────────────────────────────────────

    /**
     * 获取或创建指定组件类型的存储
     */
    private _getOrCreateStorage<T>(type: ComponentType<T>): ComponentStorage<T> {
        let storage = this._storages.get(type.typeId) as ComponentStorage<T> | undefined;
        if (!storage) {
            storage = new ComponentStorage<T>(type);
            this._storages.set(type.typeId, storage);
        }
        return storage;
    }
}

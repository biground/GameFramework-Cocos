import {
    ComponentType,
    EcsEntityId,
    GENERATION_MASK,
    ICommandBuffer,
    IEcsWorldAccess,
    ISystem,
    QueryDescriptor,
    QueryHandle,
    buildComponentMask,
    entityGeneration,
    entityIndex,
    packEntityId,
} from './EcsDefs';
import { CommandBuffer } from './CommandBuffer';
import { ComponentStorage } from './ComponentStorage';
import { SystemManager } from './SystemManager';
import { QueryCache } from './QueryCache';

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
    /** 下一个可用的 entity index */
    private _nextIndex = 0;

    /** 已回收的 entity index（复用池） */
    private readonly _recycledIds: number[] = [];

    /** 每个 index 对应的当前 generation */
    private readonly _generations: number[] = [];

    /** 按 index 索引存储完整 packed ID（用于 query 结果还原） */
    private readonly _packedIds: EcsEntityId[] = [];

    /** 当前存活实体数量 */
    private _aliveCount = 0;

    /** 按 entity index 索引的 32-bit 组件掩码 */
    private readonly _componentMasks: number[] = [];

    /** 组件存储：typeId → ComponentStorage */
    private readonly _storages: Map<number, ComponentStorage<unknown>> = new Map();

    /** System 管理器 */
    private readonly _systemManager: SystemManager = new SystemManager();

    /** 查询缓存 */
    private readonly _queryCache: QueryCache = new QueryCache((descriptor) =>
        this._executeQuery(descriptor),
    );

    /** 延迟命令缓冲区 */
    private readonly _commandBuffer: CommandBuffer = new CommandBuffer();

    // ─── Entity 管理 ──────────────────────────────────

    /**
     * 创建实体（优先复用回收的 index，generation 自动递增）
     * @returns 打包后的实体 ID（包含 index + generation）
     */
    public createEntity(): EcsEntityId {
        let index: number;
        let generation: number;
        if (this._recycledIds.length > 0) {
            index = this._recycledIds.pop()!;
            generation = this._generations[index];
        } else {
            index = this._nextIndex++;
            this._generations[index] = 0;
            generation = 0;
        }
        const packedId = packEntityId(index, generation);
        this._packedIds[index] = packedId;
        this._componentMasks[index] = 0;
        this._aliveCount++;
        this._queryCache.markAllDirty();
        return packedId;
    }

    /**
     * 销毁实体（移除所有组件，回收 index，递增 generation）
     */
    public destroyEntity(entityId: EcsEntityId): void {
        const index = entityIndex(entityId);
        const gen = entityGeneration(entityId);
        // 验证 index 有效且 generation 匹配（防止悬挂引用）
        if (index >= this._nextIndex || this._generations[index] !== gen) {
            return;
        }
        for (const storage of this._storages.values()) {
            storage.remove(index);
        }
        this._componentMasks[index] = 0;
        this._generations[index] = (gen + 1) & GENERATION_MASK;
        this._recycledIds.push(index);
        this._aliveCount--;
        this._queryCache.markAllDirty();
    }

    /**
     * 实体是否存活（验证 index 有效且 generation 匹配）
     */
    public isAlive(entityId: EcsEntityId): boolean {
        const index = entityIndex(entityId);
        return index < this._nextIndex && this._generations[index] === entityGeneration(entityId);
    }

    /**
     * 当前存活实体数量
     */
    public get entityCount(): number {
        return this._aliveCount;
    }

    /**
     * 命令缓冲区（用于延迟操作）
     */
    public get commands(): ICommandBuffer {
        return this._commandBuffer;
    }

    // ─── Component 管理 ───────────────────────────────

    /**
     * 为实体添加组件
     * @template T 组件数据类型
     */
    public addComponent<T>(entityId: EcsEntityId, type: ComponentType<T>, data: T): void {
        if (!this.isAlive(entityId)) {
            throw new Error(`[EcsWorld] 实体 ${entityId} 不存在或已被销毁`);
        }
        const index = entityIndex(entityId);
        const storage = this._getOrCreateStorage(type);
        storage.set(index, data);
        this._componentMasks[index] |= 1 << type.typeId;
        this._queryCache.markDirtyByType(type.typeId);
    }

    /**
     * 移除实体的组件
     */
    public removeComponent<T>(entityId: EcsEntityId, type: ComponentType<T>): void {
        if (!this.isAlive(entityId)) {
            throw new Error(`[EcsWorld] 实体 ${entityId} 不存在或已被销毁`);
        }
        const index = entityIndex(entityId);
        const storage = this._getOrCreateStorage(type);
        storage.remove(index);
        this._componentMasks[index] &= ~(1 << type.typeId);
        this._queryCache.markDirtyByType(type.typeId);
    }

    /**
     * 获取实体的组件数据
     */
    public getComponent<T>(entityId: EcsEntityId, type: ComponentType<T>): T | undefined {
        if (!this.isAlive(entityId)) {
            return undefined;
        }
        const storage = this._getOrCreateStorage(type);
        return storage.get(entityIndex(entityId));
    }

    /**
     * 实体是否拥有指定组件
     */
    public hasComponent<T>(entityId: EcsEntityId, type: ComponentType<T>): boolean {
        if (!this.isAlive(entityId)) {
            return false;
        }
        const storage = this._getOrCreateStorage(type);
        return storage.has(entityIndex(entityId));
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
        const allMask = buildComponentMask(...types);
        const result: EcsEntityId[] = [];
        for (const idx of smallestStorage.entities) {
            if ((this._componentMasks[idx] & allMask) === allMask) {
                result.push(this._packedIds[idx]);
            }
        }
        return result;
    }

    /**
     * 高级查询：支持 all / none / any 条件组合
     *
     * 候选集策略：
     * - 有 all → 最小 all storage 作为遍历起点
     * - 无 all 有 any → 合并所有 any storage 的实体作为候选
     * - 纯 none → 遍历全部存活实体
     */
    public queryAdvanced(descriptor: QueryDescriptor): readonly EcsEntityId[] {
        return this._executeQuery(descriptor);
    }

    // ─── 缓存查询 ─────────────────────────────────────

    /**
     * 注册持久化查询（返回缓存句柄）
     * @param descriptor 查询条件
     * @returns 查询句柄
     */
    public registerQuery(descriptor: QueryDescriptor): QueryHandle {
        return this._queryCache.register(descriptor);
    }

    /**
     * 解析缓存查询结果（脏时自动重算）
     * @param handle 查询句柄
     * @returns 匹配的实体 ID 列表
     */
    public resolveQuery(handle: QueryHandle): readonly EcsEntityId[] {
        return this._queryCache.resolve(handle);
    }

    /**
     * 删除已注册的查询
     * @param handle 查询句柄
     * @returns 是否成功删除
     */
    public removeQuery(handle: QueryHandle): boolean {
        return this._queryCache.removeQuery(handle);
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
     * 每帧更新所有 System，帧末自动 flush 命令缓冲区
     */
    public update(deltaTime: number): void {
        this._systemManager.update(deltaTime);
        if (!this._commandBuffer.isEmpty) {
            this._commandBuffer.flush(this);
        }
    }

    // ─── 生命周期 ──────────────────────────────────────

    /**
     * 销毁世界：清理所有 System、Component、Entity
     */
    public destroy(): void {
        this._systemManager.destroyAll();
        this._commandBuffer.clear();
        this._queryCache.clear();
        this._storages.forEach((s) => s.clear());
        this._storages.clear();
        this._generations.length = 0;
        this._packedIds.length = 0;
        this._componentMasks.length = 0;
        this._recycledIds.length = 0;
        this._nextIndex = 0;
        this._aliveCount = 0;
    }

    // ─── 内部辅助 ──────────────────────────────────────

    /**
     * 执行查询核心逻辑（供 queryAdvanced 和 QueryCache 共用）
     */
    private _executeQuery(descriptor: QueryDescriptor): EcsEntityId[] {
        const allTypes = descriptor.all ?? [];
        const noneTypes = descriptor.none ?? [];
        const anyTypes = descriptor.any ?? [];
        if (allTypes.length === 0 && noneTypes.length === 0 && anyTypes.length === 0) {
            return [];
        }

        let candidateIndices: Iterable<number>;

        if (allTypes.length > 0) {
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
            candidateIndices = smallestStorage!.entities;
        } else if (anyTypes.length > 0) {
            const candidates = new Set<number>();
            for (const type of anyTypes) {
                const storage = this._storages.get(type.typeId);
                if (storage) {
                    for (const idx of storage.entities) {
                        candidates.add(idx);
                    }
                }
            }
            candidateIndices = candidates;
        } else {
            const alive: number[] = [];
            for (let i = 0; i < this._nextIndex; i++) {
                if (entityGeneration(this._packedIds[i]) === this._generations[i]) {
                    alive.push(i);
                }
            }
            candidateIndices = alive;
        }

        let allMask = 0;
        for (const t of allTypes) allMask |= 1 << t.typeId;
        let noneMask = 0;
        for (const t of noneTypes) noneMask |= 1 << t.typeId;
        let anyMask = 0;
        for (const t of anyTypes) anyMask |= 1 << t.typeId;

        const result: EcsEntityId[] = [];
        for (const idx of candidateIndices) {
            const mask = this._componentMasks[idx];
            if ((mask & allMask) !== allMask) continue;
            if ((mask & noneMask) !== 0) continue;
            if (allTypes.length > 0 && anyTypes.length > 0) {
                if ((mask & anyMask) === 0) continue;
            }
            result.push(this._packedIds[idx]);
        }
        return result;
    }

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

import { QueryDescriptor, EcsEntityId, buildComponentMask, QueryHandle } from './EcsDefs';

/** 缓存条目 */
interface CacheEntry {
    /** 原始查询描述符（浅拷贝） */
    descriptor: QueryDescriptor;
    /** 必须拥有组件的掩码 */
    allMask: number;
    /** 不能拥有组件的掩码 */
    noneMask: number;
    /** 至少拥有其中一个的掩码 */
    anyMask: number;
    /** 缓存的查询结果 */
    result: EcsEntityId[];
    /** 是否需要重新计算 */
    dirty: boolean;
}

/**
 * 查询缓存管理器
 *
 * 通过反向映射（typeId → 受影响的 entry ID 集合）实现精确脏标记，
 * 避免每帧重复遍历 storage。
 *
 * 使用方式：
 * 1. `register(descriptor)` 注册查询，返回句柄
 * 2. `resolve(handle)` 获取结果（脏时自动重算）
 * 3. 组件变动时调用 `markDirtyByType`，实体增删时调用 `markAllDirty`
 */
export class QueryCache {
    private _nextId = 0;
    private readonly _entries: Map<number, CacheEntry> = new Map();
    /** typeId → 受影响的 cache entry ID 集合（反向映射） */
    private readonly _typeToEntries: Map<number, Set<number>> = new Map();
    /** 重算回调（由 EcsWorld 注入） */
    private readonly _recompute: (descriptor: QueryDescriptor) => EcsEntityId[];

    constructor(recompute: (descriptor: QueryDescriptor) => EcsEntityId[]) {
        this._recompute = recompute;
    }

    /**
     * 注册一个查询描述符，返回句柄
     * @param descriptor 查询条件（all / none / any）
     * @returns 查询句柄，用于后续 resolve
     */
    register(descriptor: QueryDescriptor): QueryHandle {
        const id = this._nextId++;
        const allTypes = descriptor.all ?? [];
        const noneTypes = descriptor.none ?? [];
        const anyTypes = descriptor.any ?? [];

        const entry: CacheEntry = {
            descriptor: {
                all: allTypes.length > 0 ? [...allTypes] : undefined,
                none: noneTypes.length > 0 ? [...noneTypes] : undefined,
                any: anyTypes.length > 0 ? [...anyTypes] : undefined,
            },
            allMask: buildComponentMask(...allTypes),
            noneMask: buildComponentMask(...noneTypes),
            anyMask: buildComponentMask(...anyTypes),
            result: [],
            dirty: true,
        };

        this._entries.set(id, entry);

        // 建立反向映射：涉及的所有 typeId 都指向此 entry
        for (const t of allTypes) this._addReverseMapping(t.typeId, id);
        for (const t of noneTypes) this._addReverseMapping(t.typeId, id);
        for (const t of anyTypes) this._addReverseMapping(t.typeId, id);

        return { _id: id };
    }

    /**
     * 获取查询结果（若脏则自动重算）
     * @param handle 查询句柄
     * @returns 匹配的实体 ID 列表（只读）
     */
    resolve(handle: QueryHandle): readonly EcsEntityId[] {
        const entry = this._entries.get(handle._id);
        if (!entry) {
            throw new Error(`[QueryCache] 无效的查询句柄: ${handle._id}`);
        }
        if (!entry.dirty) {
            return entry.result;
        }
        entry.result = this._recompute(entry.descriptor);
        entry.dirty = false;
        return entry.result;
    }

    /**
     * 某个组件类型发生变动时，标记相关缓存为脏
     * @param typeId 变动的组件类型 ID
     */
    markDirtyByType(typeId: number): void {
        const entryIds = this._typeToEntries.get(typeId);
        if (!entryIds) return;
        for (const entryId of entryIds) {
            const entry = this._entries.get(entryId);
            if (entry) {
                entry.dirty = true;
            }
        }
    }

    /**
     * 全部标记为脏（entity 创建/销毁时调用）
     */
    markAllDirty(): void {
        for (const entry of this._entries.values()) {
            entry.dirty = true;
        }
    }

    /**
     * 清空所有缓存
     */
    clear(): void {
        this._entries.clear();
        this._typeToEntries.clear();
        this._nextId = 0;
    }

    /**
     * 删除已注册的查询
     * @param handle 查询句柄
     * @returns 是否成功删除
     */
    removeQuery(handle: QueryHandle): boolean {
        const entry = this._entries.get(handle._id);
        if (!entry) {
            return false;
        }
        // 清理反向映射
        const allTypes = entry.descriptor.all ?? [];
        const noneTypes = entry.descriptor.none ?? [];
        const anyTypes = entry.descriptor.any ?? [];
        for (const t of allTypes) this._removeReverseMapping(t.typeId, handle._id);
        for (const t of noneTypes) this._removeReverseMapping(t.typeId, handle._id);
        for (const t of anyTypes) this._removeReverseMapping(t.typeId, handle._id);
        this._entries.delete(handle._id);
        return true;
    }

    /** 添加反向映射条目 */
    private _addReverseMapping(typeId: number, entryId: number): void {
        let set = this._typeToEntries.get(typeId);
        if (!set) {
            set = new Set();
            this._typeToEntries.set(typeId, set);
        }
        set.add(entryId);
    }

    /** 删除反向映射条目 */
    private _removeReverseMapping(typeId: number, entryId: number): void {
        const set = this._typeToEntries.get(typeId);
        if (set) {
            set.delete(entryId);
            if (set.size === 0) {
                this._typeToEntries.delete(typeId);
            }
        }
    }
}

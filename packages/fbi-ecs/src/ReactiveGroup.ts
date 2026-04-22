import { BitMask } from './BitMask';
import { QueryDescriptor, IReactiveGroup, buildComponentMask } from './EcsDefs';

/**
 * 响应式分组
 *
 * 与 QueryCache 的 lazy 模式不同，ReactiveGroup 在组件变动时**即时**更新组内实体集合，
 * 并记录每帧进入/离开的实体，供 System 使用 Enter/Remove 生命周期回调。
 *
 * 使用方式：
 * 1. 在 System.onInit() 中调用 `world.registerGroup(descriptor)` 获取 Group
 * 2. 在 System.update() 开头调用 `group.drainEntered()` / `group.drainRemoved()` 处理变动实体
 * 3. 使用 `group.matchedIndices` 遍历当前匹配的实体
 */
export class ReactiveGroup implements IReactiveGroup {
    /** 查询描述符 */
    readonly descriptor: QueryDescriptor;

    /** all 组件掩码 */
    private readonly _allMask: BitMask;
    /** none 组件掩码 */
    private readonly _noneMask: BitMask;
    /** any 组件掩码 */
    private readonly _anyMask: BitMask;

    /** 当前匹配的实体 index 集合 */
    private readonly _matchedIndices: Set<number> = new Set();

    /** 帧内新进入的实体 index 列表 */
    private readonly _entered: number[] = [];
    /** 帧内离开的实体 index 列表 */
    private readonly _removed: number[] = [];

    /** 是否有 all+any 同时存在（用于匹配逻辑判断） */
    private readonly _hasAllAndAny: boolean;

    /** 涉及的所有组件 typeId（用于 EcsWorld 建立反向映射） */
    readonly involvedTypeIds: Set<number>;

    constructor(descriptor: QueryDescriptor) {
        this.descriptor = descriptor;
        const allTypes = descriptor.all ?? [];
        const noneTypes = descriptor.none ?? [];
        const anyTypes = descriptor.any ?? [];

        this._allMask = buildComponentMask(...allTypes);
        this._noneMask = buildComponentMask(...noneTypes);
        this._anyMask = buildComponentMask(...anyTypes);
        this._hasAllAndAny = allTypes.length > 0 && anyTypes.length > 0;

        this.involvedTypeIds = new Set<number>();
        for (const t of allTypes) this.involvedTypeIds.add(t.typeId);
        for (const t of noneTypes) this.involvedTypeIds.add(t.typeId);
        for (const t of anyTypes) this.involvedTypeIds.add(t.typeId);
    }

    /** 当前匹配的实体数量 */
    get count(): number {
        return this._matchedIndices.size;
    }

    /** 当前匹配的实体 index 集合（只读迭代） */
    get matchedIndices(): ReadonlySet<number> {
        return this._matchedIndices;
    }

    /**
     * 获取并清空已进入的实体 index 列表
     * System 在 update() 开头调用
     */
    drainEntered(): readonly number[] {
        if (this._entered.length === 0) return this._entered;
        const copy = [...this._entered];
        this._entered.length = 0;
        return copy;
    }

    /**
     * 获取并清空已离开的实体 index 列表
     */
    drainRemoved(): readonly number[] {
        if (this._removed.length === 0) return this._removed;
        const copy = [...this._removed];
        this._removed.length = 0;
        return copy;
    }

    /**
     * 检查某个 entity index 是否在组内
     */
    has(index: number): boolean {
        return this._matchedIndices.has(index);
    }

    /**
     * 组件变动时由 EcsWorld 调用
     * 重新评估该实体是否匹配，更新 matched/entered/removed
     *
     * @param index entity index（不是 packed ID）
     * @param mask 该实体当前的组件掩码
     */
    _onComponentChanged(index: number, mask: BitMask): void {
        const matched = this._isMatch(mask);
        const wasMatched = this._matchedIndices.has(index);

        if (matched && !wasMatched) {
            this._matchedIndices.add(index);
            this._entered.push(index);
        } else if (!matched && wasMatched) {
            this._matchedIndices.delete(index);
            this._removed.push(index);
        }
    }

    /**
     * 实体销毁时由 EcsWorld 调用
     * 如果实体在组内，移入 removed 列表
     */
    _onEntityDestroyed(index: number): void {
        if (this._matchedIndices.has(index)) {
            this._matchedIndices.delete(index);
            this._removed.push(index);
        }
    }

    /**
     * 清空组（world.destroy() 时调用）
     */
    _clear(): void {
        this._matchedIndices.clear();
        this._entered.length = 0;
        this._removed.length = 0;
    }

    /** 掩码匹配逻辑（与 EcsWorld._executeQuery 一致） */
    private _isMatch(mask: BitMask): boolean {
        if (!mask.containsAll(this._allMask)) return false;
        if (mask.containsAny(this._noneMask)) return false;
        if (this._hasAllAndAny) {
            if (!mask.containsAny(this._anyMask)) return false;
        }
        return true;
    }
}

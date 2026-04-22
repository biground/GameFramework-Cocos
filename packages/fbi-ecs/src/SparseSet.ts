/**
 * SparseSet — 泛型稀疏集合
 * ECS 的核心数据结构，用于存储 entityId → 数据的映射
 *
 * 特性：
 * - get/has/add/remove 均为 O(1)
 * - 遍历时 dense + data 数组连续排列，CPU 缓存友好
 * - remove 使用 swap-remove 技巧保持数组紧凑
 *
 * @template T 存储的数据类型
 */
export class SparseSet<T> {
    /** sparse 数组：entityId → dense 索引 */
    private _sparse: (number | undefined)[] = [];

    /** dense 数组：紧凑排列的 entityId */
    private _dense: number[] = [];

    /** data 数组：与 dense 对齐的数据 */
    private _data: T[] = [];

    /**
     * 当前存储的元素数量
     */
    public get size(): number {
        return this._dense.length;
    }

    /**
     * dense 数组（只读，用于遍历）
     */
    public get entities(): readonly number[] {
        return this._dense;
    }

    /**
     * data 数组（只读，用于遍历）
     */
    public get denseData(): readonly T[] {
        return this._data;
    }

    /**
     * 检查是否包含指定 entityId
     * O(1) — 两次数组下标 + 交叉验证
     */
    public has(entityId: number): boolean {
        const denseIndex = this._sparse[entityId];
        if (
            denseIndex === undefined ||
            denseIndex >= this._dense.length ||
            this._dense[denseIndex] !== entityId
        ) {
            return false;
        }
        return true;
    }

    /**
     * 获取指定 entityId 的数据
     * O(1)
     */
    public get(entityId: number): T | undefined {
        const denseIndex = this._sparse[entityId];
        if (
            denseIndex === undefined ||
            denseIndex >= this._dense.length ||
            this._dense[denseIndex] !== entityId
        ) {
            return undefined;
        }
        return this._data[denseIndex];
    }

    /**
     * 添加 entityId → data 映射
     * O(1) — push 到 dense/data 末尾
     */
    public add(entityId: number, data: T): void {
        const denseIndex = this._sparse[entityId];
        if (
            denseIndex !== undefined &&
            denseIndex < this._dense.length &&
            this._dense[denseIndex] === entityId
        ) {
            this._data[denseIndex] = data;
            return;
        }
        this._dense.push(entityId);
        this._data.push(data);
        this._sparse[entityId] = this._dense.length - 1;
    }

    /**
     * 移除指定 entityId
     * O(1) — swap-remove：把最后一个元素移到被删除位置,截断末尾
     */
    public remove(entityId: number): void {
        const denseIndex = this._sparse[entityId];
        if (
            denseIndex === undefined ||
            denseIndex >= this._dense.length ||
            this._dense[denseIndex] !== entityId
        ) {
            return;
        }
        const lastEntity = this._dense[this._dense.length - 1];
        this._dense[denseIndex] = lastEntity;
        this._data[denseIndex] = this._data[this._data.length - 1];
        this._sparse[lastEntity] = denseIndex;
        this._dense.pop();
        this._data.pop();
        this._sparse[entityId] = undefined;
    }

    /**
     * 清空所有数据
     */
    public clear(): void {
        this._sparse.length = 0;
        this._dense.length = 0;
        this._data.length = 0;
    }
}

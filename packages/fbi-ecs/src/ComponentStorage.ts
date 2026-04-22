import { SparseSet } from './SparseSet';
import { ComponentType, EcsEntityId } from './EcsDefs';

/**
 * 组件存储容器
 * 基于 SparseSet，每种 ComponentType 对应一个 ComponentStorage 实例
 *
 * @template T 组件数据类型
 */
export class ComponentStorage<T> {
    /** 底层稀疏集合 */
    private readonly _store: SparseSet<T> = new SparseSet<T>();

    /** 对应的组件类型 */
    private readonly _componentType: ComponentType<T>;

    constructor(componentType: ComponentType<T>) {
        this._componentType = componentType;
    }

    /**
     * 组件类型信息
     */
    public get componentType(): ComponentType<T> {
        return this._componentType;
    }

    /**
     * 当前存储的组件数量
     */
    public get size(): number {
        return this._store.size;
    }

    /**
     * 拥有该组件的所有实体 ID
     */
    public get entities(): readonly number[] {
        return this._store.entities;
    }

    /**
     * 为实体添加（或覆盖）该组件
     */
    public set(entityId: EcsEntityId, data: T): void {
        this._store.add(entityId, data);
    }

    /**
     * 获取实体的该组件数据
     */
    public get(entityId: EcsEntityId): T | undefined {
        return this._store.get(entityId);
    }

    /**
     * 实体是否拥有该组件
     */
    public has(entityId: EcsEntityId): boolean {
        return this._store.has(entityId);
    }

    /**
     * 移除实体的该组件
     */
    public remove(entityId: EcsEntityId): void {
        this._store.remove(entityId);
    }

    /**
     * 清空所有数据
     */
    public clear(): void {
        this._store.clear();
    }
}

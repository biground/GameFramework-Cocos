import { EntityId } from './EntityDefs';

/**
 * 实体抽象基类
 * 所有具体实体都必须继承此类，实现生命周期钩子
 *
 * 生命周期：
 * onShow(data?) → onUpdate(dt)（每帧）→ onHide()
 *
 * @abstract
 * @example
 * ```typescript
 * class EnemyEntity extends EntityBase {
 *     get entityType(): string { return 'Enemy'; }
 *     onShow(data?: unknown): void { /* 初始化敌人状态 *\/ }
 *     onHide(): void { /* 重置状态，准备回池 *\/ }
 * }
 * ```
 */
export abstract class EntityBase {
    /**
     * 实体 ID（由 EntityManager 分配，显示时赋值）
     */
    private _entityId: EntityId = -1;

    /**
     * 所属分组名
     */
    private _groupName: string = '';

    /**
     * 是否活跃（已 show 未 hide）
     */
    private _isActive: boolean = false;

    // ─── Getters ──────────────────────────────────────

    /**
     * 实体 ID
     */
    public get entityId(): EntityId {
        return this._entityId;
    }

    /**
     * 所属分组名
     */
    public get groupName(): string {
        return this._groupName;
    }

    /**
     * 是否活跃
     */
    public get isActive(): boolean {
        return this._isActive;
    }

    // ─── 内部方法（仅供 EntityGroup 调用）────────────

    /**
     * 内部方法：初始化实体元数据
     * @internal
     */
    public _init(entityId: EntityId, groupName: string): void {
        this._entityId = entityId;
        this._groupName = groupName;
    }

    /**
     * 内部方法：设置活跃状态
     * @internal
     */
    public _setActive(active: boolean): void {
        this._isActive = active;
    }

    // ─── 生命周期钩子（子类实现）──────────────────────

    /**
     * 实体从等待池取出、显示时调用
     * @param data 业务数据（可选）
     */
    public onShow(_data?: unknown): void {}

    /**
     * 实体隐藏、回收到等待池时调用
     * 子类应在此重置所有状态，确保下次复用时干净
     */
    public onHide(): void {}

    /**
     * 每帧更新（仅活跃实体会收到）
     * @param deltaTime 帧间隔时间（秒）
     */
    public onUpdate(_deltaTime: number): void {}
}

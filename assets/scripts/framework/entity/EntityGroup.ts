import { Logger } from '../debug/Logger';
import { EntityBase } from './EntityBase';
import { EntityId, IEntityFactory } from './EntityDefs';

/**
 * 实体分组
 * 管理同一类型实体的生命周期与对象池复用
 *
 * 内部维护两个池：
 * - _activeList：当前活跃（显示中）的实体
 * - _waitingList：已 hide、等待复用的实体
 */
export class EntityGroup {
    private static readonly TAG = 'EntityGroup';

    /** 分组名称 */
    private readonly _groupName: string;

    /** 实体工厂（由 EntityManager 注入） */
    private readonly _factory: IEntityFactory;

    /** 活跃实体列表 */
    private readonly _activeList: EntityBase[] = [];

    /** 等待复用池 */
    private readonly _waitingList: EntityBase[] = [];

    public constructor(groupName: string, factory: IEntityFactory) {
        this._groupName = groupName;
        this._factory = factory;
    }

    // ─── Getters ──────────────────────────────────────

    /**
     * 分组名称
     */
    public get groupName(): string {
        return this._groupName;
    }

    /**
     * 活跃实体数量
     */
    public get activeCount(): number {
        return this._activeList.length;
    }

    /**
     * 等待池中的实体数量
     */
    public get waitingCount(): number {
        return this._waitingList.length;
    }

    // ─── 核心方法 ─────────────────────────────────────

    /**
     * 取出一个实体（优先从等待池复用，无则通过 factory 创建）
     * @param entityId 分配的实体 ID
     * @param data 传递给 onShow 的业务数据
     * @returns 活跃实体实例
     */
    public showEntity(entityId: EntityId, data?: unknown): EntityBase {
        const entity =
            this._waitingList.length > 0
                ? (Logger.debug(EntityGroup.TAG, `[${this._groupName}] 复用实体`),
                  this._waitingList.pop()!)
                : (Logger.debug(EntityGroup.TAG, `[${this._groupName}] 新建实体`),
                  this._factory.createEntity(this._groupName));
        entity._init(entityId, this._groupName);
        entity._setActive(true);
        this._activeList.push(entity);
        entity.onShow(data);
        return entity;
    }

    /**
     * 隐藏实体，将其回收到等待池
     * @param entity 要隐藏的实体
     */
    public hideEntity(entity: EntityBase): void {
        const index = this._activeList.indexOf(entity);
        if (index !== -1) {
            this._activeList.splice(index, 1);
        }
        Logger.debug(EntityGroup.TAG, `[${this._groupName}] 回收实体`);
        entity.onHide();
        entity._setActive(false);
        this._waitingList.push(entity);
    }

    /**
     * 每帧更新所有活跃实体
     * @param deltaTime 帧间隔时间
     */
    public update(deltaTime: number): void {
        const snapshot = this._activeList.slice();
        for (const entity of snapshot) {
            entity.onUpdate(deltaTime);
        }
    }

    /**
     * 销毁分组：将所有实体（活跃 + 等待）通过 factory 销毁
     */
    public destroyAll(): void {
        Logger.debug(EntityGroup.TAG, `[${this._groupName}] 销毁全部`);
        for (const entity of this._activeList) {
            entity.onHide();
            entity._setActive(false);
            this._factory.destroyEntity(entity);
        }
        for (const entity of this._waitingList) {
            this._factory.destroyEntity(entity);
        }
        this._activeList.length = 0;
        this._waitingList.length = 0;
    }

    /**
     * 获取所有活跃实体的只读快照
     * @returns 活跃实体数组（副本）
     */
    public getActiveEntities(): readonly EntityBase[] {
        return this._activeList.slice();
    }

    /**
     * 查询指定 ID 的实体是否在本组活跃
     * @param entityId 实体 ID
     */
    public hasEntity(entityId: EntityId): boolean {
        return this._activeList.some((e) => e.entityId === entityId);
    }
}

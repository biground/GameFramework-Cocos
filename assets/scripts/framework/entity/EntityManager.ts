import { ModuleBase } from '../core/ModuleBase';
import { Logger } from '../debug/Logger';
import { EntityBase } from './EntityBase';
import { EntityGroup } from './EntityGroup';
import { EntityId, IEntityFactory, ShowEntityCallbacks } from './EntityDefs';
import { IEntityManager } from '@framework/interfaces/IEntityManager';

/**
 * 实体管理器
 * 统一管理所有实体分组的注册、创建、隐藏与生命周期
 *
 * 设计要点：
 * - 按 groupName 分组管理，每组一个 EntityGroup（内含对象池）
 * - 通过 IEntityFactory 策略注入，Framework 层不依赖引擎 API
 * - 实体 ID 由管理器自增分配，全局唯一
 * - Priority = 180，在 UIManager（200）之前 update，确保 UI 读到当帧最新实体状态
 */
export class EntityManager extends ModuleBase implements IEntityManager {
    private static readonly TAG = 'EntityManager';

    public get moduleName(): string {
        return 'EntityManager';
    }

    public get priority(): number {
        return 180;
    }

    /** 实体 ID 自增计数器 */
    private _nextEntityId: EntityId = 1;

    /** 分组注册表：groupName → EntityGroup */
    private readonly _groups: Map<string, EntityGroup> = new Map();

    /** 实体反查表：entityId → EntityGroup（用于 hideEntity 快速定位分组） */
    private readonly _entityGroupMap: Map<EntityId, EntityGroup> = new Map();

    /** 实体工厂（由外部注入） */
    private _factory: IEntityFactory | null = null;

    // ─── 生命周期 ──────────────────────────────────────

    public onInit(): void {
        // 初始化状态重置（支持多次 init）
        this._nextEntityId = 1;
        this._groups.clear();
        this._entityGroupMap.clear();
        this._factory = null;
        Logger.info(EntityManager.TAG, '实体管理器初始化');
    }

    public onUpdate(deltaTime: number): void {
        for (const group of this._groups.values()) {
            group.update(deltaTime);
        }
    }

    public onShutdown(): void {
        Logger.info(EntityManager.TAG, `实体管理器关闭，销毁 ${this._groups.size} 个分组`);
        for (const group of this._groups.values()) {
            group.destroyAll();
        }
        this._groups.clear();
        this._entityGroupMap.clear();
    }

    // ─── IEntityManager 实现 ─────────────────────────

    /**
     * 设置实体工厂（必须在 showEntity 之前调用）
     */
    public setEntityFactory(factory: IEntityFactory): void {
        if (!factory) {
            Logger.error(EntityManager.TAG, 'factory 不能为空');
            throw new Error('[EntityManager] factory 不能为空');
        }
        this._factory = factory;
    }

    /**
     * 注册实体分组
     */
    public registerGroup(groupName: string): void {
        if (!groupName) {
            Logger.error(EntityManager.TAG, 'groupName 不能为空');
            throw new Error('[EntityManager] groupName 不能为空');
        }
        if (this._groups.has(groupName)) {
            Logger.error(EntityManager.TAG, `分组 "${groupName}" 已注册`);
            throw new Error(`[EntityManager] 分组 "${groupName}" 已注册`);
        }
        if (!this._factory) {
            Logger.error(EntityManager.TAG, '请先调用 setEntityFactory 设置工厂');
            throw new Error('[EntityManager] 请先调用 setEntityFactory 设置工厂');
        }
        this._groups.set(groupName, new EntityGroup(groupName, this._factory));
        Logger.debug(EntityManager.TAG, `注册分组: ${groupName}`);
    }

    /**
     * 显示（激活）一个实体
     */
    public showEntity(
        groupName: string,
        data?: unknown,
        callbacks?: ShowEntityCallbacks,
    ): EntityBase {
        const group = this._groups.get(groupName);
        if (!group) {
            const error = `[EntityManager] 分组 "${groupName}" 不存在`;
            Logger.error(EntityManager.TAG, `分组 "${groupName}" 不存在`);
            callbacks?.onFailure?.(-1, error);
            throw new Error(error);
        }
        const entityId = this._nextEntityId++;
        const entity = group.showEntity(entityId, data);
        this._entityGroupMap.set(entityId, group);
        Logger.debug(EntityManager.TAG, `显示实体: group=${groupName}, id=${entityId}`);
        callbacks?.onSuccess?.(entityId, entity);
        return entity;
    }

    /**
     * 隐藏实体，将其回收到分组的等待池
     */
    public hideEntity(entity: EntityBase): void {
        const group = this._entityGroupMap.get(entity.entityId);
        if (!group) {
            return;
        }
        Logger.debug(EntityManager.TAG, `隐藏实体: id=${entity.entityId}`);
        group.hideEntity(entity);
        this._entityGroupMap.delete(entity.entityId);
    }

    /**
     * 隐藏指定分组的所有实体
     */
    public hideAllEntities(groupName?: string): void {
        Logger.debug(EntityManager.TAG, `隐藏所有实体${groupName ? `: group=${groupName}` : ''}`);
        if (groupName !== undefined) {
            const group = this._groups.get(groupName);
            if (!group) return;
            for (const entity of group.getActiveEntities()) {
                this.hideEntity(entity);
            }
        } else {
            for (const group of this._groups.values()) {
                for (const entity of group.getActiveEntities()) {
                    this.hideEntity(entity);
                }
            }
        }
    }

    /**
     * 获取指定分组的所有活跃实体
     */
    public getEntitiesByGroup(groupName: string): readonly EntityBase[] {
        const group = this._groups.get(groupName);
        if (!group) return [];
        return group.getActiveEntities();
    }

    /**
     * 查询实体是否活跃
     */
    public hasEntity(entityId: EntityId): boolean {
        return this._entityGroupMap.has(entityId);
    }
}

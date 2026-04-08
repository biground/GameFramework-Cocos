import { EntityBase } from '../entity/EntityBase';
import { EntityId, IEntityFactory, ShowEntityCallbacks } from '../entity/EntityDefs';

/**
 * 实体管理器接口
 * 定义实体系统的公共契约，业务层应依赖此接口而非 EntityManager 实现类
 *
 * 核心职责：
 * 1. 实体分组的注册与管理
 * 2. 实体的显示（showEntity）与隐藏（hideEntity）
 * 3. 通过内部对象池复用，避免频繁 GC
 * 4. 通过 IEntityFactory 策略注入隔离引擎依赖
 */
export interface IEntityManager {
    /**
     * 设置实体工厂（策略注入）
     * 必须在 registerGroup / showEntity 之前调用
     * @param factory 实体工厂实现
     */
    setEntityFactory(factory: IEntityFactory): void;

    /**
     * 注册实体分组
     * 每种实体类型（如 Enemy、NPC、Loot）对应一个分组
     * @param groupName 分组名称（唯一标识）
     */
    registerGroup(groupName: string): void;

    /**
     * 显示（激活）一个实体
     * - 优先从该分组的等待池中复用已有实例
     * - 等待池为空时通过 IEntityFactory 创建新实例
     *
     * @param groupName 分组名称
     * @param data 传递给 onShow 的业务数据（可选）
     * @param callbacks 显示回调（可选）
     * @returns 已激活的实体实例
     */
    showEntity(groupName: string, data?: unknown, callbacks?: ShowEntityCallbacks): EntityBase;

    /**
     * 隐藏实体，将其回收到所属分组的等待池
     * @param entity 要隐藏的实体实例
     */
    hideEntity(entity: EntityBase): void;

    /**
     * 隐藏指定分组（或所有分组）的所有活跃实体
     * @param groupName 分组名（可选，不传则隐藏全部）
     */
    hideAllEntities(groupName?: string): void;

    /**
     * 获取指定分组的所有活跃实体
     * @param groupName 分组名称
     * @returns 活跃实体的只读数组
     */
    getEntitiesByGroup(groupName: string): readonly EntityBase[];

    /**
     * 查询实体是否活跃
     * @param entityId 实体 ID
     */
    hasEntity(entityId: EntityId): boolean;
}

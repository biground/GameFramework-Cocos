import {
    IEntityFactory,
    EntityBase,
} from '@framework/entity/EntityDefs';

/**
 * 模拟实体工厂
 * 用于 Demo 和测试环境的实体创建模拟
 * 
 * @description
 * 实现 IEntityFactory 接口，在不依赖 CocosCreator 引擎的情况下
 * 模拟游戏实体的创建和销毁，用于单元测试和 Demo 演示。
 */
export class MockEntityFactory implements IEntityFactory {
    private static readonly TAG = 'MockEntityFactory';

    /** 已创建的实体列表 */
    private _createdEntities: Set<EntityBase> = new Set();

    // Constructor
    constructor() {
        // TODO: 初始化实体工厂配置
    }

    /**
     * 创建实体实例（模拟）
     * @param groupName 分组名
     * @returns 实体实例
     */
    public createEntity(_groupName: string): EntityBase {
        // TODO: 实现模拟实体创建逻辑
        // 注意：实际实现需要创建 EntityBase 的子类实例
        throw new Error('[MockEntityFactory] createEntity 尚未实现');
    }

    /**
     * 销毁实体实例（模拟）
     * @param entity 要销毁的实体
     */
    public destroyEntity(entity: EntityBase): void {
        // TODO: 实现模拟实体销毁逻辑
        this._createdEntities.delete(entity);
    }

    /**
     * 获取已创建的实体数量（仅用于测试）
     * @returns 实体数量
     */
    public get createdEntityCount(): number {
        return this._createdEntities.size;
    }
}

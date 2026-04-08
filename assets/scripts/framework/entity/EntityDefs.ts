import { EntityBase } from './EntityBase';

/**
 * 实体唯一 ID 类型
 */
export type EntityId = number;

/**
 * 实体工厂接口（策略注入）
 * Framework 层定义契约，Runtime 层提供引擎相关实现
 *
 * @example
 * ```typescript
 * // Runtime 层实现示例
 * class CocosEntityFactory implements IEntityFactory {
 *     createEntity(groupName: string): EntityBase {
 *         const node = new cc.Node(groupName);
 *         return node.addComponent(MyEntity);
 *     }
 *     destroyEntity(entity: EntityBase): void {
 *         // 回收节点资源
 *     }
 * }
 * ```
 */
export interface IEntityFactory {
    /**
     * 创建实体实例（由 Runtime 层实现）
     * @param groupName 分组名
     */
    createEntity(groupName: string): EntityBase;

    /**
     * 销毁实体实例（释放引擎资源）
     * @param entity 要销毁的实体
     */
    destroyEntity(entity: EntityBase): void;
}

/**
 * 打开实体时的回调选项
 */
export interface ShowEntityCallbacks {
    /** 实体成功显示后的回调 */
    onSuccess?: (entityId: EntityId, entity: EntityBase) => void;
    /** 失败时的回调 */
    onFailure?: (entityId: EntityId, error: string) => void;
}

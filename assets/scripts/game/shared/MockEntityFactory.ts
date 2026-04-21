import { Logger } from '@framework/debug/Logger';
import { EntityBase } from '@framework/entity/EntityBase';
import { IEntityFactory } from '@framework/entity/EntityDefs';

/**
 * 模拟实体类
 * 用于测试和 Demo 环境的实体实现，追踪生命周期调用
 *
 * @description
 * 继承 EntityBase，重写生命周期方法以记录调用历史。
 * 可用于单元测试验证实体管理器的行为。
 */
export class MockEntity extends EntityBase {
    private static readonly TAG = 'MockEntity';

    /** 生命周期调用记录 */
    public readonly calls: string[] = [];

    /** 最后一次 onShow 接收的数据 */
    public lastShowData: unknown = null;

    /**
     * 实体类型标识
     */
    public get entityType(): string {
        return 'MockEntity';
    }

    /**
     * 显示实体时调用
     * @param data 业务数据
     */
    public onShow(data?: unknown): void {
        this.calls.push('onShow');
        this.lastShowData = data ?? null;
        Logger.debug(
            MockEntity.TAG,
            `MockEntity onShow (id: ${this.entityId}, group: ${this.groupName})`,
        );
    }

    /**
     * 隐藏实体时调用
     */
    public onHide(): void {
        this.calls.push('onHide');
        Logger.debug(MockEntity.TAG, `MockEntity onHide (id: ${this.entityId})`);
    }

    /**
     * 每帧更新时调用
     * @param deltaTime 帧间隔时间（秒）
     */
    public onUpdate(deltaTime: number): void {
        this.calls.push('onUpdate');
        Logger.debug(
            MockEntity.TAG,
            `MockEntity onUpdate (id: ${this.entityId}, dt: ${deltaTime})`,
        );
    }

    /**
     * 手动触发隐藏（模拟外部隐藏请求）
     */
    public simulateHide(): void {
        this.onHide();
        this._setActive(false);
        Logger.debug(MockEntity.TAG, `MockEntity simulateHide (id: ${this.entityId})`);
    }
}

/**
 * 模拟实体工厂
 * 用于测试和 Demo 环境的实体创建与销毁，支持实体池复用
 *
 * @description
 * 实现 IEntityFactory 接口，提供实体创建、销毁和池化管理功能。
 * 所有操作均会被追踪记录，便于测试验证。
 *
 * @example
 * ```typescript
 * const factory = new MockEntityFactory();
 * factory.enablePooling(true);
 * const entity = factory.createEntity('Enemy');
 * factory.destroyEntity(entity); // 回池而非真正销毁
 * ```
 */
export class MockEntityFactory implements IEntityFactory {
    private static readonly TAG = 'MockEntityFactory';

    /** 按分组追踪已创建的实体 */
    public readonly createdEntities: Map<string, MockEntity[]> = new Map();

    /** 追踪已销毁的实体 */
    public readonly destroyedEntities: EntityBase[] = [];

    /** 创建调用记录 */
    public readonly createCalls: Array<{ groupName: string }> = [];

    /** 销毁调用计数 */
    public destroyCalls: number = 0;

    /** 实体池（按分组存储） */
    private _pool: Map<string, MockEntity[]> = new Map();

    /** 是否启用实体池 */
    private _poolingEnabled: boolean = false;

    /**
     * 启用或禁用实体池
     * @param enabled true 启用池化，false 禁用池化
     */
    public enablePooling(enabled: boolean): void {
        this._poolingEnabled = enabled;
        Logger.info(MockEntityFactory.TAG, `实体池 ${enabled ? '已启用' : '已禁用'}`);
    }

    /**
     * 创建实体实例
     * 如果启用池化且池中有可用实体，则复用；否则创建新实例
     * @param groupName 分组名
     * @returns 实体实例
     */
    public createEntity(groupName: string): EntityBase {
        // 记录创建调用
        this.createCalls.push({ groupName });

        // 尝试从池中获取
        if (this._poolingEnabled) {
            const pooled = this._getFromPool(groupName);
            if (pooled !== null) {
                Logger.debug(MockEntityFactory.TAG, `从池中复用实体 (group: ${groupName})`);
                this._trackCreatedEntity(groupName, pooled);
                return pooled;
            }
        }

        // 创建新实体
        const entity = new MockEntity();
        Logger.debug(MockEntityFactory.TAG, `创建新实体 (group: ${groupName})`);
        this._trackCreatedEntity(groupName, entity);
        return entity;
    }

    /**
     * 销毁实体实例
     * 如果启用池化，将实体回池；否则标记为已销毁
     * @param entity 要销毁的实体
     */
    public destroyEntity(entity: EntityBase): void {
        this.destroyCalls++;

        if (this._poolingEnabled && entity instanceof MockEntity) {
            this._returnToPool(entity);
            Logger.debug(
                MockEntityFactory.TAG,
                `实体回池 (id: ${entity.entityId}, group: ${entity.groupName})`,
            );
        } else {
            this.destroyedEntities.push(entity);
            Logger.debug(MockEntityFactory.TAG, `实体已销毁 (id: ${entity.entityId})`);
        }
    }

    /**
     * 获取实体池（只读访问，用于测试验证）
     * @returns 实体池的副本
     */
    public getPool(): Map<string, MockEntity[]> {
        const result: Map<string, MockEntity[]> = new Map();
        this._pool.forEach((entities, group) => {
            result.set(group, [...entities]);
        });
        return result;
    }

    /**
     * 获取指定分组的池中实体数量
     * @param groupName 分组名
     * @returns 池中实体数量
     */
    public getPoolSize(groupName: string): number {
        const pool = this._pool.get(groupName);
        return pool ? pool.length : 0;
    }

    /**
     * 清空所有实体池
     */
    public clearPool(): void {
        this._pool.clear();
        Logger.info(MockEntityFactory.TAG, '实体池已清空');
    }

    // ─── 私有辅助方法 ─────────────────────────────────

    /**
     * 从池中获取实体
     * @param groupName 分组名
     * @returns 实体实例，池中无可用实体时返回 null
     */
    private _getFromPool(groupName: string): MockEntity | null {
        const pool = this._pool.get(groupName);
        if (pool && pool.length > 0) {
            return pool.pop()!;
        }
        return null;
    }

    /**
     * 将实体归还到池中
     * @param entity 实体实例
     */
    private _returnToPool(entity: MockEntity): void {
        const groupName = entity.groupName;
        let pool = this._pool.get(groupName);
        if (!pool) {
            pool = [];
            this._pool.set(groupName, pool);
        }
        pool.push(entity);
    }

    /**
     * 追踪已创建的实体
     * @param groupName 分组名
     * @param entity 实体实例
     */
    private _trackCreatedEntity(groupName: string, entity: MockEntity): void {
        let groupEntities = this.createdEntities.get(groupName);
        if (!groupEntities) {
            groupEntities = [];
            this.createdEntities.set(groupName, groupEntities);
        }
        groupEntities.push(entity);
    }
}

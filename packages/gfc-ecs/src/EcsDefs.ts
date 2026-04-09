/**
 * ComponentType — 组件类型标识符
 * 借鉴 ServiceKey<T> 的 phantom type 模式，确保类型安全
 *
 * @template T 组件数据类型
 *
 * @example
 * ```typescript
 * interface Position { x: number; y: number; }
 * const Position = new ComponentType<Position>('Position');
 *
 * world.addComponent(entity, Position, { x: 0, y: 0 });
 * const pos = world.getComponent(entity, Position); // 类型推断为 Position
 * ```
 */
export class ComponentType<T> {
    /** 幻影属性，确保不同 T 的 ComponentType 在结构类型上不兼容 */
    declare private readonly _phantom: T;

    /** 组件类型 ID（自动分配） */
    public readonly typeId: number;

    /** 组件描述（用于调试） */
    public readonly name: string;

    /** 全局自增 ID 计数器 */
    private static _nextTypeId = 0;

    constructor(name: string) {
        this.name = name;
        this.typeId = ComponentType._nextTypeId++;
    }
}

/**
 * ECS 实体 ID 类型（纯数字）
 */
export type EcsEntityId = number;

/**
 * 无效实体 ID 常量
 */
export const INVALID_ENTITY: EcsEntityId = -1;

/**
 * System 接口
 * 所有 System 必须实现此接口
 */
export interface ISystem {
    /** 系统名称（用于调试和排序） */
    readonly name: string;

    /** 执行优先级（越小越先执行） */
    readonly priority: number;

    /** 是否启用 */
    enabled: boolean;

    /**
     * 每帧执行
     * @param deltaTime 帧间隔
     */
    update(deltaTime: number): void;

    /**
     * 系统初始化（注册 query 等）
     * @param world ECS 世界引用
     */
    onInit?(world: IEcsWorldAccess): void;

    /**
     * 系统销毁
     */
    onDestroy?(): void;
}

/**
 * EcsWorld 对 System 暴露的访问接口
 * System 通过此接口与 World 交互，而非直接依赖 EcsWorld 类
 */
export interface IEcsWorldAccess {
    /** 实体是否存活 */
    isAlive(entityId: EcsEntityId): boolean;

    /** 创建实体 */
    createEntity(): EcsEntityId;

    /** 销毁实体 */
    destroyEntity(entityId: EcsEntityId): void;

    /** 添加组件 */
    addComponent<T>(entityId: EcsEntityId, type: ComponentType<T>, data: T): void;

    /** 移除组件 */
    removeComponent<T>(entityId: EcsEntityId, type: ComponentType<T>): void;

    /** 获取组件 */
    getComponent<T>(entityId: EcsEntityId, type: ComponentType<T>): T | undefined;

    /** 实体是否拥有指定组件 */
    hasComponent<T>(entityId: EcsEntityId, type: ComponentType<T>): boolean;

    /** 查询拥有指定组件组合的所有实体 */
    query(...types: ComponentType<unknown>[]): readonly EcsEntityId[];
}

/**
 * Query 过滤条件
 */
export interface QueryDescriptor {
    /** 必须拥有的组件 */
    all?: ComponentType<unknown>[];
    /** 不能拥有的组件 */
    none?: ComponentType<unknown>[];
    /** 至少拥有其中一个 */
    any?: ComponentType<unknown>[];
}

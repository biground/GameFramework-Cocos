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
/** 最大支持的组件类型数量（受 32-bit 掩码限制） */
export const MAX_COMPONENT_TYPES = 32;

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
        if (ComponentType._nextTypeId >= MAX_COMPONENT_TYPES) {
            throw new Error(`[ComponentType] 最多支持 ${MAX_COMPONENT_TYPES} 种组件类型`);
        }
        this.name = name;
        this.typeId = ComponentType._nextTypeId++;
    }
}

/**
 * 构建组件掩码（将多个 ComponentType 的 typeId 合并为 32-bit 位掩码）
 * @param types 组件类型列表
 * @returns 合并后的掩码
 */
export function buildComponentMask(...types: ComponentType<unknown>[]): number {
    let mask = 0;
    for (const t of types) {
        mask |= 1 << t.typeId;
    }
    return mask;
}

/**
 * ECS 实体 ID 类型（纯数字）
 */
export type EcsEntityId = number;

/**
 * 无效实体 ID 常量
 */
export const INVALID_ENTITY: EcsEntityId = -1;

// ─── Generational Entity ID 位布局 ────────────────────

/** Entity ID 中 index 部分的位数 */
export const INDEX_BITS = 20;

/** Entity ID 中 index 部分的掩码（低 20 位） */
export const INDEX_MASK = 0xfffff;

/** Entity ID 中 generation 部分的掩码（12 位） */
export const GENERATION_MASK = 0xfff;

/**
 * 将 index 和 generation 打包为完整的 Entity ID
 *
 * 位布局：高 12 位 generation | 低 20 位 index
 * @param index 实体索引（0 ~ 0xFFFFF）
 * @param generation 代数（0 ~ 0xFFF）
 * @returns 打包后的 Entity ID
 */
export function packEntityId(index: number, generation: number): EcsEntityId {
    return ((generation & GENERATION_MASK) << INDEX_BITS) | (index & INDEX_MASK);
}

/**
 * 从 packed Entity ID 中提取 index 部分
 * @param id 完整的 Entity ID
 * @returns index（0 ~ 0xFFFFF）
 */
export function entityIndex(id: EcsEntityId): number {
    return id & INDEX_MASK;
}

/**
 * 从 packed Entity ID 中提取 generation 部分
 * @param id 完整的 Entity ID
 * @returns generation（0 ~ 0xFFF）
 */
export function entityGeneration(id: EcsEntityId): number {
    return (id >>> INDEX_BITS) & GENERATION_MASK;
}

/** System 执行阶段 */
export enum SystemPhase {
    /** 帧开始：输入处理、帧准备 */
    PreUpdate = 0,
    /** 主逻辑更新 */
    Update = 100,
    /** 物理、碰撞检测 */
    PostUpdate = 200,
    /** 相机跟随、UI 同步 */
    LateUpdate = 300,
}

/**
 * System 接口
 * 所有 System 必须实现此接口
 */
export interface ISystem {
    /** 系统名称（用于调试和排序） */
    readonly name: string;

    /** 执行优先级（越小越先执行） */
    readonly priority: number;

    /** 执行阶段（默认 SystemPhase.Update） */
    readonly phase?: SystemPhase;

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

    /** 注册持久化查询（返回缓存句柄） */
    registerQuery(descriptor: QueryDescriptor): QueryHandle;

    /** 解析缓存查询结果 */
    resolveQuery(handle: QueryHandle): readonly EcsEntityId[];

    /** 删除已注册的查询 */
    removeQuery(handle: QueryHandle): boolean;

    /** 命令缓冲区（用于延迟操作） */
    readonly commands: ICommandBuffer;
}

/**
 * 命令缓冲区接口（System 使用）
 */
export interface ICommandBuffer {
    /** 延迟创建实体（返回临时 ID） */
    createEntity(): EcsEntityId;
    /** 延迟销毁实体 */
    destroyEntity(entityId: EcsEntityId): void;
    /** 延迟添加组件 */
    addComponent<T>(entityId: EcsEntityId, type: ComponentType<T>, data: T): void;
    /** 延迟移除组件 */
    removeComponent<T>(entityId: EcsEntityId, type: ComponentType<T>): void;
}

/**
 * 缓存的查询句柄
 * 通过 `registerQuery` 获取，用于 `resolveQuery` 快速检索结果
 */
export interface QueryHandle {
    /** 内部唯一标识 */
    readonly _id: number;
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

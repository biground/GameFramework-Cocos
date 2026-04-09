import { ComponentType, EcsEntityId } from './EcsDefs';
import type { EcsWorld } from './EcsWorld';

/**
 * 命令类型枚举
 */
const enum CommandKind {
    CreateEntity,
    DestroyEntity,
    AddComponent,
    RemoveComponent,
}

/**
 * 延迟命令结构体
 */
interface Command {
    kind: CommandKind;
    /** CreateEntity 使用的临时 ID */
    tempId?: EcsEntityId;
    /** Destroy/Add/Remove 使用的实体 ID */
    entityId?: EcsEntityId;
    /** Add/Remove 使用的组件类型 */
    componentType?: ComponentType<unknown>;
    /** Add 使用的组件数据 */
    componentData?: unknown;
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
 * 延迟命令缓冲区
 * 记录 System 更新期间的实体操作，在帧末批量执行
 */
export class CommandBuffer implements ICommandBuffer {
    /** 命令队列 */
    private _commands: Command[] = [];

    /** 临时 ID 计数器（从 -2 递减，-1 是 INVALID_ENTITY） */
    private _tempIdCounter = -2;

    /** 是否正在 flush */
    private _flushing = false;

    /**
     * 延迟创建实体，返回临时 ID
     * @returns 负数临时 ID（flush 后映射为真实 ID）
     */
    public createEntity(): EcsEntityId {
        const tempId = this._tempIdCounter--;
        this._commands.push({ kind: CommandKind.CreateEntity, tempId });
        return tempId;
    }

    /**
     * 延迟销毁实体
     * @param entityId 要销毁的实体 ID（支持临时 ID）
     */
    public destroyEntity(entityId: EcsEntityId): void {
        this._commands.push({ kind: CommandKind.DestroyEntity, entityId });
    }

    /**
     * 延迟添加组件（支持临时 ID）
     * @param entityId 实体 ID
     * @param type 组件类型
     * @param data 组件数据
     */
    public addComponent<T>(entityId: EcsEntityId, type: ComponentType<T>, data: T): void {
        this._commands.push({
            kind: CommandKind.AddComponent,
            entityId,
            componentType: type as ComponentType<unknown>,
            componentData: data,
        });
    }

    /**
     * 延迟移除组件
     * @param entityId 实体 ID
     * @param type 组件类型
     */
    public removeComponent<T>(entityId: EcsEntityId, type: ComponentType<T>): void {
        this._commands.push({
            kind: CommandKind.RemoveComponent,
            entityId,
            componentType: type as ComponentType<unknown>,
        });
    }

    /**
     * 批量执行所有命令（由 EcsWorld 在帧末调用）
     * @param world EcsWorld 实例
     */
    public flush(world: EcsWorld): void {
        if (this._flushing) {
            throw new Error('[CommandBuffer] 禁止在 flush 过程中再次 flush');
        }
        this._flushing = true;
        try {
            const tempToReal = new Map<EcsEntityId, EcsEntityId>();

            const resolveId = (id: EcsEntityId): EcsEntityId => {
                if (id < 0) {
                    const real = tempToReal.get(id);
                    if (real === undefined) {
                        throw new Error(`[CommandBuffer] 未知的临时实体 ID: ${id}`);
                    }
                    return real;
                }
                return id;
            };

            for (const cmd of this._commands) {
                switch (cmd.kind) {
                    case CommandKind.CreateEntity: {
                        const realId = world.createEntity();
                        tempToReal.set(cmd.tempId!, realId);
                        break;
                    }
                    case CommandKind.DestroyEntity:
                        world.destroyEntity(resolveId(cmd.entityId!));
                        break;
                    case CommandKind.AddComponent:
                        world.addComponent(
                            resolveId(cmd.entityId!),
                            cmd.componentType!,
                            cmd.componentData,
                        );
                        break;
                    case CommandKind.RemoveComponent:
                        world.removeComponent(resolveId(cmd.entityId!), cmd.componentType!);
                        break;
                }
            }
        } finally {
            this._flushing = false;
            this._commands.length = 0;
            this._tempIdCounter = -2;
        }
    }

    /** 命令队列是否为空 */
    public get isEmpty(): boolean {
        return this._commands.length === 0;
    }

    /** 清空缓冲区（不执行） */
    public clear(): void {
        this._commands.length = 0;
        this._tempIdCounter = -2;
    }
}

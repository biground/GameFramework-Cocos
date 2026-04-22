import { CommandBuffer } from '../src/CommandBuffer';
import { EcsWorld } from '../src/EcsWorld';
import { ComponentType, IEcsWorldAccess, ISystem } from '../src/EcsDefs';

// 每个测试重置 ComponentType 的全局 typeId 计数器
let Health: ComponentType<{ hp: number }>;
let Speed: ComponentType<{ value: number }>;

beforeEach(() => {
    // 重置 ComponentType 的全局 typeId 计数器
    (ComponentType as unknown as { _nextTypeId: number })._nextTypeId = 0;
    Health = new ComponentType<{ hp: number }>('Health');
    Speed = new ComponentType<{ value: number }>('Speed');
});

describe('CommandBuffer', () => {
    // ─── 基本延迟创建 ─────────────────────────────────

    test('createEntity 返回负数临时 ID，flush 后实体存在', () => {
        const world = new EcsWorld();
        const buffer = new CommandBuffer();

        const tempId = buffer.createEntity();
        expect(tempId).toBeLessThan(0);
        expect(world.entityCount).toBe(0);

        buffer.flush(world);
        expect(world.entityCount).toBe(1);

        world.destroy();
    });

    // ─── 延迟销毁 ─────────────────────────────────────

    test('destroyEntity flush 前不生效，flush 后实体被销毁', () => {
        const world = new EcsWorld();
        const buffer = new CommandBuffer();
        const realId = world.createEntity();

        buffer.destroyEntity(realId);
        expect(world.isAlive(realId)).toBe(true);

        buffer.flush(world);
        expect(world.isAlive(realId)).toBe(false);
        expect(world.entityCount).toBe(0);

        world.destroy();
    });

    // ─── 延迟添加组件 ─────────────────────────────────

    test('addComponent flush 后组件存在', () => {
        const world = new EcsWorld();
        const buffer = new CommandBuffer();
        const entity = world.createEntity();

        buffer.addComponent(entity, Health, { hp: 100 });
        expect(world.hasComponent(entity, Health)).toBe(false);

        buffer.flush(world);
        expect(world.hasComponent(entity, Health)).toBe(true);
        expect(world.getComponent(entity, Health)).toEqual({ hp: 100 });

        world.destroy();
    });

    // ─── 延迟移除组件 ─────────────────────────────────

    test('removeComponent flush 后组件被移除', () => {
        const world = new EcsWorld();
        const buffer = new CommandBuffer();
        const entity = world.createEntity();
        world.addComponent(entity, Health, { hp: 50 });

        buffer.removeComponent(entity, Health);
        expect(world.hasComponent(entity, Health)).toBe(true);

        buffer.flush(world);
        expect(world.hasComponent(entity, Health)).toBe(false);

        world.destroy();
    });

    // ─── 临时 ID addComponent ──────────────────────────

    test('临时 ID addComponent: flush 后新实体拥有组件', () => {
        const world = new EcsWorld();
        const buffer = new CommandBuffer();

        const tempId = buffer.createEntity();
        buffer.addComponent(tempId, Health, { hp: 200 });
        buffer.addComponent(tempId, Speed, { value: 10 });

        buffer.flush(world);
        expect(world.entityCount).toBe(1);

        // 通过 query 找到新实体
        const entities = world.query(Health, Speed);
        expect(entities).toHaveLength(1);
        expect(world.getComponent(entities[0], Health)).toEqual({ hp: 200 });
        expect(world.getComponent(entities[0], Speed)).toEqual({ value: 10 });

        world.destroy();
    });

    // ─── flush 清空命令队列 ────────────────────────────

    test('flush 后 isEmpty 为 true', () => {
        const world = new EcsWorld();
        const buffer = new CommandBuffer();

        buffer.createEntity();
        expect(buffer.isEmpty).toBe(false);

        buffer.flush(world);
        expect(buffer.isEmpty).toBe(true);

        world.destroy();
    });

    // ─── flush 防重入 ──────────────────────────────────

    test('flush 中再次 flush 抛出异常', () => {
        const world = new EcsWorld();
        const buffer = new CommandBuffer();

        // 通过代理劫持 createEntity，在 flush 执行期间尝试再次 flush
        const originalCreate = world.createEntity.bind(world);
        let intercepted = false;
        jest.spyOn(world, 'createEntity').mockImplementation(() => {
            if (!intercepted) {
                intercepted = true;
                // 在 flush 内部尝试再次 flush
                expect(() => buffer.flush(world)).toThrow(
                    '[CommandBuffer] 禁止在 flush 过程中再次 flush',
                );
            }
            return originalCreate();
        });

        buffer.createEntity();
        buffer.flush(world);

        world.destroy();
    });

    // ─── world.update 自动 flush ───────────────────────

    test('world.update 结束后自动 flush 命令缓冲区', () => {
        const world = new EcsWorld();

        // 创建一个在 update 中使用 commands 的 System
        const system: ISystem = {
            name: 'SpawnSystem',
            priority: 0,
            enabled: true,
            update(_dt: number): void {
                // 在 system update 中通过 commands 创建实体
                world.commands.createEntity();
            },
        };

        world.addSystem(system);
        expect(world.entityCount).toBe(0);

        world.update(0.016);
        // flush 后实体应存在
        expect(world.entityCount).toBe(1);

        world.destroy();
    });

    // ─── 多次 flush ───────────────────────────────────

    test('两轮 update 各自独立 flush', () => {
        const world = new EcsWorld();
        let callCount = 0;

        const system: ISystem = {
            name: 'SpawnSystem',
            priority: 0,
            enabled: true,
            update(_dt: number): void {
                callCount++;
                world.commands.createEntity();
            },
        };

        world.addSystem(system);

        world.update(0.016);
        expect(world.entityCount).toBe(1);

        world.update(0.016);
        expect(world.entityCount).toBe(2);
        expect(callCount).toBe(2);

        world.destroy();
    });

    // ─── 临时 ID 链式操作 ──────────────────────────────

    test('createEntity → addComponent → destroyEntity 同一临时 ID', () => {
        const world = new EcsWorld();
        const buffer = new CommandBuffer();

        const tempId = buffer.createEntity();
        buffer.addComponent(tempId, Health, { hp: 1 });
        buffer.destroyEntity(tempId);

        buffer.flush(world);
        // 实体已被创建后又销毁
        expect(world.entityCount).toBe(0);

        world.destroy();
    });

    // ─── clear 不执行命令 ──────────────────────────────

    test('clear 清空缓冲区但不执行命令', () => {
        const world = new EcsWorld();
        const buffer = new CommandBuffer();

        buffer.createEntity();
        buffer.createEntity();
        expect(buffer.isEmpty).toBe(false);

        buffer.clear();
        expect(buffer.isEmpty).toBe(true);
        expect(world.entityCount).toBe(0);

        world.destroy();
    });

    // ─── 未知临时 ID 抛出异常 ──────────────────────────

    test('flush 时使用未知的临时 ID 抛出异常', () => {
        const world = new EcsWorld();
        const buffer = new CommandBuffer();

        // 直接用一个不存在的临时负 ID
        buffer.addComponent(-999 as number, Health, { hp: 1 });

        expect(() => buffer.flush(world)).toThrow('[CommandBuffer] 未知的临时实体 ID: -999');

        world.destroy();
    });

    // ─── System 通过 onInit 获取 commands 引用 ─────────

    test('System 可在 onInit 中获取 commands 引用', () => {
        const world = new EcsWorld();
        let cmdRef: unknown = null;

        const system: ISystem = {
            name: 'RefSystem',
            priority: 0,
            enabled: true,
            onInit(w: IEcsWorldAccess): void {
                cmdRef = w.commands;
            },
            update(): void {
                // no-op
            },
        };

        world.addSystem(system);
        expect(cmdRef).toBe(world.commands);

        world.destroy();
    });

    // ─── 多个临时实体互相引用 ──────────────────────────

    test('多个临时实体：前者的 addComponent 引用后者的 tempId', () => {
        const world = new EcsWorld();
        const buffer = new CommandBuffer();
        const temp1 = buffer.createEntity();
        const temp2 = buffer.createEntity();
        buffer.addComponent(temp1, Health, { hp: 10 });
        buffer.addComponent(temp2, Health, { hp: 20 });
        buffer.flush(world);
        expect(world.entityCount).toBe(2);
        const entities = world.query(Health);
        expect(entities).toHaveLength(2);
        world.destroy();
    });
});

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-member-access */
import { EcsWorld } from '../src/EcsWorld';
import {
    ComponentType,
    GENERATION_MASK,
    ISystem,
    IEcsWorldAccess,
    SystemPhase,
    entityGeneration,
    entityIndex,
    packEntityId,
    buildComponentMask,
    MAX_COMPONENT_TYPES,
} from '../src/EcsDefs';

// ─── 测试用组件类型 ─────────────────────────────────

interface Position {
    x: number;
    y: number;
}
const Position = new ComponentType<Position>('Position');

interface Velocity {
    vx: number;
    vy: number;
}
const Velocity = new ComponentType<Velocity>('Velocity');

interface Health {
    hp: number;
    maxHp: number;
}
const Health = new ComponentType<Health>('Health');

// ─── Mock System ────────────────────────────────────

class MockMovementSystem implements ISystem {
    readonly name = 'Movement';
    readonly priority = 0;
    enabled = true;
    updateCount = 0;
    private _world: IEcsWorldAccess | null = null;

    onInit(world: IEcsWorldAccess): void {
        this._world = world;
    }

    update(_deltaTime: number): void {
        this.updateCount++;
        if (!this._world) return;
        const entities = this._world.query(Position, Velocity);
        for (const eid of entities) {
            const pos = this._world.getComponent(eid, Position)!;
            const vel = this._world.getComponent(eid, Velocity)!;
            pos.x += vel.vx * _deltaTime;
            pos.y += vel.vy * _deltaTime;
        }
    }
}
void MockMovementSystem;

// ─── Entity 测试 ────────────────────────────────────

describe('EcsWorld — Entity', () => {
    let world: EcsWorld;

    beforeEach(() => {
        world = new EcsWorld();
    });

    afterEach(() => {
        world.destroy();
    });

    it('createEntity 返回递增 index', () => {
        const e1 = world.createEntity();
        const e2 = world.createEntity();
        expect(entityIndex(e2)).toBe(entityIndex(e1) + 1);
    });

    it('entityCount 随 create/destroy 变化', () => {
        expect(world.entityCount).toBe(0);
        const e1 = world.createEntity();
        world.createEntity();
        expect(world.entityCount).toBe(2);
        world.destroyEntity(e1);
        expect(world.entityCount).toBe(1);
    });

    it('destroy 后 isAlive 返回 false', () => {
        const e = world.createEntity();
        expect(world.isAlive(e)).toBe(true);
        world.destroyEntity(e);
        expect(world.isAlive(e)).toBe(false);
    });

    it('销毁后 index 被回收复用，但 generation 递增', () => {
        const e1 = world.createEntity();
        world.destroyEntity(e1);
        const e2 = world.createEntity();
        // 同一 index，但 generation 不同
        expect(entityIndex(e2)).toBe(entityIndex(e1));
        expect(entityGeneration(e2)).toBe(entityGeneration(e1) + 1);
        expect(e2).not.toBe(e1);
    });

    it('destroy 不存在的实体不报错', () => {
        expect(() => world.destroyEntity(999)).not.toThrow();
    });

    it('ABA 问题：旧 ID 在 index 被回收后不再有效', () => {
        const oldEntity = world.createEntity();
        world.addComponent(oldEntity, Position, { x: 1, y: 2 });
        world.destroyEntity(oldEntity);

        const newEntity = world.createEntity(); // same index, new generation
        expect(entityIndex(newEntity)).toBe(entityIndex(oldEntity));
        expect(world.isAlive(oldEntity)).toBe(false);
        expect(world.isAlive(newEntity)).toBe(true);

        // 旧 ID 无法访问新实体的组件
        world.addComponent(newEntity, Position, { x: 99, y: 99 });
        expect(world.getComponent(oldEntity, Position)).toBeUndefined();
        expect(world.hasComponent(oldEntity, Position)).toBe(false);
    });

    it('ABA 问题：旧 ID 销毁新实体无效', () => {
        const oldEntity = world.createEntity();
        world.destroyEntity(oldEntity);

        const newEntity = world.createEntity();
        // 用旧 ID 尝试销毁 → 应无效（generation 不匹配）
        world.destroyEntity(oldEntity);
        expect(world.isAlive(newEntity)).toBe(true);
        expect(world.entityCount).toBe(1);
    });

    it('generation 回绕：达到最大值后归零', () => {
        const e1 = world.createEntity();
        const idx = entityIndex(e1);

        // 将 generation 设置为最大值，模拟即将回绕
        /* eslint-disable @typescript-eslint/no-explicit-any */
        (world as any)._generations[idx] = GENERATION_MASK;
        (world as any)._packedIds[idx] = packEntityId(idx, GENERATION_MASK);
        /* eslint-enable @typescript-eslint/no-explicit-any */

        // 销毁后 generation 应回绕到 0
        world.destroyEntity(packEntityId(idx, GENERATION_MASK));
        /* eslint-disable @typescript-eslint/no-explicit-any */
        expect((world as any)._generations[idx]).toBe(0);
        /* eslint-enable @typescript-eslint/no-explicit-any */

        // 创建新实体使用回绕后的 generation
        const e2 = world.createEntity();
        expect(entityIndex(e2)).toBe(idx);
        expect(entityGeneration(e2)).toBe(0);
    });
});

// ─── Component 测试 ─────────────────────────────────

describe('EcsWorld — Component', () => {
    let world: EcsWorld;

    beforeEach(() => {
        world = new EcsWorld();
    });

    afterEach(() => {
        world.destroy();
    });

    it('addComponent + getComponent 正常工作', () => {
        const e = world.createEntity();
        const pos = { x: 10, y: 20 };
        world.addComponent(e, Position, pos);
        expect(world.getComponent(e, Position)).toBe(pos);
    });

    it('hasComponent 正确反映组件是否存在', () => {
        const e = world.createEntity();
        expect(world.hasComponent(e, Position)).toBe(false);
        world.addComponent(e, Position, { x: 0, y: 0 });
        expect(world.hasComponent(e, Position)).toBe(true);
    });

    it('removeComponent 后 getComponent 返回 undefined', () => {
        const e = world.createEntity();
        world.addComponent(e, Position, { x: 1, y: 2 });
        world.removeComponent(e, Position);
        expect(world.getComponent(e, Position)).toBeUndefined();
    });

    it('destroyEntity 自动移除所有组件', () => {
        const e = world.createEntity();
        world.addComponent(e, Position, { x: 1, y: 2 });
        world.addComponent(e, Velocity, { vx: 3, vy: 4 });
        world.destroyEntity(e);
        // 回收后创建新实体，same index, different generation
        const e2 = world.createEntity();
        expect(entityIndex(e2)).toBe(entityIndex(e));
        expect(world.hasComponent(e2, Position)).toBe(false);
        expect(world.hasComponent(e2, Velocity)).toBe(false);
    });

    it('对已销毁实体 addComponent 应抛错', () => {
        const e = world.createEntity();
        world.destroyEntity(e);
        expect(() => world.addComponent(e, Position, { x: 0, y: 0 })).toThrow();
    });
});

// ─── Query 测试 ──────────────────────────────────────

describe('EcsWorld — Query', () => {
    let world: EcsWorld;

    beforeEach(() => {
        world = new EcsWorld();
    });

    afterEach(() => {
        world.destroy();
    });

    it('query 返回同时拥有指定组件的实体', () => {
        const e1 = world.createEntity();
        world.addComponent(e1, Position, { x: 0, y: 0 });

        const e2 = world.createEntity();
        world.addComponent(e2, Position, { x: 1, y: 1 });
        world.addComponent(e2, Velocity, { vx: 1, vy: 0 });

        const e3 = world.createEntity();
        world.addComponent(e3, Position, { x: 2, y: 2 });
        world.addComponent(e3, Velocity, { vx: 2, vy: 0 });

        const result = world.query(Position, Velocity);
        expect(result.length).toBe(2);
        expect(result).toContain(e2);
        expect(result).toContain(e3);
        expect(result).not.toContain(e1);
    });

    it('空 query 返回空数组', () => {
        world.createEntity();
        expect(world.query()).toEqual([]);
    });

    it('queryAdvanced all + none 过滤', () => {
        const e1 = world.createEntity();
        world.addComponent(e1, Position, { x: 0, y: 0 });
        world.addComponent(e1, Velocity, { vx: 1, vy: 0 });

        const e2 = world.createEntity();
        world.addComponent(e2, Position, { x: 1, y: 1 });
        world.addComponent(e2, Velocity, { vx: 2, vy: 0 });
        world.addComponent(e2, Health, { hp: 100, maxHp: 100 });

        // all: Position+Velocity, none: Health → 只返回 e1
        const result = world.queryAdvanced({
            all: [Position, Velocity],
            none: [Health],
        });
        expect(result.length).toBe(1);
        expect(result).toContain(e1);
    });

    it('queryAdvanced 纯 any：返回拥有任一组件的实体', () => {
        const e1 = world.createEntity();
        world.addComponent(e1, Position, { x: 0, y: 0 });

        const e2 = world.createEntity();
        world.addComponent(e2, Velocity, { vx: 1, vy: 0 });

        const e3 = world.createEntity();
        world.addComponent(e3, Health, { hp: 100, maxHp: 100 });

        // any: Position | Velocity → e1, e2（不含 e3）
        const result = world.queryAdvanced({ any: [Position, Velocity] });
        expect(result.length).toBe(2);
        expect(result).toContain(e1);
        expect(result).toContain(e2);
        expect(result).not.toContain(e3);
    });

    it('queryAdvanced any + none 组合', () => {
        const e1 = world.createEntity();
        world.addComponent(e1, Position, { x: 0, y: 0 });

        const e2 = world.createEntity();
        world.addComponent(e2, Position, { x: 1, y: 1 });
        world.addComponent(e2, Health, { hp: 100, maxHp: 100 });

        const e3 = world.createEntity();
        world.addComponent(e3, Velocity, { vx: 1, vy: 0 });

        // any: Position | Velocity, none: Health → e1, e3（e2 被 Health 排除）
        const result = world.queryAdvanced({
            any: [Position, Velocity],
            none: [Health],
        });
        expect(result.length).toBe(2);
        expect(result).toContain(e1);
        expect(result).toContain(e3);
        expect(result).not.toContain(e2);
    });

    it('queryAdvanced 纯 none：排除拥有指定组件的存活实体', () => {
        const e1 = world.createEntity();
        world.addComponent(e1, Position, { x: 0, y: 0 });

        const e2 = world.createEntity();
        world.addComponent(e2, Velocity, { vx: 1, vy: 0 });

        const e3 = world.createEntity();
        // e3 没有任何组件

        // none: Position → 排除 e1，返回 e2, e3
        const result = world.queryAdvanced({ none: [Position] });
        expect(result.length).toBe(2);
        expect(result).toContain(e2);
        expect(result).toContain(e3);
        expect(result).not.toContain(e1);
    });

    it('queryAdvanced all + any 组合', () => {
        const e1 = world.createEntity();
        world.addComponent(e1, Position, { x: 0, y: 0 });

        const e2 = world.createEntity();
        world.addComponent(e2, Position, { x: 1, y: 1 });
        world.addComponent(e2, Velocity, { vx: 1, vy: 0 });

        const e3 = world.createEntity();
        world.addComponent(e3, Position, { x: 2, y: 2 });
        world.addComponent(e3, Health, { hp: 100, maxHp: 100 });

        // all: Position, any: Velocity | Health → e2, e3（e1 没有 Velocity 也没有 Health）
        const result = world.queryAdvanced({
            all: [Position],
            any: [Velocity, Health],
        });
        expect(result.length).toBe(2);
        expect(result).toContain(e2);
        expect(result).toContain(e3);
        expect(result).not.toContain(e1);
    });

    it('queryAdvanced 空描述符返回空数组', () => {
        world.createEntity();
        expect(world.queryAdvanced({})).toEqual([]);
    });

    it('queryAdvanced 纯 any 去重：同一实体拥有多个 any 组件只出现一次', () => {
        const e1 = world.createEntity();
        world.addComponent(e1, Position, { x: 0, y: 0 });
        world.addComponent(e1, Velocity, { vx: 1, vy: 0 });

        // any: Position | Velocity → e1 只出现一次
        const result = world.queryAdvanced({ any: [Position, Velocity] });
        expect(result.length).toBe(1);
        expect(result).toContain(e1);
    });
});

// ─── System 测试 ─────────────────────────────────────

describe('EcsWorld — System', () => {
    let world: EcsWorld;

    beforeEach(() => {
        world = new EcsWorld();
    });

    afterEach(() => {
        world.destroy();
    });

    it('addSystem 后 update 调用 system.update', () => {
        const sys = new MockMovementSystem();
        world.addSystem(sys);
        world.update(0.016);
        expect(sys.updateCount).toBe(1);
    });

    it('MovementSystem 正确更新 Position', () => {
        const sys = new MockMovementSystem();
        world.addSystem(sys);

        const e = world.createEntity();
        world.addComponent(e, Position, { x: 0, y: 0 });
        world.addComponent(e, Velocity, { vx: 10, vy: 5 });

        world.update(1);

        const pos = world.getComponent(e, Position)!;
        expect(pos.x).toBe(10);
        expect(pos.y).toBe(5);
    });

    it('disabled system 不执行', () => {
        const sys = new MockMovementSystem();
        sys.enabled = false;
        world.addSystem(sys);
        world.update(0.016);
        expect(sys.updateCount).toBe(0);
    });

    it('System 按 priority 顺序执行', () => {
        const order: string[] = [];
        const sysA: ISystem = {
            name: 'A',
            priority: 10,
            enabled: true,
            update() {
                order.push('A');
            },
        };
        const sysB: ISystem = {
            name: 'B',
            priority: 0,
            enabled: true,
            update() {
                order.push('B');
            },
        };
        world.addSystem(sysA);
        world.addSystem(sysB);
        world.update(0.016);
        expect(order).toEqual(['B', 'A']);
    });
});

// ─── Bitwise Component Mask 测试 ────────────────────

describe('buildComponentMask', () => {
    it('单个类型生成正确掩码', () => {
        const mask = buildComponentMask(Position);
        expect(mask).toBe(1 << Position.typeId);
    });

    it('多个类型生成合并掩码', () => {
        const mask = buildComponentMask(Position, Velocity, Health);
        const expected = (1 << Position.typeId) | (1 << Velocity.typeId) | (1 << Health.typeId);
        expect(mask).toBe(expected);
    });

    it('空参数返回 0', () => {
        expect(buildComponentMask()).toBe(0);
    });
});

describe('ComponentType — MAX_COMPONENT_TYPES 限制', () => {
    it('MAX_COMPONENT_TYPES 为 32', () => {
        expect(MAX_COMPONENT_TYPES).toBe(32);
    });
});

describe('EcsWorld — Component Mask', () => {
    let world: EcsWorld;

    beforeEach(() => {
        world = new EcsWorld();
    });

    afterEach(() => {
        world.destroy();
    });

    it('addComponent 后 mask 正确设置', () => {
        const e = world.createEntity();
        world.addComponent(e, Position, { x: 0, y: 0 });
        world.addComponent(e, Velocity, { vx: 1, vy: 0 });
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const masks = (world as any)._componentMasks as number[];
        /* eslint-enable @typescript-eslint/no-explicit-any */
        const idx = entityIndex(e);
        const expected = (1 << Position.typeId) | (1 << Velocity.typeId);
        expect(masks[idx]).toBe(expected);
    });

    it('removeComponent 后 mask 正确清除对应位', () => {
        const e = world.createEntity();
        world.addComponent(e, Position, { x: 0, y: 0 });
        world.addComponent(e, Velocity, { vx: 1, vy: 0 });
        world.removeComponent(e, Velocity);
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const masks = (world as any)._componentMasks as number[];
        /* eslint-enable @typescript-eslint/no-explicit-any */
        const idx = entityIndex(e);
        expect(masks[idx]).toBe(1 << Position.typeId);
    });

    it('destroyEntity 后 mask 清零', () => {
        const e = world.createEntity();
        world.addComponent(e, Position, { x: 0, y: 0 });
        world.addComponent(e, Velocity, { vx: 1, vy: 0 });
        const idx = entityIndex(e);
        world.destroyEntity(e);
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const masks = (world as any)._componentMasks as number[];
        /* eslint-enable @typescript-eslint/no-explicit-any */
        expect(masks[idx]).toBe(0);
    });

    it('createEntity 新 index mask 为 0', () => {
        const e = world.createEntity();
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const masks = (world as any)._componentMasks as number[];
        /* eslint-enable @typescript-eslint/no-explicit-any */
        expect(masks[entityIndex(e)]).toBe(0);
    });

    it('query 使用位掩码过滤仍返回正确结果', () => {
        const e1 = world.createEntity();
        world.addComponent(e1, Position, { x: 0, y: 0 });

        const e2 = world.createEntity();
        world.addComponent(e2, Position, { x: 1, y: 1 });
        world.addComponent(e2, Velocity, { vx: 1, vy: 0 });

        const result = world.query(Position, Velocity);
        expect(result.length).toBe(1);
        expect(result).toContain(e2);
    });

    it('destroy 清空 _componentMasks', () => {
        const e = world.createEntity();
        world.addComponent(e, Position, { x: 0, y: 0 });
        world.destroy();
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const masks = (world as any)._componentMasks as number[];
        /* eslint-enable @typescript-eslint/no-explicit-any */
        expect(masks.length).toBe(0);
    });
});

// ─── System Phase 测试 ──────────────────────────────

describe('EcsWorld — System Phase', () => {
    let world: EcsWorld;

    beforeEach(() => {
        world = new EcsWorld();
    });

    afterEach(() => {
        world.destroy();
    });

    it('System 按阶段执行：不同 phase 按正确顺序', () => {
        const order: string[] = [];
        const sysLate: ISystem = {
            name: 'Late',
            priority: 0,
            phase: SystemPhase.LateUpdate,
            enabled: true,
            update() {
                order.push('Late');
            },
        };
        const sysPre: ISystem = {
            name: 'Pre',
            priority: 0,
            phase: SystemPhase.PreUpdate,
            enabled: true,
            update() {
                order.push('Pre');
            },
        };
        const sysUpdate: ISystem = {
            name: 'Update',
            priority: 0,
            phase: SystemPhase.Update,
            enabled: true,
            update() {
                order.push('Update');
            },
        };
        // 故意乱序添加
        world.addSystem(sysLate);
        world.addSystem(sysPre);
        world.addSystem(sysUpdate);
        world.update(0.016);
        expect(order).toEqual(['Pre', 'Update', 'Late']);
    });
});

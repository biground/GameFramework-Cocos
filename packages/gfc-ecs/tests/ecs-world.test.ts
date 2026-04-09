/* eslint-disable @typescript-eslint/no-unused-vars */
import { EcsWorld } from '../src/EcsWorld';
import { ComponentType, ISystem, IEcsWorldAccess } from '../src/EcsDefs';

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

    it('createEntity 返回递增 ID', () => {
        const e1 = world.createEntity();
        const e2 = world.createEntity();
        expect(e2).toBe(e1 + 1);
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

    it('销毁后 ID 被回收复用', () => {
        const e1 = world.createEntity();
        world.destroyEntity(e1);
        const e2 = world.createEntity();
        expect(e2).toBe(e1);
    });

    it('destroy 不存在的实体不报错', () => {
        expect(() => world.destroyEntity(999)).not.toThrow();
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
        // 实体已死，重新创建同 ID 说明被回收
        const e2 = world.createEntity();
        expect(e2).toBe(e);
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

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
        // TODO: 实现
    });

    it('entityCount 随 create/destroy 变化', () => {
        // TODO: 实现
    });

    it('destroy 后 isAlive 返回 false', () => {
        // TODO: 实现
    });

    it('销毁后 ID 被回收复用', () => {
        // TODO: create → destroy → create，新 ID 等于旧 ID
    });

    it('destroy 不存在的实体不报错', () => {
        // TODO: 实现
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
        // TODO: 实现
    });

    it('hasComponent 正确反映组件是否存在', () => {
        // TODO: 实现
    });

    it('removeComponent 后 getComponent 返回 undefined', () => {
        // TODO: 实现
    });

    it('destroyEntity 自动移除所有组件', () => {
        // TODO: 实现
    });

    it('对已销毁实体 addComponent 应抛错', () => {
        // TODO: 实现
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
        // TODO: 创建 3 个实体，1 只有 Position，2 有 Position+Velocity，query 返回 2 个
    });

    it('空 query 返回空数组', () => {
        // TODO: 实现
    });

    it('queryAdvanced all + none 过滤', () => {
        // TODO: 3 个实体，2 有 Position+Velocity，1 多了 Health
        // queryAdvanced({ all: [Position, Velocity], none: [Health] }) 返回 1 个
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
        // TODO: 实现
    });

    it('MovementSystem 正确更新 Position', () => {
        // TODO: 创建 entity + Position + Velocity，update(1)，验证 pos 变化
    });

    it('disabled system 不执行', () => {
        // TODO: 实现
    });

    it('System 按 priority 顺序执行', () => {
        // TODO: 注册两个不同 priority 的 system，验证执行顺序
    });
});

/* eslint-disable @typescript-eslint/no-unused-vars */
import { EcsWorld } from '../src/EcsWorld';
import {
    ComponentType,
    ISystem,
    IEcsWorldAccess,
    IReactiveGroup,
    entityIndex,
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

interface Poison {
    damage: number;
}
const Poison = new ComponentType<Poison>('Poison');

// ─── 测试套件 ────────────────────────────────────────

describe('ReactiveGroup', () => {
    describe('基础匹配', () => {
        it('registerGroup → addComponent 使实体满足条件 → 自动加入组', () => {
            const world = new EcsWorld();
            const group = world.registerGroup({ all: [Position, Velocity] });

            const eid = world.createEntity();
            world.addComponent(eid, Position, { x: 0, y: 0 });
            // 还缺 Velocity，不应在组内
            expect(group.count).toBe(0);

            world.addComponent(eid, Velocity, { vx: 1, vy: 1 });
            // 满足条件，自动加入
            expect(group.count).toBe(1);
            expect(group.has(entityIndex(eid))).toBe(true);
        });

        it('多个实体独立匹配', () => {
            const world = new EcsWorld();
            const group = world.registerGroup({ all: [Position] });

            const e1 = world.createEntity();
            const e2 = world.createEntity();
            world.addComponent(e1, Position, { x: 0, y: 0 });
            world.addComponent(e2, Position, { x: 1, y: 1 });

            expect(group.count).toBe(2);
            expect(group.has(entityIndex(e1))).toBe(true);
            expect(group.has(entityIndex(e2))).toBe(true);
        });
    });

    describe('Enter 追踪', () => {
        it('添加最后一个必需组件 → drainEntered 包含该实体', () => {
            const world = new EcsWorld();
            const group = world.registerGroup({ all: [Position, Velocity] });

            const eid = world.createEntity();
            world.addComponent(eid, Position, { x: 0, y: 0 });
            // 只加了 Position，不应出现在 entered
            expect(group.drainEntered()).toEqual([]);

            world.addComponent(eid, Velocity, { vx: 1, vy: 1 });
            const entered = group.drainEntered();
            expect(entered).toEqual([entityIndex(eid)]);
        });
    });

    describe('Remove 追踪', () => {
        it('移除一个必需组件 → drainRemoved 包含该实体', () => {
            const world = new EcsWorld();
            const group = world.registerGroup({ all: [Position, Velocity] });

            const eid = world.createEntity();
            world.addComponent(eid, Position, { x: 0, y: 0 });
            world.addComponent(eid, Velocity, { vx: 1, vy: 1 });
            // drain 掉 entered
            group.drainEntered();

            world.removeComponent(eid, Velocity);
            expect(group.count).toBe(0);
            const removed = group.drainRemoved();
            expect(removed).toEqual([entityIndex(eid)]);
        });
    });

    describe('Entity 销毁追踪', () => {
        it('销毁已匹配实体 → drainRemoved 包含该实体', () => {
            const world = new EcsWorld();
            const group = world.registerGroup({ all: [Position] });

            const eid = world.createEntity();
            world.addComponent(eid, Position, { x: 0, y: 0 });
            group.drainEntered();

            world.destroyEntity(eid);
            expect(group.count).toBe(0);
            expect(group.drainRemoved()).toEqual([entityIndex(eid)]);
        });

        it('销毁未匹配实体 → drainRemoved 不受影响', () => {
            const world = new EcsWorld();
            const group = world.registerGroup({ all: [Position, Velocity] });

            const eid = world.createEntity();
            world.addComponent(eid, Position, { x: 0, y: 0 });
            // 不满足条件

            world.destroyEntity(eid);
            expect(group.drainRemoved()).toEqual([]);
        });
    });

    describe('None 条件', () => {
        it('加入排除组件 → 实体从组中移除', () => {
            const world = new EcsWorld();
            const group = world.registerGroup({ all: [Position], none: [Poison] });

            const eid = world.createEntity();
            world.addComponent(eid, Position, { x: 0, y: 0 });
            expect(group.count).toBe(1);
            group.drainEntered();

            // 添加排除组件
            world.addComponent(eid, Poison, { damage: 5 });
            expect(group.count).toBe(0);
            expect(group.drainRemoved()).toEqual([entityIndex(eid)]);
        });

        it('移除排除组件 → 实体重新进入组', () => {
            const world = new EcsWorld();
            const group = world.registerGroup({ all: [Position], none: [Poison] });

            const eid = world.createEntity();
            world.addComponent(eid, Position, { x: 0, y: 0 });
            world.addComponent(eid, Poison, { damage: 5 });
            expect(group.count).toBe(0);
            group.drainEntered();
            group.drainRemoved();

            world.removeComponent(eid, Poison);
            expect(group.count).toBe(1);
            expect(group.drainEntered()).toEqual([entityIndex(eid)]);
        });
    });

    describe('Any 条件', () => {
        it('添加 any 组件之一 → 实体进入组（需同时满足 all）', () => {
            const world = new EcsWorld();
            const group = world.registerGroup({
                all: [Position],
                any: [Velocity, Health],
            });

            const eid = world.createEntity();
            world.addComponent(eid, Position, { x: 0, y: 0 });
            // 仅有 Position，缺少 any 组件
            expect(group.count).toBe(0);

            world.addComponent(eid, Health, { hp: 100, maxHp: 100 });
            expect(group.count).toBe(1);
            expect(group.drainEntered()).toEqual([entityIndex(eid)]);
        });
    });

    describe('Drain 清空', () => {
        it('drainEntered 调用后再次调用返回空数组', () => {
            const world = new EcsWorld();
            const group = world.registerGroup({ all: [Position] });

            const eid = world.createEntity();
            world.addComponent(eid, Position, { x: 0, y: 0 });

            const first = group.drainEntered();
            expect(first.length).toBe(1);

            const second = group.drainEntered();
            expect(second.length).toBe(0);
        });

        it('drainRemoved 调用后再次调用返回空数组', () => {
            const world = new EcsWorld();
            const group = world.registerGroup({ all: [Position] });

            const eid = world.createEntity();
            world.addComponent(eid, Position, { x: 0, y: 0 });
            group.drainEntered();

            world.removeComponent(eid, Position);
            const first = group.drainRemoved();
            expect(first.length).toBe(1);

            const second = group.drainRemoved();
            expect(second.length).toBe(0);
        });
    });

    describe('初始匹配', () => {
        it('registerGroup 时已有匹配实体 → 直接在组内（进入 entered 列表）', () => {
            const world = new EcsWorld();
            const eid = world.createEntity();
            world.addComponent(eid, Position, { x: 0, y: 0 });
            world.addComponent(eid, Velocity, { vx: 1, vy: 1 });

            // 注册时实体已满足条件
            const group = world.registerGroup({ all: [Position, Velocity] });
            expect(group.count).toBe(1);
            expect(group.has(entityIndex(eid))).toBe(true);
            // 初始匹配的实体也应出现在 entered 中
            expect(group.drainEntered()).toEqual([entityIndex(eid)]);
        });
    });

    describe('System Enter/Remove 生命周期', () => {
        it('update 前自动派发 enter/remove 回调', () => {
            const world = new EcsWorld();
            const enteredLog: number[][] = [];
            const removedLog: number[][] = [];
            let updateCount = 0;

            const system: ISystem = {
                name: 'ReactiveTest',
                priority: 0,
                enabled: true,
                group: undefined as IReactiveGroup | undefined,
                onInit(w: IEcsWorldAccess) {
                    (this as { group: IReactiveGroup }).group = w.registerGroup({
                        all: [Position],
                    });
                },
                onEntityEnter(indices: readonly number[]) {
                    enteredLog.push([...indices]);
                },
                onEntityRemove(indices: readonly number[]) {
                    removedLog.push([...indices]);
                },
                update(_dt: number) {
                    updateCount++;
                },
            };

            world.addSystem(system);

            // 创建匹配实体
            const eid = world.createEntity();
            world.addComponent(eid, Position, { x: 0, y: 0 });

            // update 时应先触发 onEntityEnter，再调用 update
            world.update(0.016);
            expect(enteredLog.length).toBe(1);
            expect(enteredLog[0]).toEqual([entityIndex(eid)]);
            expect(updateCount).toBe(1);

            // 销毁实体
            world.destroyEntity(eid);
            world.update(0.016);
            expect(removedLog.length).toBe(1);
            expect(removedLog[0]).toEqual([entityIndex(eid)]);
            expect(updateCount).toBe(2);
        });

        it('无 group 的 system 正常执行，不触发生命周期', () => {
            const world = new EcsWorld();
            let updated = false;

            const system: ISystem = {
                name: 'PlainSystem',
                priority: 0,
                enabled: true,
                update() {
                    updated = true;
                },
            };

            world.addSystem(system);
            world.update(0.016);
            expect(updated).toBe(true);
        });
    });

    describe('多个 group 独立追踪', () => {
        it('两个不同 descriptor 的 group 独立响应', () => {
            const world = new EcsWorld();
            const groupPos = world.registerGroup({ all: [Position] });
            const groupVel = world.registerGroup({ all: [Velocity] });

            const eid = world.createEntity();
            world.addComponent(eid, Position, { x: 0, y: 0 });

            expect(groupPos.count).toBe(1);
            expect(groupVel.count).toBe(0);

            world.addComponent(eid, Velocity, { vx: 1, vy: 1 });
            expect(groupPos.count).toBe(1);
            expect(groupVel.count).toBe(1);

            // drainEntered 分别独立
            expect(groupPos.drainEntered()).toEqual([entityIndex(eid)]);
            expect(groupVel.drainEntered()).toEqual([entityIndex(eid)]);
        });
    });
});

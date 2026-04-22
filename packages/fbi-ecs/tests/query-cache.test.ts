import { EcsWorld } from '../src/EcsWorld';
import { ComponentType } from '../src/EcsDefs';
import { QueryCache } from '../src/QueryCache';

// ─── 测试用组件类型 ─────────────────────────────────

interface Pos {
    x: number;
    y: number;
}
const Pos = new ComponentType<Pos>('QC_Pos');

interface Vel {
    vx: number;
    vy: number;
}
const Vel = new ComponentType<Vel>('QC_Vel');

interface Hp {
    hp: number;
}
const Hp = new ComponentType<Hp>('QC_Hp');

interface Tag {
    tag: string;
}
const Tag = new ComponentType<Tag>('QC_Tag');

// ─── QueryCache 单元测试 ─────────────────────────────

describe('QueryCache — 单元测试', () => {
    it('register 返回唯一递增的句柄 ID', () => {
        const cache = new QueryCache(() => []);
        const h1 = cache.register({ all: [Pos] });
        const h2 = cache.register({ all: [Vel] });
        expect(h1._id).toBe(0);
        expect(h2._id).toBe(1);
    });

    it('resolve 对脏条目调用 recompute', () => {
        const recompute = jest.fn(() => [42]);
        const cache = new QueryCache(recompute);
        const handle = cache.register({ all: [Pos] });

        const result = cache.resolve(handle);
        expect(recompute).toHaveBeenCalledTimes(1);
        expect(result).toEqual([42]);
    });

    it('resolve 对干净条目直接返回缓存（不调用 recompute）', () => {
        const recompute = jest.fn(() => [42]);
        const cache = new QueryCache(recompute);
        const handle = cache.register({ all: [Pos] });

        const r1 = cache.resolve(handle);
        const r2 = cache.resolve(handle);
        expect(recompute).toHaveBeenCalledTimes(1);
        expect(r1).toBe(r2); // 同一引用
    });

    it('markDirtyByType 仅标记相关条目为脏', () => {
        let callCount = 0;
        const cache = new QueryCache(() => [++callCount]);
        const hPos = cache.register({ all: [Pos] });
        const hVel = cache.register({ all: [Vel] });

        // 首次 resolve 各调用一次 recompute
        cache.resolve(hPos);
        cache.resolve(hVel);
        expect(callCount).toBe(2);

        // 标记 Pos 脏 → 仅 hPos 需要重算
        cache.markDirtyByType(Pos.typeId);
        cache.resolve(hPos);
        cache.resolve(hVel);
        expect(callCount).toBe(3); // 只增 1
    });

    it('markAllDirty 标记全部条目为脏', () => {
        let callCount = 0;
        const cache = new QueryCache(() => [++callCount]);
        const hPos = cache.register({ all: [Pos] });
        const hVel = cache.register({ all: [Vel] });

        cache.resolve(hPos);
        cache.resolve(hVel);
        expect(callCount).toBe(2);

        cache.markAllDirty();
        cache.resolve(hPos);
        cache.resolve(hVel);
        expect(callCount).toBe(4); // 两个都重算
    });

    it('clear 清空所有缓存和映射', () => {
        const cache = new QueryCache(() => []);
        const handle = cache.register({ all: [Pos] });
        cache.resolve(handle);

        cache.clear();
        expect(() => cache.resolve(handle)).toThrow('[QueryCache]');
    });

    it('resolve 无效句柄抛出错误', () => {
        const cache = new QueryCache(() => []);
        expect(() => cache.resolve({ _id: 999 })).toThrow('[QueryCache]');
    });

    it('none 类型变动也触发脏标记', () => {
        let callCount = 0;
        const cache = new QueryCache(() => [++callCount]);
        const handle = cache.register({ all: [Pos], none: [Hp] });

        cache.resolve(handle); // callCount = 1
        cache.markDirtyByType(Hp.typeId); // Hp 在 none 列表中
        cache.resolve(handle); // callCount = 2
        expect(callCount).toBe(2);
    });

    it('any 类型变动也触发脏标记', () => {
        let callCount = 0;
        const cache = new QueryCache(() => [++callCount]);
        const handle = cache.register({ all: [Pos], any: [Vel, Hp] });

        cache.resolve(handle); // callCount = 1
        cache.markDirtyByType(Vel.typeId); // Vel 在 any 列表中
        cache.resolve(handle); // callCount = 2
        expect(callCount).toBe(2);
    });

    // ─── removeQuery ─────────────────────────────────

    it('removeQuery 后 resolve 该 handle 抛错', () => {
        const cache = new QueryCache(() => []);
        const handle = cache.register({ all: [Pos] });
        cache.resolve(handle);

        expect(cache.removeQuery(handle)).toBe(true);
        expect(() => cache.resolve(handle)).toThrow('[QueryCache]');
    });

    it('removeQuery 不影响其他已注册的查询', () => {
        let callCount = 0;
        const cache = new QueryCache(() => [++callCount]);
        const h1 = cache.register({ all: [Pos] });
        const h2 = cache.register({ all: [Vel] });

        cache.resolve(h1);
        cache.resolve(h2);

        cache.removeQuery(h1);
        // h2 仍然可用
        cache.markDirtyByType(Vel.typeId);
        const result = cache.resolve(h2);
        expect(result).toEqual([3]);
    });

    it('removeQuery 后相关 typeId 的脏标记不再影响已删除的条目', () => {
        let callCount = 0;
        const cache = new QueryCache(() => [++callCount]);
        const h1 = cache.register({ all: [Pos] });
        const h2 = cache.register({ all: [Pos, Vel] });

        cache.resolve(h1);
        cache.resolve(h2);
        expect(callCount).toBe(2);

        cache.removeQuery(h1);
        // 标记 Pos 脏 → 只有 h2 被重算（h1 已删除）
        cache.markDirtyByType(Pos.typeId);
        cache.resolve(h2);
        expect(callCount).toBe(3);
    });

    it('removeQuery 不存在的 handle 返回 false', () => {
        const cache = new QueryCache(() => []);
        expect(cache.removeQuery({ _id: 999 })).toBe(false);
    });
});

// ─── EcsWorld 集成测试 ───────────────────────────────

describe('EcsWorld — Query 缓存', () => {
    let world: EcsWorld;

    beforeEach(() => {
        world = new EcsWorld();
    });

    afterEach(() => {
        world.destroy();
    });

    // ─── 基本工作流 ──────────────────────────────────

    it('registerQuery + resolveQuery 基本工作流', () => {
        const e = world.createEntity();
        world.addComponent(e, Pos, { x: 1, y: 2 });

        const handle = world.registerQuery({ all: [Pos] });
        const result = world.resolveQuery(handle);

        expect(result).toEqual([e]);
    });

    it('首次 resolve 计算结果', () => {
        const e1 = world.createEntity();
        world.addComponent(e1, Pos, { x: 0, y: 0 });
        const e2 = world.createEntity();
        world.addComponent(e2, Pos, { x: 1, y: 1 });
        world.addComponent(e2, Vel, { vx: 1, vy: 1 });

        const handle = world.registerQuery({ all: [Pos, Vel] });
        const result = world.resolveQuery(handle);

        expect(result).toEqual([e2]);
    });

    // ─── 缓存命中 ───────────────────────────────────

    it('无变更时 resolve 返回相同引用（缓存命中）', () => {
        const e = world.createEntity();
        world.addComponent(e, Pos, { x: 0, y: 0 });

        const handle = world.registerQuery({ all: [Pos] });
        const r1 = world.resolveQuery(handle);
        const r2 = world.resolveQuery(handle);

        expect(r1).toBe(r2); // 同一数组引用
    });

    // ─── addComponent 失效 ──────────────────────────

    it('addComponent 后缓存失效，resolve 返回新结果', () => {
        const e1 = world.createEntity();
        world.addComponent(e1, Pos, { x: 0, y: 0 });

        const handle = world.registerQuery({ all: [Pos, Vel] });
        const r1 = world.resolveQuery(handle);
        expect(r1).toEqual([]); // e1 没有 Vel

        world.addComponent(e1, Vel, { vx: 1, vy: 1 });
        const r2 = world.resolveQuery(handle);
        expect(r2).toEqual([e1]);
        expect(r2).not.toBe(r1); // 不同引用
    });

    // ─── removeComponent 失效 ───────────────────────

    it('removeComponent 后缓存失效', () => {
        const e = world.createEntity();
        world.addComponent(e, Pos, { x: 0, y: 0 });
        world.addComponent(e, Vel, { vx: 1, vy: 1 });

        const handle = world.registerQuery({ all: [Pos, Vel] });
        const r1 = world.resolveQuery(handle);
        expect(r1).toEqual([e]);

        world.removeComponent(e, Vel);
        const r2 = world.resolveQuery(handle);
        expect(r2).toEqual([]);
    });

    // ─── createEntity 全失效 ────────────────────────

    it('createEntity 后全缓存失效', () => {
        const e1 = world.createEntity();
        world.addComponent(e1, Pos, { x: 0, y: 0 });

        const handle = world.registerQuery({ all: [Pos] });
        const r1 = world.resolveQuery(handle);
        expect(r1).toEqual([e1]);

        // 创建新实体 → 全缓存失效
        const e2 = world.createEntity();
        world.addComponent(e2, Pos, { x: 1, y: 1 });
        const r2 = world.resolveQuery(handle);
        expect(r2).toContain(e1);
        expect(r2).toContain(e2);
        expect(r2).not.toBe(r1);
    });

    // ─── destroyEntity 全失效 ───────────────────────

    it('destroyEntity 后全缓存失效', () => {
        const e1 = world.createEntity();
        world.addComponent(e1, Pos, { x: 0, y: 0 });
        const e2 = world.createEntity();
        world.addComponent(e2, Pos, { x: 1, y: 1 });

        const handle = world.registerQuery({ all: [Pos] });
        const r1 = world.resolveQuery(handle);
        expect(r1).toHaveLength(2);

        world.destroyEntity(e1);
        const r2 = world.resolveQuery(handle);
        expect(r2).toEqual([e2]);
        expect(r2).not.toBe(r1);
    });

    // ─── 精确脏标记 ────────────────────────────────

    it('多个 query 注册，仅相关的被标记脏', () => {
        const e1 = world.createEntity();
        world.addComponent(e1, Pos, { x: 0, y: 0 });
        world.addComponent(e1, Vel, { vx: 1, vy: 1 });
        const e2 = world.createEntity();
        world.addComponent(e2, Vel, { vx: 2, vy: 2 });

        const handlePos = world.registerQuery({ all: [Pos] });
        const handleVel = world.registerQuery({ all: [Vel] });

        const rPos1 = world.resolveQuery(handlePos);
        const rVel1 = world.resolveQuery(handleVel);
        expect(rPos1).toEqual([e1]);
        expect(rVel1).toEqual(expect.arrayContaining([e1, e2]));

        // 移除 e1 的 Pos → 仅 handlePos 脏
        world.removeComponent(e1, Pos);
        const rPos2 = world.resolveQuery(handlePos);
        const rVel2 = world.resolveQuery(handleVel);

        expect(rPos2).toEqual([]); // 重算
        expect(rPos2).not.toBe(rPos1);
        expect(rVel2).toBe(rVel1); // 同引用（未重算）
    });

    it('不相关的组件变动不影响缓存', () => {
        const e = world.createEntity();
        world.addComponent(e, Pos, { x: 0, y: 0 });

        const handle = world.registerQuery({ all: [Pos] });
        const r1 = world.resolveQuery(handle);

        // 添加不相关组件
        world.addComponent(e, Tag, { tag: 'test' });
        const r2 = world.resolveQuery(handle);
        expect(r2).toBe(r1); // 同引用
    });

    // ─── 复合查询 ───────────────────────────────────

    it('all + none + any 复合查询缓存正常工作', () => {
        const e1 = world.createEntity();
        world.addComponent(e1, Pos, { x: 0, y: 0 });
        world.addComponent(e1, Vel, { vx: 1, vy: 1 });

        const e2 = world.createEntity();
        world.addComponent(e2, Pos, { x: 1, y: 1 });
        world.addComponent(e2, Hp, { hp: 100 });

        const e3 = world.createEntity();
        world.addComponent(e3, Vel, { vx: 2, vy: 2 });

        // all: [Pos], none: [Hp], any: [Vel]
        // e1: Pos+Vel → all✓ none✓ any✓ → 包含
        // e2: Pos+Hp → all✓ none✗ → 排除
        // e3: Vel → all✗ → 排除
        const handle = world.registerQuery({ all: [Pos], none: [Hp], any: [Vel] });
        const r1 = world.resolveQuery(handle);
        expect(r1).toEqual([e1]);

        // 给 e1 加 Hp → none 条件不满足
        world.addComponent(e1, Hp, { hp: 50 });
        const r2 = world.resolveQuery(handle);
        expect(r2).toEqual([]);
    });

    // ─── destroy 清理 ───────────────────────────────

    it('world.destroy 后缓存清空', () => {
        const e = world.createEntity();
        world.addComponent(e, Pos, { x: 0, y: 0 });
        const handle = world.registerQuery({ all: [Pos] });
        world.resolveQuery(handle);

        world.destroy();
        // 重建 world
        world = new EcsWorld();
        // 旧句柄不可用（因为 world 内部 queryCache 已 clear）
        // 注意：这里 handle 是旧 world 的，新 world 需要新注册
        const handle2 = world.registerQuery({ all: [Pos] });
        const result = world.resolveQuery(handle2);
        expect(result).toEqual([]);
    });

    // ─── 原有 query/queryAdvanced 不受影响 ────────────

    it('原有 query 方法仍然正常工作（不走缓存）', () => {
        const e = world.createEntity();
        world.addComponent(e, Pos, { x: 0, y: 0 });
        world.addComponent(e, Vel, { vx: 1, vy: 1 });

        const result = world.query(Pos, Vel);
        expect(result).toEqual([e]);
    });

    it('原有 queryAdvanced 方法仍然正常工作（不走缓存）', () => {
        const e = world.createEntity();
        world.addComponent(e, Pos, { x: 0, y: 0 });

        const result = world.queryAdvanced({ all: [Pos], none: [Hp] });
        expect(result).toEqual([e]);
    });

    // ─── removeQuery 集成测试 ────────────────────────

    it('removeQuery 后 resolveQuery 抛错', () => {
        const e = world.createEntity();
        world.addComponent(e, Pos, { x: 0, y: 0 });

        const handle = world.registerQuery({ all: [Pos] });
        world.resolveQuery(handle);

        expect(world.removeQuery(handle)).toBe(true);
        expect(() => world.resolveQuery(handle)).toThrow('[QueryCache]');
    });

    it('removeQuery 后其他查询不受影响', () => {
        const e = world.createEntity();
        world.addComponent(e, Pos, { x: 0, y: 0 });
        world.addComponent(e, Vel, { vx: 1, vy: 1 });

        const hPos = world.registerQuery({ all: [Pos] });
        const hPosVel = world.registerQuery({ all: [Pos, Vel] });

        world.resolveQuery(hPos);
        world.resolveQuery(hPosVel);

        world.removeQuery(hPos);

        // hPosVel 仍然可用
        const result = world.resolveQuery(hPosVel);
        expect(result).toEqual([e]);
    });

    it('removeQuery 不存在的 handle 返回 false', () => {
        expect(world.removeQuery({ _id: 999 })).toBe(false);
    });
});

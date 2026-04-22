import { BitMask } from '../src/BitMask';

describe('BitMask — 基本操作', () => {
    it('初始状态 isEmpty 为 true', () => {
        const m = new BitMask();
        expect(m.isEmpty()).toBe(true);
    });

    it('set/has/clear 基本流程', () => {
        const m = new BitMask();
        expect(m.has(0)).toBe(false);
        m.set(0);
        expect(m.has(0)).toBe(true);
        m.clear(0);
        expect(m.has(0)).toBe(false);
    });

    it('设置多个位后 isEmpty 为 false', () => {
        const m = new BitMask();
        m.set(3);
        m.set(7);
        expect(m.isEmpty()).toBe(false);
    });

    it('reset 清零所有位', () => {
        const m = new BitMask();
        m.set(0);
        m.set(15);
        m.set(31);
        m.reset();
        expect(m.isEmpty()).toBe(true);
        expect(m.has(0)).toBe(false);
        expect(m.has(15)).toBe(false);
        expect(m.has(31)).toBe(false);
    });

    it('clone 产生独立副本', () => {
        const m = new BitMask();
        m.set(5);
        m.set(10);
        const c = m.clone();
        expect(c.has(5)).toBe(true);
        expect(c.has(10)).toBe(true);
        // 修改原不影响克隆
        m.clear(5);
        expect(c.has(5)).toBe(true);
    });

    it('容量默认 64 位', () => {
        const m = new BitMask();
        expect(m.capacity).toBe(64);
    });

    it('自定义初始容量按 32 对齐', () => {
        const m = new BitMask(33);
        expect(m.capacity).toBe(64);
    });
});

describe('BitMask — 第 31 位（符号位边界）', () => {
    it('第 31 位正确 set/has/clear', () => {
        const m = new BitMask();
        m.set(31);
        expect(m.has(31)).toBe(true);
        expect(m.has(30)).toBe(false);
        m.clear(31);
        expect(m.has(31)).toBe(false);
    });

    it('第 31 位和第 0 位同时存在', () => {
        const m = new BitMask();
        m.set(0);
        m.set(31);
        expect(m.has(0)).toBe(true);
        expect(m.has(31)).toBe(true);
    });
});

describe('BitMask — 自动扩展（超过 32 位）', () => {
    it('第 32 位自动扩展到第二个 word', () => {
        const m = new BitMask();
        m.set(32);
        expect(m.has(32)).toBe(true);
        expect(m.capacity).toBeGreaterThanOrEqual(64);
    });

    it('第 63 位正确工作', () => {
        const m = new BitMask();
        m.set(63);
        expect(m.has(63)).toBe(true);
        expect(m.has(62)).toBe(false);
    });

    it('第 64 位触发额外扩展', () => {
        const m = new BitMask();
        m.set(64);
        expect(m.has(64)).toBe(true);
        expect(m.capacity).toBeGreaterThanOrEqual(96);
    });

    it('超大 bit（128+）正确工作', () => {
        const m = new BitMask();
        m.set(128);
        m.set(200);
        expect(m.has(128)).toBe(true);
        expect(m.has(200)).toBe(true);
        expect(m.has(129)).toBe(false);
    });

    it('has 超出容量返回 false（不扩展）', () => {
        const m = new BitMask(32);
        expect(m.has(100)).toBe(false);
        // 容量不应增长
        expect(m.capacity).toBe(32);
    });

    it('clear 超出容量不报错', () => {
        const m = new BitMask(32);
        expect(() => m.clear(100)).not.toThrow();
    });
});

describe('BitMask — containsAll / containsAny / containsNone', () => {
    it('containsAll：子集检查', () => {
        const a = new BitMask();
        a.set(1);
        a.set(3);
        a.set(5);

        const b = new BitMask();
        b.set(1);
        b.set(3);

        expect(a.containsAll(b)).toBe(true);
        expect(b.containsAll(a)).toBe(false);
    });

    it('containsAll：空 mask 始终包含', () => {
        const a = new BitMask();
        a.set(0);
        const empty = new BitMask();
        expect(a.containsAll(empty)).toBe(true);
    });

    it('containsAll：跨字边界', () => {
        const a = new BitMask();
        a.set(10);
        a.set(40);
        a.set(70);

        const b = new BitMask();
        b.set(10);
        b.set(70);

        expect(a.containsAll(b)).toBe(true);
    });

    it('containsAny：任意交集', () => {
        const a = new BitMask();
        a.set(1);
        a.set(5);

        const b = new BitMask();
        b.set(5);
        b.set(10);

        expect(a.containsAny(b)).toBe(true);
    });

    it('containsAny：无交集返回 false', () => {
        const a = new BitMask();
        a.set(1);

        const b = new BitMask();
        b.set(2);

        expect(a.containsAny(b)).toBe(false);
    });

    it('containsNone：无交集', () => {
        const a = new BitMask();
        a.set(0);
        a.set(2);

        const b = new BitMask();
        b.set(1);
        b.set(3);

        expect(a.containsNone(b)).toBe(true);
    });

    it('containsNone：有交集返回 false', () => {
        const a = new BitMask();
        a.set(1);

        const b = new BitMask();
        b.set(1);

        expect(a.containsNone(b)).toBe(false);
    });

    it('containsAll：other 比 this 更长时正确判断', () => {
        const a = new BitMask(32);
        a.set(0);

        const b = new BitMask();
        b.set(0);
        b.set(64);

        // a 不含 bit 64
        expect(a.containsAll(b)).toBe(false);
    });
});

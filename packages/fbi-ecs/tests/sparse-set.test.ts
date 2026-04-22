/* eslint-disable @typescript-eslint/no-unused-vars */
import { SparseSet } from '../src/SparseSet';

describe('SparseSet', () => {
    let set: SparseSet<{ x: number; y: number }>;

    beforeEach(() => {
        set = new SparseSet();
        void set;
    });

    describe('add + has + get', () => {
        it('add 后 has 返回 true，get 返回数据', () => {
            set.add(5, { x: 10, y: 20 });
            expect(set.has(5)).toBe(true);
            expect(set.get(5)).toEqual({ x: 10, y: 20 });
        });

        it('不存在的 entityId，has 返回 false，get 返回 undefined', () => {
            expect(set.has(999)).toBe(false);
            expect(set.get(999)).toBeUndefined();
        });

        it('size 随 add 增长', () => {
            expect(set.size).toBe(0);
            set.add(0, { x: 0, y: 0 });
            expect(set.size).toBe(1);
            set.add(1, { x: 1, y: 1 });
            expect(set.size).toBe(2);
        });

        it('重复 add 同一 entityId 覆盖数据', () => {
            set.add(3, { x: 1, y: 2 });
            set.add(3, { x: 99, y: 88 });
            expect(set.size).toBe(1);
            expect(set.get(3)).toEqual({ x: 99, y: 88 });
        });
    });

    describe('remove — swap-remove', () => {
        it('remove 后 has 返回 false', () => {
            set.add(1, { x: 1, y: 1 });
            set.remove(1);
            expect(set.has(1)).toBe(false);
        });

        it('remove 后 size 减 1', () => {
            set.add(0, { x: 0, y: 0 });
            set.add(1, { x: 1, y: 1 });
            set.remove(0);
            expect(set.size).toBe(1);
        });

        it('remove 中间元素后，剩余元素仍可正确 get', () => {
            set.add(10, { x: 10, y: 10 });
            set.add(20, { x: 20, y: 20 });
            set.add(30, { x: 30, y: 30 });
            set.remove(20);
            expect(set.has(10)).toBe(true);
            expect(set.get(10)).toEqual({ x: 10, y: 10 });
            expect(set.has(30)).toBe(true);
            expect(set.get(30)).toEqual({ x: 30, y: 30 });
            expect(set.has(20)).toBe(false);
        });

        it('remove 不存在的 entityId 不报错', () => {
            expect(() => set.remove(999)).not.toThrow();
        });

        it('remove 唯一元素后 size 为 0', () => {
            set.add(7, { x: 7, y: 7 });
            set.remove(7);
            expect(set.size).toBe(0);
        });
    });

    describe('遍历', () => {
        it('entities 和 denseData 对齐且紧凑', () => {
            set.add(0, { x: 0, y: 0 });
            set.add(1, { x: 1, y: 1 });
            set.add(2, { x: 2, y: 2 });
            expect(set.entities.length).toBe(3);
            expect(set.denseData.length).toBe(3);
            // entities[i] 对应 denseData[i]
            for (let i = 0; i < set.entities.length; i++) {
                expect(set.get(set.entities[i])).toBe(set.denseData[i]);
            }
        });

        it('remove 后数组仍紧凑（无空洞）', () => {
            set.add(0, { x: 0, y: 0 });
            set.add(1, { x: 1, y: 1 });
            set.add(2, { x: 2, y: 2 });
            set.remove(1);
            expect(set.entities.length).toBe(2);
            expect(set.denseData.length).toBe(2);
        });
    });

    describe('clear', () => {
        it('clear 后 size 为 0', () => {
            set.add(0, { x: 0, y: 0 });
            set.add(1, { x: 1, y: 1 });
            set.clear();
            expect(set.size).toBe(0);
            expect(set.has(0)).toBe(false);
            expect(set.has(1)).toBe(false);
        });
    });
});

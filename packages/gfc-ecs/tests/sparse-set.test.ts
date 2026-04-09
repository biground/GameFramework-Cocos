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
            // TODO: 实现
        });

        it('不存在的 entityId，has 返回 false，get 返回 undefined', () => {
            // TODO: 实现
        });

        it('size 随 add 增长', () => {
            // TODO: 实现
        });

        it('重复 add 同一 entityId 覆盖数据', () => {
            // TODO: 实现
        });
    });

    describe('remove — swap-remove', () => {
        it('remove 后 has 返回 false', () => {
            // TODO: 实现
        });

        it('remove 后 size 减 1', () => {
            // TODO: 实现
        });

        it('remove 中间元素后，剩余元素仍可正确 get', () => {
            // TODO: add 3 个，remove 中间那个，验证前后两个仍存在
        });

        it('remove 不存在的 entityId 不报错', () => {
            // TODO: 实现
        });

        it('remove 唯一元素后 size 为 0', () => {
            // TODO: 实现
        });
    });

    describe('遍历', () => {
        it('entities 和 denseData 对齐且紧凑', () => {
            // TODO: add 3 个，验证 entities.length === denseData.length === 3
        });

        it('remove 后数组仍紧凑（无空洞）', () => {
            // TODO: add 3 个，remove 1 个，entities.length === 2
        });
    });

    describe('clear', () => {
        it('clear 后 size 为 0', () => {
            // TODO: 实现
        });
    });
});

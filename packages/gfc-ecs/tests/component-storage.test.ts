/* eslint-disable @typescript-eslint/no-unused-vars */
import { ComponentStorage } from '../src/ComponentStorage';
import { ComponentType } from '../src/EcsDefs';

// ─── 测试用组件类型 ─────────────────────────────────

interface Position {
    x: number;
    y: number;
}
const Position = new ComponentType<Position>('Position');

// ─── ComponentStorage 测试 ──────────────────────────

describe('ComponentStorage', () => {
    let storage: ComponentStorage<Position>;

    beforeEach(() => {
        storage = new ComponentStorage(Position);
        void storage;
    });

    it('componentType 返回正确的组件类型', () => {
        // TODO: 实现
    });

    it('set + get 正常工作', () => {
        // TODO: set(1, { x: 10, y: 20 })，get(1) 返回相同对象
    });

    it('has 正确反映是否存在', () => {
        // TODO: 实现
    });

    it('remove 后 has 返回 false', () => {
        // TODO: 实现
    });

    it('getEntities 返回所有有此组件的实体ID', () => {
        // TODO: set 多个实体，验证 getEntities 包含所有
    });

    it('clear 清除所有数据', () => {
        // TODO: 实现
    });
});

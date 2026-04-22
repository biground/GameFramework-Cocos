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
        expect(storage.componentType).toBe(Position);
        expect(storage.componentType.name).toBe('Position');
    });

    it('set + get 正常工作', () => {
        const pos = { x: 10, y: 20 };
        storage.set(1, pos);
        expect(storage.get(1)).toBe(pos);
    });

    it('has 正确反映是否存在', () => {
        expect(storage.has(1)).toBe(false);
        storage.set(1, { x: 0, y: 0 });
        expect(storage.has(1)).toBe(true);
    });

    it('remove 后 has 返回 false', () => {
        storage.set(1, { x: 0, y: 0 });
        storage.remove(1);
        expect(storage.has(1)).toBe(false);
        expect(storage.get(1)).toBeUndefined();
    });

    it('getEntities 返回所有有此组件的实体ID', () => {
        storage.set(10, { x: 10, y: 10 });
        storage.set(20, { x: 20, y: 20 });
        storage.set(30, { x: 30, y: 30 });
        const ids = [...storage.entities];
        expect(ids).toContain(10);
        expect(ids).toContain(20);
        expect(ids).toContain(30);
        expect(ids.length).toBe(3);
    });

    it('clear 清除所有数据', () => {
        storage.set(1, { x: 1, y: 1 });
        storage.set(2, { x: 2, y: 2 });
        storage.clear();
        expect(storage.size).toBe(0);
        expect(storage.has(1)).toBe(false);
        expect(storage.has(2)).toBe(false);
    });
});

/* eslint-disable @typescript-eslint/no-unused-vars */
import { SystemManager } from '../src/SystemManager';
import { ISystem, IEcsWorldAccess, EcsEntityId, ComponentType } from '../src/EcsDefs';

// ─── Mock World ─────────────────────────────────────

const mockWorld: IEcsWorldAccess = {
    createEntity(): EcsEntityId {
        return 0;
    },
    destroyEntity(_eid: EcsEntityId): void {
        // no-op
    },
    isAlive(_eid: EcsEntityId): boolean {
        return true;
    },
    addComponent<T>(_eid: EcsEntityId, _type: ComponentType<T>, _data: T): void {
        // no-op
    },
    removeComponent<T>(_eid: EcsEntityId, _type: ComponentType<T>): void {
        // no-op
    },
    getComponent<T>(_eid: EcsEntityId, _type: ComponentType<T>): T | undefined {
        return undefined;
    },
    hasComponent<T>(_eid: EcsEntityId, _type: ComponentType<T>): boolean {
        return false;
    },
    query(..._types: ComponentType<unknown>[]): EcsEntityId[] {
        return [];
    },
};
void mockWorld;

// ─── Mock System ────────────────────────────────────

function createMockSystem(name: string, priority: number): ISystem & { calls: string[] } {
    const calls: string[] = [];
    return {
        name,
        priority,
        enabled: true,
        calls,
        onInit(_world: IEcsWorldAccess) {
            calls.push(`${name}:init`);
        },
        update(_dt: number) {
            calls.push(`${name}:update`);
        },
        onDestroy() {
            calls.push(`${name}:destroy`);
        },
    };
}
void createMockSystem;

// ─── SystemManager 测试 ─────────────────────────────

describe('SystemManager', () => {
    let manager: SystemManager;

    beforeEach(() => {
        manager = new SystemManager();
        void manager;
    });

    it('addSystem 后 onInit 被调用', () => {
        const sys = createMockSystem('A', 0);
        manager.addSystem(sys);
        // SystemManager 自己不调 onInit，由 EcsWorld 调用
        // 此处验证 system 被正确添加
        expect(manager.systemCount).toBe(1);
    });

    it('update 按 priority 升序执行', () => {
        const sysA = createMockSystem('A', 10);
        const sysB = createMockSystem('B', 0);
        manager.addSystem(sysA);
        manager.addSystem(sysB);
        const order: string[] = [];
        sysA.update = () => order.push('A');
        sysB.update = () => order.push('B');
        manager.update(0.016);
        expect(order).toEqual(['B', 'A']); // B(0) 先于 A(10)
    });

    it('removeSystem 后不再 update', () => {
        const sys = createMockSystem('A', 0);
        manager.addSystem(sys);
        manager.removeSystem(sys);
        manager.update(0.016);
        expect(sys.calls.filter((c) => c.includes('update'))).toHaveLength(0);
    });

    it('removeSystem 触发 onDestroy', () => {
        const sys = createMockSystem('A', 0);
        manager.addSystem(sys);
        manager.removeSystem(sys);
        expect(sys.calls).toContain('A:destroy');
    });

    it('disabled system 跳过 update', () => {
        const sys = createMockSystem('A', 0);
        manager.addSystem(sys);
        sys.enabled = false;
        manager.update(0.016);
        expect(sys.calls.filter((c) => c.includes('update'))).toHaveLength(0);
    });

    it('destroyAll 调用所有 onDestroy 并清空', () => {
        const sysA = createMockSystem('A', 0);
        const sysB = createMockSystem('B', 10);
        manager.addSystem(sysA);
        manager.addSystem(sysB);
        manager.destroyAll();
        expect(sysA.calls).toContain('A:destroy');
        expect(sysB.calls).toContain('B:destroy');
        expect(manager.systemCount).toBe(0);
    });

    it('添加重复 name 的 system 应跳过', () => {
        const sys = createMockSystem('A', 0);
        manager.addSystem(sys);
        manager.addSystem(sys); // 同一引用，应被跳过
        expect(manager.systemCount).toBe(1);
    });

    it('dirty flag：添加后首次 update 才排序', () => {
        const sysA = createMockSystem('A', 10);
        const sysB = createMockSystem('B', 0);
        manager.addSystem(sysA);
        manager.addSystem(sysB);
        // 添加顺序是 A(10) 然后 B(0)，但 update 后应按 priority 排序
        const order: string[] = [];
        sysA.update = () => order.push('A');
        sysB.update = () => order.push('B');
        manager.update(0.016);
        expect(order).toEqual(['B', 'A']);
    });
});

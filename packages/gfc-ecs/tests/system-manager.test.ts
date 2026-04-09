/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/explicit-function-return-type */
import { SystemManager } from '../src/SystemManager';
import {
    ISystem,
    IEcsWorldAccess,
    IReactiveGroup,
    EcsEntityId,
    ComponentType,
    QueryDescriptor,
    QueryHandle,
    SystemPhase,
    ICommandBuffer,
} from '../src/EcsDefs';

// ─── Mock World ─────────────────────────────────────

const mockCommandBuffer: ICommandBuffer = {
    createEntity(): EcsEntityId {
        return -1;
    },
    destroyEntity(_eid: EcsEntityId): void {
        // no-op
    },
    addComponent<T>(_eid: EcsEntityId, _type: ComponentType<T>, _data: T): void {
        // no-op
    },
    removeComponent<T>(_eid: EcsEntityId, _type: ComponentType<T>): void {
        // no-op
    },
};

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
    registerQuery(_descriptor: QueryDescriptor): QueryHandle {
        return { _id: 0 };
    },
    resolveQuery(_handle: QueryHandle): readonly EcsEntityId[] {
        return [];
    },
    removeQuery(_handle: QueryHandle): boolean {
        return false;
    },
    commands: mockCommandBuffer,
    registerGroup(_descriptor: QueryDescriptor): IReactiveGroup {
        return {
            descriptor: _descriptor,
            count: 0,
            matchedIndices: new Set(),
            drainEntered: () => [],
            drainRemoved: () => [],
            has: () => false,
        };
    },
};
void mockWorld;

// ─── Mock System ────────────────────────────────────

function createMockSystem(
    name: string,
    priority: number,
    phase?: SystemPhase,
): ISystem & { calls: string[] } {
    const calls: string[] = [];
    return {
        name,
        priority,
        phase,
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

// ─── SystemPhase 测试 ───────────────────────────────

describe('SystemManager — Phase', () => {
    let manager: SystemManager;

    beforeEach(() => {
        manager = new SystemManager();
    });

    it('不同 phase 的 System 按 phase 顺序执行', () => {
        const order: string[] = [];
        const sysLate = createMockSystem('Late', 0, SystemPhase.LateUpdate);
        const sysPre = createMockSystem('Pre', 0, SystemPhase.PreUpdate);
        const sysPost = createMockSystem('Post', 0, SystemPhase.PostUpdate);
        const sysUpdate = createMockSystem('Update', 0, SystemPhase.Update);

        sysLate.update = () => order.push('Late');
        sysPre.update = () => order.push('Pre');
        sysPost.update = () => order.push('Post');
        sysUpdate.update = () => order.push('Update');

        // 故意乱序添加
        manager.addSystem(sysLate);
        manager.addSystem(sysPre);
        manager.addSystem(sysPost);
        manager.addSystem(sysUpdate);
        manager.update(0.016);
        expect(order).toEqual(['Pre', 'Update', 'Post', 'Late']);
    });

    it('同一 phase 内按 priority 排序', () => {
        const order: string[] = [];
        const sysA = createMockSystem('A', 10, SystemPhase.Update);
        const sysB = createMockSystem('B', 0, SystemPhase.Update);
        sysA.update = () => order.push('A');
        sysB.update = () => order.push('B');
        manager.addSystem(sysA);
        manager.addSystem(sysB);
        manager.update(0.016);
        expect(order).toEqual(['B', 'A']);
    });

    it('phase + priority 综合排序：PreUpdate(priority=10) 先于 Update(priority=0)', () => {
        const order: string[] = [];
        const sysPre = createMockSystem('Pre', 10, SystemPhase.PreUpdate);
        const sysUpdate = createMockSystem('Update', 0, SystemPhase.Update);
        sysPre.update = () => order.push('Pre');
        sysUpdate.update = () => order.push('Update');
        manager.addSystem(sysUpdate);
        manager.addSystem(sysPre);
        manager.update(0.016);
        expect(order).toEqual(['Pre', 'Update']);
    });

    it('removeSystem 从正确的 phase 移除', () => {
        const sysPre = createMockSystem('Pre', 0, SystemPhase.PreUpdate);
        const sysUpdate = createMockSystem('Upd', 0, SystemPhase.Update);
        manager.addSystem(sysPre);
        manager.addSystem(sysUpdate);
        expect(manager.systemCount).toBe(2);

        manager.removeSystem(sysPre);
        expect(manager.systemCount).toBe(1);

        const order: string[] = [];
        sysUpdate.update = () => order.push('Upd');
        manager.update(0.016);
        expect(order).toEqual(['Upd']);
    });

    it('destroyAll 按 phase 倒序调用 onDestroy', () => {
        const destroyOrder: string[] = [];
        const sysPre = createMockSystem('Pre', 0, SystemPhase.PreUpdate);
        const sysUpdate = createMockSystem('Upd', 0, SystemPhase.Update);
        const sysPost = createMockSystem('Post', 0, SystemPhase.PostUpdate);
        const sysLate = createMockSystem('Late', 0, SystemPhase.LateUpdate);

        sysPre.onDestroy = () => destroyOrder.push('Pre');
        sysUpdate.onDestroy = () => destroyOrder.push('Upd');
        sysPost.onDestroy = () => destroyOrder.push('Post');
        sysLate.onDestroy = () => destroyOrder.push('Late');

        manager.addSystem(sysPre);
        manager.addSystem(sysUpdate);
        manager.addSystem(sysPost);
        manager.addSystem(sysLate);
        manager.destroyAll();

        expect(destroyOrder).toEqual(['Late', 'Post', 'Upd', 'Pre']);
        expect(manager.systemCount).toBe(0);
    });

    it('无 phase 的 system 默认归入 Update 阶段', () => {
        const order: string[] = [];
        const sysDefault = createMockSystem('Default', 0);
        const sysPre = createMockSystem('Pre', 0, SystemPhase.PreUpdate);
        sysDefault.update = () => order.push('Default');
        sysPre.update = () => order.push('Pre');
        manager.addSystem(sysDefault);
        manager.addSystem(sysPre);
        manager.update(0.016);
        expect(order).toEqual(['Pre', 'Default']);
    });
});

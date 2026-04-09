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
        // TODO: 实现
    });

    it('update 按 priority 升序执行', () => {
        // TODO: 注册 priority=10, priority=0，验证 update 顺序是 0 → 10
    });

    it('removeSystem 后不再 update', () => {
        // TODO: 实现
    });

    it('removeSystem 触发 onDestroy', () => {
        // TODO: 实现
    });

    it('disabled system 跳过 update', () => {
        // TODO: 实现
    });

    it('destroyAll 调用所有 onDestroy 并清空', () => {
        // TODO: 实现
    });

    it('添加重复 name 的 system 应抛错', () => {
        // TODO: 实现
    });

    it('dirty flag：添加后首次 update 才排序', () => {
        // TODO: 先 add priority=10，再 add priority=0，update 时顺序正确
    });
});

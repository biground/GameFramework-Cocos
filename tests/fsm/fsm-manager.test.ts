import { FsmState } from '@framework/fsm/FsmState';
import { FsmManager } from '@framework/fsm/FsmManager';
import { Fsm } from '@framework/fsm/Fsm';
import { GameModule } from '@framework/core/GameModule';
import { IFsm, IFsmState, Constructor } from '@framework/fsm/FsmDefs';

// ============ Test Helpers ============

/** 将 IFsm 转为 Fsm 并调用 start（start 不在接口上） */
function startFsm<T>(fsm: IFsm<T>, stateType: Constructor<IFsmState<T>>): void {
    (fsm as Fsm<T>).start(stateType);
}

class MockOwner {
    public tag = 'owner';
}

class IdleState extends FsmState<MockOwner> {
    public updateCount = 0;
    public lastDelta = 0;
    public destroyCalled = false;

    onUpdate(_fsm: IFsm<MockOwner>, deltaTime: number): void {
        this.updateCount++;
        this.lastDelta = deltaTime;
    }
    onDestroy(_fsm: IFsm<MockOwner>): void {
        this.destroyCalled = true;
    }
}

class WalkState extends FsmState<MockOwner> {
    public updateCount = 0;
    public destroyCalled = false;

    onUpdate(_fsm: IFsm<MockOwner>, _deltaTime: number): void {
        this.updateCount++;
    }
    onDestroy(_fsm: IFsm<MockOwner>): void {
        this.destroyCalled = true;
    }
}

// ============ FsmManager Tests ============

describe('FsmManager', () => {
    let manager: FsmManager;
    let owner: MockOwner;

    beforeEach(() => {
        manager = new FsmManager();
        owner = new MockOwner();
    });

    afterEach(() => {
        GameModule.shutdownAll();
    });

    // ---------- 模块元数据 ----------

    describe('模块元数据', () => {
        it('moduleName 应为 "FsmManager"', () => {
            expect(manager.moduleName).toBe('FsmManager');
        });

        it('priority 应为 110', () => {
            expect(manager.priority).toBe(110);
        });

        it('初始 fsmCount 应为 0', () => {
            expect(manager.fsmCount).toBe(0);
        });
    });

    // ---------- createFsm ----------

    describe('createFsm', () => {
        it('创建状态机后 fsmCount 应增加', () => {
            manager.createFsm('testFsm', owner, new IdleState());
            expect(manager.fsmCount).toBe(1);

            manager.createFsm('testFsm2', owner, new WalkState());
            expect(manager.fsmCount).toBe(2);
        });

        it('创建状态机应返回有效的 IFsm 实例', () => {
            const fsm = manager.createFsm('hero', owner, new IdleState(), new WalkState());
            expect(fsm).toBeDefined();
            expect(fsm.name).toBe('hero');
            expect(fsm.owner).toBe(owner);
        });

        it('重复同名状态机应抛出异常', () => {
            manager.createFsm('hero', owner, new IdleState());
            expect(() => {
                manager.createFsm('hero', owner, new WalkState());
            }).toThrow('[FsmManager] 已存在同名状态机: "hero"');
        });

        it('空状态列表应抛出异常', () => {
            expect(() => {
                manager.createFsm('empty', owner);
            }).toThrow('[FsmManager] 创建状态机 "empty" 时状态列表不能为空');
        });
    });

    // ---------- destroyFsm ----------

    describe('destroyFsm', () => {
        it('销毁已存在的状态机应返回 true', () => {
            manager.createFsm('hero', owner, new IdleState());
            expect(manager.destroyFsm('hero')).toBe(true);
            expect(manager.fsmCount).toBe(0);
        });

        it('销毁不存在的状态机应返回 false', () => {
            expect(manager.destroyFsm('nonexistent')).toBe(false);
        });

        it('销毁后不应再能获取该状态机', () => {
            manager.createFsm('hero', owner, new IdleState());
            manager.destroyFsm('hero');
            expect(manager.getFsm('hero')).toBeUndefined();
            expect(manager.hasFsm('hero')).toBe(false);
        });

        it('销毁时应调用状态机的 shutdown', () => {
            const idle = new IdleState();
            const fsm = manager.createFsm('hero', owner, idle);
            startFsm(fsm, IdleState as unknown as Constructor<IFsmState<MockOwner>>);

            manager.destroyFsm('hero');
            expect(idle.destroyCalled).toBe(true);
        });
    });

    // ---------- getFsm ----------

    describe('getFsm', () => {
        it('获取已存在的状态机应返回对应实例', () => {
            const fsm = manager.createFsm('hero', owner, new IdleState());
            expect(manager.getFsm('hero')).toBe(fsm);
        });

        it('获取不存在的状态机应返回 undefined', () => {
            expect(manager.getFsm('ghost')).toBeUndefined();
        });
    });

    // ---------- hasFsm ----------

    describe('hasFsm', () => {
        it('已创建的状态机应返回 true', () => {
            manager.createFsm('hero', owner, new IdleState());
            expect(manager.hasFsm('hero')).toBe(true);
        });

        it('未创建的状态机应返回 false', () => {
            expect(manager.hasFsm('hero')).toBe(false);
        });
    });

    // ---------- onUpdate ----------

    describe('onUpdate', () => {
        it('应驱动所有状态机的 update', () => {
            const idle1 = new IdleState();
            const idle2 = new IdleState();

            const fsm1 = manager.createFsm('fsm1', owner, idle1);
            const fsm2 = manager.createFsm('fsm2', owner, idle2);

            startFsm(fsm1, IdleState as unknown as Constructor<IFsmState<MockOwner>>);
            startFsm(fsm2, IdleState as unknown as Constructor<IFsmState<MockOwner>>);

            manager.onUpdate(0.016);

            expect(idle1.updateCount).toBe(1);
            expect(idle1.lastDelta).toBeCloseTo(0.016);
            expect(idle2.updateCount).toBe(1);
        });

        it('多次 update 应累计调用', () => {
            const idle = new IdleState();
            const fsm = manager.createFsm('hero', owner, idle);
            startFsm(fsm, IdleState as unknown as Constructor<IFsmState<MockOwner>>);

            manager.onUpdate(0.016);
            manager.onUpdate(0.033);
            manager.onUpdate(0.016);

            expect(idle.updateCount).toBe(3);
            expect(idle.lastDelta).toBeCloseTo(0.016);
        });

        it('未启动的状态机 update 不应抛出异常', () => {
            manager.createFsm('hero', owner, new IdleState());
            expect(() => manager.onUpdate(0.016)).not.toThrow();
        });
    });

    // ---------- onShutdown ----------

    describe('onShutdown', () => {
        it('应销毁所有状态机并清空计数', () => {
            const idle1 = new IdleState();
            const idle2 = new IdleState();

            const fsm1 = manager.createFsm('fsm1', owner, idle1);
            const fsm2 = manager.createFsm('fsm2', owner, idle2);

            startFsm(fsm1, IdleState as unknown as Constructor<IFsmState<MockOwner>>);
            startFsm(fsm2, IdleState as unknown as Constructor<IFsmState<MockOwner>>);

            manager.onShutdown();

            expect(manager.fsmCount).toBe(0);
            expect(idle1.destroyCalled).toBe(true);
            expect(idle2.destroyCalled).toBe(true);
        });

        it('shutdown 后不应再能获取任何状态机', () => {
            manager.createFsm('fsm1', owner, new IdleState());
            manager.createFsm('fsm2', owner, new WalkState());

            manager.onShutdown();

            expect(manager.getFsm('fsm1')).toBeUndefined();
            expect(manager.getFsm('fsm2')).toBeUndefined();
            expect(manager.hasFsm('fsm1')).toBe(false);
        });
    });

    // ---------- GameModule 集成 ----------

    describe('GameModule 集成', () => {
        it('注册到 GameModule 后应能正常获取', () => {
            GameModule.register(manager);
            const retrieved = GameModule.getModule<FsmManager>('FsmManager');
            expect(retrieved).toBe(manager);
        });

        it('通过 GameModule 注册后 createFsm 应正常工作', () => {
            GameModule.register(manager);
            const retrieved = GameModule.getModule<FsmManager>('FsmManager');

            const fsm = retrieved.createFsm('hero', owner, new IdleState());
            expect(fsm).toBeDefined();
            expect(retrieved.fsmCount).toBe(1);
        });

        it('GameModule.shutdownAll 应触发 FsmManager onShutdown', () => {
            const idle = new IdleState();
            GameModule.register(manager);

            const retrieved = GameModule.getModule<FsmManager>('FsmManager');
            const fsm = retrieved.createFsm('hero', owner, idle);
            startFsm(fsm, IdleState as unknown as Constructor<IFsmState<MockOwner>>);

            GameModule.shutdownAll();

            expect(idle.destroyCalled).toBe(true);
        });
    });
});

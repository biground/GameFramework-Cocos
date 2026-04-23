import { FsmState } from '@framework/fsm/FsmState';
import { Fsm } from '@framework/fsm/Fsm';
import { IFsm, IFsmState, Constructor } from '@framework/fsm/FsmDefs';

// ============ Test Helpers ============

class MockOwner {
    public tag = 'owner';
}

class IdleState extends FsmState<MockOwner> {
    public initCalled = false;
    public enterCalled = false;
    public leaveCalled = false;
    public destroyCalled = false;
    public updateCount = 0;
    public lastDelta = 0;

    onInit(_fsm: IFsm<MockOwner>): void {
        this.initCalled = true;
    }
    onEnter(_fsm: IFsm<MockOwner>): void {
        this.enterCalled = true;
    }
    onUpdate(_fsm: IFsm<MockOwner>, deltaTime: number): void {
        this.updateCount++;
        this.lastDelta = deltaTime;
    }
    onLeave(_fsm: IFsm<MockOwner>): void {
        this.leaveCalled = true;
    }
    onDestroy(_fsm: IFsm<MockOwner>): void {
        this.destroyCalled = true;
    }
}

class WalkState extends FsmState<MockOwner> {
    public enterCalled = false;
    public leaveCalled = false;
    public destroyCalled = false;

    onEnter(_fsm: IFsm<MockOwner>): void {
        this.enterCalled = true;
    }
    onLeave(_fsm: IFsm<MockOwner>): void {
        this.leaveCalled = true;
    }
    onDestroy(_fsm: IFsm<MockOwner>): void {
        this.destroyCalled = true;
    }
}

/** 在 onEnter 中试图 changeState —— 用于测试反递归保护 */
class RecursiveState extends FsmState<MockOwner> {
    onEnter(fsm: IFsm<MockOwner>): void {
        fsm.changeState(IdleState as unknown as Constructor<IFsmState<MockOwner>>);
    }
}

/** 在 onLeave 中试图 changeState —— 用于测试反递归保护 */
class RecursiveLeaveState extends FsmState<MockOwner> {
    onLeave(fsm: IFsm<MockOwner>): void {
        fsm.changeState(IdleState as unknown as Constructor<IFsmState<MockOwner>>);
    }
}

/** 纯默认实现，不覆盖任何方法 */
class EmptyState extends FsmState<MockOwner> {}

// ============ FsmState Tests ============

describe('FsmState', () => {
    it('应该提供默认的空生命周期实现', () => {
        const state = new EmptyState();
        const mockFsm = {} as IFsm<MockOwner>;

        // 调用不应抛出异常
        expect(() => state.onInit(mockFsm)).not.toThrow();
        expect(() => state.onEnter(mockFsm)).not.toThrow();
        expect(() => state.onUpdate(mockFsm, 0.016)).not.toThrow();
        expect(() => state.onLeave(mockFsm)).not.toThrow();
        expect(() => state.onDestroy(mockFsm)).not.toThrow();
    });

    it('changeState 应该委托给 fsm.changeState', () => {
        class TestState extends FsmState<MockOwner> {
            public doChange(fsm: IFsm<MockOwner>): void {
                this.changeState(fsm, IdleState as unknown as Constructor<IFsmState<MockOwner>>);
            }
        }
        const mockFsm = { changeState: jest.fn() } as unknown as IFsm<MockOwner>;
        const state = new TestState();
        state.doChange(mockFsm);
        expect(mockFsm.changeState as jest.Mock).toHaveBeenCalledWith(IdleState);
    });
});

// ============ Fsm Tests ============

describe('Fsm', () => {
    let owner: MockOwner;
    let idle: IdleState;
    let walk: WalkState;

    beforeEach(() => {
        owner = new MockOwner();
        idle = new IdleState();
        walk = new WalkState();
    });

    // ---- constructor 验证 ----
    describe('constructor', () => {
        it('应该正确创建 FSM 并初始化所有状态', () => {
            const fsm = new Fsm('test', owner, [idle, walk]);
            expect(fsm.name).toBe('test');
            expect(fsm.owner).toBe(owner);
            expect(fsm.currentState).toBeNull();
            expect(fsm.isDestroyed).toBe(false);
            expect(idle.initCalled).toBe(true);
        });

        it('name 为空时应该抛出异常', () => {
            expect(() => new Fsm('', owner, [idle])).toThrow('[FSM]');
        });

        it('owner 为 null 时应该抛出异常', () => {
            expect(() => new Fsm('test', null as unknown as MockOwner, [idle])).toThrow('[FSM]');
        });

        it('owner 为 undefined 时应该抛出异常', () => {
            expect(() => new Fsm('test', undefined as unknown as MockOwner, [idle])).toThrow(
                '[FSM]',
            );
        });

        it('states 为空数组时应该抛出异常', () => {
            expect(() => new Fsm('test', owner, [])).toThrow('[FSM]');
        });

        it('存在重复状态类型时应该抛出异常', () => {
            const idle2 = new IdleState();
            expect(() => new Fsm('test', owner, [idle, idle2])).toThrow('[FSM]');
        });
    });

    // ---- start ----
    describe('start', () => {
        it('应该启动 FSM 并进入初始状态', () => {
            const fsm = new Fsm('test', owner, [idle, walk]);
            fsm.start(IdleState as unknown as Constructor<IFsmState<MockOwner>>);
            expect(fsm.currentState).toBe(idle);
            expect(idle.enterCalled).toBe(true);
        });

        it('已启动后再次 start 应该抛出异常', () => {
            const fsm = new Fsm('test', owner, [idle, walk]);
            fsm.start(IdleState as unknown as Constructor<IFsmState<MockOwner>>);
            expect(() =>
                fsm.start(WalkState as unknown as Constructor<IFsmState<MockOwner>>),
            ).toThrow('[FSM]');
        });

        it('已销毁后 start 应该抛出异常', () => {
            const fsm = new Fsm('test', owner, [idle, walk]);
            fsm.shutdown();
            expect(() =>
                fsm.start(IdleState as unknown as Constructor<IFsmState<MockOwner>>),
            ).toThrow('[FSM]');
        });

        it('状态类型不存在时 start 应该抛出异常', () => {
            const fsm = new Fsm('test', owner, [idle]);
            expect(() =>
                fsm.start(WalkState as unknown as Constructor<IFsmState<MockOwner>>),
            ).toThrow('[FSM]');
        });
    });

    // ---- changeState ----
    describe('changeState', () => {
        it('应该正确触发 onLeave 和 onEnter', () => {
            const fsm = new Fsm('test', owner, [idle, walk]);
            fsm.start(IdleState as unknown as Constructor<IFsmState<MockOwner>>);

            fsm.changeState(WalkState as unknown as Constructor<IFsmState<MockOwner>>);

            expect(idle.leaveCalled).toBe(true);
            expect(walk.enterCalled).toBe(true);
            expect(fsm.currentState).toBe(walk);
        });

        it('未启动时 changeState 应该抛出异常', () => {
            const fsm = new Fsm('test', owner, [idle, walk]);
            expect(() =>
                fsm.changeState(WalkState as unknown as Constructor<IFsmState<MockOwner>>),
            ).toThrow('[FSM]');
        });

        it('目标状态不存在时应该抛出异常', () => {
            const fsm = new Fsm('test', owner, [idle]);
            fsm.start(IdleState as unknown as Constructor<IFsmState<MockOwner>>);
            expect(() =>
                fsm.changeState(WalkState as unknown as Constructor<IFsmState<MockOwner>>),
            ).toThrow('[FSM]');
        });

        it('onEnter 中递归调用 changeState 应延迟执行（重入保护）', () => {
            const recursive = new RecursiveState();
            const fsm = new Fsm('test', owner, [idle, recursive]);
            fsm.start(IdleState as unknown as Constructor<IFsmState<MockOwner>>);

            // RecursiveState.onEnter 中调用 changeState(IdleState)
            // 不再抛出异常，而是延迟到当前转换完成后执行
            fsm.changeState(RecursiveState as unknown as Constructor<IFsmState<MockOwner>>);
            // 最终状态应为 IdleState（pending transition 已执行）
            expect(fsm.currentState).toBeInstanceOf(IdleState);
        });

        it('onLeave 中递归调用 changeState 应延迟执行（重入保护）', () => {
            const recursiveLeave = new RecursiveLeaveState();
            const fsm = new Fsm('test', owner, [idle, recursiveLeave]);
            fsm.start(RecursiveLeaveState as unknown as Constructor<IFsmState<MockOwner>>);

            // RecursiveLeaveState.onLeave 中调用 changeState(IdleState)
            // 不再抛出异常，而是延迟到当前转换完成后执行
            fsm.changeState(IdleState as unknown as Constructor<IFsmState<MockOwner>>);
            // 最终状态应为 IdleState
            expect(fsm.currentState).toBeInstanceOf(IdleState);
        });
    });

    // ---- update ----
    describe('update', () => {
        it('应该驱动当前状态的 onUpdate', () => {
            const fsm = new Fsm('test', owner, [idle, walk]);
            fsm.start(IdleState as unknown as Constructor<IFsmState<MockOwner>>);

            fsm.update(0.016);
            expect(idle.updateCount).toBe(1);
            expect(idle.lastDelta).toBeCloseTo(0.016);

            fsm.update(0.033);
            expect(idle.updateCount).toBe(2);
        });

        it('未启动时 update 不应抛出异常（no-op）', () => {
            const fsm = new Fsm('test', owner, [idle]);
            expect(() => fsm.update(0.016)).not.toThrow();
            expect(idle.updateCount).toBe(0);
        });

        it('已销毁后 update 不应抛出异常（no-op）', () => {
            const fsm = new Fsm('test', owner, [idle]);
            fsm.start(IdleState as unknown as Constructor<IFsmState<MockOwner>>);
            fsm.shutdown();
            const countBefore = idle.updateCount;
            expect(() => fsm.update(0.016)).not.toThrow();
            expect(idle.updateCount).toBe(countBefore);
        });
    });

    // ---- shutdown ----
    describe('shutdown', () => {
        it('应该调用所有状态的 onDestroy 并标记销毁', () => {
            const fsm = new Fsm('test', owner, [idle, walk]);
            fsm.start(IdleState as unknown as Constructor<IFsmState<MockOwner>>);
            fsm.shutdown();

            expect(idle.destroyCalled).toBe(true);
            expect(walk.destroyCalled).toBe(true);
            expect(fsm.isDestroyed).toBe(true);
            expect(fsm.currentState).toBeNull();
        });

        it('shutdown 前应先调用当前状态的 onLeave', () => {
            const fsm = new Fsm('test', owner, [idle, walk]);
            fsm.start(IdleState as unknown as Constructor<IFsmState<MockOwner>>);
            fsm.shutdown();

            expect(idle.leaveCalled).toBe(true);
        });

        it('已销毁后再次 shutdown 不应抛出异常（no-op）', () => {
            const fsm = new Fsm('test', owner, [idle]);
            fsm.shutdown();
            expect(() => fsm.shutdown()).not.toThrow();
        });
    });

    // ---- hasState ----
    describe('hasState', () => {
        it('包含的状态应返回 true', () => {
            const fsm = new Fsm('test', owner, [idle, walk]);
            expect(fsm.hasState(IdleState as unknown as Constructor<IFsmState<MockOwner>>)).toBe(
                true,
            );
        });

        it('不包含的状态应返回 false', () => {
            const fsm = new Fsm('test', owner, [idle]);
            expect(fsm.hasState(WalkState as unknown as Constructor<IFsmState<MockOwner>>)).toBe(
                false,
            );
        });
    });

    // ---- 数据存取（Blackboard） ----
    describe('blackboard data', () => {
        it('setData / getData 应正确存取数据', () => {
            const fsm = new Fsm('test', owner, [idle]);
            fsm.setData('hp', 100);
            expect(fsm.getData<number>('hp')).toBe(100);
        });

        it('getData 不存在的 key 应返回 undefined', () => {
            const fsm = new Fsm('test', owner, [idle]);
            expect(fsm.getData('missing')).toBeUndefined();
        });

        it('removeData 应正确移除数据', () => {
            const fsm = new Fsm('test', owner, [idle]);
            fsm.setData('hp', 100);
            expect(fsm.removeData('hp')).toBe(true);
            expect(fsm.getData('hp')).toBeUndefined();
        });

        it('removeData 不存在的 key 应返回 false', () => {
            const fsm = new Fsm('test', owner, [idle]);
            expect(fsm.removeData('nope')).toBe(false);
        });
    });
});

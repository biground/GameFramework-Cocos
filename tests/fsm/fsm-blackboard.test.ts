import { FsmState } from '@framework/fsm/FsmState';
import { Fsm } from '@framework/fsm/Fsm';
import { IFsm, IFsmState, Constructor } from '@framework/fsm/FsmDefs';

// ============ 黑板类型定义 ============

interface HeroBlackboard {
    hp: number;
    mp: number;
    targetId: string | null;
}

// ============ 测试用状态 ============

class MockOwner {
    public tag = 'owner';
}

/** 使用泛型黑板的状态 */
class TypedIdleState extends FsmState<MockOwner, HeroBlackboard> {
    public lastHp = -1;

    onEnter(fsm: IFsm<MockOwner, HeroBlackboard>): void {
        this.lastHp = fsm.blackboard.hp;
    }

    onUpdate(fsm: IFsm<MockOwner, HeroBlackboard>, _deltaTime: number): void {
        this.lastHp = fsm.blackboard.hp;
    }
}

class TypedAttackState extends FsmState<MockOwner, HeroBlackboard> {
    public enteredWithTarget: string | null = null;

    onEnter(fsm: IFsm<MockOwner, HeroBlackboard>): void {
        this.enteredWithTarget = fsm.blackboard.targetId;
    }
}

/** 不使用泛型黑板的状态（向后兼容） */
class LegacyIdleState extends FsmState<MockOwner> {
    public initCalled = false;

    onInit(_fsm: IFsm<MockOwner>): void {
        this.initCalled = true;
    }
}

// ============ 测试 ============

describe('FSM Blackboard 泛型支持', () => {
    let owner: MockOwner;

    beforeEach(() => {
        owner = new MockOwner();
    });

    // ---- 创建带 typed blackboard 的 FSM ----
    describe('创建带 typed blackboard 的 FSM', () => {
        it('应该能通过 create 传入初始 blackboard', () => {
            const idleState = new TypedIdleState();
            const attackState = new TypedAttackState();
            const bb: HeroBlackboard = { hp: 100, mp: 50, targetId: null };

            const fsm = new Fsm<MockOwner, HeroBlackboard>(
                'hero',
                owner,
                [idleState, attackState],
                bb,
            );

            expect(fsm.blackboard).toBe(bb);
            expect(fsm.blackboard.hp).toBe(100);
            expect(fsm.blackboard.mp).toBe(50);
            expect(fsm.blackboard.targetId).toBeNull();
        });

        it('不传 blackboard 时应使用空对象作为默认值', () => {
            const idleState = new TypedIdleState();
            const fsm = new Fsm<MockOwner, HeroBlackboard>('hero', owner, [idleState]);

            expect(fsm.blackboard).toBeDefined();
            expect(typeof fsm.blackboard).toBe('object');
        });
    });

    // ---- blackboard getter 返回正确类型 ----
    describe('blackboard getter', () => {
        it('应返回传入的 blackboard 引用', () => {
            const bb: HeroBlackboard = { hp: 200, mp: 100, targetId: 'enemy-1' };
            const fsm = new Fsm<MockOwner, HeroBlackboard>(
                'hero',
                owner,
                [new TypedIdleState()],
                bb,
            );

            const result = fsm.blackboard;
            expect(result).toBe(bb);
            expect(result.hp).toBe(200);
            expect(result.targetId).toBe('enemy-1');
        });
    });

    // ---- setBlackboard 更新黑板 ----
    describe('setBlackboard', () => {
        it('应该替换整个黑板对象', () => {
            const bb1: HeroBlackboard = { hp: 100, mp: 50, targetId: null };
            const bb2: HeroBlackboard = { hp: 200, mp: 100, targetId: 'boss' };

            const fsm = new Fsm<MockOwner, HeroBlackboard>(
                'hero',
                owner,
                [new TypedIdleState()],
                bb1,
            );
            expect(fsm.blackboard.hp).toBe(100);

            fsm.setBlackboard(bb2);
            expect(fsm.blackboard).toBe(bb2);
            expect(fsm.blackboard.hp).toBe(200);
            expect(fsm.blackboard.targetId).toBe('boss');
        });
    });

    // ---- 黑板与旧 getData/setData 共存互不干扰 ----
    describe('黑板与 getData/setData 共存', () => {
        it('setData/getData 不应影响 blackboard', () => {
            const bb: HeroBlackboard = { hp: 100, mp: 50, targetId: null };
            const fsm = new Fsm<MockOwner, HeroBlackboard>(
                'hero',
                owner,
                [new TypedIdleState()],
                bb,
            );

            // 通过旧 API 设置数据
            fsm.setData('hp', 999);

            // blackboard 不受影响
            expect(fsm.blackboard.hp).toBe(100);
            // 旧 API 正常工作
            expect(fsm.getData<number>('hp')).toBe(999);
        });

        it('blackboard 修改不应影响 getData', () => {
            const bb: HeroBlackboard = { hp: 100, mp: 50, targetId: null };
            const fsm = new Fsm<MockOwner, HeroBlackboard>(
                'hero',
                owner,
                [new TypedIdleState()],
                bb,
            );

            fsm.setData('score', 42);
            bb.hp = 999;

            expect(fsm.blackboard.hp).toBe(999);
            expect(fsm.getData<number>('score')).toBe(42);
        });
    });

    // ---- 状态中访问 fsm.blackboard ----
    describe('状态中访问 fsm.blackboard', () => {
        it('状态 onEnter 中应能读取 blackboard', () => {
            const bb: HeroBlackboard = { hp: 100, mp: 50, targetId: null };
            const idleState = new TypedIdleState();
            const fsm = new Fsm<MockOwner, HeroBlackboard>('hero', owner, [idleState], bb);

            fsm.start(
                TypedIdleState as unknown as Constructor<IFsmState<MockOwner, HeroBlackboard>>,
            );

            expect(idleState.lastHp).toBe(100);
        });

        it('状态 onUpdate 中应能读取最新 blackboard', () => {
            const bb: HeroBlackboard = { hp: 100, mp: 50, targetId: null };
            const idleState = new TypedIdleState();
            const fsm = new Fsm<MockOwner, HeroBlackboard>('hero', owner, [idleState], bb);

            fsm.start(
                TypedIdleState as unknown as Constructor<IFsmState<MockOwner, HeroBlackboard>>,
            );
            bb.hp = 75;
            fsm.update(0.016);

            expect(idleState.lastHp).toBe(75);
        });

        it('切换状态后新状态应能读取 blackboard', () => {
            const bb: HeroBlackboard = { hp: 100, mp: 50, targetId: 'enemy-1' };
            const idleState = new TypedIdleState();
            const attackState = new TypedAttackState();
            const fsm = new Fsm<MockOwner, HeroBlackboard>(
                'hero',
                owner,
                [idleState, attackState],
                bb,
            );

            fsm.start(
                TypedIdleState as unknown as Constructor<IFsmState<MockOwner, HeroBlackboard>>,
            );
            fsm.changeState(
                TypedAttackState as unknown as Constructor<IFsmState<MockOwner, HeroBlackboard>>,
            );

            expect(attackState.enteredWithTarget).toBe('enemy-1');
        });
    });

    // ---- 向后兼容 ----
    describe('向后兼容', () => {
        it('不传 TBlackboard 的 FSM 应该正常工作', () => {
            const legacyState = new LegacyIdleState();
            const fsm = new Fsm('legacy', owner, [legacyState]);

            expect(fsm.blackboard).toBeDefined();
            expect(legacyState.initCalled).toBe(true);
        });

        it('旧版 FsmState<T> 不传 TBlackboard 应保持兼容', () => {
            const legacyState = new LegacyIdleState();
            const fsm = new Fsm('legacy', owner, [legacyState]);

            fsm.start(LegacyIdleState as unknown as Constructor<IFsmState<MockOwner>>);
            expect(fsm.currentState).toBe(legacyState);
        });
    });
});

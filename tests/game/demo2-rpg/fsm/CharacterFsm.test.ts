/**
 * 角色 FSM 状态测试
 *
 * 测试 4 个角色状态的生命周期与切换逻辑。
 */
import { Fsm } from '@framework/fsm/Fsm';
import { EventManager } from '@framework/event/EventManager';
import { CharacterState } from '@game/demo2-rpg/data/RpgGameData';
import { ICharacterBlackboard, CharacterFsmDataKeys } from '@game/demo2-rpg/fsm/CharacterFsmDefs';
import { CharIdleState } from '@game/demo2-rpg/fsm/character/CharIdleState';
import { CharActingState } from '@game/demo2-rpg/fsm/character/CharActingState';
import { CharStunnedState } from '@game/demo2-rpg/fsm/character/CharStunnedState';
import { CharDeadState } from '@game/demo2-rpg/fsm/character/CharDeadState';
import { RpgEvents } from '@game/demo2-rpg/events/RpgEvents';

// ─── 辅助函数 ──────────────────────────────────────────

/** 创建默认角色状态数据 */
function createCharacterState(overrides?: Partial<CharacterState>): CharacterState {
    return {
        id: 1,
        name: '勇者',
        maxHp: 100,
        hp: 100,
        maxMp: 50,
        mp: 50,
        atk: 20,
        def: 10,
        spd: 15,
        skills: [1],
        level: 1,
        exp: 0,
        isAlive: true,
        group: 'player',
        buffs: [],
        ...overrides,
    };
}

/** 创建黑板、FSM 并启动到指定状态 */
function createCharacterFsm(charOverrides?: Partial<CharacterState>, stunRounds = 0) {
    const eventManager = new EventManager();
    eventManager.onInit();

    const characterState = createCharacterState(charOverrides);

    const blackboard: ICharacterBlackboard = {
        characterId: characterState.id,
        characterState,
        eventManager,
        stunRounds,
    };

    const fsm = new Fsm<ICharacterBlackboard>(`char_fsm_${characterState.id}`, blackboard, [
        new CharIdleState(),
        new CharActingState(),
        new CharStunnedState(),
        new CharDeadState(),
    ]);

    fsm.setData(CharacterFsmDataKeys.BLACKBOARD, blackboard);

    return { fsm, blackboard, eventManager, characterState };
}

// ─── 测试 ──────────────────────────────────────────────

describe('CharacterFsm', () => {
    // ─── CharIdleState ─────────────────────────────────

    describe('CharIdleState', () => {
        it('进入空闲状态后，角色保持 isAlive', () => {
            const { fsm, characterState } = createCharacterFsm();
            fsm.start(CharIdleState);

            expect(fsm.currentState).toBeInstanceOf(CharIdleState);
            expect(characterState.isAlive).toBe(true);
        });

        it('HP<=0 时切换到 Dead', () => {
            const { fsm, characterState } = createCharacterFsm({ hp: 0 });
            fsm.start(CharIdleState);

            // onUpdate 检测 HP
            fsm.update(0.016);

            expect(fsm.currentState).toBeInstanceOf(CharDeadState);
            expect(characterState.isAlive).toBe(false);
        });
    });

    // ─── CharActingState ───────────────────────────────

    describe('CharActingState', () => {
        it('进入行动状态', () => {
            const { fsm } = createCharacterFsm();
            fsm.start(CharActingState);

            expect(fsm.currentState).toBeInstanceOf(CharActingState);
        });

        it('行动完成后回到 Idle', () => {
            const { fsm } = createCharacterFsm();
            fsm.start(CharActingState);

            // onUpdate 中行动完成 → 切换回 Idle
            fsm.update(0.016);

            expect(fsm.currentState).toBeInstanceOf(CharIdleState);
        });

        it('行动中 HP<=0 切换到 Dead', () => {
            const { fsm, characterState } = createCharacterFsm();
            fsm.start(CharActingState);

            // 在 update 前将 HP 设为 0（模拟反击致死）
            characterState.hp = 0;
            fsm.update(0.016);

            expect(fsm.currentState).toBeInstanceOf(CharDeadState);
        });
    });

    // ─── CharStunnedState ──────────────────────────────

    describe('CharStunnedState', () => {
        it('进入眩晕状态', () => {
            const { fsm } = createCharacterFsm(undefined, 2);
            fsm.start(CharStunnedState);

            expect(fsm.currentState).toBeInstanceOf(CharStunnedState);
        });

        it('眩晕计数递减，结束后回到 Idle', () => {
            const { fsm, blackboard } = createCharacterFsm(undefined, 1);
            fsm.start(CharStunnedState);

            // stunRounds=1 → onUpdate 递减到 0 → 切换到 Idle
            fsm.update(0.016);

            expect(blackboard.stunRounds).toBe(0);
            expect(fsm.currentState).toBeInstanceOf(CharIdleState);
        });

        it('多回合眩晕逐步递减', () => {
            const { fsm, blackboard } = createCharacterFsm(undefined, 3);
            fsm.start(CharStunnedState);

            // 第 1 次 update: 3 → 2
            fsm.update(0.016);
            expect(blackboard.stunRounds).toBe(2);
            expect(fsm.currentState).toBeInstanceOf(CharStunnedState);

            // 第 2 次 update: 2 → 1
            fsm.update(0.016);
            expect(blackboard.stunRounds).toBe(1);
            expect(fsm.currentState).toBeInstanceOf(CharStunnedState);

            // 第 3 次 update: 1 → 0 → Idle
            fsm.update(0.016);
            expect(blackboard.stunRounds).toBe(0);
            expect(fsm.currentState).toBeInstanceOf(CharIdleState);
        });

        it('眩晕中 HP<=0 切换到 Dead', () => {
            const { fsm, characterState } = createCharacterFsm(undefined, 2);
            fsm.start(CharStunnedState);

            characterState.hp = 0;
            fsm.update(0.016);

            expect(fsm.currentState).toBeInstanceOf(CharDeadState);
        });
    });

    // ─── CharDeadState ─────────────────────────────────

    describe('CharDeadState', () => {
        it('进入死亡状态，标记 isAlive = false', () => {
            const { fsm, characterState } = createCharacterFsm();
            fsm.start(CharDeadState);

            expect(fsm.currentState).toBeInstanceOf(CharDeadState);
            expect(characterState.isAlive).toBe(false);
        });

        it('死亡状态是终态，onUpdate 不切换', () => {
            const { fsm } = createCharacterFsm();
            fsm.start(CharDeadState);

            fsm.update(0.016);
            fsm.update(0.016);

            expect(fsm.currentState).toBeInstanceOf(CharDeadState);
        });

        it('死亡状态发出 CHARACTER_DEAD 事件', () => {
            const { fsm, eventManager, characterState } = createCharacterFsm();
            const handler = jest.fn();
            eventManager.on(RpgEvents.CHARACTER_DEAD, handler);

            fsm.start(CharDeadState);

            expect(handler).toHaveBeenCalledWith({
                characterId: characterState.id,
                group: characterState.group,
            });
        });
    });

    // ─── 状态间切换正确性 ──────────────────────────────

    describe('状态间切换正确性', () => {
        it('Idle → Acting → Idle 完整流程', () => {
            const { fsm } = createCharacterFsm();
            fsm.start(CharIdleState);
            expect(fsm.currentState).toBeInstanceOf(CharIdleState);

            // 手动切换到 Acting
            fsm.changeState(CharActingState);
            expect(fsm.currentState).toBeInstanceOf(CharActingState);

            // 行动完成 → 回到 Idle
            fsm.update(0.016);
            expect(fsm.currentState).toBeInstanceOf(CharIdleState);
        });

        it('Idle → Stunned → Idle 完整流程', () => {
            const { fsm, blackboard } = createCharacterFsm(undefined, 1);
            fsm.start(CharIdleState);

            // 切换到 Stunned
            fsm.changeState(CharStunnedState);
            expect(fsm.currentState).toBeInstanceOf(CharStunnedState);

            // 眩晕结束 → 回到 Idle
            fsm.update(0.016);
            expect(blackboard.stunRounds).toBe(0);
            expect(fsm.currentState).toBeInstanceOf(CharIdleState);
        });

        it('任意状态 HP<=0 → Dead', () => {
            const { fsm, characterState } = createCharacterFsm();
            fsm.start(CharIdleState);

            characterState.hp = 0;
            fsm.update(0.016);
            expect(fsm.currentState).toBeInstanceOf(CharDeadState);
        });
    });
});

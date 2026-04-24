/**
 * 战斗 FSM 状态机单元测试
 *
 * 测试 6 个战斗状态的生命周期、状态切换、事件发射和边界条件。
 */

import { IFsm, Constructor, IFsmState } from '@framework/fsm/FsmDefs';
import { IBattleBlackboard } from '@game/demo2-rpg/fsm/BattleFsmDefs';
import { RoundStartState } from '@game/demo2-rpg/fsm/battle/RoundStartState';
import { SelectActionState } from '@game/demo2-rpg/fsm/battle/SelectActionState';
import { ExecuteActionState } from '@game/demo2-rpg/fsm/battle/ExecuteActionState';
import { RoundEndState } from '@game/demo2-rpg/fsm/battle/RoundEndState';
import { VictoryState } from '@game/demo2-rpg/fsm/battle/VictoryState';
import { DefeatState } from '@game/demo2-rpg/fsm/battle/DefeatState';
import { BattleSystem } from '@game/demo2-rpg/systems/BattleSystem';
import { BuffSystem } from '@game/demo2-rpg/systems/BuffSystem';
import { EnemyAI } from '@game/demo2-rpg/systems/EnemyAI';
import { RpgGameData, CharacterState, BuffType } from '@game/demo2-rpg/data/RpgGameData';
import { SkillConfigRow, SKILL_DATA } from '@game/demo2-rpg/data/SkillConfigRow';
import { MonsterConfigRow, MONSTER_DATA } from '@game/demo2-rpg/data/MonsterConfigRow';
import { EventKey } from '@framework/event/EventDefs';

// ─── 测试辅助 ──────────────────────────────────────────

/** 加载技能配置表 */
function loadSkillTable(): SkillConfigRow[] {
    return SKILL_DATA.map((raw) => {
        const row = new SkillConfigRow();
        row.parseRow(raw);
        return row;
    });
}

/** 加载怪物配置表 */
function loadMonsterTable(): MonsterConfigRow[] {
    return MONSTER_DATA.map((raw) => {
        const row = new MonsterConfigRow();
        row.parseRow(raw);
        return row;
    });
}

/** 创建一个玩家角色 */
function makePlayer(overrides: Partial<CharacterState> = {}): CharacterState {
    return {
        id: 1,
        name: '战士',
        maxHp: 100,
        hp: 100,
        maxMp: 50,
        mp: 50,
        atk: 20,
        def: 10,
        spd: 10,
        skills: [1, 2],
        level: 1,
        exp: 0,
        isAlive: true,
        group: 'player',
        buffs: [],
        ...overrides,
    };
}

/** 创建一个敌方角色 */
function makeEnemy(overrides: Partial<CharacterState> = {}): CharacterState {
    return {
        id: 100,
        name: '史莱姆',
        maxHp: 50,
        hp: 50,
        maxMp: 20,
        mp: 20,
        atk: 8,
        def: 3,
        spd: 5,
        skills: [1],
        level: 1,
        exp: 0,
        isAlive: true,
        group: 'enemy',
        buffs: [],
        ...overrides,
    };
}

/** 记录 changeState 调用的 mock FSM */
function createMockFsm(bb: IBattleBlackboard): {
    fsm: IFsm<IBattleBlackboard, IBattleBlackboard>;
    lastChangedState: Constructor<IFsmState<IBattleBlackboard, IBattleBlackboard>> | null;
} {
    const data = new Map<string, unknown>();

    const tracker = {
        lastChangedState: null as Constructor<
            IFsmState<IBattleBlackboard, IBattleBlackboard>
        > | null,
    };

    const fsm: IFsm<IBattleBlackboard, IBattleBlackboard> = {
        name: 'battle_fsm_test',
        owner: bb,
        currentState: null,
        isDestroyed: false,
        blackboard: bb,
        changeState<TState extends IFsmState<IBattleBlackboard, IBattleBlackboard>>(
            stateType: Constructor<TState>,
        ): void {
            tracker.lastChangedState = stateType as Constructor<
                IFsmState<IBattleBlackboard, IBattleBlackboard>
            >;
        },
        getData<V>(key: string): V | undefined {
            return data.get(key) as V | undefined;
        },
        setData<V>(key: string, value: V): void {
            data.set(key, value);
        },
        removeData(key: string): boolean {
            return data.delete(key);
        },
        hasState(): boolean {
            return true;
        },
        setBlackboard(): void {
            // mock: 不实际设置
        },
        start(): void {
            // mock: 不实际启动
        },
    };

    return {
        fsm,
        ...tracker,
        get lastChangedState() {
            return tracker.lastChangedState;
        },
    };
}

/** 创建 mock eventManager */
function createMockEventManager(): {
    eventManager: IBattleBlackboard['eventManager'];
    emittedEvents: Array<{ key: string; data: unknown }>;
} {
    const emittedEvents: Array<{ key: string; data: unknown }> = [];
    const eventManager: IBattleBlackboard['eventManager'] = {
        on: jest.fn(),
        once: jest.fn(),
        off: jest.fn(),
        offAll: jest.fn(),
        offByCaller: jest.fn(),
        emit: jest.fn(((key: EventKey<unknown>, ...args: unknown[]) => {
            emittedEvents.push({ key: key.description, data: args[0] });
        }) as IBattleBlackboard['eventManager']['emit']),
    };
    return { eventManager, emittedEvents };
}

/** 创建 mock audioManager */
function createMockAudioManager(): IBattleBlackboard['audioManager'] {
    return {
        setAudioPlayer: jest.fn(),
        playMusic: jest.fn(),
        stopMusic: jest.fn(),
        pauseMusic: jest.fn(),
        resumeMusic: jest.fn(),
        playSound: jest.fn(),
        stopSound: jest.fn(),
        stopAllSounds: jest.fn(),
        masterVolume: 1,
        musicVolume: 1,
        soundVolume: 1,
        isMuted: false,
        setMasterVolume: jest.fn(),
        setMusicVolume: jest.fn(),
        setSoundVolume: jest.fn(),
        setMuted: jest.fn(),
    } as unknown as IBattleBlackboard['audioManager'];
}

/** 创建默认黑板 */
function createBlackboard(overrides: Partial<IBattleBlackboard> = {}): IBattleBlackboard {
    const buffSystem = new BuffSystem();
    const battleSystem = new BattleSystem(buffSystem);
    const { eventManager } = createMockEventManager();
    const audioManager = createMockAudioManager();

    const player = makePlayer();
    const enemy = makeEnemy();

    return {
        battleSystem,
        buffSystem,
        gameData: new RpgGameData(),
        turnOrder: [],
        currentActorIndex: 0,
        actionDecision: null,
        renderer: {} as IBattleBlackboard['renderer'],
        eventManager,
        audioManager,
        allCharacters: [player, enemy],
        skillTable: loadSkillTable(),
        monsterTable: loadMonsterTable(),
        maxRound: 10,
        ...overrides,
    };
}

// ─── 测试套件 ──────────────────────────────────────────

describe('BattleFsm — 战斗状态机', () => {
    // 战斗状态通过 setTimeout(0) 延迟切换，需要 fakeTimers 才能同步验证
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());
    // ─── RoundStartState ─────────────────────────

    describe('RoundStartState — 回合开始', () => {
        it('递增回合数并发射 ROUND_START 事件', () => {
            const { eventManager, emittedEvents } = createMockEventManager();
            const bb = createBlackboard({ eventManager });
            bb.gameData.currentRound = 0;

            const { fsm } = createMockFsm(bb);
            const state = new RoundStartState();
            state.onEnter(fsm);

            expect(bb.gameData.currentRound).toBe(1);
            const roundStartEvent = emittedEvents.find((e) => e.key === 'rpg:round_start');
            expect(roundStartEvent).toBeDefined();
            expect(roundStartEvent!.data).toEqual({ roundNumber: 1 });
        });

        it('按 SPD 降序计算行动顺序并存入黑板', () => {
            const player = makePlayer({ id: 1, name: '战士', spd: 10 });
            const enemy = makeEnemy({ id: 100, name: '史莱姆', spd: 5 });
            const bb = createBlackboard({ allCharacters: [player, enemy] });

            const { fsm } = createMockFsm(bb);
            const state = new RoundStartState();
            state.onEnter(fsm);

            // 玩家 SPD=10 > 敌方 SPD=5
            expect(bb.turnOrder).toHaveLength(2);
            expect(bb.turnOrder[0].id).toBe(1);
            expect(bb.turnOrder[1].id).toBe(100);
            expect(bb.currentActorIndex).toBe(0);
        });

        it('切换到 SelectActionState', () => {
            const bb = createBlackboard();
            const mock = createMockFsm(bb);
            const state = new RoundStartState();
            state.onEnter(mock.fsm);
            jest.runAllTimers();

            expect(mock.lastChangedState).toBe(SelectActionState);
        });
    });

    // ─── SelectActionState ───────────────────────

    describe('SelectActionState — 选择行动', () => {
        it('敌方角色使用 EnemyAI 决策', () => {
            const player = makePlayer({ id: 1, name: '战士' });
            const enemy = makeEnemy({ id: 100, name: '史莱姆', spd: 20 });
            const bb = createBlackboard({ allCharacters: [player, enemy] });
            // 模拟当前行动者为敌方
            bb.turnOrder = [enemy, player];
            bb.currentActorIndex = 0;

            const spy = jest.spyOn(EnemyAI, 'decideAction');
            const mock = createMockFsm(bb);
            const state = new SelectActionState();
            state.onEnter(mock.fsm);

            expect(spy).toHaveBeenCalledWith(enemy, [player], bb.skillTable);
            expect(bb.actionDecision).not.toBeNull();
            jest.runAllTimers();
            expect(mock.lastChangedState).toBe(ExecuteActionState);

            spy.mockRestore();
        });

        it('玩家角色自动选择普攻', () => {
            const player = makePlayer({ id: 1, name: '战士' });
            const enemy = makeEnemy({ id: 100, name: '史莱姆' });
            const bb = createBlackboard({ allCharacters: [player, enemy] });
            bb.turnOrder = [player, enemy];
            bb.currentActorIndex = 0;

            const mock = createMockFsm(bb);
            const state = new SelectActionState();
            state.onEnter(mock.fsm);

            expect(bb.actionDecision).toEqual({
                actorId: 1,
                skillId: 1,
                targetIds: [100],
            });
            jest.runAllTimers();
            expect(mock.lastChangedState).toBe(ExecuteActionState);
        });

        it('跳过已死亡角色', () => {
            const player = makePlayer({ id: 1, isAlive: false });
            const enemy = makeEnemy({ id: 100, name: '史莱姆' });
            const alivePlayer = makePlayer({ id: 2, name: '法师', spd: 5 });
            const bb = createBlackboard({ allCharacters: [player, alivePlayer, enemy] });
            bb.turnOrder = [player, alivePlayer, enemy];
            bb.currentActorIndex = 0;

            const mock = createMockFsm(bb);
            const state = new SelectActionState();
            state.onEnter(mock.fsm);

            // 跳过死亡的 player(id=1)，行动 alivePlayer(id=2)
            expect(bb.currentActorIndex).toBe(1);
            expect(bb.actionDecision!.actorId).toBe(2);
        });

        it('跳过被眩晕的角色', () => {
            const stunnedPlayer = makePlayer({
                id: 1,
                name: '被眩晕的战士',
                buffs: [{ buffType: BuffType.STUN, remainingRounds: 1, value: 0 }],
            });
            const enemy = makeEnemy({ id: 100, name: '史莱姆' });
            const alivePlayer = makePlayer({ id: 2, name: '法师', spd: 5 });
            const bb = createBlackboard({ allCharacters: [stunnedPlayer, alivePlayer, enemy] });
            bb.turnOrder = [stunnedPlayer, alivePlayer, enemy];
            bb.currentActorIndex = 0;

            const mock = createMockFsm(bb);
            const state = new SelectActionState();
            state.onEnter(mock.fsm);

            // 跳过眩晕的 player，行动 alivePlayer
            expect(bb.currentActorIndex).toBe(1);
            expect(bb.actionDecision!.actorId).toBe(2);
        });

        it('所有角色行动完毕时切换到 RoundEndState', () => {
            const bb = createBlackboard();
            bb.turnOrder = [makePlayer()];
            bb.currentActorIndex = 1; // 已超出列表

            const mock = createMockFsm(bb);
            const state = new SelectActionState();
            state.onEnter(mock.fsm);
            jest.runAllTimers();

            expect(mock.lastChangedState).toBe(RoundEndState);
        });
    });

    // ─── ExecuteActionState ──────────────────────

    describe('ExecuteActionState — 执行行动', () => {
        it('执行攻击并发射 ATTACK/CHARACTER_HURT 事件', () => {
            const { eventManager, emittedEvents } = createMockEventManager();
            const audioManager = createMockAudioManager();
            const player = makePlayer({ id: 1, name: '战士', atk: 20 });
            const enemy = makeEnemy({ id: 100, name: '史莱姆', hp: 50, def: 3 });
            const bb = createBlackboard({
                eventManager,
                audioManager,
                allCharacters: [player, enemy],
            });
            bb.turnOrder = [player, enemy];
            bb.currentActorIndex = 0;
            bb.actionDecision = { actorId: 1, skillId: 1, targetIds: [100] };

            const mock = createMockFsm(bb);
            const state = new ExecuteActionState();
            state.onEnter(mock.fsm);

            // 应该发射 SKILL_USED
            const skillUsed = emittedEvents.find((e) => e.key === 'rpg:skill_used');
            expect(skillUsed).toBeDefined();

            // 应该发射 ATTACK
            const attack = emittedEvents.find((e) => e.key === 'rpg:attack');
            expect(attack).toBeDefined();

            // 应该发射 CHARACTER_HURT
            const hurt = emittedEvents.find((e) => e.key === 'rpg:character_hurt');
            expect(hurt).toBeDefined();

            // 应该播放音效
            expect(audioManager.playSound).toHaveBeenCalledWith('sfx_attack');

            // 决策已清空
            expect(bb.actionDecision).toBeNull();
        });

        it('目标死亡时发射 CHARACTER_DEAD 事件', () => {
            const { eventManager, emittedEvents } = createMockEventManager();
            const audioManager = createMockAudioManager();
            const player = makePlayer({ id: 1, atk: 999 }); // 超高攻击力确保击杀
            const enemy = makeEnemy({ id: 100, hp: 1, def: 0 });
            const bb = createBlackboard({
                eventManager,
                audioManager,
                allCharacters: [player, enemy],
            });
            bb.turnOrder = [player, enemy];
            bb.currentActorIndex = 0;
            bb.actionDecision = { actorId: 1, skillId: 1, targetIds: [100] };

            const mock = createMockFsm(bb);
            const state = new ExecuteActionState();
            state.onEnter(mock.fsm);

            const deadEvent = emittedEvents.find((e) => e.key === 'rpg:character_dead');
            expect(deadEvent).toBeDefined();
            expect(deadEvent!.data).toEqual({ characterId: 100, group: 'enemy' });
        });

        it('全部敌人死亡时切换到 VictoryState', () => {
            const audioManager = createMockAudioManager();
            const player = makePlayer({ id: 1, atk: 999 });
            const enemy = makeEnemy({ id: 100, hp: 1, def: 0 });
            const bb = createBlackboard({
                audioManager,
                allCharacters: [player, enemy],
            });
            bb.turnOrder = [player];
            bb.currentActorIndex = 0;
            bb.actionDecision = { actorId: 1, skillId: 1, targetIds: [100] };

            const mock = createMockFsm(bb);
            const state = new ExecuteActionState();
            state.onEnter(mock.fsm);
            jest.runAllTimers();

            expect(mock.lastChangedState).toBe(VictoryState);
        });

        it('全部玩家死亡时切换到 DefeatState', () => {
            const audioManager = createMockAudioManager();
            const player = makePlayer({ id: 1, hp: 1, def: 0 });
            const enemy = makeEnemy({ id: 100, atk: 999 });
            const bb = createBlackboard({
                audioManager,
                allCharacters: [player, enemy],
            });
            bb.turnOrder = [enemy];
            bb.currentActorIndex = 0;
            bb.actionDecision = { actorId: 100, skillId: 1, targetIds: [1] };

            const mock = createMockFsm(bb);
            const state = new ExecuteActionState();
            state.onEnter(mock.fsm);
            jest.runAllTimers();

            expect(mock.lastChangedState).toBe(DefeatState);
        });

        it('战斗未结束且还有角色未行动时切换回 SelectActionState', () => {
            const audioManager = createMockAudioManager();
            const player = makePlayer({ id: 1, atk: 5 }); // 低攻击不会击杀
            const enemy = makeEnemy({ id: 100, hp: 999, def: 0 });
            const bb = createBlackboard({
                audioManager,
                allCharacters: [player, enemy],
            });
            bb.turnOrder = [player, enemy];
            bb.currentActorIndex = 0;
            bb.actionDecision = { actorId: 1, skillId: 1, targetIds: [100] };

            const mock = createMockFsm(bb);
            const state = new ExecuteActionState();
            state.onEnter(mock.fsm);

            // currentActorIndex 应该递增
            expect(bb.currentActorIndex).toBe(1);
            jest.runAllTimers();
            expect(mock.lastChangedState).toBe(SelectActionState);
        });

        it('战斗未结束但所有角色已行动时切换到 RoundEndState', () => {
            const audioManager = createMockAudioManager();
            const player = makePlayer({ id: 1, atk: 5 });
            const enemy = makeEnemy({ id: 100, hp: 999, def: 0 });
            const bb = createBlackboard({
                audioManager,
                allCharacters: [player, enemy],
            });
            bb.turnOrder = [player]; // 只有一个行动者
            bb.currentActorIndex = 0;
            bb.actionDecision = { actorId: 1, skillId: 1, targetIds: [100] };

            const mock = createMockFsm(bb);
            const state = new ExecuteActionState();
            state.onEnter(mock.fsm);

            // turnOrder 只有 1 个，index 递增到 1 后 >= length
            jest.runAllTimers();
            expect(mock.lastChangedState).toBe(RoundEndState);
        });
    });

    // ─── RoundEndState ───────────────────────────

    describe('RoundEndState — 回合结束', () => {
        it('对存活角色执行 BUFF 递减', () => {
            const { eventManager } = createMockEventManager();
            const buffSystem = new BuffSystem();
            const battleSystem = new BattleSystem(buffSystem);
            const player = makePlayer({ id: 1 });
            const bb = createBlackboard({
                eventManager,
                battleSystem,
                buffSystem,
                allCharacters: [player, makeEnemy()],
            });
            bb.gameData.currentRound = 1;

            // 给玩家施加 1 回合 ATK_UP
            buffSystem.applyBuff(1, BuffType.ATK_UP, 1, 10);

            const mock = createMockFsm(bb);
            const state = new RoundEndState();
            state.onEnter(mock.fsm);

            // BUFF 应该已递减为 0 并被移除
            expect(buffSystem.hasBuff(1, BuffType.ATK_UP)).toBe(false);
        });

        it('发射 BUFF_EXPIRED 事件', () => {
            const { eventManager, emittedEvents } = createMockEventManager();
            const buffSystem = new BuffSystem();
            const battleSystem = new BattleSystem(buffSystem);
            const player = makePlayer({ id: 1 });
            const bb = createBlackboard({
                eventManager,
                battleSystem,
                buffSystem,
                allCharacters: [player, makeEnemy()],
            });
            bb.gameData.currentRound = 1;
            buffSystem.applyBuff(1, BuffType.ATK_UP, 1, 10);

            const mock = createMockFsm(bb);
            const state = new RoundEndState();
            state.onEnter(mock.fsm);

            const expired = emittedEvents.find((e) => e.key === 'rpg:buff_expired');
            expect(expired).toBeDefined();
            expect(expired!.data).toEqual({ targetId: 1, buffType: BuffType.ATK_UP });
        });

        it('发射 ROUND_END 事件', () => {
            const { eventManager, emittedEvents } = createMockEventManager();
            const bb = createBlackboard({ eventManager });
            bb.gameData.currentRound = 3;

            const mock = createMockFsm(bb);
            const state = new RoundEndState();
            state.onEnter(mock.fsm);

            const roundEnd = emittedEvents.find((e) => e.key === 'rpg:round_end');
            expect(roundEnd).toBeDefined();
            expect(roundEnd!.data).toEqual({ roundNumber: 3 });
        });

        it('未超过最大回合时切换回 RoundStartState', () => {
            const bb = createBlackboard({ maxRound: 10 });
            bb.gameData.currentRound = 3;

            const mock = createMockFsm(bb);
            const state = new RoundEndState();
            state.onEnter(mock.fsm);
            jest.runAllTimers();

            expect(mock.lastChangedState).toBe(RoundStartState);
        });

        it('超过最大回合时切换到 DefeatState', () => {
            const bb = createBlackboard({ maxRound: 5 });
            bb.gameData.currentRound = 5;

            const mock = createMockFsm(bb);
            const state = new RoundEndState();
            state.onEnter(mock.fsm);
            jest.runAllTimers();

            expect(mock.lastChangedState).toBe(DefeatState);
        });

        it('maxRound=0 时不限制回合数', () => {
            const bb = createBlackboard({ maxRound: 0 });
            bb.gameData.currentRound = 100;

            const mock = createMockFsm(bb);
            const state = new RoundEndState();
            state.onEnter(mock.fsm);
            jest.runAllTimers();

            expect(mock.lastChangedState).toBe(RoundStartState);
        });
    });

    // ─── VictoryState ────────────────────────────

    describe('VictoryState — 胜利', () => {
        it('计算击杀怪物的经验和金币奖励', () => {
            const { eventManager } = createMockEventManager();
            const audioManager = createMockAudioManager();
            const player = makePlayer({ id: 1 });
            // 2 只史莱姆已死亡
            const enemy1 = makeEnemy({ id: 100, name: '史莱姆', isAlive: false });
            const enemy2 = makeEnemy({ id: 101, name: '史莱姆', isAlive: false });
            const bb = createBlackboard({
                eventManager,
                audioManager,
                allCharacters: [player, enemy1, enemy2],
            });
            bb.gameData.gold = 0;
            bb.gameData.totalExp = 0;

            const mock = createMockFsm(bb);
            const state = new VictoryState();
            state.onEnter(mock.fsm);

            // 史莱姆 expReward=10, goldReward=5，两只
            expect(bb.gameData.totalExp).toBe(20);
            expect(bb.gameData.gold).toBe(10);
        });

        it('发射 BATTLE_VICTORY 事件', () => {
            const { eventManager, emittedEvents } = createMockEventManager();
            const audioManager = createMockAudioManager();
            const enemy = makeEnemy({ id: 100, name: '史莱姆', isAlive: false });
            const bb = createBlackboard({
                eventManager,
                audioManager,
                allCharacters: [makePlayer(), enemy],
            });

            const mock = createMockFsm(bb);
            const state = new VictoryState();
            state.onEnter(mock.fsm);

            const victory = emittedEvents.find((e) => e.key === 'rpg:battle_victory');
            expect(victory).toBeDefined();
            expect(victory!.data).toEqual({ expReward: 10, goldReward: 5 });
        });

        it('播放胜利音效', () => {
            const audioManager = createMockAudioManager();
            const bb = createBlackboard({ audioManager });

            const mock = createMockFsm(bb);
            const state = new VictoryState();
            state.onEnter(mock.fsm);

            expect(audioManager.playSound).toHaveBeenCalledWith('sfx_victory');
        });
    });

    // ─── DefeatState ─────────────────────────────

    describe('DefeatState — 失败', () => {
        it('发射 BATTLE_DEFEAT 事件', () => {
            const { eventManager, emittedEvents } = createMockEventManager();
            const audioManager = createMockAudioManager();
            const bb = createBlackboard({ eventManager, audioManager });

            const mock = createMockFsm(bb);
            const state = new DefeatState();
            state.onEnter(mock.fsm);

            const defeat = emittedEvents.find((e) => e.key === 'rpg:battle_defeat');
            expect(defeat).toBeDefined();
        });

        it('播放失败音效', () => {
            const audioManager = createMockAudioManager();
            const bb = createBlackboard({ audioManager });

            const mock = createMockFsm(bb);
            const state = new DefeatState();
            state.onEnter(mock.fsm);

            expect(audioManager.playSound).toHaveBeenCalledWith('sfx_defeat');
        });
    });
});

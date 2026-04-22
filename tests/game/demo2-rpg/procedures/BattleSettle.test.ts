/**
 * BattleProcedure & SettleProcedure 单元测试
 *
 * 测试战斗流程和结算流程的事件注册、流程切换、奖励计算、升级逻辑、清理操作。
 */

import { IFsm, Constructor, IFsmState } from '@framework/fsm/FsmDefs';
import { EventKey } from '@framework/event/EventDefs';
import {
    IRpgProcedureContext,
    RPG_PROCEDURE_CONTEXT_KEY,
} from '@game/demo2-rpg/procedures/RpgProcedureContext';
import { BattleProcedure } from '@game/demo2-rpg/procedures/BattleProcedure';
import { SettleProcedure } from '@game/demo2-rpg/procedures/SettleProcedure';
import { RpgEvents } from '@game/demo2-rpg/events/RpgEvents';
import { RpgGameData, CharacterState } from '@game/demo2-rpg/data/RpgGameData';
import { BattleSystem } from '@game/demo2-rpg/systems/BattleSystem';
import { BuffSystem } from '@game/demo2-rpg/systems/BuffSystem';
// ─── 测试辅助 ──────────────────────────────────────────

/** 创建玩家角色 */
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

/** 事件监听记录 */
interface EventListenerRecord {
    key: EventKey<unknown>;
    callback: (...args: unknown[]) => void;
    caller?: unknown;
}

/** 创建 mock 事件管理器 */
function createMockEventManager(): {
    eventManager: IRpgProcedureContext['eventManager'];
    listeners: EventListenerRecord[];
    emittedEvents: Array<{ key: string; data: unknown }>;
} {
    const listeners: EventListenerRecord[] = [];
    const emittedEvents: Array<{ key: string; data: unknown }> = [];

    const eventManager = {
        on: jest.fn(((
            key: EventKey<unknown>,
            callback: (...args: unknown[]) => void,
            caller?: unknown,
        ) => {
            listeners.push({ key, callback, caller });
        }) as IRpgProcedureContext['eventManager']['on']),
        once: jest.fn(),
        off: jest.fn(),
        offAll: jest.fn(),
        offByCaller: jest.fn(),
        emit: jest.fn(((key: EventKey<unknown>, ...args: unknown[]) => {
            emittedEvents.push({ key: key.description, data: args[0] });
            // 触发匹配的监听器
            for (const listener of listeners) {
                if (listener.key === key) {
                    listener.callback(...args);
                }
            }
        }) as IRpgProcedureContext['eventManager']['emit']),
    } as unknown as IRpgProcedureContext['eventManager'];

    return { eventManager, listeners, emittedEvents };
}

/** 创建 mock 音频管理器 */
function createMockAudioManager(): IRpgProcedureContext['audioManager'] {
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
    } as unknown as IRpgProcedureContext['audioManager'];
}

/** 创建 mock FSM 管理器 */
function createMockFsmManager(): IRpgProcedureContext['fsmManager'] {
    return {
        destroyFsm: jest.fn(),
        getFsm: jest.fn().mockReturnValue(undefined),
    } as unknown as IRpgProcedureContext['fsmManager'];
}

/** 创建 mock Procedure FSM */
function createMockProcedureFsm(ctx: IRpgProcedureContext): {
    fsm: IFsm<unknown>;
    lastChangedState: { value: Constructor<IFsmState<unknown>> | null };
} {
    const data = new Map<string, unknown>();
    data.set(RPG_PROCEDURE_CONTEXT_KEY, ctx);

    const tracker = { value: null as Constructor<IFsmState<unknown>> | null };

    const fsm: IFsm<unknown> = {
        name: 'rpg_procedure_test',
        owner: {},
        currentState: null,
        isDestroyed: false,
        changeState<TState extends IFsmState<unknown>>(stateType: Constructor<TState>): void {
            tracker.value = stateType as Constructor<IFsmState<unknown>>;
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
        start(): void {
            // mock
        },
    };

    return { fsm, lastChangedState: tracker };
}

/** 创建上下文 */
function createContext(overrides: Partial<IRpgProcedureContext> = {}): IRpgProcedureContext {
    const buffSystem = new BuffSystem();
    const battleSystem = new BattleSystem(buffSystem);
    const { eventManager } = createMockEventManager();
    const audioManager = createMockAudioManager();
    const fsmManager = createMockFsmManager();

    return {
        gameData: new RpgGameData(),
        renderer: {} as IRpgProcedureContext['renderer'],
        battleSystem,
        buffSystem,
        damageCalculator: {} as unknown,
        enemyAI: {} as unknown,
        eventManager,
        timerManager: {} as unknown as IRpgProcedureContext['timerManager'],
        fsmManager,
        entityManager: {} as unknown as IRpgProcedureContext['entityManager'],
        audioManager,
        uiManager: {} as unknown as IRpgProcedureContext['uiManager'],
        dataTableManager: {} as unknown as IRpgProcedureContext['dataTableManager'],
        referencePool: {} as unknown as IRpgProcedureContext['referencePool'],
        ...overrides,
    } as IRpgProcedureContext;
}

// ─── BattleProcedure 测试 ───────────────────────────────

describe('BattleProcedure — 战斗流程', () => {
    it('onEnter 应注册 BATTLE_VICTORY 和 BATTLE_DEFEAT 事件监听', () => {
        const { eventManager } = createMockEventManager();
        const ctx = createContext({ eventManager });
        const { fsm } = createMockProcedureFsm(ctx);

        const procedure = new BattleProcedure();
        procedure.onEnter(fsm);

        // 应注册两个事件监听
        const registeredKeys = (eventManager.on as jest.Mock).mock.calls.map(
            (call: unknown[]) => (call[0] as EventKey<unknown>).description,
        );
        expect(registeredKeys).toContain('rpg:battle_victory');
        expect(registeredKeys).toContain('rpg:battle_defeat');
    });

    it('收到 BATTLE_VICTORY 后应切换到 SettleProcedure', () => {
        const { eventManager } = createMockEventManager();
        const ctx = createContext({ eventManager });
        const { fsm, lastChangedState } = createMockProcedureFsm(ctx);

        const procedure = new BattleProcedure();
        procedure.onEnter(fsm);

        // 模拟发射 BATTLE_VICTORY 事件
        eventManager.emit(RpgEvents.BATTLE_VICTORY, { expReward: 50, goldReward: 20 });

        expect(lastChangedState.value).toBe(SettleProcedure);
    });

    it('收到 BATTLE_DEFEAT 后应切换到 SettleProcedure', () => {
        const { eventManager } = createMockEventManager();
        const ctx = createContext({ eventManager });
        const { fsm, lastChangedState } = createMockProcedureFsm(ctx);

        const procedure = new BattleProcedure();
        procedure.onEnter(fsm);

        // 模拟发射 BATTLE_DEFEAT 事件
        eventManager.emit(RpgEvents.BATTLE_DEFEAT, {} as Record<string, never>);

        expect(lastChangedState.value).toBe(SettleProcedure);
    });

    it('onLeave 应取消所有事件监听', () => {
        const { eventManager } = createMockEventManager();
        const ctx = createContext({ eventManager });
        const { fsm } = createMockProcedureFsm(ctx);

        const procedure = new BattleProcedure();
        procedure.onEnter(fsm);
        procedure.onLeave(fsm);

        // off 应被调用（取消 BATTLE_VICTORY 和 BATTLE_DEFEAT 的监听）
        expect(eventManager.off).toHaveBeenCalledTimes(2);
    });

    it('缺少上下文时 onEnter 应抛出错误', () => {
        const fsm: IFsm<unknown> = {
            name: 'test',
            owner: {},
            currentState: null,
            isDestroyed: false,
            changeState: jest.fn(),
            getData: jest.fn().mockReturnValue(undefined),
            setData: jest.fn(),
            removeData: jest.fn(),
            hasState: jest.fn(),
            start: jest.fn(),
        };

        const procedure = new BattleProcedure();
        expect(() => procedure.onEnter(fsm)).toThrow();
    });
});

// ─── SettleProcedure 测试 ────────────────────────────────

describe('SettleProcedure — 结算流程', () => {
    it('应正确计算战斗奖励并更新 gameData', () => {
        const gameData = new RpgGameData();
        gameData.gold = 100;
        gameData.totalExp = 50;
        // 模拟有一只已死亡的史莱姆（expReward=10, goldReward=5）
        gameData.playerCharacters = [makePlayer()];

        const buffSystem = new BuffSystem();
        const battleSystem = new BattleSystem(buffSystem);
        const { eventManager } = createMockEventManager();
        const audioManager = createMockAudioManager();
        const fsmManager = createMockFsmManager();

        const ctx = createContext({
            gameData,
            battleSystem,
            buffSystem,
            eventManager,
            audioManager,
            fsmManager,
        });

        // 将上下文中的 allCharacters 记录到 FSM 数据中（模拟战斗遗留）
        const { fsm } = createMockProcedureFsm(ctx);
        // 需要在 fsm 数据中放置击杀的怪物信息
        // SettleProcedure 从 BattleFsm 的黑板获取数据
        // 简化：通过 gameData.battleLog 或直接在 context 上携带信息
        // 实际上 VictoryState 已经在事件中传了 expReward/goldReward
        // SettleProcedure 应该从事件数据中拿奖励

        const procedure = new SettleProcedure();

        // 在 fsm 数据中设置胜利结算数据
        fsm.setData('__battle_result__', {
            victory: true,
            expReward: 10,
            goldReward: 5,
        });

        procedure.onEnter(fsm);

        // 金币和经验应增加
        expect(gameData.gold).toBe(105);
        expect(gameData.totalExp).toBe(60);
    });

    it('角色升级逻辑：每 100 exp 升一级，升级恢复全 HP/MP', () => {
        const gameData = new RpgGameData();
        const player = makePlayer({ level: 1, exp: 90, hp: 50, mp: 20 });
        gameData.playerCharacters = [player];
        gameData.gold = 0;
        gameData.totalExp = 90;

        const buffSystem = new BuffSystem();
        const ctx = createContext({
            gameData,
            buffSystem,
        });

        const { fsm } = createMockProcedureFsm(ctx);
        fsm.setData('__battle_result__', {
            victory: true,
            expReward: 20, // 90 + 20 = 110 → 升到 2 级
            goldReward: 10,
        });

        const procedure = new SettleProcedure();
        procedure.onEnter(fsm);

        expect(player.level).toBe(2);
        expect(player.exp).toBe(110);
        expect(player.hp).toBe(player.maxHp);
        expect(player.mp).toBe(player.maxMp);
    });

    it('多次升级：exp 跨多个 100 阈值', () => {
        const gameData = new RpgGameData();
        const player = makePlayer({ level: 1, exp: 50, hp: 30, mp: 10 });
        gameData.playerCharacters = [player];
        gameData.totalExp = 50;

        const buffSystem = new BuffSystem();
        const ctx = createContext({ gameData, buffSystem });

        const { fsm } = createMockProcedureFsm(ctx);
        fsm.setData('__battle_result__', {
            victory: true,
            expReward: 250, // 50 + 250 = 300 → 4级
            goldReward: 0,
        });

        const procedure = new SettleProcedure();
        procedure.onEnter(fsm);

        expect(player.level).toBe(4);
        expect(player.exp).toBe(300);
        expect(player.hp).toBe(player.maxHp);
        expect(player.mp).toBe(player.maxMp);
    });

    it('BUFF 系统 clearAll 应被调用', () => {
        const gameData = new RpgGameData();
        gameData.playerCharacters = [makePlayer()];

        const buffSystem = new BuffSystem();
        const clearAllSpy = jest.spyOn(buffSystem, 'clearAll');
        const ctx = createContext({ gameData, buffSystem });

        const { fsm } = createMockProcedureFsm(ctx);
        fsm.setData('__battle_result__', {
            victory: true,
            expReward: 0,
            goldReward: 0,
        });

        const procedure = new SettleProcedure();
        procedure.onEnter(fsm);

        expect(clearAllSpy).toHaveBeenCalledTimes(1);
    });

    it('BGM 应被停止', () => {
        const gameData = new RpgGameData();
        gameData.playerCharacters = [makePlayer()];

        const buffSystem = new BuffSystem();
        const audioManager = createMockAudioManager();
        const ctx = createContext({ gameData, buffSystem, audioManager });

        const { fsm } = createMockProcedureFsm(ctx);
        fsm.setData('__battle_result__', {
            victory: true,
            expReward: 0,
            goldReward: 0,
        });

        const procedure = new SettleProcedure();
        procedure.onEnter(fsm);

        expect(audioManager.stopMusic).toHaveBeenCalled();
    });

    it('战斗失败时不增加奖励', () => {
        const gameData = new RpgGameData();
        gameData.gold = 100;
        gameData.totalExp = 50;
        gameData.playerCharacters = [makePlayer()];

        const buffSystem = new BuffSystem();
        const ctx = createContext({ gameData, buffSystem });

        const { fsm } = createMockProcedureFsm(ctx);
        fsm.setData('__battle_result__', {
            victory: false,
            expReward: 0,
            goldReward: 0,
        });

        const procedure = new SettleProcedure();
        procedure.onEnter(fsm);

        expect(gameData.gold).toBe(100);
        expect(gameData.totalExp).toBe(50);
    });

    it('缺少上下文时 onEnter 应抛出错误', () => {
        const fsm: IFsm<unknown> = {
            name: 'test',
            owner: {},
            currentState: null,
            isDestroyed: false,
            changeState: jest.fn(),
            getData: jest.fn().mockReturnValue(undefined),
            setData: jest.fn(),
            removeData: jest.fn(),
            hasState: jest.fn(),
            start: jest.fn(),
        };

        const procedure = new SettleProcedure();
        expect(() => procedure.onEnter(fsm)).toThrow();
    });
});

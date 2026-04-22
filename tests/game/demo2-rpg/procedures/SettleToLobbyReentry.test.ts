/**
 * 回归测试：战后返回大厅并再次出发
 *
 * 验证完整流程：关卡1 → 结算 → 返回大厅 → 选关卡2 → 出发。
 * 确保 SettleProcedure 正确销毁 BattleFsm、恢复角色、LobbyProcedure 二次进入时
 * UI 重建正常、角色保留升级进度、"出发"按钮可正常切换到 BattlePrepProcedure。
 */

import { IFsm, Constructor, IFsmState } from '@framework/fsm/FsmDefs';
import {
    IRpgProcedureContext,
    RPG_PROCEDURE_CONTEXT_KEY,
} from '@game/demo2-rpg/procedures/RpgProcedureContext';
import { SettleProcedure } from '@game/demo2-rpg/procedures/SettleProcedure';
import { LobbyProcedure } from '@game/demo2-rpg/procedures/LobbyProcedure';
import { BattlePrepProcedure } from '@game/demo2-rpg/procedures/BattlePrepProcedure';
import { RpgGameData } from '@game/demo2-rpg/data/RpgGameData';
import { CharacterConfigRow, CHAR_DATA } from '@game/demo2-rpg/data/CharacterConfigRow';
import { StageConfigRow, STAGE_DATA } from '@game/demo2-rpg/data/StageConfigRow';
import { BattleSystem } from '@game/demo2-rpg/systems/BattleSystem';
import { BuffSystem } from '@game/demo2-rpg/systems/BuffSystem';

// ─── Mock ──────────────────────────────────────────────

jest.mock('@framework/debug/Logger', () => ({
    Logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

/** 按钮回调类型 */
type ButtonCall = [unknown, string, () => void];

/** 创建 mock 渲染器 */
function createMockRenderer(): IRpgProcedureContext['renderer'] & {
    _getButtonCallback: (label: string) => (() => void) | undefined;
} {
    const buttonCallbacks = new Map<string, () => void>();
    return {
        log: jest.fn(),
        updateLog: jest.fn(),
        separator: jest.fn(),
        clearLog: jest.fn(),
        clearButtons: jest.fn(() => {
            buttonCallbacks.clear();
        }),
        clearStatusPanels: jest.fn(),
        createButtonGroup: jest.fn().mockReturnValue({}),
        addButton: jest.fn((_group: unknown, label: string, onClick: () => void) => {
            buttonCallbacks.set(label, onClick);
            return {} as HTMLButtonElement;
        }),
        createStatusPanel: jest.fn().mockReturnValue({
            element: {},
            update: jest.fn(),
        }),
        updateStatus: jest.fn(),
        _getButtonCallback: (label: string) => buttonCallbacks.get(label),
    } as unknown as IRpgProcedureContext['renderer'] & {
        _getButtonCallback: (label: string) => (() => void) | undefined;
    };
}

/** 创建 mock DataTableManager */
function createMockDataTableManager(): IRpgProcedureContext['dataTableManager'] {
    const charRows: CharacterConfigRow[] = CHAR_DATA.map((raw) => {
        const row = new CharacterConfigRow();
        row.parseRow(raw);
        return row;
    });
    const stageRows: StageConfigRow[] = STAGE_DATA.map((raw) => {
        const row = new StageConfigRow();
        row.parseRow(raw);
        return row;
    });

    return {
        getAllRows: jest.fn().mockImplementation((tableName: string) => {
            if (tableName === 'character_config') return charRows;
            if (tableName === 'stage_config') return stageRows;
            return [];
        }),
        getRow: jest.fn().mockImplementation((tableName: string, id: number) => {
            if (tableName === 'character_config') return charRows.find((r) => r.id === id);
            if (tableName === 'stage_config') return stageRows.find((r) => r.id === id);
            return undefined;
        }),
    } as unknown as IRpgProcedureContext['dataTableManager'];
}

/** 创建 mock FSM，追踪 changeState */
function createMockFsm(data: Map<string, unknown>): {
    fsm: IFsm<unknown>;
    lastChangedState: { value: Constructor<IFsmState<unknown>> | null };
} {
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
            /* mock */
        },
    };

    return { fsm, lastChangedState: tracker };
}

// ─── 测试 ──────────────────────────────────────────────

describe('回归测试：关卡1 → 结算 → 回大厅 → 关卡2 → 出发', () => {
    let renderer: ReturnType<typeof createMockRenderer>;
    let gameData: RpgGameData;
    let fsmData: Map<string, unknown>;
    let fsm: IFsm<unknown>;
    let lastChangedState: { value: Constructor<IFsmState<unknown>> | null };
    let ctx: IRpgProcedureContext;

    beforeEach(() => {
        renderer = createMockRenderer();
        gameData = new RpgGameData();

        const buffSystem = new BuffSystem();
        const fsmManager = {
            destroyFsm: jest.fn(),
            getFsm: jest.fn().mockReturnValue(undefined),
        } as unknown as IRpgProcedureContext['fsmManager'];

        ctx = {
            gameData,
            renderer,
            battleSystem: new BattleSystem(buffSystem),
            buffSystem,
            damageCalculator: {},
            enemyAI: {},
            eventManager: {
                emit: jest.fn(),
                on: jest.fn(),
                off: jest.fn(),
            } as unknown as IRpgProcedureContext['eventManager'],
            timerManager: {} as IRpgProcedureContext['timerManager'],
            fsmManager,
            entityManager: {} as IRpgProcedureContext['entityManager'],
            audioManager: {
                stopMusic: jest.fn(),
                playMusic: jest.fn(),
            } as unknown as IRpgProcedureContext['audioManager'],
            uiManager: {} as IRpgProcedureContext['uiManager'],
            dataTableManager: createMockDataTableManager(),
            referencePool: {} as IRpgProcedureContext['referencePool'],
        } as IRpgProcedureContext;

        fsmData = new Map<string, unknown>();
        fsmData.set(RPG_PROCEDURE_CONTEXT_KEY, ctx);

        const result = createMockFsm(fsmData);
        fsm = result.fsm;
        lastChangedState = result.lastChangedState;
    });

    it('完整流程应正确运行', () => {
        // ═══ 第 1 阶段：首次进入大厅 ═══
        const lobby = new LobbyProcedure();
        lobby.onEnter(fsm);

        // 应初始化 3 个角色
        expect(gameData.playerCharacters).toHaveLength(3);
        const warrior = gameData.playerCharacters.find((c) => c.id === 1)!;
        expect(warrior.level).toBe(1);

        // 选择关卡 1 → 出发
        gameData.selectedStageId = 1;
        const addButtonMock1 = renderer.addButton as jest.Mock;
        const goCall1 = addButtonMock1.mock.calls.find(
            (call: unknown[]) => call[1] === '出发',
        ) as ButtonCall;
        expect(goCall1).toBeDefined();
        goCall1[2](); // 点击出发
        expect(lastChangedState.value).toBe(BattlePrepProcedure);

        lobby.onLeave(fsm);

        // ═══ 第 2 阶段：结算（模拟战斗胜利后进入 SettleProcedure）═══
        lastChangedState.value = null;

        // 模拟战斗导致角色受伤
        warrior.hp = 30;
        warrior.mp = 10;
        warrior.isAlive = true;

        fsm.setData('__battle_result__', {
            victory: true,
            expReward: 50,
            goldReward: 20,
        });

        const settle = new SettleProcedure();
        settle.onEnter(fsm);

        // 验证奖励已发放
        expect(gameData.gold).toBe(20);
        expect(gameData.totalExp).toBe(50);

        // 验证角色 HP/MP 已恢复
        expect(warrior.hp).toBe(warrior.maxHp);
        expect(warrior.mp).toBe(warrior.maxMp);
        expect(warrior.isAlive).toBe(true);

        // 验证 BattleFsm 已销毁
        expect(ctx.fsmManager.destroyFsm).toHaveBeenCalledWith('battle_fsm');

        // 点击"返回大厅"
        const lobbyBtnCallback = renderer._getButtonCallback('返回大厅');
        expect(lobbyBtnCallback).toBeDefined();
        lobbyBtnCallback!();
        expect(lastChangedState.value).toBe(LobbyProcedure);

        // ═══ 第 3 阶段：二次进入大厅 ═══
        lastChangedState.value = null;

        const lobby2 = new LobbyProcedure();
        lobby2.onEnter(fsm);

        // 验证 UI 被清理
        expect(renderer.clearButtons).toHaveBeenCalled();
        expect(renderer.clearStatusPanels).toHaveBeenCalled();

        // 验证角色保留了升级进度（exp=50，level 仍为 1 因为 <100）
        expect(gameData.playerCharacters).toHaveLength(3);
        const warriorAfter = gameData.playerCharacters.find((c) => c.id === 1)!;
        expect(warriorAfter.exp).toBe(50);

        // 选择关卡 2 → 出发
        gameData.selectedStageId = 2;

        const goBtnCallback = renderer._getButtonCallback('出发');
        expect(goBtnCallback).toBeDefined();
        goBtnCallback!();

        // 应切换到 BattlePrepProcedure
        expect(lastChangedState.value).toBe(BattlePrepProcedure);
    });

    it('角色升级后二次进入大厅应保留等级', () => {
        // 首次进入初始化角色
        const lobby = new LobbyProcedure();
        lobby.onEnter(fsm);
        lobby.onLeave(fsm);

        // 模拟战斗获得大量经验导致升级
        fsm.setData('__battle_result__', {
            victory: true,
            expReward: 150, // 0 + 150 = 150 → Lv.2
            goldReward: 100,
        });

        const settle = new SettleProcedure();
        settle.onEnter(fsm);

        const warrior = gameData.playerCharacters.find((c) => c.id === 1)!;
        expect(warrior.level).toBe(2);
        expect(warrior.exp).toBe(150);

        // 返回大厅，角色等级应保留
        const lobby2 = new LobbyProcedure();
        lobby2.onEnter(fsm);

        const warriorAfter = gameData.playerCharacters.find((c) => c.id === 1)!;
        expect(warriorAfter.level).toBe(2);
        expect(warriorAfter.exp).toBe(150);
    });
});

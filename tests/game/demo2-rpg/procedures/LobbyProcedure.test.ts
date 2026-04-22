/**
 * LobbyProcedure 单元测试
 *
 * 验证大厅流程：角色初始化、关卡选择、出发切换
 */
import { LobbyProcedure } from '@game/demo2-rpg/procedures/LobbyProcedure';
import {
    RPG_PROCEDURE_CONTEXT_KEY,
    IRpgProcedureContext,
} from '@game/demo2-rpg/procedures/RpgProcedureContext';
import { RpgGameData } from '@game/demo2-rpg/data/RpgGameData';
import { CharacterConfigRow, CHAR_DATA } from '@game/demo2-rpg/data/CharacterConfigRow';
import { RpgEvents } from '@game/demo2-rpg/events/RpgEvents';
import { IFsm } from '@framework/fsm/FsmDefs';
import { StageConfigRow, STAGE_DATA } from '@game/demo2-rpg/data/StageConfigRow';

// ─── Mock 工具 ──────────────────────────────────────────

/** 按钮回调类型：[group, label, onClick] */
type ButtonCall = [unknown, string, () => void];

/** 创建 mock FSM */
function createMockFsm(data: Map<string, unknown>): IFsm<unknown> {
    return {
        name: 'test-fsm',
        owner: {},
        currentState: null,
        isDestroyed: false,
        changeState: jest.fn(),
        getData: <V>(key: string) => data.get(key) as V | undefined,
        setData: <V>(key: string, value: V) => {
            data.set(key, value);
        },
        removeData: (key: string) => data.delete(key),
        hasState: () => false,
        start: jest.fn(),
    };
}

/** 创建 mock HtmlRenderer */
function createMockRenderer(): IRpgProcedureContext['renderer'] {
    const buttonCallbacks = new Map<string, () => void>();
    return {
        log: jest.fn(),
        updateLog: jest.fn(),
        separator: jest.fn(),
        clearLog: jest.fn(),
        clearButtons: jest.fn(),
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
        // 暴露给测试的辅助方法
        _getButtonCallback: (label: string): (() => void) | undefined => buttonCallbacks.get(label),
    } as unknown as IRpgProcedureContext['renderer'] & {
        _getButtonCallback: (label: string) => (() => void) | undefined;
    };
}

/** 创建 mock DataTableManager，内置 character_config 和 stage_config 数据 */
function createMockDataTableManager(): IRpgProcedureContext['dataTableManager'] {
    // 预解析角色数据
    const charRows: CharacterConfigRow[] = CHAR_DATA.map((raw) => {
        const row = new CharacterConfigRow();
        row.parseRow(raw);
        return row;
    });

    // 预解析关卡数据
    const stageRows: StageConfigRow[] = STAGE_DATA.map((raw) => {
        const row = new StageConfigRow();
        row.parseRow(raw);
        return row;
    });

    return {
        getAllRows: jest.fn().mockImplementation((tableName: string) => {
            if (tableName === 'character_config') {
                return charRows;
            }
            if (tableName === 'stage_config') {
                return stageRows;
            }
            return [];
        }),
        getRow: jest.fn().mockImplementation((tableName: string, id: number) => {
            if (tableName === 'character_config') {
                return charRows.find((r) => r.id === id);
            }
            if (tableName === 'stage_config') {
                return stageRows.find((r) => r.id === id);
            }
            return undefined;
        }),
    } as unknown as IRpgProcedureContext['dataTableManager'];
}

/** 创建 mock EventManager */
function createMockEventManager(): IRpgProcedureContext['eventManager'] {
    return {
        emit: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
    } as unknown as IRpgProcedureContext['eventManager'];
}

/** 构建完整上下文 + FSM */
function setupTestEnv(): {
    procedure: LobbyProcedure;
    fsm: IFsm<unknown>;
    ctx: IRpgProcedureContext;
    gameData: RpgGameData;
    renderer: IRpgProcedureContext['renderer'];
    dataTableManager: IRpgProcedureContext['dataTableManager'];
    eventManager: IRpgProcedureContext['eventManager'];
} {
    const gameData = new RpgGameData();
    const renderer = createMockRenderer();
    const dataTableManager = createMockDataTableManager();
    const eventManager = createMockEventManager();

    const ctx: IRpgProcedureContext = {
        gameData,
        renderer,
        battleSystem: {},
        buffSystem: {},
        damageCalculator: {},
        enemyAI: {},
        eventManager,
        timerManager: {} as IRpgProcedureContext['timerManager'],
        fsmManager: {} as IRpgProcedureContext['fsmManager'],
        entityManager: {} as IRpgProcedureContext['entityManager'],
        audioManager: {} as IRpgProcedureContext['audioManager'],
        uiManager: {} as IRpgProcedureContext['uiManager'],
        dataTableManager,
        referencePool: {} as IRpgProcedureContext['referencePool'],
    };

    const fsmData = new Map<string, unknown>();
    fsmData.set(RPG_PROCEDURE_CONTEXT_KEY, ctx);
    const fsm = createMockFsm(fsmData);

    const procedure = new LobbyProcedure();

    return { procedure, fsm, ctx, gameData, renderer, dataTableManager, eventManager };
}

// ─── 测试用例 ──────────────────────────────────────────

describe('LobbyProcedure', () => {
    describe('onEnter — 角色初始化', () => {
        it('应从 character_config 初始化 3 个玩家角色', () => {
            const { procedure, fsm, gameData } = setupTestEnv();

            procedure.onEnter(fsm);

            expect(gameData.playerCharacters).toHaveLength(3);
        });

        it('角色属性应与配置表一致', () => {
            const { procedure, fsm, gameData } = setupTestEnv();

            procedure.onEnter(fsm);

            const warrior = gameData.playerCharacters.find((c) => c.id === 1);
            expect(warrior).toBeDefined();
            expect(warrior!.name).toBe('战士');
            expect(warrior!.maxHp).toBe(200);
            expect(warrior!.hp).toBe(200);
            expect(warrior!.atk).toBe(30);
            expect(warrior!.def).toBe(20);
            expect(warrior!.spd).toBe(12);
            expect(warrior!.isAlive).toBe(true);
            expect(warrior!.group).toBe('player');
            expect(warrior!.skills).toEqual([1, 2]);
            expect(warrior!.buffs).toEqual([]);
            expect(warrior!.level).toBe(1);
            expect(warrior!.exp).toBe(0);
        });

        it('法师和牧师属性应正确初始化', () => {
            const { procedure, fsm, gameData } = setupTestEnv();

            procedure.onEnter(fsm);

            const mage = gameData.playerCharacters.find((c) => c.id === 2);
            expect(mage).toBeDefined();
            expect(mage!.name).toBe('法师');
            expect(mage!.maxHp).toBe(120);
            expect(mage!.maxMp).toBe(150);
            expect(mage!.skills).toEqual([1, 3, 4]);

            const priest = gameData.playerCharacters.find((c) => c.id === 3);
            expect(priest).toBeDefined();
            expect(priest!.name).toBe('牧师');
            expect(priest!.maxHp).toBe(150);
            expect(priest!.maxMp).toBe(120);
            expect(priest!.skills).toEqual([1, 5, 6]);
        });
    });

    describe('onEnter — 渲染器交互', () => {
        it('应调用 renderer 创建状态面板', () => {
            const { procedure, fsm, renderer } = setupTestEnv();

            procedure.onEnter(fsm);

            expect(renderer.createStatusPanel).toHaveBeenCalled();
        });

        it('应创建按钮组和按钮', () => {
            const { procedure, fsm, renderer } = setupTestEnv();

            procedure.onEnter(fsm);

            expect(renderer.createButtonGroup).toHaveBeenCalled();
            expect(renderer.addButton).toHaveBeenCalled();
        });

        it('应记录进入大厅的日志', () => {
            const { procedure, fsm, renderer } = setupTestEnv();

            procedure.onEnter(fsm);

            expect(renderer.log).toHaveBeenCalled();
        });
    });

    describe('关卡选择', () => {
        it('关卡选择按钮回调应更新 gameData.selectedStageId', () => {
            const { procedure, fsm, gameData, renderer } = setupTestEnv();

            procedure.onEnter(fsm);

            // 查找关卡选择按钮（包含关卡名称的按钮）
            const addButtonMock = renderer.addButton as jest.Mock;
            const calls = addButtonMock.mock.calls as ButtonCall[];
            const stageButtonCalls = calls.filter((call) => {
                const label = call[1];
                return (
                    label.includes('新手村') ||
                    label.includes('黑暗森林') ||
                    label.includes('火山洞穴')
                );
            });

            expect(stageButtonCalls.length).toBeGreaterThanOrEqual(3);

            // 点击"黑暗森林"按钮（stageId=2）
            const forestButton = stageButtonCalls.find((call) => call[1].includes('黑暗森林'));
            expect(forestButton).toBeDefined();
            const forestCallback = forestButton![2];
            forestCallback();

            expect(gameData.selectedStageId).toBe(2);
        });

        it('关卡选择应发射 STAGE_SELECTED 事件', () => {
            const { procedure, fsm, eventManager, renderer } = setupTestEnv();

            procedure.onEnter(fsm);

            const addButtonMock = renderer.addButton as jest.Mock;
            const calls = addButtonMock.mock.calls as ButtonCall[];
            const volcanoCall = calls.find((call) => call[1].includes('火山洞穴'));
            expect(volcanoCall).toBeDefined();

            const volcanoCallback = volcanoCall![2];
            volcanoCallback();

            expect(eventManager.emit).toHaveBeenCalledWith(RpgEvents.STAGE_SELECTED, {
                stageId: 3,
            });
        });
    });

    describe('出发按钮', () => {
        it('点击出发按钮应触发 changeProcedure', () => {
            const { procedure, fsm, renderer } = setupTestEnv();

            procedure.onEnter(fsm);

            // 查找"出发"按钮
            const addButtonMock = renderer.addButton as jest.Mock;
            const calls = addButtonMock.mock.calls as ButtonCall[];
            const departCall = calls.find((call) => call[1].includes('出发'));
            expect(departCall).toBeDefined();

            const departCallback = departCall![2];
            departCallback();

            expect(fsm.changeState).toHaveBeenCalled();
        });
    });

    describe('onLeave — 清理', () => {
        it('离开时不应抛出异常', () => {
            const { procedure, fsm } = setupTestEnv();

            procedure.onEnter(fsm);

            expect(() => procedure.onLeave(fsm)).not.toThrow();
        });
    });

    describe('异常处理', () => {
        it('上下文缺失时 onEnter 应抛出异常', () => {
            const procedure = new LobbyProcedure();
            const emptyFsm = createMockFsm(new Map());

            expect(() => procedure.onEnter(emptyFsm)).toThrow();
        });
    });

    describe('二次进入（战后返回大厅）', () => {
        it('应清理旧 UI（调用 clearButtons 和 clearStatusPanels）', () => {
            const { procedure, fsm, renderer } = setupTestEnv();

            procedure.onEnter(fsm);

            expect(renderer.clearButtons).toHaveBeenCalledTimes(1);
            expect(renderer.clearStatusPanels).toHaveBeenCalledTimes(1);
        });

        it('二次进入时不应重新初始化已有角色', () => {
            const { procedure, fsm, gameData } = setupTestEnv();

            // 首次进入
            procedure.onEnter(fsm);
            expect(gameData.playerCharacters).toHaveLength(3);

            // 模拟战斗结束后角色升级
            gameData.playerCharacters[0].level = 3;
            gameData.playerCharacters[0].exp = 200;

            // 二次进入
            procedure.onLeave(fsm);
            procedure.onEnter(fsm);

            // 角色应保留升级后的状态
            expect(gameData.playerCharacters).toHaveLength(3);
            expect(gameData.playerCharacters[0].level).toBe(3);
            expect(gameData.playerCharacters[0].exp).toBe(200);
        });

        it('二次进入时"出发"按钮应仍然可用', () => {
            const { procedure, fsm, renderer } = setupTestEnv();

            // 首次进入
            procedure.onEnter(fsm);
            procedure.onLeave(fsm);

            // 二次进入
            procedure.onEnter(fsm);

            // 查找"出发"按钮
            const addButtonMock = renderer.addButton as jest.Mock;
            const calls = addButtonMock.mock.calls as ButtonCall[];
            const departCall = calls.find((call) => call[1].includes('出发'));
            expect(departCall).toBeDefined();

            const departCallback = departCall![2];
            departCallback();

            expect(fsm.changeState).toHaveBeenCalled();
        });
    });
});

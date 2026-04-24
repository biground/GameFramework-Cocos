/**
 * BattlePrepProcedure 单元测试
 *
 * 验证战斗准备流程：读取配置表创建敌人、创建 BattleFsm、播放 BGM、切换到 BattleProcedure。
 */

import { BattlePrepProcedure } from '@game/demo2-rpg/procedures/BattlePrepProcedure';
import {
    RPG_PROCEDURE_CONTEXT_KEY,
    IRpgProcedureContext,
} from '@game/demo2-rpg/procedures/RpgProcedureContext';
import { RpgGameData, CharacterState } from '@game/demo2-rpg/data/RpgGameData';
import { MonsterConfigRow } from '@game/demo2-rpg/data/MonsterConfigRow';
import { StageConfigRow } from '@game/demo2-rpg/data/StageConfigRow';
import { SkillConfigRow } from '@game/demo2-rpg/data/SkillConfigRow';
import { IFsm, IFsmState, Constructor } from '@framework/fsm/FsmDefs';

// ─── Mock 工具 ──────────────────────────────────────────

/** 创建 mock FsmState 行为的 FSM */
function createMockProcedureFsm(context: IRpgProcedureContext): IFsm<unknown> {
    const dataStore = new Map<string, unknown>();
    dataStore.set(RPG_PROCEDURE_CONTEXT_KEY, context);

    let lastChangedState: Constructor<IFsmState<unknown>> | null = null;

    return {
        name: 'test_procedure_fsm',
        owner: {},
        currentState: null,
        isDestroyed: false,
        changeState: jest.fn((stateType: Constructor<IFsmState<unknown>>) => {
            lastChangedState = stateType;
        }),
        getData: jest.fn((key: string) => dataStore.get(key)),
        setData: jest.fn((key: string, value: unknown) => {
            dataStore.set(key, value);
        }),
        removeData: jest.fn((_key: string): boolean => false),
        hasState: jest.fn((): boolean => true),
        get _lastChangedState() {
            return lastChangedState;
        },
    } as unknown as IFsm<unknown> & { _lastChangedState: Constructor<IFsmState<unknown>> | null };
}

/** 创建 mock 的 BattleFsm */
function createMockBattleFsm(): IFsm<unknown> {
    const dataStore = new Map<string, unknown>();
    let storedBlackboard: unknown = null;
    return {
        name: 'battle_fsm',
        owner: {},
        currentState: null,
        isDestroyed: false,
        changeState: jest.fn(),
        getData: jest.fn((key: string) => dataStore.get(key)),
        setData: jest.fn((key: string, value: unknown) => {
            dataStore.set(key, value);
        }),
        removeData: jest.fn((): boolean => false),
        hasState: jest.fn((): boolean => true),
        setBlackboard: jest.fn((data: unknown) => {
            storedBlackboard = data;
        }),
        get blackboard() {
            return storedBlackboard;
        },
        start: jest.fn(),
    } as unknown as IFsm<unknown>;
}

/** 创建关卡配置行 */
function createStageRow(
    id: number,
    name: string,
    monsters: string,
    bgm: string,
    maxRound: number,
): StageConfigRow {
    const row = new StageConfigRow();
    row.parseRow({ id, name, monsters, bgm, maxRound });
    return row;
}

/** 创建怪物配置行 */
function createMonsterRow(
    id: number,
    name: string,
    hp: number,
    atk: number,
    def: number,
    spd: number,
): MonsterConfigRow {
    const row = new MonsterConfigRow();
    row.parseRow({ id, name, hp, atk, def, spd, expReward: 10, goldReward: 5 });
    return row;
}

/** 创建技能配置行 */
function createSkillRow(id: number, name: string): SkillConfigRow {
    const row = new SkillConfigRow();
    row.parseRow({
        id,
        name,
        mpCost: 0,
        damageRate: 1.0,
        target: 'single_enemy',
        effect: 'none',
        effectDuration: 0,
        cooldown: 0,
    });
    return row;
}

/** 创建标准测试上下文 */
function createTestContext(): {
    context: IRpgProcedureContext;
    gameData: RpgGameData;
    mockBattleFsm: IFsm<unknown>;
} {
    const gameData = new RpgGameData();
    gameData.selectedStageId = 1;
    gameData.playerCharacters = [
        {
            id: 101,
            name: '勇者',
            maxHp: 200,
            hp: 200,
            maxMp: 50,
            mp: 50,
            atk: 30,
            def: 15,
            spd: 10,
            skills: [1, 2],
            level: 1,
            exp: 0,
            isAlive: true,
            group: 'player',
            buffs: [],
        },
    ];

    const mockBattleFsm = createMockBattleFsm();

    // 关卡配置表：第 1 关包含怪物 1,1,2
    const stageRows = [createStageRow(1, '新手村', '1,1,2', 'bgm_village', 10)];
    // 怪物配置表
    const monsterRows = [
        createMonsterRow(1, '史莱姆', 50, 8, 3, 5),
        createMonsterRow(2, '骷髅兵', 80, 15, 8, 7),
    ];
    // 技能配置表
    const skillRows = [createSkillRow(1, '普通攻击'), createSkillRow(2, '重击')];

    const context: IRpgProcedureContext = {
        gameData: gameData,
        renderer: {} as IRpgProcedureContext['renderer'],
        battleSystem: {},
        buffSystem: {},
        damageCalculator: {},
        enemyAI: {},
        eventManager: {
            emit: jest.fn(),
            on: jest.fn(),
            off: jest.fn(),
        } as unknown as IRpgProcedureContext['eventManager'],
        timerManager: {} as IRpgProcedureContext['timerManager'],
        fsmManager: {
            createFsm: jest.fn().mockReturnValue(mockBattleFsm),
        } as unknown as IRpgProcedureContext['fsmManager'],
        entityManager: {} as IRpgProcedureContext['entityManager'],
        audioManager: {
            playMusic: jest.fn(),
        } as unknown as IRpgProcedureContext['audioManager'],
        uiManager: {} as IRpgProcedureContext['uiManager'],
        dataTableManager: {
            getRow: jest.fn((tableName: string, id: number) => {
                if (tableName === 'stage_config') {
                    return stageRows.find((r) => r.id === id);
                }
                if (tableName === 'monster_config') {
                    return monsterRows.find((r) => r.id === id);
                }
                return undefined;
            }),
            getAllRows: jest.fn((tableName: string) => {
                if (tableName === 'stage_config') return stageRows;
                if (tableName === 'monster_config') return monsterRows;
                if (tableName === 'skill_config') return skillRows;
                return [];
            }),
        } as unknown as IRpgProcedureContext['dataTableManager'],
        referencePool: {} as IRpgProcedureContext['referencePool'],
    };

    return { context, gameData, mockBattleFsm };
}

// ─── 测试 ──────────────────────────────────────────────

describe('BattlePrepProcedure', () => {
    let procedure: BattlePrepProcedure;
    let fsm: ReturnType<typeof createMockProcedureFsm>;
    let context: IRpgProcedureContext;
    let gameData: RpgGameData;
    let mockBattleFsm: IFsm<unknown>;

    beforeEach(() => {
        const testData = createTestContext();
        context = testData.context;
        gameData = testData.gameData;
        mockBattleFsm = testData.mockBattleFsm;

        fsm = createMockProcedureFsm(context);
        procedure = new BattlePrepProcedure();
    });

    // ─── 敌人创建 ──────────────────────────────────────

    describe('敌人从配置表正确创建', () => {
        it('应根据关卡怪物列表创建正确数量的敌人', () => {
            procedure.onEnter(fsm);

            // 关卡 1 的怪物列表是 '1,1,2'，应创建 3 个敌人
            // 从黑板中验证
            expect(mockBattleFsm.setBlackboard).toHaveBeenCalledTimes(1);
            const calls = (mockBattleFsm.setBlackboard as jest.Mock).mock.calls as Array<
                [{ allCharacters: CharacterState[] }]
            >;
            const blackboard = calls[0][0];
            // 玩家 1 + 敌人 3 = 4 个角色
            const enemies = blackboard.allCharacters.filter(
                (c: CharacterState) => c.group === 'enemy',
            );
            expect(enemies).toHaveLength(3);
        });

        it('敌人属性应与怪物配置表一致', () => {
            procedure.onEnter(fsm);

            const calls = (mockBattleFsm.setBlackboard as jest.Mock).mock.calls as Array<
                [{ allCharacters: CharacterState[] }]
            >;
            const blackboard = calls[0][0];
            const enemies = blackboard.allCharacters.filter(
                (c: CharacterState) => c.group === 'enemy',
            );

            // 前两个是史莱姆（id=1），第三个是骷髅兵（id=2）
            expect(enemies[0].name).toBe('史莱姆');
            expect(enemies[0].hp).toBe(50);
            expect(enemies[0].atk).toBe(8);
            expect(enemies[0].def).toBe(3);
            expect(enemies[0].spd).toBe(5);

            expect(enemies[1].name).toBe('史莱姆');

            expect(enemies[2].name).toBe('骷髅兵');
            expect(enemies[2].hp).toBe(80);
            expect(enemies[2].atk).toBe(15);
        });

        it('敌人应标记为 enemy 阵营且存活', () => {
            procedure.onEnter(fsm);

            const calls = (mockBattleFsm.setBlackboard as jest.Mock).mock.calls as Array<
                [{ allCharacters: CharacterState[] }]
            >;
            const blackboard = calls[0][0];
            const enemies = blackboard.allCharacters.filter(
                (c: CharacterState) => c.group === 'enemy',
            );

            for (const enemy of enemies) {
                expect(enemy.group).toBe('enemy');
                expect(enemy.isAlive).toBe(true);
                expect(enemy.buffs).toEqual([]);
            }
        });
    });

    // ─── BattleFsm 创建 ──────────────────────────────

    describe('BattleFsm 创建', () => {
        it('应调用 fsmManager.createFsm 创建战斗 FSM', () => {
            procedure.onEnter(fsm);

            expect(context.fsmManager.createFsm).toHaveBeenCalledTimes(1);
        });

        it('创建的 FSM 应包含 6 个战斗状态', () => {
            procedure.onEnter(fsm);

            const createFsmArgs = (context.fsmManager.createFsm as jest.Mock).mock
                .calls[0] as unknown[];
            // createFsm(name, owner, ...states) → states 从第 3 个参数开始
            const states = createFsmArgs.slice(2);
            expect(states).toHaveLength(6);
        });

        it('应正确设置 BattleFsm 黑板数据', () => {
            procedure.onEnter(fsm);

            expect(mockBattleFsm.setBlackboard).toHaveBeenCalledWith(
                expect.objectContaining({
                    gameData: gameData,
                    maxRound: 10,
                }),
            );
        });
    });

    // ─── BGM 播放 ──────────────────────────────────────

    describe('BGM 播放', () => {
        it('应播放当前关卡的 BGM', () => {
            procedure.onEnter(fsm);

            expect(context.audioManager.playMusic).toHaveBeenCalledWith('bgm_village');
        });
    });

    // ─── 状态重置 ──────────────────────────────────────

    describe('战斗状态重置', () => {
        it('应重置 currentRound 为 0', () => {
            gameData.currentRound = 5;
            procedure.onEnter(fsm);

            expect(gameData.currentRound).toBe(0);
        });

        it('应清空 battleLog', () => {
            gameData.battleLog = ['旧日志'];
            procedure.onEnter(fsm);

            expect(gameData.battleLog).toEqual([]);
        });
    });

    // ─── 流程切换 ──────────────────────────────────────

    describe('切换到 BattleProcedure', () => {
        it('应在准备完成后切换流程', () => {
            jest.useFakeTimers();
            procedure.onEnter(fsm);
            jest.runAllTimers();

            expect(fsm.changeState).toHaveBeenCalledTimes(1);
            jest.useRealTimers();
        });
    });

    // ─── 边界情况 ──────────────────────────────────────

    describe('边界情况', () => {
        it('关卡不存在时应抛出错误', () => {
            gameData.selectedStageId = 999;

            expect(() => procedure.onEnter(fsm)).toThrow();
        });

        it('怪物 ID 在配置表中不存在时应抛出错误', () => {
            // 修改关卡配置包含不存在的怪物 ID
            (context.dataTableManager.getRow as jest.Mock).mockImplementation(
                (tableName: string, id: number) => {
                    if (tableName === 'stage_config' && id === 1) {
                        return createStageRow(1, '测试', '99', 'bgm_test', 10);
                    }
                    if (tableName === 'monster_config') return undefined;
                    return undefined;
                },
            );

            expect(() => procedure.onEnter(fsm)).toThrow();
        });
    });
});

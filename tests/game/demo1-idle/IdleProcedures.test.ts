/**
 * Idle Clicker Procedure 流程测试 —— 轻量级集成测试
 *
 * 注意：LaunchProcedure/PreloadProcedure/OfflineSettleProcedure 在 onEnter 中
 * 同步调用 changeProcedure，会触发 FSM 的反递归保护。因此这些流程的转换逻辑
 * 使用 mock FSM 独立测试；MainProcedure 和 SettingsProcedure 使用真实
 * ProcedureManager 测试其 onUpdate 驱动的双向切换。
 */

import { EventManager } from '@framework/event/EventManager';
import { TimerManager } from '@framework/timer/TimerManager';
import { DataTableManager } from '@framework/datatable/DataTableManager';
import { FsmManager } from '@framework/fsm/FsmManager';
import { ProcedureManager } from '@framework/procedure/ProcedureManager';
import { IFsm } from '@framework/fsm/FsmDefs';

import { BuildingSystem } from '@game/demo1-idle/systems/BuildingSystem';
import { AchievementSystem } from '@game/demo1-idle/systems/AchievementSystem';
import { OfflineRewardSystem } from '@game/demo1-idle/systems/OfflineRewardSystem';
import { SaveSystem, IStorage } from '@game/demo1-idle/systems/SaveSystem';
import { IdleGameData } from '@game/demo1-idle/data/IdleGameData';
import { BuildingConfigRow } from '@game/demo1-idle/data/BuildingConfigRow';
import { UpgradeCurveRow } from '@game/demo1-idle/data/UpgradeCurveRow';
import { AchievementConfigRow } from '@game/demo1-idle/data/AchievementConfigRow';
import { IProcedureContext, PROCEDURE_CONTEXT_KEY } from '@game/demo1-idle/procedures/ProcedureContext';

import { LaunchProcedure } from '@game/demo1-idle/procedures/LaunchProcedure';
import { PreloadProcedure } from '@game/demo1-idle/procedures/PreloadProcedure';
import { OfflineSettleProcedure } from '@game/demo1-idle/procedures/OfflineSettleProcedure';
import { MainProcedure } from '@game/demo1-idle/procedures/MainProcedure';
import { SettingsProcedure } from '@game/demo1-idle/procedures/SettingsProcedure';

// ─── 测试辅助 ──────────────────────────────────────────

/** 内存存储 mock */
class MapStorage implements IStorage {
    private _map = new Map<string, string>();
    getItem(key: string): string | null { return this._map.get(key) ?? null; }
    setItem(key: string, value: string): void { this._map.set(key, value); }
    removeItem(key: string): void { this._map.delete(key); }
}

function makeConfig(overrides: Partial<BuildingConfigRow> & { id: number }): BuildingConfigRow {
    const c = new BuildingConfigRow();
    Object.assign(c, {
        name: '',
        baseCost: 10,
        baseOutput: 1,
        outputInterval: 2,
        costMultiplier: 1.5,
        outputPerLevel: 1,
        maxLevel: 5,
        unlockCondition: 0,
        ...overrides,
    });
    return c;
}

function makeAchievement(overrides: Partial<AchievementConfigRow> & { id: number }): AchievementConfigRow {
    const a = new AchievementConfigRow();
    Object.assign(a, {
        name: '',
        desc: '',
        type: 'totalGold',
        target: 100,
        reward: 10,
        ...overrides,
    });
    return a;
}

const TEST_BUILDING_CONFIGS: BuildingConfigRow[] = [
    makeConfig({ id: 1, name: 'mine', baseCost: 10, baseOutput: 1, outputInterval: 2 }),
];

const TEST_ACHIEVEMENT_CONFIGS: AchievementConfigRow[] = [
    makeAchievement({ id: 1, name: '初次收入', type: 'totalGold', target: 10, reward: 5 }),
];

// ─── 共享环境构建 ──────────────────────────────────────

interface TestEnv {
    eventManager: EventManager;
    timerManager: TimerManager;
    dataTableManager: DataTableManager;
    fsmManager: FsmManager;
    gameData: IdleGameData;
    buildingSystem: BuildingSystem;
    achievementSystem: AchievementSystem;
    offlineRewardSystem: OfflineRewardSystem;
    saveSystem: SaveSystem;
    ctx: IProcedureContext;
}

function buildTestEnv(): TestEnv {
    const eventManager = new EventManager();
    eventManager.onInit();
    const timerManager = new TimerManager();
    timerManager.onInit();
    const dataTableManager = new DataTableManager();
    dataTableManager.onInit();
    const fsmManager = new FsmManager();
    fsmManager.onInit();

    // 注册数据表
    dataTableManager.createTable<BuildingConfigRow>('building_config', TEST_BUILDING_CONFIGS);
    dataTableManager.createTable<UpgradeCurveRow>('upgrade_curve', []);
    dataTableManager.createTable<AchievementConfigRow>('achievement_config', TEST_ACHIEVEMENT_CONFIGS);

    const gameData = new IdleGameData();
    const buildingSystem = new BuildingSystem(gameData, eventManager, timerManager);
    const achievementSystem = new AchievementSystem(gameData, eventManager);
    const offlineRewardSystem = new OfflineRewardSystem(eventManager);
    const saveSystem = new SaveSystem('test_save', eventManager, timerManager, new MapStorage());

    const ctx: IProcedureContext = {
        gameData,
        buildingSystem,
        achievementSystem,
        offlineRewardSystem,
        saveSystem,
        eventManager,
        timerManager,
        dataTableManager,
        fsmManager,
    };

    return {
        eventManager, timerManager, dataTableManager, fsmManager,
        gameData, buildingSystem, achievementSystem, offlineRewardSystem, saveSystem,
        ctx,
    };
}

function teardownEnv(env: TestEnv): void {
    env.buildingSystem.stopAllProduction();
    env.fsmManager.onShutdown();
    env.dataTableManager.onShutdown();
    env.timerManager.onShutdown();
    env.eventManager.onShutdown();
}

/** 创建 mock FSM 用于测试 onEnter 中的同步 changeProcedure */
function createMockFsm(ctx: IProcedureContext) {
    const dataMap = new Map<string, unknown>();
    dataMap.set(PROCEDURE_CONTEXT_KEY, ctx);

    const mockFsm = {
        name: '__procedure__',
        owner: {},
        currentState: null,
        isDestroyed: false,
        changeState: jest.fn(),
        getData: jest.fn((key: string) => dataMap.get(key)),
        setData: jest.fn((key: string, value: unknown) => { dataMap.set(key, value); }),
        removeData: jest.fn((key: string) => dataMap.delete(key)),
        hasState: jest.fn(() => true),
    };
    return mockFsm as unknown as IFsm<unknown> & { changeState: jest.Mock };
}

// ─── 测试套件 ──────────────────────────────────────────

describe('IdleProcedures — 流程测试', () => {
    let env: TestEnv;

    beforeEach(() => {
        jest.useFakeTimers();
        env = buildTestEnv();
    });

    afterEach(() => {
        teardownEnv(env);
        jest.useRealTimers();
    });

    // ─── LaunchProcedure ─────────────────────────────

    describe('LaunchProcedure', () => {
        it('onEnter 后切换到 PreloadProcedure', () => {
            const proc = new LaunchProcedure();
            const mockFsm = createMockFsm(env.ctx);

            proc.onEnter(mockFsm);
            jest.runAllTimers();

            expect(mockFsm.changeState).toHaveBeenCalledTimes(1);
            expect(mockFsm.changeState).toHaveBeenCalledWith(PreloadProcedure);
        });
    });

    // ─── PreloadProcedure ────────────────────────────

    describe('PreloadProcedure', () => {
        it('加载配置并注入系统后切换到 OfflineSettleProcedure', () => {
            const proc = new PreloadProcedure();
            const mockFsm = createMockFsm(env.ctx);
            const loadConfigsSpy = jest.spyOn(env.buildingSystem, 'loadConfigs');
            const loadAchSpy = jest.spyOn(env.achievementSystem, 'loadConfigs');

            proc.onEnter(mockFsm);
            jest.runAllTimers();

            expect(loadConfigsSpy).toHaveBeenCalledTimes(1);
            expect(loadAchSpy).toHaveBeenCalledTimes(1);

            // 验证传入正确数量的配置
            const buildingArgs = loadConfigsSpy.mock.calls[0];
            expect(buildingArgs[0]).toHaveLength(TEST_BUILDING_CONFIGS.length);

            // 验证切换到 OfflineSettleProcedure
            expect(mockFsm.changeState).toHaveBeenCalledWith(OfflineSettleProcedure);
        });

        it('缺少上下文时抛出错误', () => {
            const proc = new PreloadProcedure();
            const emptyFsm = createMockFsm(env.ctx);
            // 清空上下文
            (emptyFsm.getData as jest.Mock).mockReturnValue(undefined);

            expect(() => proc.onEnter(emptyFsm)).toThrow('Procedure 上下文缺失');
        });
    });

    // ─── OfflineSettleProcedure ──────────────────────

    describe('OfflineSettleProcedure', () => {
        it('无存档时直接切换到 MainProcedure', () => {
            const proc = new OfflineSettleProcedure();
            const mockFsm = createMockFsm(env.ctx);

            proc.onEnter(mockFsm);
            jest.runAllTimers();

            expect(mockFsm.changeState).toHaveBeenCalledWith(MainProcedure);
        });

        it('有存档时恢复数据、计算离线收益后切换到 MainProcedure', () => {
            // 准备存档数据
            const savedData = new IdleGameData();
            savedData.gold = 500;
            savedData.totalGoldEarned = 1000;
            savedData.clickPower = 5;
            savedData.buildings = [
                { id: 1, level: 2, owned: true, isUpgrading: false, upgradeStartTime: 0 },
            ];
            savedData.lastOnlineTime = Date.now() - 3600 * 1000; // 1 小时前
            savedData.lastSaveTime = Date.now() - 3600 * 1000;

            // 写入存档
            env.saveSystem.save(savedData);

            const rewardSpy = jest.spyOn(env.offlineRewardSystem, 'calculateReward');

            const proc = new OfflineSettleProcedure();
            const mockFsm = createMockFsm(env.ctx);
            proc.onEnter(mockFsm);
            jest.runAllTimers();

            // 验证离线收益被计算
            expect(rewardSpy).toHaveBeenCalledTimes(1);
            // 验证切换到 MainProcedure
            expect(mockFsm.changeState).toHaveBeenCalledWith(MainProcedure);
        });

        it('有存档时恢复 gameData 状态', () => {
            const savedData = new IdleGameData();
            savedData.gold = 500;
            savedData.totalGoldEarned = 1000;
            savedData.clickPower = 5;
            savedData.buildings = [
                { id: 1, level: 2, owned: true, isUpgrading: false, upgradeStartTime: 0 },
            ];
            savedData.lastOnlineTime = Date.now() - 60000;
            savedData.lastSaveTime = Date.now() - 60000;
            env.saveSystem.save(savedData);

            const proc = new OfflineSettleProcedure();
            const mockFsm = createMockFsm(env.ctx);
            proc.onEnter(mockFsm);

            // 验证 gameData 被恢复（save 时设置了 lastSaveTime/lastOnlineTime）
            expect(env.gameData.clickPower).toBe(5);
            expect(env.gameData.buildings).toHaveLength(1);
            expect(env.gameData.buildings[0].level).toBe(2);
        });
    });

    // ─── MainProcedure + SettingsProcedure 集成测试 ──

    describe('MainProcedure（真实 ProcedureManager）', () => {
        let procedureManager: ProcedureManager;
        let mainProc: MainProcedure;
        let settingsProc: SettingsProcedure;

        beforeEach(() => {
            procedureManager = new ProcedureManager();
            procedureManager.onInit();

            mainProc = new MainProcedure();
            settingsProc = new SettingsProcedure();

            // 只注册 Main 和 Settings，直接从 Main 启动
            procedureManager.initialize(mainProc, settingsProc);
            procedureManager.setData(PROCEDURE_CONTEXT_KEY, env.ctx);
        });

        afterEach(() => {
            procedureManager.onShutdown();
        });

        it('进入后启动建筑生产', () => {
            const startProdSpy = jest.spyOn(env.buildingSystem, 'startAllProduction');

            procedureManager.startProcedure(MainProcedure);
            expect(procedureManager.currentProcedure).toBeInstanceOf(MainProcedure);
            expect(startProdSpy).toHaveBeenCalledTimes(1);
        });

        it('requestSettings 后下一帧切换到 SettingsProcedure', () => {
            procedureManager.startProcedure(MainProcedure);

            mainProc.requestSettings();
            procedureManager.onUpdate(0.016);
            expect(procedureManager.currentProcedure).toBeInstanceOf(SettingsProcedure);
        });

        it('离开 Main 时停止生产并保存', () => {
            const stopProdSpy = jest.spyOn(env.buildingSystem, 'stopAllProduction');
            const saveSpy = jest.spyOn(env.saveSystem, 'save');

            procedureManager.startProcedure(MainProcedure);

            mainProc.requestSettings();
            procedureManager.onUpdate(0.016);

            expect(stopProdSpy).toHaveBeenCalled();
            expect(saveSpy).toHaveBeenCalled();
        });

        it('Settings → Main 双向切换', () => {
            procedureManager.startProcedure(MainProcedure);
            expect(procedureManager.currentProcedure).toBeInstanceOf(MainProcedure);

            // Main → Settings
            mainProc.requestSettings();
            procedureManager.onUpdate(0.016);
            expect(procedureManager.currentProcedure).toBeInstanceOf(SettingsProcedure);

            // Settings → Main
            settingsProc.requestBack();
            procedureManager.onUpdate(0.016);
            expect(procedureManager.currentProcedure).toBeInstanceOf(MainProcedure);

            // Main → Settings 再次
            mainProc.requestSettings();
            procedureManager.onUpdate(0.016);
            expect(procedureManager.currentProcedure).toBeInstanceOf(SettingsProcedure);
        });
    });

    // ─── SettingsProcedure ───────────────────────────

    describe('SettingsProcedure', () => {
        it('deleteSave 清除存档和重置游戏数据', () => {
            const mockFsm = createMockFsm(env.ctx);

            env.gameData.gold = 999;
            env.gameData.totalGoldEarned = 999;

            const clearSpy = jest.spyOn(env.saveSystem, 'clearSave');
            const resetSpy = jest.spyOn(env.gameData, 'reset');

            const proc = new SettingsProcedure();
            proc.deleteSave(mockFsm);

            expect(clearSpy).toHaveBeenCalled();
            expect(resetSpy).toHaveBeenCalled();
            expect(env.gameData.gold).toBe(0);
        });
    });

    // ─── Procedure 上下文 ────────────────────────────

    describe('Procedure 上下文', () => {
        it('上下文可通过 FSM getData 访问', () => {
            const mockFsm = createMockFsm(env.ctx);
            const retrieved = mockFsm.getData<IProcedureContext>(PROCEDURE_CONTEXT_KEY);

            expect(retrieved).toBeDefined();
            expect(retrieved!.gameData).toBe(env.gameData);
            expect(retrieved!.buildingSystem).toBe(env.buildingSystem);
            expect(retrieved!.eventManager).toBe(env.eventManager);
        });

        it('各流程 onEnter 均可正常访问上下文（不抛异常）', () => {
            const mockFsm = createMockFsm(env.ctx);

            // 每个 onEnter 内都会访问上下文，不抛异常即通过
            expect(() => new LaunchProcedure().onEnter(mockFsm)).not.toThrow();
            expect(() => new PreloadProcedure().onEnter(mockFsm)).not.toThrow();
            expect(() => new OfflineSettleProcedure().onEnter(mockFsm)).not.toThrow();
            expect(() => new MainProcedure().onEnter(mockFsm)).not.toThrow();
            expect(() => new SettingsProcedure().onEnter(mockFsm)).not.toThrow();
        });
    });
});

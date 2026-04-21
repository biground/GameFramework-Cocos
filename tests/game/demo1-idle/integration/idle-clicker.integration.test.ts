/**
 * @jest-environment jsdom
 */

/**
 * Idle Clicker Demo 集成测试
 *
 * 验证完整游戏生命周期：初始化、挖矿、购买建筑、自动产出、
 * 升级、成就、离线收益、保存/加载、shutdown 清理。
 */

import { GameModule } from '@framework/core/GameModule';
import { EventManager } from '@framework/event/EventManager';
import { DataTableManager } from '@framework/datatable/DataTableManager';
import { IdleClickerDemo } from '@game/demo1-idle/IdleClickerDemo';
import { IdleGameData } from '@game/demo1-idle/data/IdleGameData';
import { BuildingSystem } from '@game/demo1-idle/systems/BuildingSystem';
import { AchievementSystem } from '@game/demo1-idle/systems/AchievementSystem';
import { OfflineRewardSystem } from '@game/demo1-idle/systems/OfflineRewardSystem';
import { SaveSystem } from '@game/demo1-idle/systems/SaveSystem';
import { BuildingConfigRow } from '@game/demo1-idle/data/BuildingConfigRow';
import { UpgradeCurveRow } from '@game/demo1-idle/data/UpgradeCurveRow';
import { AchievementConfigRow } from '@game/demo1-idle/data/AchievementConfigRow';
import {
    GOLD_CHANGED,
    CLICK_MINE,
    BUILDING_PURCHASED,
    BUILDING_UPGRADED,
    BUILDING_OUTPUT,
    ACHIEVEMENT_UNLOCKED,
    OFFLINE_REWARD,
    GAME_SAVED,
} from '@game/demo1-idle/events/IdleEvents';

// ─── Mock Logger ───────────────────────────────────────

jest.mock('@framework/debug/Logger', () => {
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    class MockLogger {
        moduleName = 'Logger';
        priority = 0;
        onInit = jest.fn();
        onUpdate = jest.fn();
        onShutdown = jest.fn();

        static debug = jest.fn();
        static info = jest.fn();
        static warn = jest.fn();
        static error = jest.fn();
    }
    return { Logger: MockLogger };
});

// ─── 可测试子类 ────────────────────────────────────────

/**
 * 测试用子类
 *
 * 覆写 start()：跳过 Procedure 链的同步递归切换（FSM 不允许递归 changeState），
 * 手动执行各 Procedure 的初始化逻辑（加载配置、启动生产等），
 * 暴露内部系统以便断言。
 */
class TestIdleClickerDemo extends IdleClickerDemo {
    /** 获取游戏数据 */
    get gameData(): IdleGameData {
        return (this as unknown as { _gameData: IdleGameData })._gameData;
    }

    /** 获取建筑系统 */
    get buildingSystem(): BuildingSystem {
        return (this as unknown as { _buildingSystem: BuildingSystem })._buildingSystem;
    }

    /** 获取成就系统 */
    get achievementSystem(): AchievementSystem {
        return (this as unknown as { _achievementSystem: AchievementSystem })._achievementSystem;
    }

    /** 获取离线收益系统 */
    get offlineRewardSystem(): OfflineRewardSystem {
        return (this as unknown as { _offlineRewardSystem: OfflineRewardSystem })._offlineRewardSystem;
    }

    /** 获取存档系统 */
    get saveSystem(): SaveSystem {
        return (this as unknown as { _saveSystem: SaveSystem })._saveSystem;
    }

    /**
     * 覆写 start()：执行 bootstrap + 手动模拟 Procedure 链的效果。
     *
     * Procedure 链: Launch → Preload → OfflineSettle → Main
     * 由于 FSM 不允许递归 changeState，在测试中手动执行等效逻辑。
     */
    async start(): Promise<void> {
        // 1. bootstrap（注册模块 + setupProcedures + setupDataTables）
        this.bootstrap();

        // 2. 模拟 PreloadProcedure：从 DataTableManager 加载配置到系统
        const dtMgr = GameModule.getModule<DataTableManager>('DataTableManager');
        const buildingConfigs = [...dtMgr.getAllRows<BuildingConfigRow>('building_config')];
        const upgradeCurves = [...dtMgr.getAllRows<UpgradeCurveRow>('upgrade_curve')];
        const achievementConfigs = [...dtMgr.getAllRows<AchievementConfigRow>('achievement_config')];

        this.buildingSystem.loadConfigs(buildingConfigs, upgradeCurves);
        this.achievementSystem.loadConfigs(achievementConfigs);

        // 3. 模拟 MainProcedure：启动主循环
        this.startMainLoop(30);
    }

    /** 暴露 getModule 供测试使用 */
    getModuleAs<T>(name: string): T {
        return GameModule.getModule(name) as unknown as T;
    }
}

// ─── 测试套件 ──────────────────────────────────────────

describe('Idle Clicker Demo 集成测试', () => {
    let demo: TestIdleClickerDemo;

    beforeEach(() => {
        jest.useFakeTimers();
        GameModule.shutdownAll();
        demo = new TestIdleClickerDemo();
    });

    afterEach(() => {
        demo.shutdown();
        document.body.innerHTML = '';
        jest.useRealTimers();
        localStorage.clear();
    });

    /**
     * 辅助：启动游戏并推进一帧让 Procedure 链完成
     */
    function startGame(): void {
        demo.start();
        // 推进一帧，让 GameModule.update 驱动 Procedure 链
        jest.advanceTimersByTime(50);
    }

    /**
     * 辅助：推进 N 秒（驱动 TimerManager 内的定时器）
     */
    function advanceSeconds(seconds: number): void {
        // 分多步推进，每步驱动一次 GameModule.update
        const stepMs = 100;
        const totalMs = seconds * 1000;
        for (let elapsed = 0; elapsed < totalMs; elapsed += stepMs) {
            jest.advanceTimersByTime(stepMs);
        }
    }

    // ─── 场景 1：完整游戏初始化 ────────────────────────

    describe('完整游戏初始化', () => {
        it('start() 后所有框架模块可用', () => {
            startGame();

            const modules = [
                'EventManager', 'TimerManager', 'FsmManager',
                'ProcedureManager', 'DataTableManager', 'AudioManager',
                'ResourceManager', 'UIManager', 'SceneManager',
                'NetworkManager', 'EntityManager', 'LocalizationManager',
                'HotUpdateManager', 'DebugManager',
            ];
            for (const name of modules) {
                expect(GameModule.hasModule(name)).toBe(true);
            }
        });

        it('游戏系统被正确创建', () => {
            startGame();

            expect(demo.buildingSystem).toBeDefined();
            expect(demo.achievementSystem).toBeDefined();
            expect(demo.offlineRewardSystem).toBeDefined();
            expect(demo.saveSystem).toBeDefined();
        });

        it('数据表注册完成', () => {
            startGame();

            const dtMgr = GameModule.getModule<DataTableManager>('DataTableManager');
            expect(dtMgr.hasTable('building_config')).toBe(true);
            expect(dtMgr.hasTable('upgrade_curve')).toBe(true);
            expect(dtMgr.hasTable('achievement_config')).toBe(true);
        });

        it('HtmlRenderer DOM 元素存在', () => {
            startGame();

            // bootstrap 创建 HtmlRenderer，DOM 中应有元素
            const allElements = document.body.querySelectorAll('div');
            expect(allElements.length).toBeGreaterThan(0);
        });

        it('主循环已启动', () => {
            startGame();
            expect(demo.isRunning).toBe(true);
        });
    });

    // ─── 场景 2：手动点击挖矿 ─────────────────────────

    describe('手动点击挖矿', () => {
        it('点击挖矿后金币增加并触发 GOLD_CHANGED 事件', () => {
            startGame();

            const eventMgr = GameModule.getModule<EventManager>('EventManager');
            const goldSpy = jest.fn();
            const clickSpy = jest.fn();
            eventMgr.on(GOLD_CHANGED, goldSpy);
            eventMgr.on(CLICK_MINE, clickSpy);

            const goldBefore = demo.gameData.gold;
            demo.buildingSystem.clickMine();

            expect(demo.gameData.gold).toBe(goldBefore + demo.gameData.clickPower);
            expect(goldSpy).toHaveBeenCalled();
            expect(clickSpy).toHaveBeenCalledWith({ amount: demo.gameData.clickPower });
        });

        it('连续点击多次金币正确累加', () => {
            startGame();

            const clickCount = 10;
            for (let i = 0; i < clickCount; i++) {
                demo.buildingSystem.clickMine();
            }

            expect(demo.gameData.gold).toBe(clickCount * demo.gameData.clickPower);
            expect(demo.gameData.totalGoldEarned).toBe(clickCount * demo.gameData.clickPower);
        });
    });

    // ─── 场景 3：购买建筑 ──────────────────────────────

    describe('购买建筑', () => {
        it('金币充足时购买成功，扣除金币并触发 BUILDING_PURCHASED', () => {
            startGame();

            const eventMgr = GameModule.getModule<EventManager>('EventManager');
            const purchaseSpy = jest.fn();
            eventMgr.on(BUILDING_PURCHASED, purchaseSpy);

            // 给足金币
            demo.gameData.gold = 1000;
            demo.gameData.totalGoldEarned = 1000;

            const goldBefore = demo.gameData.gold;
            const result = demo.buildingSystem.purchaseBuilding(1);

            expect(result).toBe(true);
            expect(demo.gameData.gold).toBeLessThan(goldBefore);
            expect(demo.gameData.buildings.find((b) => b.id === 1)?.owned).toBe(true);
            expect(purchaseSpy).toHaveBeenCalledWith(
                expect.objectContaining({ buildingId: 1 }),
            );
        });

        it('金币不足时购买失败', () => {
            startGame();

            demo.gameData.gold = 1;
            const result = demo.buildingSystem.purchaseBuilding(1);
            expect(result).toBe(false);
            expect(demo.gameData.gold).toBe(1);
        });

        it('购买后生产 Timer 启动', () => {
            startGame();

            const eventMgr = GameModule.getModule<EventManager>('EventManager');
            const outputSpy = jest.fn();
            eventMgr.on(BUILDING_OUTPUT, outputSpy);

            demo.gameData.gold = 1000;
            demo.gameData.totalGoldEarned = 1000;
            demo.buildingSystem.purchaseBuilding(1);

            // 建筑 1 的 outputInterval = 1s，推进 2 秒应有产出
            advanceSeconds(2);

            expect(outputSpy).toHaveBeenCalled();
            expect(outputSpy.mock.calls[0][0]).toEqual(
                expect.objectContaining({ buildingId: 1 }),
            );
        });
    });

    // ─── 场景 4：建筑自动产出 ──────────────────────────

    describe('建筑自动产出', () => {
        it('购买建筑后按 outputInterval 周期产出金币', () => {
            startGame();

            // 建筑 1: baseCost=10, baseOutput=1, outputInterval=1s
            demo.gameData.gold = 100;
            demo.gameData.totalGoldEarned = 100;
            demo.buildingSystem.purchaseBuilding(1);

            const goldAfterPurchase = demo.gameData.gold;

            // 推进 3 秒，预期至少 2 次产出
            advanceSeconds(3);

            expect(demo.gameData.gold).toBeGreaterThan(goldAfterPurchase);
        });

        it('产出时触发 BUILDING_OUTPUT 事件', () => {
            startGame();

            const eventMgr = GameModule.getModule<EventManager>('EventManager');
            const outputSpy = jest.fn();
            eventMgr.on(BUILDING_OUTPUT, outputSpy);

            demo.gameData.gold = 100;
            demo.gameData.totalGoldEarned = 100;
            demo.buildingSystem.purchaseBuilding(1);

            advanceSeconds(3);

            expect(outputSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
            for (const call of outputSpy.mock.calls) {
                expect(call[0].buildingId).toBe(1);
                expect(call[0].amount).toBeGreaterThan(0);
            }
        });
    });

    // ─── 场景 5：建筑升级 ──────────────────────────────

    describe('建筑升级', () => {
        it('升级后等级增加、扣除金币、产出提升', () => {
            startGame();

            const eventMgr = GameModule.getModule<EventManager>('EventManager');
            const upgradeSpy = jest.fn();
            eventMgr.on(BUILDING_UPGRADED, upgradeSpy);

            // 购买建筑 1
            demo.gameData.gold = 10000;
            demo.gameData.totalGoldEarned = 10000;
            demo.buildingSystem.purchaseBuilding(1);

            const outputBeforeUpgrade = demo.buildingSystem.getBuildingOutput(1);
            const upgradeCost = demo.buildingSystem.getUpgradeCost(1);
            const goldBeforeUpgrade = demo.gameData.gold;

            // 升级
            const result = demo.buildingSystem.upgradeBuilding(1);

            expect(result).toBe(true);
            expect(demo.gameData.buildings.find((b) => b.id === 1)?.level).toBe(2);
            expect(demo.gameData.gold).toBe(goldBeforeUpgrade - upgradeCost);
            expect(demo.buildingSystem.getBuildingOutput(1)).toBeGreaterThan(outputBeforeUpgrade);
            expect(upgradeSpy).toHaveBeenCalledWith(
                expect.objectContaining({ buildingId: 1, oldLevel: 1, newLevel: 2 }),
            );
        });

        it('达到最大等级时升级失败', () => {
            startGame();

            demo.gameData.gold = 99999999;
            demo.gameData.totalGoldEarned = 99999999;
            demo.buildingSystem.purchaseBuilding(1);

            // 手动设为最大等级
            const state = demo.gameData.buildings.find((b) => b.id === 1)!;
            state.level = 10; // maxLevel = 10

            const result = demo.buildingSystem.upgradeBuilding(1);
            expect(result).toBe(false);
        });
    });

    // ─── 场景 6：成就系统 ──────────────────────────────

    describe('成就系统', () => {
        it('累计金币达到 10 后触发"初次收入"成就', () => {
            startGame();

            const eventMgr = GameModule.getModule<EventManager>('EventManager');
            const achievementSpy = jest.fn();
            eventMgr.on(ACHIEVEMENT_UNLOCKED, achievementSpy);

            // 手动挖矿足够多次达到 totalGold >= 10
            for (let i = 0; i < 15; i++) {
                demo.buildingSystem.clickMine();
            }

            // 触发成就检测
            demo.achievementSystem.checkAchievements();

            expect(achievementSpy).toHaveBeenCalledWith(
                expect.objectContaining({ achievementId: 1, reward: 5 }),
            );
            expect(demo.gameData.unlockedAchievements).toContain(1);
        });

        it('成就不会重复解锁', () => {
            startGame();

            const eventMgr = GameModule.getModule<EventManager>('EventManager');
            const achievementSpy = jest.fn();
            eventMgr.on(ACHIEVEMENT_UNLOCKED, achievementSpy);

            // 第一次
            demo.gameData.gold = 1000;
            demo.gameData.totalGoldEarned = 1000;
            demo.achievementSystem.checkAchievements();
            const firstCallCount = achievementSpy.mock.calls.length;

            // 第二次检测——不应有新的解锁
            demo.achievementSystem.checkAchievements();
            expect(achievementSpy.mock.calls.length).toBe(firstCallCount);
        });
    });

    // ─── 场景 7：离线收益 ──────────────────────────────

    describe('离线收益', () => {
        it('有产出建筑时计算正确的离线收益', () => {
            startGame();

            // 购买建筑 1 并停止实时生产（避免干扰）
            demo.gameData.gold = 1000;
            demo.gameData.totalGoldEarned = 1000;
            demo.buildingSystem.purchaseBuilding(1);
            demo.buildingSystem.stopAllProduction();

            // 获取配置用于计算
            const dtMgr = GameModule.getModule<DataTableManager>('DataTableManager');
            const buildingConfigs = [...dtMgr.getAllRows<BuildingConfigRow>('building_config')];
            const upgradeCurveRows = [...dtMgr.getAllRows<UpgradeCurveRow>('upgrade_curve')];
            const upgradeCurves = new Map<number, UpgradeCurveRow[]>();
            for (const row of upgradeCurveRows) {
                const list = upgradeCurves.get(row.buildingId);
                if (list) {
                    list.push(row);
                } else {
                    upgradeCurves.set(row.buildingId, [row]);
                }
            }

            // 模拟离线 1 小时
            const offlineSeconds = 3600;
            const now = Date.now();
            demo.gameData.lastOnlineTime = now - offlineSeconds * 1000;

            const reward = demo.offlineRewardSystem.calculateReward(
                demo.gameData,
                buildingConfigs,
                upgradeCurves,
                now,
            );

            // 建筑 1: output=1, interval=1s → 1/s × 3600s = 3600
            expect(reward).toBe(3600);
        });

        it('settleReward 正确加金币并触发事件', () => {
            startGame();

            const eventMgr = GameModule.getModule<EventManager>('EventManager');
            const rewardSpy = jest.fn();
            eventMgr.on(OFFLINE_REWARD, rewardSpy);

            const goldBefore = demo.gameData.gold;
            demo.gameData.lastOnlineTime = Date.now() - 60000;
            demo.offlineRewardSystem.settleReward(demo.gameData, 500);

            expect(demo.gameData.gold).toBe(goldBefore + 500);
            expect(rewardSpy).toHaveBeenCalledWith(
                expect.objectContaining({ totalReward: 500 }),
            );
        });

        it('无产出建筑时离线收益为 0', () => {
            startGame();

            const dtMgr = GameModule.getModule<DataTableManager>('DataTableManager');
            const buildingConfigs = [...dtMgr.getAllRows<BuildingConfigRow>('building_config')];

            demo.gameData.lastOnlineTime = Date.now() - 3600000;

            const reward = demo.offlineRewardSystem.calculateReward(
                demo.gameData,
                buildingConfigs,
                new Map(),
                Date.now(),
            );

            expect(reward).toBe(0);
        });
    });

    // ─── 场景 8：保存和加载 ────────────────────────────

    describe('保存和加载', () => {
        it('保存后可正确加载恢复状态', () => {
            startGame();

            // 积累游戏状态
            demo.gameData.gold = 500;
            demo.gameData.totalGoldEarned = 800;
            demo.gameData.clickPower = 3;
            demo.gameData.gold = 1000;
            demo.gameData.totalGoldEarned = 1000;
            demo.buildingSystem.purchaseBuilding(1);

            const goldBeforeSave = demo.gameData.gold;
            const buildingCountBeforeSave = demo.gameData.buildings.filter((b) => b.owned).length;

            // 保存
            demo.saveSystem.save(demo.gameData);

            // 重置
            demo.gameData.reset();
            expect(demo.gameData.gold).toBe(0);
            expect(demo.gameData.buildings.length).toBe(0);

            // 加载
            const loaded = demo.saveSystem.load();
            expect(loaded).not.toBeNull();
            expect(loaded!.gold).toBe(goldBeforeSave);
            expect(loaded!.buildings.filter((b) => b.owned).length).toBe(buildingCountBeforeSave);
        });

        it('保存时触发 GAME_SAVED 事件', () => {
            startGame();

            const eventMgr = GameModule.getModule<EventManager>('EventManager');
            const saveSpy = jest.fn();
            eventMgr.on(GAME_SAVED, saveSpy);

            demo.saveSystem.save(demo.gameData);

            expect(saveSpy).toHaveBeenCalledWith(
                expect.objectContaining({ timestamp: expect.any(Number) }),
            );
        });

        it('无存档时 load 返回 null', () => {
            startGame();

            // 确保没有存档
            demo.saveSystem.clearSave();

            const loaded = demo.saveSystem.load();
            expect(loaded).toBeNull();
        });

        it('clearSave 后 hasSave 返回 false', () => {
            startGame();

            demo.saveSystem.save(demo.gameData);
            expect(demo.saveSystem.hasSave()).toBe(true);

            demo.saveSystem.clearSave();
            expect(demo.saveSystem.hasSave()).toBe(false);
        });
    });

    // ─── 场景 9：shutdown 清理 ─────────────────────────

    describe('shutdown 清理', () => {
        it('shutdown 后主循环停止', () => {
            startGame();
            expect(demo.isRunning).toBe(true);

            demo.shutdown();
            expect(demo.isRunning).toBe(false);
        });

        it('shutdown 后所有模块被清理', () => {
            startGame();

            expect(GameModule.hasModule('EventManager')).toBe(true);
            expect(GameModule.hasModule('TimerManager')).toBe(true);

            demo.shutdown();

            expect(GameModule.hasModule('EventManager')).toBe(false);
            expect(GameModule.hasModule('TimerManager')).toBe(false);
        });

        it('shutdown 后 GameModule.update 不再驱动', () => {
            startGame();

            const updateSpy = jest.spyOn(GameModule, 'update');
            demo.shutdown();

            jest.advanceTimersByTime(500);
            // shutdown 中 stopMainLoop 清了 setInterval，不再调用 update
            expect(updateSpy).not.toHaveBeenCalled();

            updateSpy.mockRestore();
        });
    });
});

/**
 * BuildingSystem 单元测试
 */

import { EventManager } from '@framework/event/EventManager';
import { TimerManager } from '@framework/timer/TimerManager';
import { BuildingSystem } from '@game/demo1-idle/systems/BuildingSystem';
import { IdleGameData } from '@game/demo1-idle/data/IdleGameData';
import { BuildingConfigRow } from '@game/demo1-idle/data/BuildingConfigRow';
import { UpgradeCurveRow } from '@game/demo1-idle/data/UpgradeCurveRow';
import {
    GOLD_CHANGED,
    CLICK_MINE,
    BUILDING_PURCHASED,
    BUILDING_UPGRADED,
    BUILDING_OUTPUT,
} from '@game/demo1-idle/events/IdleEvents';

// ─── 测试数据 ──────────────────────────────────────────

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

const TEST_CONFIGS: BuildingConfigRow[] = [
    makeConfig({ id: 1, name: 'mine', baseCost: 10, baseOutput: 1, outputInterval: 2, costMultiplier: 1.5, outputPerLevel: 1, maxLevel: 5, unlockCondition: 0 }),
    makeConfig({ id: 2, name: 'lumber', baseCost: 50, baseOutput: 3, outputInterval: 3, costMultiplier: 1.6, outputPerLevel: 2, maxLevel: 5, unlockCondition: 100 }),
];

const TEST_CURVES: UpgradeCurveRow[] = [];

// ─── 测试套件 ──────────────────────────────────────────

describe('BuildingSystem', () => {
    let eventManager: EventManager;
    let timerManager: TimerManager;
    let gameData: IdleGameData;
    let system: BuildingSystem;

    beforeEach(() => {
        jest.useFakeTimers();
        eventManager = new EventManager();
        eventManager.onInit();
        timerManager = new TimerManager();
        timerManager.onInit();
        gameData = new IdleGameData();
        system = new BuildingSystem(gameData, eventManager, timerManager);
        system.loadConfigs(TEST_CONFIGS, TEST_CURVES);
    });

    afterEach(() => {
        system.stopAllProduction();
        timerManager.onShutdown();
        eventManager.onShutdown();
        jest.useRealTimers();
    });

    // ─── clickMine ────────────────────────────────────

    describe('clickMine', () => {
        it('增加金币并触发 GOLD_CHANGED 事件', () => {
            gameData.clickPower = 5;
            const goldSpy = jest.fn();
            const clickSpy = jest.fn();
            eventManager.on(GOLD_CHANGED, goldSpy);
            eventManager.on(CLICK_MINE, clickSpy);

            system.clickMine();

            expect(gameData.gold).toBe(5);
            expect(gameData.totalGoldEarned).toBe(5);
            expect(goldSpy).toHaveBeenCalledWith({ oldGold: 0, newGold: 5 });
            expect(clickSpy).toHaveBeenCalledWith({ amount: 5 });
        });
    });

    // ─── purchaseBuilding ─────────────────────────────

    describe('purchaseBuilding', () => {
        it('扣除金币并设置建筑为已拥有，触发 BUILDING_PURCHASED', () => {
            gameData.gold = 100;
            const spy = jest.fn();
            eventManager.on(BUILDING_PURCHASED, spy);

            const result = system.purchaseBuilding(1);

            expect(result).toBe(true);
            expect(gameData.gold).toBe(90); // 100 - 10
            expect(gameData.buildings.find(b => b.id === 1)?.owned).toBe(true);
            expect(spy).toHaveBeenCalledWith({ buildingId: 1, cost: 10 });
        });

        it('金币不足时购买失败', () => {
            gameData.gold = 5;
            const result = system.purchaseBuilding(1);
            expect(result).toBe(false);
            expect(gameData.gold).toBe(5);
        });

        it('建筑未解锁时购买失败（unlockCondition 未满足）', () => {
            gameData.gold = 1000;
            gameData.totalGoldEarned = 0; // lumber 需要 100
            const result = system.purchaseBuilding(2);
            expect(result).toBe(false);
        });

        it('解锁条件满足时可以购买', () => {
            gameData.gold = 1000;
            gameData.totalGoldEarned = 100; // lumber unlockCondition = 100
            const result = system.purchaseBuilding(2);
            expect(result).toBe(true);
            expect(gameData.gold).toBe(950); // 1000 - 50
        });

        it('已拥有的建筑不能重复购买', () => {
            gameData.gold = 100;
            system.purchaseBuilding(1);
            const goldBefore = gameData.gold;
            const result = system.purchaseBuilding(1);
            expect(result).toBe(false);
            expect(gameData.gold).toBe(goldBefore);
        });
    });

    // ─── upgradeBuilding ──────────────────────────────

    describe('upgradeBuilding', () => {
        beforeEach(() => {
            gameData.gold = 10000;
            system.purchaseBuilding(1); // 花费 10，等级 1
        });

        it('升级成功：等级增加、扣除金币、触发 BUILDING_UPGRADED', () => {
            const spy = jest.fn();
            eventManager.on(BUILDING_UPGRADED, spy);

            const cost = system.getUpgradeCost(1);
            const goldBefore = gameData.gold;
            const result = system.upgradeBuilding(1);

            expect(result).toBe(true);
            expect(gameData.buildings.find(b => b.id === 1)?.level).toBe(2);
            expect(gameData.gold).toBe(goldBefore - cost);
            expect(spy).toHaveBeenCalledWith(
                expect.objectContaining({ buildingId: 1, oldLevel: 1, newLevel: 2 }),
            );
        });

        it('达到最大等级时升级失败', () => {
            // 把等级手动设为 maxLevel
            const state = gameData.buildings.find(b => b.id === 1)!;
            state.level = 5; // maxLevel = 5
            const result = system.upgradeBuilding(1);
            expect(result).toBe(false);
        });
    });

    // ─── getUpgradeCost ───────────────────────────────

    describe('getUpgradeCost', () => {
        it('无升级曲线时使用指数公式 baseCost * costMultiplier^level', () => {
            // mine: baseCost=10, costMultiplier=1.5, level=0 → 10 * 1.5^0 = 10
            expect(system.getUpgradeCost(1)).toBe(10);

            // 购买后 level=1 → 10 * 1.5^1 = 15
            gameData.gold = 100;
            system.purchaseBuilding(1);
            expect(system.getUpgradeCost(1)).toBe(Math.floor(10 * Math.pow(1.5, 1)));
        });

        it('有升级曲线时优先使用曲线表', () => {
            const curve = new UpgradeCurveRow();
            Object.assign(curve, { id: 1, buildingId: 1, level: 2, cost: 999, output: 10, upgradeTime: 1 });
            system.loadConfigs(TEST_CONFIGS, [curve]);

            gameData.gold = 100;
            system.purchaseBuilding(1);
            // level=1，查 level=2 的曲线
            expect(system.getUpgradeCost(1)).toBe(999);
        });
    });

    // ─── getBuildingOutput ─────────────────────────────

    describe('getBuildingOutput', () => {
        it('公式计算产出: baseOutput + (level-1) * outputPerLevel', () => {
            gameData.gold = 100;
            system.purchaseBuilding(1); // level=1
            // mine: baseOutput=1, outputPerLevel=1, level=1 → 1 + 0*1 = 1
            expect(system.getBuildingOutput(1)).toBe(1);

            // 升级到 level 2
            system.upgradeBuilding(1);
            // 1 + (2-1)*1 = 2
            expect(system.getBuildingOutput(1)).toBe(2);
        });

        it('未拥有建筑产出为 0', () => {
            expect(system.getBuildingOutput(1)).toBe(0);
        });
    });

    // ─── getTotalOutputPerSecond ───────────────────────

    describe('getTotalOutputPerSecond', () => {
        it('汇总所有已拥有建筑的每秒产出', () => {
            gameData.gold = 10000;
            gameData.totalGoldEarned = 10000;
            system.purchaseBuilding(1); // mine: output=1, interval=2 → 0.5/s
            system.purchaseBuilding(2); // lumber: output=3, interval=3 → 1/s

            const total = system.getTotalOutputPerSecond();
            expect(total).toBeCloseTo(0.5 + 1, 5);
        });

        it('无建筑时返回 0', () => {
            expect(system.getTotalOutputPerSecond()).toBe(0);
        });
    });

    // ─── 生产 Timer ───────────────────────────────────

    describe('生产 Timer', () => {
        it('startAllProduction 为已拥有建筑创建生产 Timer', () => {
            gameData.gold = 10000;
            system.purchaseBuilding(1); // 购买时已自动启动 timer
            system.stopAllProduction();

            const spy = jest.fn();
            eventManager.on(BUILDING_OUTPUT, spy);

            system.startAllProduction();

            // mine outputInterval=2s，推进 2 秒
            timerManager.onUpdate(2);
            expect(spy).toHaveBeenCalledWith(expect.objectContaining({ buildingId: 1 }));
        });

        it('生产 Timer 周期性增加金币', () => {
            gameData.gold = 10000;
            system.purchaseBuilding(1);
            const goldAfterPurchase = gameData.gold;

            // mine: output=1, interval=2s，推进 6 秒 → 3 次产出
            timerManager.onUpdate(2);
            timerManager.onUpdate(2);
            timerManager.onUpdate(2);

            expect(gameData.gold).toBe(goldAfterPurchase + 3);
        });

        it('stopAllProduction 移除所有 Timer', () => {
            gameData.gold = 10000;
            system.purchaseBuilding(1);
            system.stopAllProduction();

            const goldBefore = gameData.gold;
            timerManager.onUpdate(10);
            expect(gameData.gold).toBe(goldBefore);
        });
    });
});

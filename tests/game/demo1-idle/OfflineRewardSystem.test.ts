/**
 * OfflineRewardSystem 单元测试
 */

import { EventManager } from '@framework/event/EventManager';
import { OfflineRewardSystem } from '@game/demo1-idle/systems/OfflineRewardSystem';
import { IdleGameData } from '@game/demo1-idle/data/IdleGameData';
import { BuildingConfigRow } from '@game/demo1-idle/data/BuildingConfigRow';
import { OFFLINE_REWARD, GOLD_CHANGED } from '@game/demo1-idle/events/IdleEvents';

// ─── 测试数据 ──────────────────────────────────────────

function makeConfig(overrides: Partial<BuildingConfigRow> & { id: number }): BuildingConfigRow {
    const c = new BuildingConfigRow();
    Object.assign(c, {
        name: '',
        baseCost: 10,
        baseOutput: 1,
        outputInterval: 1,
        costMultiplier: 1.5,
        outputPerLevel: 1,
        maxLevel: 5,
        unlockCondition: 0,
        ...overrides,
    });
    return c;
}

const TEST_CONFIGS: BuildingConfigRow[] = [
    makeConfig({ id: 1, name: 'mine', baseOutput: 2, outputInterval: 2, outputPerLevel: 1, maxLevel: 5 }),
    makeConfig({ id: 2, name: 'lumber', baseOutput: 6, outputInterval: 3, outputPerLevel: 2, maxLevel: 5 }),
];

// ─── 测试套件 ──────────────────────────────────────────

describe('OfflineRewardSystem', () => {
    let eventManager: EventManager;
    let system: OfflineRewardSystem;

    beforeEach(() => {
        eventManager = new EventManager();
        eventManager.onInit();
        system = new OfflineRewardSystem(eventManager);
    });

    afterEach(() => {
        eventManager.onShutdown();
    });

    describe('calculateReward', () => {
        it('无建筑时返回 0', () => {
            const gameData = new IdleGameData();
            gameData.lastOnlineTime = Date.now() - 60000;

            const reward = system.calculateReward(gameData, TEST_CONFIGS, new Map(), Date.now());

            expect(reward).toBe(0);
        });

        it('正确计算已拥有建筑的离线收益', () => {
            const gameData = new IdleGameData();
            // 拥有 mine (id=1, level=1): output=2, interval=2 → 1/s
            gameData.buildings.push({
                id: 1, level: 1, owned: true, isUpgrading: false, upgradeStartTime: 0,
            });

            const now = Date.now();
            gameData.lastOnlineTime = now - 100_000; // 离线 100 秒

            const reward = system.calculateReward(gameData, TEST_CONFIGS, new Map(), now);

            // outputPerSecond = 2 / 2 = 1, 100s → 100
            expect(reward).toBe(100);
        });

        it('多建筑产出叠加', () => {
            const gameData = new IdleGameData();
            gameData.buildings.push(
                { id: 1, level: 1, owned: true, isUpgrading: false, upgradeStartTime: 0 },
                { id: 2, level: 1, owned: true, isUpgrading: false, upgradeStartTime: 0 },
            );

            const now = Date.now();
            gameData.lastOnlineTime = now - 60_000; // 离线 60 秒

            const reward = system.calculateReward(gameData, TEST_CONFIGS, new Map(), now);

            // mine: 2/2 = 1/s, lumber: 6/3 = 2/s → total 3/s × 60s = 180
            expect(reward).toBe(180);
        });

        it('离线时长上限 24 小时', () => {
            const gameData = new IdleGameData();
            gameData.buildings.push({
                id: 1, level: 1, owned: true, isUpgrading: false, upgradeStartTime: 0,
            });

            const now = Date.now();
            // 离线 48 小时
            gameData.lastOnlineTime = now - 48 * 60 * 60 * 1000;

            const reward = system.calculateReward(gameData, TEST_CONFIGS, new Map(), now);

            // 上限 24h = 86400s, mine 1/s → 86400
            expect(reward).toBe(86400);
        });

        it('lastOnlineTime <= 0 时返回 0', () => {
            const gameData = new IdleGameData();
            gameData.lastOnlineTime = 0;

            const reward = system.calculateReward(gameData, TEST_CONFIGS, new Map(), Date.now());
            expect(reward).toBe(0);
        });
    });

    describe('settleReward', () => {
        it('增加金币并触发 GOLD_CHANGED 和 OFFLINE_REWARD 事件', () => {
            const gameData = new IdleGameData();
            gameData.gold = 100;
            gameData.totalGoldEarned = 100;
            gameData.lastOnlineTime = Date.now() - 60000;

            const goldSpy = jest.fn();
            const offlineSpy = jest.fn();
            eventManager.on(GOLD_CHANGED, goldSpy);
            eventManager.on(OFFLINE_REWARD, offlineSpy);

            system.settleReward(gameData, 500);

            expect(gameData.gold).toBe(600);
            expect(gameData.totalGoldEarned).toBe(600);
            expect(goldSpy).toHaveBeenCalledWith({ oldGold: 100, newGold: 600 });
            expect(offlineSpy).toHaveBeenCalledWith(
                expect.objectContaining({ totalReward: 500 }),
            );
        });

        it('奖励为 0 时不做任何操作', () => {
            const gameData = new IdleGameData();
            gameData.gold = 100;
            const spy = jest.fn();
            eventManager.on(GOLD_CHANGED, spy);

            system.settleReward(gameData, 0);

            expect(gameData.gold).toBe(100);
            expect(spy).not.toHaveBeenCalled();
        });
    });
});

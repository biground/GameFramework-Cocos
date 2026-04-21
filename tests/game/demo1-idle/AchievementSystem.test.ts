/**
 * AchievementSystem 单元测试
 */

import { EventManager } from '@framework/event/EventManager';
import { AchievementSystem } from '@game/demo1-idle/systems/AchievementSystem';
import { IdleGameData } from '@game/demo1-idle/data/IdleGameData';
import { AchievementConfigRow } from '@game/demo1-idle/data/AchievementConfigRow';
import { ACHIEVEMENT_UNLOCKED, GOLD_CHANGED } from '@game/demo1-idle/events/IdleEvents';

// ─── 测试数据 ──────────────────────────────────────────

function makeAchievement(overrides: Partial<AchievementConfigRow> & { id: number }): AchievementConfigRow {
    const c = new AchievementConfigRow();
    Object.assign(c, {
        name: '',
        desc: '',
        type: 'totalGold',
        target: 0,
        reward: 0,
        ...overrides,
    });
    return c;
}

const TEST_ACHIEVEMENTS: AchievementConfigRow[] = [
    makeAchievement({ id: 1, name: '初次收入', type: 'totalGold', target: 10, reward: 5 }),
    makeAchievement({ id: 2, name: '建筑收集者', type: 'buildingCount', target: 2, reward: 20 }),
    makeAchievement({ id: 3, name: '建筑大师', type: 'buildingLevel', target: 3, reward: 50 }),
];

// ─── 测试套件 ──────────────────────────────────────────

describe('AchievementSystem', () => {
    let eventManager: EventManager;
    let gameData: IdleGameData;
    let system: AchievementSystem;

    beforeEach(() => {
        eventManager = new EventManager();
        eventManager.onInit();
        gameData = new IdleGameData();
        system = new AchievementSystem(gameData, eventManager);
        system.loadConfigs(TEST_ACHIEVEMENTS);
    });

    afterEach(() => {
        eventManager.onShutdown();
    });

    // ─── totalGold 条件 ───────────────────────────────

    describe('totalGold 条件', () => {
        it('累计金币达标时解锁成就', () => {
            gameData.totalGoldEarned = 10;
            const spy = jest.fn();
            eventManager.on(ACHIEVEMENT_UNLOCKED, spy);

            system.checkAchievements();

            expect(spy).toHaveBeenCalledWith({ achievementId: 1, reward: 5 });
            expect(gameData.unlockedAchievements).toContain(1);
        });

        it('累计金币不足时不解锁', () => {
            gameData.totalGoldEarned = 5;
            const spy = jest.fn();
            eventManager.on(ACHIEVEMENT_UNLOCKED, spy);

            system.checkAchievements();

            expect(spy).not.toHaveBeenCalled();
            expect(gameData.unlockedAchievements).not.toContain(1);
        });
    });

    // ─── buildingLevel 条件 ───────────────────────────

    describe('buildingLevel 条件', () => {
        it('任意建筑等级达标时解锁成就', () => {
            gameData.buildings.push({
                id: 1, level: 3, owned: true, isUpgrading: false, upgradeStartTime: 0,
            });
            const spy = jest.fn();
            eventManager.on(ACHIEVEMENT_UNLOCKED, spy);

            system.checkAchievements();

            expect(spy).toHaveBeenCalledWith(
                expect.objectContaining({ achievementId: 3 }),
            );
        });

        it('等级不足时不解锁', () => {
            gameData.buildings.push({
                id: 1, level: 2, owned: true, isUpgrading: false, upgradeStartTime: 0,
            });

            system.checkAchievements();

            expect(gameData.unlockedAchievements).not.toContain(3);
        });
    });

    // ─── buildingCount 条件 ───────────────────────────

    describe('buildingCount 条件', () => {
        it('拥有建筑数量达标时解锁成就', () => {
            gameData.buildings.push(
                { id: 1, level: 1, owned: true, isUpgrading: false, upgradeStartTime: 0 },
                { id: 2, level: 1, owned: true, isUpgrading: false, upgradeStartTime: 0 },
            );
            const spy = jest.fn();
            eventManager.on(ACHIEVEMENT_UNLOCKED, spy);

            system.checkAchievements();

            expect(spy).toHaveBeenCalledWith(
                expect.objectContaining({ achievementId: 2 }),
            );
        });

        it('拥有数量不足时不解锁', () => {
            gameData.buildings.push(
                { id: 1, level: 1, owned: true, isUpgrading: false, upgradeStartTime: 0 },
            );

            system.checkAchievements();

            expect(gameData.unlockedAchievements).not.toContain(2);
        });
    });

    // ─── 已解锁跳过 ──────────────────────────────────

    describe('已解锁成就', () => {
        it('已解锁的成就不会重复触发', () => {
            gameData.totalGoldEarned = 10;
            gameData.unlockedAchievements.push(1);
            const spy = jest.fn();
            eventManager.on(ACHIEVEMENT_UNLOCKED, spy);

            system.checkAchievements();

            // 不应该再次触发 id=1 的成就
            expect(spy).not.toHaveBeenCalledWith(
                expect.objectContaining({ achievementId: 1 }),
            );
        });
    });

    // ─── 奖励金币 ────────────────────────────────────

    describe('奖励发放', () => {
        it('解锁成就后奖励金币加到 gameData', () => {
            gameData.totalGoldEarned = 10;
            gameData.gold = 100;
            const goldSpy = jest.fn();
            eventManager.on(GOLD_CHANGED, goldSpy);

            system.checkAchievements();

            expect(gameData.gold).toBe(105); // 100 + 5
            expect(gameData.totalGoldEarned).toBe(15); // 10 + 5
            expect(goldSpy).toHaveBeenCalledWith({ oldGold: 100, newGold: 105 });
        });
    });
});

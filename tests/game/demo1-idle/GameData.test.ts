/**
 * IdleGameData 单元测试
 */

import { IdleGameData } from '@game/demo1-idle/data/IdleGameData';

describe('IdleGameData', () => {
    // ─── toJSON ───────────────────────────────────────

    describe('toJSON', () => {
        it('返回有效的 JSON 字符串', () => {
            const data = new IdleGameData();
            data.gold = 100;
            data.totalGoldEarned = 200;
            data.clickPower = 5;

            const json = data.toJSON();
            const parsed = JSON.parse(json);

            expect(parsed.gold).toBe(100);
            expect(parsed.totalGoldEarned).toBe(200);
            expect(parsed.clickPower).toBe(5);
        });

        it('包含建筑和成就数据', () => {
            const data = new IdleGameData();
            data.buildings.push({
                id: 1, level: 3, owned: true, isUpgrading: false, upgradeStartTime: 0,
            });
            data.unlockedAchievements.push(1, 2);

            const json = data.toJSON();
            const parsed = JSON.parse(json);

            expect(parsed.buildings).toHaveLength(1);
            expect(parsed.buildings[0].id).toBe(1);
            expect(parsed.unlockedAchievements).toEqual([1, 2]);
        });
    });

    // ─── fromJSON ─────────────────────────────────────

    describe('fromJSON', () => {
        it('正确还原所有字段', () => {
            const json = JSON.stringify({
                gold: 500,
                totalGoldEarned: 1000,
                clickPower: 3,
                buildings: [
                    { id: 1, level: 2, owned: true, isUpgrading: false, upgradeStartTime: 0 },
                ],
                unlockedAchievements: [1, 3],
                lastSaveTime: 12345,
                lastOnlineTime: 67890,
            });

            const data = IdleGameData.fromJSON(json);

            expect(data.gold).toBe(500);
            expect(data.totalGoldEarned).toBe(1000);
            expect(data.clickPower).toBe(3);
            expect(data.buildings).toHaveLength(1);
            expect(data.buildings[0].id).toBe(1);
            expect(data.buildings[0].level).toBe(2);
            expect(data.buildings[0].owned).toBe(true);
            expect(data.unlockedAchievements).toEqual([1, 3]);
            expect(data.lastSaveTime).toBe(12345);
            expect(data.lastOnlineTime).toBe(67890);
        });

        it('缺少字段时使用默认值', () => {
            const data = IdleGameData.fromJSON('{}');

            expect(data.gold).toBe(0);
            expect(data.clickPower).toBe(1);
            expect(data.buildings).toEqual([]);
            expect(data.unlockedAchievements).toEqual([]);
        });

        it('无效 JSON 抛出异常', () => {
            expect(() => IdleGameData.fromJSON('not json')).toThrow();
        });
    });

    // ─── reset ────────────────────────────────────────

    describe('reset', () => {
        it('重置为初始状态', () => {
            const data = new IdleGameData();
            data.gold = 999;
            data.totalGoldEarned = 999;
            data.clickPower = 10;
            data.buildings.push({
                id: 1, level: 5, owned: true, isUpgrading: false, upgradeStartTime: 0,
            });
            data.unlockedAchievements.push(1, 2, 3);
            data.lastSaveTime = 99999;
            data.lastOnlineTime = 99999;

            data.reset();

            expect(data.gold).toBe(0);
            expect(data.totalGoldEarned).toBe(0);
            expect(data.clickPower).toBe(1);
            expect(data.buildings).toEqual([]);
            expect(data.unlockedAchievements).toEqual([]);
            expect(data.lastSaveTime).toBe(0);
            expect(data.lastOnlineTime).toBe(0);
        });
    });

    // ─── Round-trip ───────────────────────────────────

    describe('序列化 Round-trip', () => {
        it('save → load 保留所有数据', () => {
            const original = new IdleGameData();
            original.gold = 12345;
            original.totalGoldEarned = 99999;
            original.clickPower = 7;
            original.buildings.push(
                { id: 1, level: 3, owned: true, isUpgrading: false, upgradeStartTime: 0 },
                { id: 2, level: 5, owned: true, isUpgrading: true, upgradeStartTime: 1000 },
            );
            original.unlockedAchievements.push(1, 4, 7);
            original.lastSaveTime = 1111111;
            original.lastOnlineTime = 2222222;

            const json = original.toJSON();
            const restored = IdleGameData.fromJSON(json);

            expect(restored.gold).toBe(original.gold);
            expect(restored.totalGoldEarned).toBe(original.totalGoldEarned);
            expect(restored.clickPower).toBe(original.clickPower);
            expect(restored.buildings).toHaveLength(2);
            expect(restored.buildings[0]).toEqual(original.buildings[0]);
            expect(restored.buildings[1]).toEqual(original.buildings[1]);
            expect(restored.unlockedAchievements).toEqual(original.unlockedAchievements);
            expect(restored.lastSaveTime).toBe(original.lastSaveTime);
            expect(restored.lastOnlineTime).toBe(original.lastOnlineTime);
        });
    });
});

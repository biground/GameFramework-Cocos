/**
 * SaveSystem 单元测试
 */

import { EventManager } from '@framework/event/EventManager';
import { TimerManager } from '@framework/timer/TimerManager';
import { SaveSystem, MapStorage } from '@game/demo1-idle/systems/SaveSystem';
import { IdleGameData } from '@game/demo1-idle/data/IdleGameData';
import { GAME_SAVED } from '@game/demo1-idle/events/IdleEvents';

// ─── 测试套件 ──────────────────────────────────────────

describe('SaveSystem', () => {
    let eventManager: EventManager;
    let timerManager: TimerManager;
    let storage: MapStorage;
    let system: SaveSystem;
    const SAVE_KEY = 'test_idle_save';

    beforeEach(() => {
        jest.useFakeTimers();
        eventManager = new EventManager();
        eventManager.onInit();
        timerManager = new TimerManager();
        timerManager.onInit();
        storage = new MapStorage();
        system = new SaveSystem(SAVE_KEY, eventManager, timerManager, storage);
    });

    afterEach(() => {
        system.stopAutoSave();
        timerManager.onShutdown();
        eventManager.onShutdown();
        jest.useRealTimers();
    });

    // ─── save / load ──────────────────────────────────

    describe('save', () => {
        it('将游戏数据序列化保存到存储', () => {
            const gameData = new IdleGameData();
            gameData.gold = 999;
            gameData.clickPower = 3;

            system.save(gameData);

            expect(storage.getItem(SAVE_KEY)).toBeTruthy();
            const parsed = JSON.parse(storage.getItem(SAVE_KEY)!);
            expect(parsed.gold).toBe(999);
            expect(parsed.clickPower).toBe(3);
        });

        it('保存后触发 GAME_SAVED 事件', () => {
            const spy = jest.fn();
            eventManager.on(GAME_SAVED, spy);

            system.save(new IdleGameData());

            expect(spy).toHaveBeenCalledWith(
                expect.objectContaining({ timestamp: expect.any(Number) }),
            );
        });
    });

    describe('load', () => {
        it('正确还原游戏数据', () => {
            const gameData = new IdleGameData();
            gameData.gold = 500;
            gameData.totalGoldEarned = 1000;
            gameData.buildings.push({
                id: 1, level: 3, owned: true, isUpgrading: false, upgradeStartTime: 0,
            });
            system.save(gameData);

            const loaded = system.load();

            expect(loaded).not.toBeNull();
            expect(loaded!.gold).toBe(500);
            expect(loaded!.totalGoldEarned).toBe(1000);
            expect(loaded!.buildings).toHaveLength(1);
            expect(loaded!.buildings[0].id).toBe(1);
            expect(loaded!.buildings[0].level).toBe(3);
        });

        it('无存档时返回 null', () => {
            const loaded = system.load();
            expect(loaded).toBeNull();
        });
    });

    // ─── hasSave / deleteSave ─────────────────────────

    describe('hasSave', () => {
        it('无存档时返回 false', () => {
            expect(system.hasSave()).toBe(false);
        });

        it('有存档时返回 true', () => {
            system.save(new IdleGameData());
            expect(system.hasSave()).toBe(true);
        });
    });

    describe('deleteSave', () => {
        it('删除存档后 hasSave 返回 false', () => {
            system.save(new IdleGameData());
            expect(system.hasSave()).toBe(true);

            system.deleteSave();
            expect(system.hasSave()).toBe(false);
        });
    });

    // ─── 自动保存 ────────────────────────────────────

    describe('自动保存', () => {
        it('按间隔周期性保存', () => {
            const gameData = new IdleGameData();
            gameData.gold = 10;

            system.startAutoSave(gameData, 5);

            // 推进 5 秒 → 第 1 次自动保存
            timerManager.onUpdate(5);
            const loaded1 = system.load();
            expect(loaded1).not.toBeNull();
            expect(loaded1!.gold).toBe(10);

            // 修改金币后再推进 5 秒 → 第 2 次自动保存
            gameData.gold = 999;
            timerManager.onUpdate(5);
            const loaded2 = system.load();
            expect(loaded2!.gold).toBe(999);
        });

        it('stopAutoSave 停止后不再自动保存', () => {
            const gameData = new IdleGameData();
            system.startAutoSave(gameData, 5);
            system.stopAutoSave();

            timerManager.onUpdate(10);
            expect(system.hasSave()).toBe(false);
        });
    });
});

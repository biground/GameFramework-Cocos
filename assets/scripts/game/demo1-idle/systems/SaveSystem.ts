/**
 * 存档系统 —— Idle Clicker 自动保存/加载
 *
 * 使用 JSON 序列化将游戏状态持久化到 localStorage（或注入的存储实现）。
 * 支持自动定时保存和手动保存/加载/删除。
 * @module
 */

import { EventManager } from '@framework/event/EventManager';
import { TimerManager } from '@framework/timer/TimerManager';
import { TIMER_REPEAT_FOREVER } from '@framework/timer/TimerDefs';
import { Logger } from '@framework/debug/Logger';
import { IdleGameData } from '@game/demo1-idle/data/IdleGameData';
import { GAME_SAVED } from '@game/demo1-idle/events/IdleEvents';

const TAG = 'SaveSystem';

/** 默认自动保存间隔（秒） */
const DEFAULT_AUTO_SAVE_INTERVAL = 30;

/**
 * 存储接口，用于解耦 localStorage 依赖
 */
export interface IStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

/**
 * 存档系统
 *
 * 提供游戏数据的序列化/反序列化、自动保存和存档管理。
 */
export class SaveSystem {
    private _saveKey: string;
    private _eventManager: EventManager;
    private _timerManager: TimerManager;
    private _autoSaveTimerId: number | null = null;
    /** 存储后端，默认 localStorage，可注入测试用 mock */
    private _storage: IStorage;

    constructor(
        saveKey: string,
        eventManager: EventManager,
        timerManager: TimerManager,
        storage?: IStorage,
    ) {
        this._saveKey = saveKey;
        this._eventManager = eventManager;
        this._timerManager = timerManager;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        this._storage = storage ?? (typeof localStorage !== 'undefined' ? localStorage : new MapStorage());
    }

    /**
     * 保存游戏数据
     * @param gameData 当前游戏状态
     */
    save(gameData: IdleGameData): void {
        gameData.lastSaveTime = Date.now();
        gameData.lastOnlineTime = Date.now();
        const json = gameData.toJSON();
        this._storage.setItem(this._saveKey, json);
        this._eventManager.emit(GAME_SAVED, { timestamp: gameData.lastSaveTime });
        Logger.debug(TAG, `游戏已保存, key=${this._saveKey}`);
    }

    /**
     * 加载游戏数据
     * @returns 反序列化后的游戏状态，无存档时返回 null
     */
    load(): IdleGameData | null {
        const json = this._storage.getItem(this._saveKey);
        if (!json) {
            Logger.debug(TAG, '无存档数据');
            return null;
        }
        try {
            const data = IdleGameData.fromJSON(json);
            Logger.info(TAG, `存档加载成功, 金币=${data.gold}`);
            return data;
        } catch (e) {
            Logger.error(TAG, '存档数据解析失败', e);
            return null;
        }
    }

    /**
     * 启动自动保存
     * @param gameData 游戏状态引用
     * @param intervalSeconds 保存间隔秒数（默认 30 秒）
     */
    startAutoSave(gameData: IdleGameData, intervalSeconds: number = DEFAULT_AUTO_SAVE_INTERVAL): void {
        this.stopAutoSave();
        this._autoSaveTimerId = this._timerManager.addTimer(
            intervalSeconds,
            () => {
                this.save(gameData);
            },
            { repeat: TIMER_REPEAT_FOREVER },
        );
        Logger.info(TAG, `自动保存已启动, 间隔 ${intervalSeconds}s`);
    }

    /**
     * 停止自动保存
     */
    stopAutoSave(): void {
        if (this._autoSaveTimerId !== null) {
            this._timerManager.removeTimer(this._autoSaveTimerId);
            this._autoSaveTimerId = null;
            Logger.info(TAG, '自动保存已停止');
        }
    }

    /**
     * 删除存档
     */
    deleteSave(): void {
        this._storage.removeItem(this._saveKey);
        Logger.info(TAG, `存档已删除, key=${this._saveKey}`);
    }

    /**
     * 检查是否有存档
     * @returns 是否存在存档数据
     */
    hasSave(): boolean {
        return this._storage.getItem(this._saveKey) !== null;
    }

    /**
     * 清除存档数据
     */
    clearSave(): void {
        this._storage.removeItem(this._saveKey);
        Logger.info(TAG, `存档已清除, key=${this._saveKey}`);
    }
}

/**
 * 基于 Map 的内存存储实现（测试 / 无 localStorage 环境使用）
 */
export class MapStorage implements IStorage {
    private _map: Map<string, string> = new Map();

    getItem(key: string): string | null {
        return this._map.get(key) ?? null;
    }

    setItem(key: string, value: string): void {
        this._map.set(key, value);
    }

    removeItem(key: string): void {
        this._map.delete(key);
    }
}

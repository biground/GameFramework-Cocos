/**
 * 成就系统 —— Idle Clicker 成就检测与解锁
 *
 * 检查条件类型：totalGold / buildingLevel / buildingCount。
 * 成就解锁后发事件并发放奖励金币。
 * @module
 */

import { EventManager } from '@framework/event/EventManager';
import { Logger } from '@framework/debug/Logger';
import { IdleGameData } from '@game/demo1-idle/data/IdleGameData';
import { AchievementConfigRow } from '@game/demo1-idle/data/AchievementConfigRow';
import { ACHIEVEMENT_UNLOCKED, GOLD_CHANGED } from '@game/demo1-idle/events/IdleEvents';

const TAG = 'AchievementSystem';

/**
 * 成就系统
 *
 * 管理成就的解锁检测和奖励发放。
 */
export class AchievementSystem {
    private _configs: AchievementConfigRow[] = [];
    private _eventManager: EventManager;
    private _gameData: IdleGameData;

    constructor(gameData: IdleGameData, eventManager: EventManager) {
        this._gameData = gameData;
        this._eventManager = eventManager;
    }

    /**
     * 加载成就配置
     * @param configs 成就配置列表
     */
    loadConfigs(configs: AchievementConfigRow[]): void {
        this._configs = configs;
        Logger.info(TAG, `成就配置加载完成: ${configs.length} 个成就`);
    }

    /**
     * 检查所有成就（在金币变化、升级等事件后调用）
     *
     * 遍历所有未解锁成就，按条件类型检测是否达成。
     * 解锁后发放奖励金币并触发事件。
     */
    checkAchievements(): void {
        for (const config of this._configs) {
            // 跳过已解锁
            if (this._gameData.unlockedAchievements.includes(config.id)) {
                continue;
            }

            if (this._checkCondition(config)) {
                this._unlock(config);
            }
        }
    }

    /**
     * 获取已解锁成就列表
     * @returns 已解锁的成就配置
     */
    getUnlockedAchievements(): AchievementConfigRow[] {
        return this._configs.filter((c) =>
            this._gameData.unlockedAchievements.includes(c.id),
        );
    }

    /**
     * 获取未解锁成就列表
     * @returns 未解锁的成就配置
     */
    getLockedAchievements(): AchievementConfigRow[] {
        return this._configs.filter((c) =>
            !this._gameData.unlockedAchievements.includes(c.id),
        );
    }

    /**
     * 检查单个成就条件是否满足
     * @param config 成就配置
     * @returns 是否满足
     */
    private _checkCondition(config: AchievementConfigRow): boolean {
        switch (config.type) {
            case 'totalGold':
                return this._gameData.totalGoldEarned >= config.target;

            case 'buildingLevel':
                return this._gameData.buildings.some(
                    (b) => b.owned && b.level >= config.target,
                );

            case 'buildingCount':
                return this._gameData.buildings.filter((b) => b.owned).length >= config.target;

            default:
                Logger.warn(TAG, `未知成就类型: ${config.type as string}`);
                return false;
        }
    }

    /**
     * 解锁成就并发放奖励
     * @param config 成就配置
     */
    private _unlock(config: AchievementConfigRow): void {
        this._gameData.unlockedAchievements.push(config.id);

        // 发放奖励金币
        if (config.reward > 0) {
            const oldGold = this._gameData.gold;
            this._gameData.gold += config.reward;
            this._gameData.totalGoldEarned += config.reward;
            this._eventManager.emit(GOLD_CHANGED, { oldGold, newGold: this._gameData.gold });
        }

        this._eventManager.emit(ACHIEVEMENT_UNLOCKED, {
            achievementId: config.id,
            reward: config.reward,
        });

        Logger.info(TAG, `成就解锁: "${config.name}" (ID=${config.id}), 奖励 ${config.reward} 金币`);
    }
}

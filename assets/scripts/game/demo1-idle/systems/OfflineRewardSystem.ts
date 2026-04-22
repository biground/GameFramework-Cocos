/**
 * 离线收益系统 —— Idle Clicker 离线产出计算与结算
 *
 * 根据离线时长和建筑产出计算离线收益，支持上限（最多 24 小时）。
 * @module
 */

import { EventManager } from '@framework/event/EventManager';
import { Logger } from '@framework/debug/Logger';
import { IdleGameData } from '@game/demo1-idle/data/IdleGameData';
import { BuildingConfigRow } from '@game/demo1-idle/data/BuildingConfigRow';
import { UpgradeCurveRow } from '@game/demo1-idle/data/UpgradeCurveRow';
import { OFFLINE_REWARD, GOLD_CHANGED } from '@game/demo1-idle/events/IdleEvents';

const TAG = 'OfflineRewardSystem';

/** 最大离线收益时长（秒）—— 24 小时 */
const MAX_OFFLINE_SECONDS = 24 * 60 * 60;

/**
 * 离线收益系统
 *
 * 计算玩家离线期间建筑的自动产出总量并结算。
 */
export class OfflineRewardSystem {
    private _eventManager: EventManager;

    constructor(eventManager: EventManager) {
        this._eventManager = eventManager;
    }

    /**
     * 计算离线收益
     * @param gameData 游戏状态
     * @param buildingConfigs 建筑配置列表
     * @param upgradeCurves 升级曲线映射
     * @param currentTime 当前时间戳（毫秒）
     * @returns 离线收益金币量
     */
    calculateReward(
        gameData: IdleGameData,
        buildingConfigs: BuildingConfigRow[],
        upgradeCurves: Map<number, UpgradeCurveRow[]>,
        currentTime: number,
    ): number {
        if (gameData.lastOnlineTime <= 0) {
            return 0;
        }

        const offlineMs = currentTime - gameData.lastOnlineTime;
        if (offlineMs <= 0) {
            return 0;
        }

        let offlineSeconds = offlineMs / 1000;
        // 上限 24 小时
        if (offlineSeconds > MAX_OFFLINE_SECONDS) {
            offlineSeconds = MAX_OFFLINE_SECONDS;
        }

        let totalReward = 0;
        for (const state of gameData.buildings) {
            if (!state.owned || state.level <= 0) {
                continue;
            }

            const config = buildingConfigs.find((c) => c.id === state.id);
            if (!config || config.outputInterval <= 0) {
                continue;
            }

            const output = this._getBuildingOutput(state.id, state.level, config, upgradeCurves);
            const outputPerSecond = output / config.outputInterval;
            totalReward += outputPerSecond * offlineSeconds;
        }

        totalReward = Math.floor(totalReward);
        Logger.info(TAG, `离线 ${Math.floor(offlineSeconds)}s, 收益 ${totalReward} 金币`);
        return totalReward;
    }

    /**
     * 结算离线收益（加金币 + 发事件）
     * @param gameData 游戏状态
     * @param reward 离线收益金币量
     */
    settleReward(gameData: IdleGameData, reward: number): void {
        if (reward <= 0) {
            return;
        }

        const oldGold = gameData.gold;
        gameData.gold += reward;
        gameData.totalGoldEarned += reward;

        this._eventManager.emit(GOLD_CHANGED, { oldGold, newGold: gameData.gold });

        const offlineSeconds = gameData.lastOnlineTime > 0
            ? Math.floor((Date.now() - gameData.lastOnlineTime) / 1000)
            : 0;
        this._eventManager.emit(OFFLINE_REWARD, { offlineSeconds, totalReward: reward });

        Logger.info(TAG, `离线收益结算: +${reward} 金币`);
    }

    /**
     * 获取建筑当前等级的产出量
     * @param buildingId 建筑 ID
     * @param level 当前等级
     * @param config 建筑配置
     * @param upgradeCurves 升级曲线映射
     * @returns 每次产出周期的金币量
     */
    private _getBuildingOutput(
        buildingId: number,
        level: number,
        config: BuildingConfigRow,
        upgradeCurves: Map<number, UpgradeCurveRow[]>,
    ): number {
        // 优先使用升级曲线表
        const curves = upgradeCurves.get(buildingId);
        if (curves) {
            const curve = curves.find((c) => c.level === level);
            if (curve) {
                return curve.output;
            }
        }

        // 回退到公式
        return config.baseOutput + (level - 1) * config.outputPerLevel;
    }
}

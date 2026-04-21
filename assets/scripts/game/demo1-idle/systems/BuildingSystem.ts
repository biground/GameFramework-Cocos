/**
 * 建筑系统 —— Idle Clicker 核心建筑管理
 *
 * 负责建筑的购买、升级、产出计算、生产 Timer 管理。
 * 游戏层系统类，不继承 ModuleBase。
 * @module
 */

import { EventManager } from '@framework/event/EventManager';
import { TimerManager } from '@framework/timer/TimerManager';
import { TIMER_REPEAT_FOREVER } from '@framework/timer/TimerDefs';
import { Logger } from '@framework/debug/Logger';
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

const TAG = 'BuildingSystem';

/**
 * 建筑系统
 *
 * 管理建筑的购买、升级、自动产出和手动点击挖矿。
 * 所有金币变动通过事件通知外部。
 */
export class BuildingSystem {
    private _gameData: IdleGameData;
    private _eventManager: EventManager;
    private _timerManager: TimerManager;
    private _buildingConfigs: BuildingConfigRow[] = [];
    private _upgradeCurves: Map<number, UpgradeCurveRow[]> = new Map();
    private _productionTimerIds: Map<number, number> = new Map();

    constructor(gameData: IdleGameData, eventManager: EventManager, timerManager: TimerManager) {
        this._gameData = gameData;
        this._eventManager = eventManager;
        this._timerManager = timerManager;
    }

    /**
     * 加载配置数据
     * @param buildings 建筑配置列表
     * @param curves 升级曲线列表
     */
    loadConfigs(buildings: BuildingConfigRow[], curves: UpgradeCurveRow[]): void {
        this._buildingConfigs = buildings;
        this._upgradeCurves = new Map();
        for (const curve of curves) {
            const list = this._upgradeCurves.get(curve.buildingId);
            if (list) {
                list.push(curve);
            } else {
                this._upgradeCurves.set(curve.buildingId, [curve]);
            }
        }
        Logger.info(TAG, `配置加载完成: ${buildings.length} 栋建筑, ${curves.length} 条升级曲线`);
    }

    /**
     * 手动点击挖矿，增加 clickPower 数量的金币
     */
    clickMine(): void {
        const amount = this._gameData.clickPower;
        this._addGold(amount);
        this._eventManager.emit(CLICK_MINE, { amount });
        Logger.debug(TAG, `点击挖矿 +${amount}`);
    }

    /**
     * 购买建筑
     * @param buildingId 建筑配置 ID
     * @returns 是否购买成功
     */
    purchaseBuilding(buildingId: number): boolean {
        const config = this._buildingConfigs.find((c) => c.id === buildingId);
        if (!config) {
            Logger.warn(TAG, `建筑配置不存在: ${buildingId}`);
            return false;
        }

        if (!this.isBuildingUnlocked(buildingId)) {
            Logger.warn(TAG, `建筑未解锁: ${buildingId}`);
            return false;
        }

        // 检查是否已拥有
        const state = this._gameData.buildings.find((b) => b.id === buildingId);
        if (state && state.owned) {
            Logger.warn(TAG, `建筑已拥有: ${buildingId}`);
            return false;
        }

        // 检查金币
        const cost = config.baseCost;
        if (!this._deductGold(cost)) {
            Logger.debug(TAG, `金币不足, 需要 ${cost}, 当前 ${this._gameData.gold}`);
            return false;
        }

        // 设置建筑状态
        if (state) {
            state.owned = true;
            state.level = 1;
        } else {
            this._gameData.buildings.push({
                id: buildingId,
                level: 1,
                owned: true,
                isUpgrading: false,
                upgradeStartTime: 0,
            });
        }

        // 启动生产 Timer
        this._startBuildingProduction(buildingId);

        this._eventManager.emit(BUILDING_PURCHASED, { buildingId, cost });
        Logger.info(TAG, `购买建筑 #${buildingId}, 花费 ${cost}`);
        return true;
    }

    /**
     * 升级建筑
     * @param buildingId 建筑配置 ID
     * @returns 是否升级成功
     */
    upgradeBuilding(buildingId: number): boolean {
        const config = this._buildingConfigs.find((c) => c.id === buildingId);
        if (!config) {
            Logger.warn(TAG, `建筑配置不存在: ${buildingId}`);
            return false;
        }

        const state = this._gameData.buildings.find((b) => b.id === buildingId);
        if (!state || !state.owned) {
            Logger.warn(TAG, `建筑未拥有: ${buildingId}`);
            return false;
        }

        if (state.level >= config.maxLevel) {
            Logger.warn(TAG, `建筑已达最大等级: ${buildingId}, lv${state.level}`);
            return false;
        }

        const cost = this.getUpgradeCost(buildingId);
        if (!this._deductGold(cost)) {
            Logger.debug(TAG, `升级金币不足, 需要 ${cost}, 当前 ${this._gameData.gold}`);
            return false;
        }

        const oldLevel = state.level;
        state.level++;

        // 重启生产 Timer（产出已变化）
        this._stopBuildingProduction(buildingId);
        this._startBuildingProduction(buildingId);

        this._eventManager.emit(BUILDING_UPGRADED, {
            buildingId,
            oldLevel,
            newLevel: state.level,
            cost,
        });
        Logger.info(TAG, `升级建筑 #${buildingId}: lv${oldLevel} → lv${state.level}, 花费 ${cost}`);
        return true;
    }

    /**
     * 获取建筑升级费用
     * @param buildingId 建筑配置 ID
     * @returns 升级所需金币
     */
    getUpgradeCost(buildingId: number): number {
        const config = this._buildingConfigs.find((c) => c.id === buildingId);
        if (!config) {
            return 0;
        }

        const state = this._gameData.buildings.find((b) => b.id === buildingId);
        const level = state ? state.level : 0;

        // 优先使用升级曲线表
        const curves = this._upgradeCurves.get(buildingId);
        if (curves) {
            const curve = curves.find((c) => c.level === level + 1);
            if (curve) {
                return curve.cost;
            }
        }

        // 回退到公式计算: baseCost * costMultiplier^level
        return Math.floor(config.baseCost * Math.pow(config.costMultiplier, level));
    }

    /**
     * 获取建筑当前产出量（每次产出周期的金币量）
     * @param buildingId 建筑配置 ID
     * @returns 每次产出周期的金币量
     */
    getBuildingOutput(buildingId: number): number {
        const config = this._buildingConfigs.find((c) => c.id === buildingId);
        if (!config) {
            return 0;
        }

        const state = this._gameData.buildings.find((b) => b.id === buildingId);
        if (!state || !state.owned || state.level <= 0) {
            return 0;
        }

        // 优先使用升级曲线表
        const curves = this._upgradeCurves.get(buildingId);
        if (curves) {
            const curve = curves.find((c) => c.level === state.level);
            if (curve) {
                return curve.output;
            }
        }

        // 回退到公式: baseOutput + (level - 1) * outputPerLevel
        return config.baseOutput + (state.level - 1) * config.outputPerLevel;
    }

    /**
     * 获取每秒总产出
     * @returns 所有已拥有建筑的每秒金币总产出
     */
    getTotalOutputPerSecond(): number {
        let total = 0;
        for (const state of this._gameData.buildings) {
            if (!state.owned || state.level <= 0) {
                continue;
            }
            const config = this._buildingConfigs.find((c) => c.id === state.id);
            if (!config || config.outputInterval <= 0) {
                continue;
            }
            const output = this.getBuildingOutput(state.id);
            total += output / config.outputInterval;
        }
        return total;
    }

    /**
     * 检查建筑是否可解锁（累计金币是否达标）
     * @param buildingId 建筑配置 ID
     * @returns 是否已解锁
     */
    isBuildingUnlocked(buildingId: number): boolean {
        const config = this._buildingConfigs.find((c) => c.id === buildingId);
        if (!config) {
            return false;
        }
        return this._gameData.totalGoldEarned >= config.unlockCondition;
    }

    /**
     * 启动所有已拥有建筑的生产 Timer
     */
    startAllProduction(): void {
        for (const state of this._gameData.buildings) {
            if (state.owned && state.level > 0) {
                this._startBuildingProduction(state.id);
            }
        }
        Logger.info(TAG, '启动所有建筑生产');
    }

    /**
     * 停止所有生产 Timer
     */
    stopAllProduction(): void {
        for (const [buildingId, timerId] of this._productionTimerIds) {
            this._timerManager.removeTimer(timerId);
            Logger.debug(TAG, `停止建筑 #${buildingId} 生产 Timer #${timerId}`);
        }
        this._productionTimerIds.clear();
        Logger.info(TAG, '停止所有建筑生产');
    }

    /**
     * 创建建筑生产 Timer
     * @param buildingId 建筑配置 ID
     */
    private _startBuildingProduction(buildingId: number): void {
        const config = this._buildingConfigs.find((c) => c.id === buildingId);
        if (!config || config.outputInterval <= 0) {
            return;
        }

        // 如果已有 Timer 先移除
        this._stopBuildingProduction(buildingId);

        const timerId = this._timerManager.addTimer(
            config.outputInterval,
            () => {
                const output = this.getBuildingOutput(buildingId);
                this._addGold(output);
                this._eventManager.emit(BUILDING_OUTPUT, { buildingId, amount: output });
            },
            { repeat: TIMER_REPEAT_FOREVER },
        );

        this._productionTimerIds.set(buildingId, timerId);
        Logger.debug(TAG, `建筑 #${buildingId} 启动生产 Timer #${timerId}, 间隔 ${config.outputInterval}s`);
    }

    /**
     * 停止单个建筑的生产 Timer
     * @param buildingId 建筑配置 ID
     */
    private _stopBuildingProduction(buildingId: number): void {
        const timerId = this._productionTimerIds.get(buildingId);
        if (timerId !== undefined) {
            this._timerManager.removeTimer(timerId);
            this._productionTimerIds.delete(buildingId);
        }
    }

    /**
     * 扣除金币并触发变化事件
     * @param amount 扣除金额
     * @returns 是否扣除成功
     */
    private _deductGold(amount: number): boolean {
        if (this._gameData.gold < amount) {
            return false;
        }
        const oldGold = this._gameData.gold;
        this._gameData.gold -= amount;
        this._eventManager.emit(GOLD_CHANGED, { oldGold, newGold: this._gameData.gold });
        return true;
    }

    /**
     * 增加金币并触发变化事件
     * @param amount 增加金额
     */
    private _addGold(amount: number): void {
        const oldGold = this._gameData.gold;
        this._gameData.gold += amount;
        this._gameData.totalGoldEarned += amount;
        this._eventManager.emit(GOLD_CHANGED, { oldGold, newGold: this._gameData.gold });
    }
}

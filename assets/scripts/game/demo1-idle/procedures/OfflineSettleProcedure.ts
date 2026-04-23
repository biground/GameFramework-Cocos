/**
 * 离线结算流程 —— 检查存档并计算离线收益
 *
 * 从 SaveSystem 加载存档，如有存档则计算离线期间的建筑产出收益。
 * 结算完成后切换到 MainProcedure。
 * @module
 */

import { ProcedureBase } from '@framework/procedure/ProcedureBase';
import { IFsm } from '@framework/fsm/FsmDefs';
import { Logger } from '@framework/debug/Logger';
import { IProcedureContext, PROCEDURE_CONTEXT_KEY } from './ProcedureContext';
import { MainProcedure } from './MainProcedure';
import { BuildingConfigRow } from '@game/demo1-idle/data/BuildingConfigRow';
import { UpgradeCurveRow } from '@game/demo1-idle/data/UpgradeCurveRow';

const TAG = 'OfflineSettleProcedure';

/**
 * 离线结算流程
 *
 * 检查是否有存档，有则计算离线收益并应用到游戏数据。
 */
export class OfflineSettleProcedure extends ProcedureBase {
    /** 进入离线结算流程 */
    onEnter(fsm: IFsm<unknown>): void {
        Logger.info(TAG, '进入离线结算流程');

        const ctx = fsm.getData<IProcedureContext>(PROCEDURE_CONTEXT_KEY);
        if (!ctx) {
            Logger.error(TAG, 'Procedure 上下文缺失');
            throw new Error(`[${TAG}] Procedure 上下文缺失`);
        }

        // 尝试加载存档
        const savedData = ctx.saveSystem.load();
        if (savedData) {
            Logger.info(TAG, '检测到存档数据，恢复游戏状态');

            // 恢复存档数据到 gameData
            ctx.gameData.gold = savedData.gold;
            ctx.gameData.totalGoldEarned = savedData.totalGoldEarned;
            ctx.gameData.clickPower = savedData.clickPower;
            ctx.gameData.buildings = savedData.buildings;
            ctx.gameData.unlockedAchievements = savedData.unlockedAchievements;
            ctx.gameData.lastSaveTime = savedData.lastSaveTime;
            ctx.gameData.lastOnlineTime = savedData.lastOnlineTime;

            // 计算离线收益
            const dtMgr = ctx.dataTableManager;
            const buildingConfigs = [...dtMgr.getAllRows<BuildingConfigRow>('building_config')];
            const upgradeCurveRows = [...dtMgr.getAllRows<UpgradeCurveRow>('upgrade_curve')];

            // 构建升级曲线 Map
            const upgradeCurves = new Map<number, UpgradeCurveRow[]>();
            for (const row of upgradeCurveRows) {
                const list = upgradeCurves.get(row.buildingId);
                if (list) {
                    list.push(row);
                } else {
                    upgradeCurves.set(row.buildingId, [row]);
                }
            }

            const currentTime = Date.now();
            const reward = ctx.offlineRewardSystem.calculateReward(
                ctx.gameData,
                buildingConfigs,
                upgradeCurves,
                currentTime,
            );

            if (reward > 0) {
                ctx.gameData.gold += reward;
                ctx.gameData.totalGoldEarned += reward;
                const offlineSeconds = Math.floor(
                    (currentTime - ctx.gameData.lastOnlineTime) / 1000,
                );
                Logger.info(TAG, `离线 ${offlineSeconds} 秒，获得 ${reward} 金币`);
            } else {
                Logger.info(TAG, '离线时间太短或无产出建筑，无离线收益');
            }
        } else {
            Logger.info(TAG, '无存档数据，新游戏开始');
        }

        Logger.info(TAG, '离线结算完成，切换到主流程');
        this.changeProcedure(fsm, MainProcedure);
    }
}

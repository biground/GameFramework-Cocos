/**
 * 预加载流程 —— 加载配置表并初始化系统数据
 *
 * 从 DataTableManager 读取建筑配置、升级曲线、成就配置，
 * 将数据注入 BuildingSystem 和 AchievementSystem，然后切换到离线结算流程。
 * @module
 */

import { ProcedureBase } from '@framework/procedure/ProcedureBase';
import { IFsm } from '@framework/fsm/FsmDefs';
import { Logger } from '@framework/debug/Logger';
import { IProcedureContext, PROCEDURE_CONTEXT_KEY } from './ProcedureContext';
import { OfflineSettleProcedure } from './OfflineSettleProcedure';
import { BuildingConfigRow } from '@game/demo1-idle/data/BuildingConfigRow';
import { UpgradeCurveRow } from '@game/demo1-idle/data/UpgradeCurveRow';
import { AchievementConfigRow } from '@game/demo1-idle/data/AchievementConfigRow';

const TAG = 'PreloadProcedure';

/**
 * 预加载流程
 *
 * 从 DataTableManager 获取已注册的配置表数据，
 * 初始化 BuildingSystem 和 AchievementSystem 的配置。
 */
export class PreloadProcedure extends ProcedureBase {
    /** 进入预加载流程 */
    onEnter(fsm: IFsm<unknown>): void {
        Logger.info(TAG, '进入预加载流程，加载配置表...');

        const ctx = this.getContext<IProcedureContext>(fsm, PROCEDURE_CONTEXT_KEY);

        const dtMgr = ctx.dataTableManager;

        // 读取建筑配置
        const buildingConfigs = dtMgr.getAllRows<BuildingConfigRow>('building_config');
        Logger.info(TAG, `建筑配置加载完成: ${buildingConfigs.length} 条`);

        // 读取升级曲线
        const upgradeCurves = dtMgr.getAllRows<UpgradeCurveRow>('upgrade_curve');
        Logger.info(TAG, `升级曲线加载完成: ${upgradeCurves.length} 条`);

        // 读取成就配置
        const achievementConfigs = dtMgr.getAllRows<AchievementConfigRow>('achievement_config');
        Logger.info(TAG, `成就配置加载完成: ${achievementConfigs.length} 条`);

        // 注入系统配置
        ctx.buildingSystem.loadConfigs([...buildingConfigs], [...upgradeCurves]);
        ctx.achievementSystem.loadConfigs([...achievementConfigs]);

        Logger.info(TAG, '配置表加载完成，切换到离线结算流程');
        this.changeProcedure(fsm, OfflineSettleProcedure);
    }
}

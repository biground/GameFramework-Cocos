/**
 * 建筑 FSM 状态实现 —— 4 个生命周期状态
 *
 * - IdleBuildingState: 等待购买
 * - ProducingState: 自动产出中
 * - UpgradingState: 升级倒计时
 * - MaxLevelState: 满级持续产出
 *
 * @module
 */

import { FsmState } from '@framework/fsm/FsmState';
import { IFsm } from '@framework/fsm/FsmDefs';
import { Logger } from '@framework/debug/Logger';
import {
    IBuildingBlackboard,
    BuildingFsmDataKeys,
    BuildingFsmStateNames,
} from './BuildingFsmDefs';

const TAG = 'BuildingFSM';

/**
 * 从 FSM 共享数据中获取黑板
 */
function getBlackboard(fsm: IFsm<IBuildingBlackboard>): IBuildingBlackboard {
    const bb = fsm.getData<IBuildingBlackboard>(BuildingFsmDataKeys.BLACKBOARD);
    if (!bb) {
        throw new Error(`[${TAG}] 黑板数据缺失，FSM="${fsm.name}"`);
    }
    return bb;
}

// ─── IdleBuildingState ─────────────────────────────────

/**
 * 等待购买状态
 *
 * 建筑尚未被玩家购买，不产出、不可升级。
 * 当建筑被购买后切换到 ProducingState。
 */
export class IdleBuildingState extends FsmState<IBuildingBlackboard> {
    /** 进入等待购买状态 */
    onEnter(fsm: IFsm<IBuildingBlackboard>): void {
        const bb = getBlackboard(fsm);
        Logger.info(TAG, `[${fsm.name}] 建筑 #${bb.buildingId} 进入 ${BuildingFsmStateNames.IDLE} 状态`);
    }

    /**
     * 每帧检测建筑是否已被购买
     * 购买后切换到 ProducingState
     */
    onUpdate(fsm: IFsm<IBuildingBlackboard>, _dt: number): void {
        const bb = getBlackboard(fsm);
        const buildingState = bb.gameData.buildings.find((b) => b.id === bb.buildingId);
        if (buildingState && buildingState.owned) {
            this.changeState(fsm, ProducingState);
        }
    }
}

// ─── ProducingState ────────────────────────────────────

/**
 * 自动产出状态
 *
 * 建筑已购买并正在产出金币（Timer 由 BuildingSystem 管理）。
 * 可响应升级请求切换到 UpgradingState，或检测到满级切换到 MaxLevelState。
 */
export class ProducingState extends FsmState<IBuildingBlackboard> {
    /** 进入产出状态 */
    onEnter(fsm: IFsm<IBuildingBlackboard>): void {
        const bb = getBlackboard(fsm);
        Logger.info(TAG, `[${fsm.name}] 建筑 #${bb.buildingId} 进入 ${BuildingFsmStateNames.PRODUCING} 状态`);

        // 确保生产 Timer 运行（BuildingSystem 在 purchaseBuilding / upgradeBuilding 中已自动管理）
    }

    /**
     * 每帧检测升级状态和满级条件
     * - 正在升级 → 切换到 UpgradingState
     * - 已达满级 → 切换到 MaxLevelState
     */
    onUpdate(fsm: IFsm<IBuildingBlackboard>, _dt: number): void {
        const bb = getBlackboard(fsm);
        const buildingState = bb.gameData.buildings.find((b) => b.id === bb.buildingId);
        if (!buildingState) {
            return;
        }

        // 检测是否正在升级
        if (buildingState.isUpgrading) {
            this.changeState(fsm, UpgradingState);
            return;
        }

        // 检测是否满级
        const config = bb.buildingSystem.getBuildingConfig(bb.buildingId);
        if (config && buildingState.level >= config.maxLevel) {
            this.changeState(fsm, MaxLevelState);
        }
    }

    /** 离开产出状态 */
    onLeave(fsm: IFsm<IBuildingBlackboard>): void {
        const bb = getBlackboard(fsm);
        Logger.debug(TAG, `[${fsm.name}] 建筑 #${bb.buildingId} 离开 ${BuildingFsmStateNames.PRODUCING} 状态`);
    }
}

// ─── UpgradingState ────────────────────────────────────

/**
 * 升级中状态
 *
 * 建筑正在升级，等待升级计时器完成。
 * 升级完成后切换回 ProducingState。
 */
export class UpgradingState extends FsmState<IBuildingBlackboard> {
    /** 进入升级状态，记录升级开始时间 */
    onEnter(fsm: IFsm<IBuildingBlackboard>): void {
        const bb = getBlackboard(fsm);
        Logger.info(TAG, `[${fsm.name}] 建筑 #${bb.buildingId} 进入 ${BuildingFsmStateNames.UPGRADING} 状态`);

        const buildingState = bb.gameData.buildings.find((b) => b.id === bb.buildingId);
        if (buildingState) {
            fsm.setData(BuildingFsmDataKeys.UPGRADE_START_TIME, buildingState.upgradeStartTime);
        }
    }

    /**
     * 每帧检测升级是否完成
     * 升级完成（isUpgrading 变为 false）后切换回 ProducingState
     */
    onUpdate(fsm: IFsm<IBuildingBlackboard>, _dt: number): void {
        const bb = getBlackboard(fsm);
        const buildingState = bb.gameData.buildings.find((b) => b.id === bb.buildingId);
        if (!buildingState) {
            return;
        }

        // 升级完成
        if (!buildingState.isUpgrading) {
            Logger.info(TAG, `[${fsm.name}] 建筑 #${bb.buildingId} 升级完成, lv${buildingState.level}`);
            this.changeState(fsm, ProducingState);
        }
    }

    /** 离开升级状态，清理升级临时数据 */
    onLeave(fsm: IFsm<IBuildingBlackboard>): void {
        const bb = getBlackboard(fsm);
        fsm.removeData(BuildingFsmDataKeys.UPGRADE_START_TIME);
        fsm.removeData(BuildingFsmDataKeys.UPGRADE_DURATION);
        Logger.debug(TAG, `[${fsm.name}] 建筑 #${bb.buildingId} 离开 ${BuildingFsmStateNames.UPGRADING} 状态`);
    }
}

// ─── MaxLevelState ─────────────────────────────────────

/**
 * 满级状态
 *
 * 建筑已达最大等级，持续产出但无法再升级。
 */
export class MaxLevelState extends FsmState<IBuildingBlackboard> {
    /** 进入满级状态 */
    onEnter(fsm: IFsm<IBuildingBlackboard>): void {
        const bb = getBlackboard(fsm);
        const buildingState = bb.gameData.buildings.find((b) => b.id === bb.buildingId);
        const level = buildingState ? buildingState.level : 0;
        Logger.info(TAG, `[${fsm.name}] 建筑 #${bb.buildingId} 达到满级 lv${level}, 持续产出中`);
    }
}

/**
 * 建筑 FSM 定义 —— 状态名常量与黑板接口
 *
 * 每栋建筑拥有独立 FSM 实例，状态间通过黑板共享数据。
 * @module
 */

import { BuildingSystem } from '@game/demo1-idle/systems/BuildingSystem';
import { IdleGameData } from '@game/demo1-idle/data/IdleGameData';

// ─── 状态名常量 ────────────────────────────────────────

/** 建筑 FSM 状态名 */
export const BuildingFsmStateNames = {
    /** 等待购买 */
    IDLE: 'Idle',
    /** 自动产出中 */
    PRODUCING: 'Producing',
    /** 升级中 */
    UPGRADING: 'Upgrading',
    /** 满级 */
    MAX_LEVEL: 'MaxLevel',
} as const;

/** FSM 名称前缀（实际名称为 `building_fsm_{buildingId}`） */
export const BUILDING_FSM_PREFIX = 'building_fsm_';

// ─── 黑板接口 ──────────────────────────────────────────

/** 建筑 FSM 黑板数据，所有状态共享 */
export interface IBuildingBlackboard {
    /** 建筑配置 ID */
    buildingId: number;
    /** 建筑系统引用 */
    buildingSystem: BuildingSystem;
    /** 游戏状态数据引用 */
    gameData: IdleGameData;
}

// ─── 黑板数据键常量 ────────────────────────────────────

/** FSM 共享数据键 */
export const BuildingFsmDataKeys = {
    /** 黑板数据 */
    BLACKBOARD: 'blackboard',
    /** 升级开始时间（毫秒戳） */
    UPGRADE_START_TIME: 'upgradeStartTime',
    /** 升级所需时间（秒） */
    UPGRADE_DURATION: 'upgradeDuration',
} as const;

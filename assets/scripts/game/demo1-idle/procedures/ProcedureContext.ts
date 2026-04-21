/**
 * 流程共享上下文 —— Procedure 间共享的系统引用
 *
 * 所有 Procedure 通过 FSM 的共享数据（getData/setData）访问此上下文。
 * 在 IdleClickerDemo 中初始化并写入 FSM 数据。
 * @module
 */

import { BuildingSystem } from '@game/demo1-idle/systems/BuildingSystem';
import { AchievementSystem } from '@game/demo1-idle/systems/AchievementSystem';
import { OfflineRewardSystem } from '@game/demo1-idle/systems/OfflineRewardSystem';
import { SaveSystem } from '@game/demo1-idle/systems/SaveSystem';
import { IdleGameData } from '@game/demo1-idle/data/IdleGameData';
import { EventManager } from '@framework/event/EventManager';
import { TimerManager } from '@framework/timer/TimerManager';
import { DataTableManager } from '@framework/datatable/DataTableManager';
import { FsmManager } from '@framework/fsm/FsmManager';

/** Procedure 共享上下文 */
export interface IProcedureContext {
    /** 游戏状态数据 */
    gameData: IdleGameData;
    /** 建筑系统 */
    buildingSystem: BuildingSystem;
    /** 成就系统 */
    achievementSystem: AchievementSystem;
    /** 离线收益系统 */
    offlineRewardSystem: OfflineRewardSystem;
    /** 存档系统 */
    saveSystem: SaveSystem;
    /** 事件管理器 */
    eventManager: EventManager;
    /** 定时器管理器 */
    timerManager: TimerManager;
    /** 数据表管理器 */
    dataTableManager: DataTableManager;
    /** 状态机管理器 */
    fsmManager: FsmManager;
}

/** FSM 共享数据键：Procedure 上下文 */
export const PROCEDURE_CONTEXT_KEY = '__procedure_context__';

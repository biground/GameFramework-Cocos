/**
 * Auto-chess Lite Demo — 流程共享上下文
 *
 * 所有 Procedure 通过 FSM 的共享数据（getData/setData）访问此上下文。
 * 在 AutoChessDemo 主入口中初始化并写入 FSM 数据。
 * @module
 */

import { AutoChessGameData } from '../data/AutoChessGameData';
import { BoardSystem } from '../systems/BoardSystem';
import { ShopSystem } from '../systems/ShopSystem';
import { MergeSystem } from '../systems/MergeSystem';
import { SynergySystem } from '../systems/SynergySystem';
import { BattleSystem } from '../systems/BattleSystem';
import { EventManager } from '../../../framework/event/EventManager';
import { TimerManager } from '../../../framework/timer/TimerManager';
import { FsmManager } from '../../../framework/fsm/FsmManager';
import { EntityManager } from '../../../framework/entity/EntityManager';
import { AudioManager } from '../../../framework/audio/AudioManager';
import { DataTableManager } from '../../../framework/datatable/DataTableManager';

/**
 * Auto-chess Procedure 共享上下文接口
 *
 * 聚合所有游戏系统和框架模块引用，供 Procedure 统一访问。
 */
export interface IAutoChessProcedureContext {
    /** 游戏运行时状态数据 */
    gameData: AutoChessGameData;
    /** 渲染器（HTML 文字版） */
    renderer: unknown;
    /** 棋盘系统 */
    boardSystem: BoardSystem;
    /** 商店系统 */
    shopSystem: ShopSystem;
    /** 合成系统 */
    mergeSystem: MergeSystem;
    /** 羁绊系统 */
    synergySystem: SynergySystem;
    /** 战斗系统 */
    battleSystem: BattleSystem;
    /** 事件管理器 */
    eventManager: EventManager;
    /** 定时器管理器 */
    timerManager: TimerManager;
    /** 状态机管理器 */
    fsmManager: FsmManager;
    /** 实体管理器 */
    entityManager: EntityManager;
    /** 音频管理器 */
    audioManager: AudioManager;
    /** 数据表管理器 */
    dataTableManager: DataTableManager;
}

/** FSM 共享数据键：Auto-chess Procedure 上下文 */
export const AUTO_CHESS_CONTEXT_KEY = '__auto_chess_context__';

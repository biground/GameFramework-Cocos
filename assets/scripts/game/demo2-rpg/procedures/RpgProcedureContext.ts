/**
 * RPG 流程共享上下文 —— Procedure 间共享的系统与模块引用
 *
 * 所有 Procedure 通过 FSM 的共享数据（getData/setData）访问此上下文。
 * 在 TurnBasedRpgDemo 中初始化并写入 FSM 数据。
 *
 * 注意：Wave 1 阶段部分系统尚未实现，使用 `unknown` 占位，
 * 后续 Wave 实现对应系统后再精确化类型。
 * @module
 */

import { HtmlRenderer } from '@game/shared/HtmlRenderer';
import { EventManager } from '@framework/event/EventManager';
import { TimerManager } from '@framework/timer/TimerManager';
import { DataTableManager } from '@framework/datatable/DataTableManager';
import { FsmManager } from '@framework/fsm/FsmManager';
import { EntityManager } from '@framework/entity/EntityManager';
import { AudioManager } from '@framework/audio/AudioManager';
import { UIManager } from '@framework/ui/UIManager';
import { ReferencePool } from '@framework/objectpool/ReferencePool';

/**
 * RPG Procedure 共享上下文接口
 *
 * 聚合所有游戏系统和框架模块引用，供 Procedure 统一访问。
 * 字段标注 `unknown` 的系统将在后续 Wave 中替换为具体类型。
 */
export interface IRpgProcedureContext {
    /** 游戏运行时状态数据（Wave 1 T03 定义） */
    gameData: unknown;
    /** HTML 渲染器（共享基础设施） */
    renderer: HtmlRenderer;
    /** 战斗系统（Wave 2 T09 实现） */
    battleSystem: unknown;
    /** BUFF 系统（Wave 2 T07 实现） */
    buffSystem: unknown;
    /** 伤害计算器（Wave 2 T06 实现） */
    damageCalculator: unknown;
    /** 敌方 AI（Wave 2 T08 实现） */
    enemyAI: unknown;
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
    /** UI 管理器 */
    uiManager: UIManager;
    /** 数据表管理器 */
    dataTableManager: DataTableManager;
    /** 引用池（对象池管理器） */
    referencePool: ReferencePool;
}

/** FSM 共享数据键：RPG Procedure 上下文 */
export const RPG_PROCEDURE_CONTEXT_KEY = '__rpg_procedure_context__';

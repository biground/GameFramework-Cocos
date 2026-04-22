/**
 * 角色 FSM 定义 —— 状态名常量与黑板接口
 *
 * 每个角色拥有独立 FSM 实例，用于管理角色在战斗中的行为状态。
 * @module
 */

import { CharacterState } from '@game/demo2-rpg/data/RpgGameData';
import { EventManager } from '@framework/event/EventManager';

// ─── 黑板接口 ──────────────────────────────────────────

/** 角色 FSM 黑板数据，所有状态共享 */
export interface ICharacterBlackboard {
    /** 角色 ID */
    characterId: number;
    /** 角色运行时状态数据 */
    characterState: CharacterState;
    /** 事件管理器引用 */
    eventManager: EventManager;
    /** 眩晕剩余回合数 */
    stunRounds: number;
}

// ─── 黑板数据键常量 ────────────────────────────────────

/** 角色 FSM 共享数据键 */
export const CharacterFsmDataKeys = {
    /** 黑板数据 */
    BLACKBOARD: 'character_blackboard',
} as const;

// ─── 状态名常量 ────────────────────────────────────────

/** 角色 FSM 状态名 */
export const CharacterFsmStateNames = {
    /** 待机 */
    IDLE: 'Idle',
    /** 行动中 */
    ACTING: 'Acting',
    /** 眩晕 */
    STUNNED: 'Stunned',
    /** 死亡 */
    DEAD: 'Dead',
} as const;

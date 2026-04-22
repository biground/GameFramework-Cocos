/**
 * 战斗 FSM 定义 —— 状态名常量与黑板接口
 *
 * 回合制战斗拥有独立 FSM 实例，状态间通过黑板共享数据。
 * @module
 */

import { BattleSystem } from '../systems/BattleSystem';
import { BuffSystem } from '../systems/BuffSystem';
import { RpgGameData, CharacterState, ActionDecision } from '../data/RpgGameData';
import { SkillConfigRow } from '../data/SkillConfigRow';
import { MonsterConfigRow } from '../data/MonsterConfigRow';
import { IEventManager } from '@framework/interfaces/IEventManager';
import { IAudioManager } from '@framework/audio/IAudioManager';
import { HtmlRenderer } from '@game/shared/HtmlRenderer';

// ─── 黑板接口 ──────────────────────────────────────────

/** 战斗 FSM 黑板数据，所有状态共享 */
export interface IBattleBlackboard {
    /** 战斗系统引用 */
    battleSystem: BattleSystem;
    /** Buff 系统引用 */
    buffSystem: BuffSystem;
    /** RPG 游戏数据引用 */
    gameData: RpgGameData;
    /** 行动顺序列表 */
    turnOrder: CharacterState[];
    /** 当前行动者索引 */
    currentActorIndex: number;
    /** 行动决策（null 表示尚未决策） */
    actionDecision: ActionDecision | null;
    /** HTML 渲染器引用 */
    renderer: HtmlRenderer;
    /** 事件管理器引用 */
    eventManager: IEventManager;
    /** 音频管理器引用 */
    audioManager: IAudioManager;
    /** 所有角色（玩家+敌方）列表 */
    allCharacters: CharacterState[];
    /** 技能配置表 */
    skillTable: SkillConfigRow[];
    /** 怪物配置表 */
    monsterTable: MonsterConfigRow[];
    /** 最大回合数 */
    maxRound: number;
}

// ─── 黑板数据键常量 ────────────────────────────────────

/** 战斗 FSM 共享数据键 */
export const BattleFsmDataKeys = {
    /** 黑板数据 */
    BLACKBOARD: 'battle_blackboard',
} as const;

// ─── 状态名常量 ────────────────────────────────────────

/** 战斗 FSM 状态名 */
export const BattleFsmStateNames = {
    /** 回合开始 */
    ROUND_START: 'RoundStart',
    /** 选择行动 */
    SELECT_ACTION: 'SelectAction',
    /** 执行行动 */
    EXECUTE_ACTION: 'ExecuteAction',
    /** 回合结束 */
    ROUND_END: 'RoundEnd',
    /** 胜利 */
    VICTORY: 'Victory',
    /** 失败 */
    DEFEAT: 'Defeat',
} as const;

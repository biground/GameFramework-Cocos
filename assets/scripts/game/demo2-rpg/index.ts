/**
 * Turn-based RPG Demo 入口
 * @module
 */

// ─── 数据层 ────────────────────────────────────────────
export { RpgGameData, BuffType } from './data/RpgGameData';
export type {
    BuffState,
    CharacterState,
    ActionDecision,
    ActionResult,
    BattleEndResult,
} from './data/RpgGameData';
export { CharacterConfigRow } from './data/CharacterConfigRow';
export { MonsterConfigRow } from './data/MonsterConfigRow';
export { SkillConfigRow } from './data/SkillConfigRow';
export { StageConfigRow } from './data/StageConfigRow';

// ─── 事件 ──────────────────────────────────────────────
export { RpgEvents } from './events/RpgEvents';

// ─── 系统层 ────────────────────────────────────────────
export { BattleSystem } from './systems/BattleSystem';
export { BuffSystem } from './systems/BuffSystem';
export { DamageCalculator } from './systems/DamageCalculator';
export { EnemyAI } from './systems/EnemyAI';

// ─── 流程层 ────────────────────────────────────────────
export type { IRpgProcedureContext } from './procedures/RpgProcedureContext';
export { RPG_PROCEDURE_CONTEXT_KEY } from './procedures/RpgProcedureContext';
export { LaunchProcedure } from './procedures/LaunchProcedure';
export { PreloadProcedure } from './procedures/PreloadProcedure';
export { LobbyProcedure } from './procedures/LobbyProcedure';
export { BattlePrepProcedure } from './procedures/BattlePrepProcedure';
export { BattleProcedure } from './procedures/BattleProcedure';
export { SettleProcedure } from './procedures/SettleProcedure';

// ─── Demo 主入口 ───────────────────────────────────────
export { TurnBasedRpgDemo } from './TurnBasedRpgDemo';

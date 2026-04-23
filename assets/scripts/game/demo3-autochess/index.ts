/**
 * Auto-chess Lite Demo 桶文件（barrel exports）
 * @module
 */

// ─── 定义层 ────────────────────────────────────────────
export * from './AutoChessDefs';

// ─── 数据层 ────────────────────────────────────────────
export * from './data/AutoChessGameData';
export * from './data/ChessPieceConfigRow';
export * from './data/SynergyConfigRow';

// ─── 系统层 ────────────────────────────────────────────
export { BoardSystem } from './systems/BoardSystem';
export { ShopSystem } from './systems/ShopSystem';
export { MergeSystem } from './systems/MergeSystem';
export { SynergySystem } from './systems/SynergySystem';
export { BattleSystem } from './systems/BattleSystem';

// ─── 实体/工厂 ─────────────────────────────────────────
export { AutoChessEntityFactory } from './factory/AutoChessEntityFactory';

// ─── 流程层 ────────────────────────────────────────────
export * from './procedures/AutoChessProcedureContext';
export { LaunchProcedure } from './procedures/LaunchProcedure';
export { PreloadProcedure } from './procedures/PreloadProcedure';
export { PrepareProcedure } from './procedures/PrepareProcedure';
export { BattleProcedure } from './procedures/BattleProcedure';
export { SettleProcedure } from './procedures/SettleProcedure';
export { GameOverProcedure } from './procedures/GameOverProcedure';

// ─── UI 层 ─────────────────────────────────────────────
export { AutoChessRenderer } from './ui/AutoChessRenderer';

// ─── 主入口 ────────────────────────────────────────────
export { AutoChessDemo } from './AutoChessDemo';

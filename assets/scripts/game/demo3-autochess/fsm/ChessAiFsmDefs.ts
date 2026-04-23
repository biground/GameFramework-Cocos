/**
 * 棋子 AI FSM 定义 — 黑板接口与数据键
 *
 * 所有 AI 状态共享 IChessAiBlackboard，通过 FSM 共享数据访问。
 * @module
 */

import { ChessPieceRuntimeState } from '../data/AutoChessGameData';
import { BoardSystem } from '../systems/BoardSystem';
import { IEventManager } from '../../../framework/interfaces/IEventManager';

// ─── 黑板接口 ──────────────────────────────────────────

/** 棋子 AI FSM 黑板数据，所有状态共享 */
export interface IChessAiBlackboard {
    /** 棋子运行时状态 */
    pieceState: ChessPieceRuntimeState;
    /** 棋盘系统引用 */
    boardSystem: BoardSystem;
    /** 获取所有敌方棋子（存活） */
    allEnemies: () => ChessPieceRuntimeState[];
    /** 当前攻击目标 */
    target: ChessPieceRuntimeState | null;
    /** 事件管理器引用 */
    eventManager: IEventManager;
}

// ─── 数据键常量 ────────────────────────────────────────

/** 棋子 AI FSM 共享数据键 */
export const ChessAiDataKeys = {
    /** 黑板数据 */
    BLACKBOARD: 'chess_ai_blackboard',
} as const;

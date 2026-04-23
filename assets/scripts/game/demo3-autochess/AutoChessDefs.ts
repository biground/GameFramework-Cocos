/**
 * Auto-chess Lite Demo — 共享类型定义
 *
 * 包含事件键、游戏常量、接口类型、FSM 状态名常量。
 * 事件键统一使用 'ace:' 前缀，遵循 Game 层 `ns:event_name` 冒号格式约定。
 * @module
 */

import { EventKey } from '../../framework/event/EventDefs';

// ═══════════════════════════════════════════════════════
// 事件键定义（幻影类型安全）
// ═══════════════════════════════════════════════════════

export const AutoChessEvents = {
    /** 购买棋子 */
    CHESS_BOUGHT: new EventKey<{ pieceId: number; configId: number; cost: number }>(
        'ace:chess_bought',
    ),

    /** 棋子放置到棋盘 */
    CHESS_PLACED: new EventKey<{ pieceId: number; row: number; col: number }>('ace:chess_placed'),

    /** 棋子合成升星 */
    CHESS_MERGED: new EventKey<{ resultPieceId: number; star: number; name: string }>(
        'ace:chess_merged',
    ),

    /** 棋子发起攻击 */
    CHESS_ATTACK: new EventKey<{ attackerId: number; defenderId: number; damage: number }>(
        'ace:chess_attack',
    ),

    /** 棋子被击杀 */
    CHESS_KILLED: new EventKey<{ pieceId: number; killerPieceId: number }>('ace:chess_killed'),

    /** 回合开始 */
    ROUND_START: new EventKey<{ round: number }>('ace:round_start'),

    /** 回合结束 */
    ROUND_END: new EventKey<{ round: number; result: 'win' | 'lose' }>('ace:round_end'),

    /** 阶段切换 */
    PHASE_CHANGED: new EventKey<{ from: string; to: string }>('ace:phase_changed'),

    /** 羁绊激活 */
    SYNERGY_ACTIVATED: new EventKey<{ race: string; threshold: number; effect: string }>(
        'ace:synergy_activated',
    ),

    /** 商店刷新 */
    SHOP_REFRESHED: new EventKey<{ slotCount: number }>('ace:shop_refreshed'),

    /** 生命值变化 */
    HP_CHANGED: new EventKey<{ oldHp: number; newHp: number; damage: number }>('ace:hp_changed'),

    /** 金币变化 */
    GOLD_CHANGED: new EventKey<{ oldGold: number; newGold: number }>('ace:gold_changed'),

    /** 游戏结束 */
    GAME_OVER: new EventKey<{ finalRound: number; result: string }>('ace:game_over'),

    /** 战斗开始 */
    BATTLE_START: new EventKey<{ round: number }>('ace:battle_start'),

    /** 战斗结束 */
    BATTLE_END: new EventKey<{ round: number; winner: string }>('ace:battle_end'),
} as const;

// ═══════════════════════════════════════════════════════
// 游戏常量
// ═══════════════════════════════════════════════════════

/** 棋盘行数 */
export const BOARD_ROWS = 4;
/** 棋盘列数 */
export const BOARD_COLS = 4;
/** 玩家占据的行 */
export const PLAYER_ROWS = [0, 1] as const;
/** 敌方占据的行 */
export const ENEMY_ROWS = [2, 3] as const;

/** 初始生命值 */
export const INITIAL_HP = 100;
/** 初始金币 */
export const INITIAL_GOLD = 10;
/** 基础每回合收入 */
export const BASE_INCOME = 5;

/** 刷新商店费用 */
export const REFRESH_COST = 2;
/** 准备阶段时长（秒） */
export const PREPARE_TIME_SECONDS = 30;

/** 商店槽位数 */
export const SHOP_SIZE = 5;
/** 备战席上限 */
export const MAX_BENCH_SIZE = 8;

// ═══════════════════════════════════════════════════════
// 接口定义
// ═══════════════════════════════════════════════════════

/** 棋盘网格坐标 */
export interface IGridPosition {
    row: number;
    col: number;
}

/** 传递给 ChessPieceEntity.onShow() 的初始化数据 */
export interface IChessPieceShowData {
    /** 配置表 ID */
    configId: number;
    /** 棋子名称 */
    name: string;
    /** 种族 */
    race: string;
    /** 生命值 */
    hp: number;
    /** 攻击力 */
    atk: number;
    /** 攻击间隔（秒） */
    atkSpeed: number;
    /** 攻击范围（格数） */
    range: number;
    /** 星级 */
    star: number;
    /** 初始位置 */
    position: IGridPosition;
}

/** 棋盘格子状态 */
export interface IBoardCell {
    /** 格子上的棋子 ID，null 表示空格 */
    pieceId: number | null;
    /** 行号 */
    row: number;
    /** 列号 */
    col: number;
}

// ═══════════════════════════════════════════════════════
// FSM 状态名常量
// ═══════════════════════════════════════════════════════

/** 棋子 AI 状态机状态名 */
export const ChessAiStateNames = {
    IDLE: 'Idle',
    MOVE_TO: 'MoveTo',
    ATTACK: 'Attack',
    DEAD: 'Dead',
} as const;

/** 游戏阶段状态机状态名 */
export const GamePhaseStateNames = {
    PREPARE: 'Prepare',
    BATTLE: 'Battle',
    SETTLE: 'Settle',
} as const;

/** 游戏阶段 FSM 名称 */
export const GAME_PHASE_FSM_NAME = 'AutoChess_GamePhase';

/** 棋子 AI FSM 名称前缀（后接棋子 ID） */
export const CHESS_AI_FSM_PREFIX = 'AutoChess_ChessAI_';

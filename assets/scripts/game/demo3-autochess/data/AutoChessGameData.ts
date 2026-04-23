/**
 * Auto-chess Lite Demo — 游戏运行时状态数据
 *
 * 包含棋子运行时状态、商店、羁绊、战斗结果等运行时数据结构。
 * @module
 */

import { INITIAL_GOLD, INITIAL_HP, IGridPosition } from '../AutoChessDefs';
export { INITIAL_GOLD, INITIAL_HP };
export type { IGridPosition };

/** 棋子阵营 */
export type ChessPieceSide = 'player' | 'enemy';

/** 棋子配置行最小接口（解耦 ChessPieceConfigRow） */
export interface IChessPieceConfig {
    id: number;
    name: string;
    race: string;
    hp: number;
    atk: number;
    atkSpeed: number;
    range: number;
    cost: number;
    star2Mult: number;
}

/**
 * 棋子运行时状态
 *
 * 在战斗和布阵阶段携带棋子的全部实时属性。
 */
export interface ChessPieceRuntimeState {
    /** 棋子唯一 ID（自增） */
    id: number;
    /** 配置 ID */
    configId: number;
    /** 棋子名称 */
    name: string;
    /** 种族 */
    race: string;
    /** 当前 HP */
    hp: number;
    /** 最大 HP */
    maxHp: number;
    /** 攻击力 */
    atk: number;
    /** 攻击间隔（秒） */
    atkSpeed: number;
    /** 攻击范围（格数） */
    range: number;
    /** 星级（1 或 2） */
    star: number;
    /** 阵营 */
    side: ChessPieceSide;
    /** 棋盘位置（未上阵时为 {row:-1, col:-1}） */
    position: IGridPosition;
    /** 是否存活 */
    isAlive: boolean;
}

/** 商店槽位 */
export interface ShopSlot {
    /** 棋子配置（null 表示空槽） */
    config: IChessPieceConfig | null;
    /** 是否已售出 */
    sold: boolean;
}

/** 已激活的羁绊 */
export interface ActiveSynergy {
    /** 种族 */
    race: string;
    /** 场上该种族棋子数 */
    count: number;
    /** 触发阈值 */
    threshold: number;
    /** 效果类型 */
    effect: string;
    /** 加成百分比 */
    value: number;
    /** 是否已激活 */
    isActive: boolean;
}

/** 战斗结果 */
export type BattleResult = 'win' | 'lose';

/** 合成结果 */
export interface MergeResult {
    /** 合成后的棋子状态 */
    mergedPiece: ChessPieceRuntimeState;
    /** 被消耗的棋子 ID 列表 */
    consumedIds: number[];
}

// ─── 实现类 ────────────────────────────────────────────

/**
 * 自走棋游戏运行时数据
 *
 * 维护金币、HP、回合数、棋子注册表、棋盘/备战席/商店状态。
 */
export class AutoChessGameData {
    /** 当前金币 */
    gold: number = INITIAL_GOLD;

    /** 当前生命值 */
    hp: number = INITIAL_HP;

    /** 当前回合（从 1 开始） */
    round: number = 1;

    /** 棋盘棋子映射：'row,col' → pieceId */
    boardPieces: Map<string, number> = new Map();

    /** 备战席棋子列表 */
    benchPieces: ChessPieceRuntimeState[] = [];

    /** 商店槽位 */
    shopSlots: ShopSlot[] = [];

    /** 商店是否锁定 */
    shopLocked: boolean = false;

    /** 已激活的羁绊列表 */
    activeSynergies: ActiveSynergy[] = [];

    /** 全局棋子注册表：pieceId → 运行时状态 */
    allPieces: Map<number, ChessPieceRuntimeState> = new Map();

    /** 下一个棋子 ID（自增） */
    nextPieceId: number = 1;

    /**
     * 重置所有运行时状态为默认值
     */
    reset(): void {
        this.gold = INITIAL_GOLD;
        this.hp = INITIAL_HP;
        this.round = 1;
        this.boardPieces = new Map();
        this.benchPieces = [];
        this.shopSlots = [];
        this.shopLocked = false;
        this.activeSynergies = [];
        this.allPieces = new Map();
        this.nextPieceId = 1;
    }

    /**
     * 创建一个棋子运行时状态并注册到 allPieces
     *
     * @param config 棋子配置
     * @param star 星级（1 或 2）
     * @param side 阵营
     * @returns 新建的棋子运行时状态
     */
    createPieceState(
        config: IChessPieceConfig,
        star: number,
        side: ChessPieceSide,
    ): ChessPieceRuntimeState {
        const mult = star >= 2 ? config.star2Mult : 1;
        const piece: ChessPieceRuntimeState = {
            id: this.nextPieceId++,
            configId: config.id,
            name: config.name,
            race: config.race,
            hp: config.hp * mult,
            maxHp: config.hp * mult,
            atk: config.atk * mult,
            atkSpeed: config.atkSpeed,
            range: config.range,
            star,
            side,
            position: { row: -1, col: -1 },
            isAlive: true,
        };

        this.allPieces.set(piece.id, piece);
        return piece;
    }

    /**
     * 按 ID 获取棋子
     *
     * @param id 棋子 ID
     * @returns 棋子状态，不存在时返回 undefined
     */
    getPiece(id: number): ChessPieceRuntimeState | undefined {
        return this.allPieces.get(id);
    }

    /**
     * 获取所有存活的玩家棋子
     */
    getPlayerPieces(): ChessPieceRuntimeState[] {
        return [...this.allPieces.values()].filter((p) => p.side === 'player' && p.isAlive);
    }

    /**
     * 获取所有存活的敌方棋子
     */
    getEnemyPieces(): ChessPieceRuntimeState[] {
        return [...this.allPieces.values()].filter((p) => p.side === 'enemy' && p.isAlive);
    }
}

/**
 * Auto-chess 准备阶段流程
 *
 * 管理准备阶段的商店购买、棋子布阵、合成升星、商店刷新等交互。
 * 进入时增加回合、发放收入、刷新商店、创建 30s 倒计时。
 * 倒计时结束或手动完成后计算最终羁绊并切换到 BattleProcedure。
 * @module
 */

import { ProcedureBase } from '../../../framework/procedure/ProcedureBase';
import { IFsm } from '../../../framework/fsm/FsmDefs';
import { Logger } from '../../../framework/debug/Logger';
import { AutoChessEvents, BASE_INCOME, REFRESH_COST, PREPARE_TIME_SECONDS } from '../AutoChessDefs';
import { IAutoChessProcedureContext, AUTO_CHESS_CONTEXT_KEY } from './AutoChessProcedureContext';
import { AutoChessGameData } from '../data/AutoChessGameData';
import { ChessPieceConfigRow } from '../data/ChessPieceConfigRow';
import { SynergyConfigRow } from '../data/SynergyConfigRow';
import { ShopSystem } from '../systems/ShopSystem';
import { BoardSystem } from '../systems/BoardSystem';
import { MergeSystem } from '../systems/MergeSystem';
import { SynergySystem } from '../systems/SynergySystem';
import { EventManager } from '../../../framework/event/EventManager';
import { BattleProcedure } from './BattleProcedure';

const TAG = 'PrepareProcedure';

/**
 * Auto-chess 准备阶段流程
 *
 * 管理准备阶段所有交互：购买棋子、放置到棋盘、刷新商店。
 * 倒计时结束自动切换到战斗阶段。
 */
export class PrepareProcedure extends ProcedureBase {
    /** 流程状态机引用 */
    private _fsm: IFsm<unknown> | null = null;

    /** 游戏运行时数据 */
    private _gameData: AutoChessGameData | null = null;

    /** 商店系统 */
    private _shopSystem: ShopSystem | null = null;

    /** 棋盘系统 */
    private _boardSystem: BoardSystem | null = null;

    /** 合成系统 */
    private _mergeSystem: MergeSystem | null = null;

    /** 羁绊系统 */
    private _synergySystem: SynergySystem | null = null;

    /** 事件管理器 */
    private _eventManager: EventManager | null = null;

    /** 定时器管理器 */
    private _timerManager: {
        addTimer: (delay: number, cb: () => void) => number;
        removeTimer: (id: number) => boolean;
    } | null = null;

    /** 渲染器 */
    private _renderer: {
        log: (msg: string) => void;
        updateLog: (key: string, msg: string) => void;
        updateStatus: (msg: string) => void;
    } | null = null;

    /** 数据表管理器 */
    private _dataTableManager: {
        getAllRows: (name: string) => readonly unknown[];
        getRow: (name: string, id: number) => unknown;
    } | null = null;

    /** 准备阶段倒计时 Timer ID */
    private _timerId: number = -1;

    /** 操作是否已禁用（onLeave 后或 onPrepareComplete 后） */
    private _disabled: boolean = false;

    /**
     * 进入准备阶段
     *
     * 1. 获取上下文
     * 2. 增加回合计数、增加收入
     * 3. 刷新商店（如未锁定）
     * 4. 发射 ROUND_START 事件
     * 5. 创建 30s 倒计时
     * 6. 渲染商店和棋盘
     */
    onEnter(fsm: IFsm<unknown>): void {
        const ctx = fsm.getData<IAutoChessProcedureContext>(AUTO_CHESS_CONTEXT_KEY);
        if (!ctx) {
            Logger.error(TAG, 'Auto-chess Procedure 上下文缺失');
            throw new Error(`[${TAG}] Auto-chess Procedure 上下文缺失`);
        }

        this._fsm = fsm;
        this._gameData = ctx.gameData;
        this._shopSystem = ctx.shopSystem;
        this._boardSystem = ctx.boardSystem;
        this._mergeSystem = ctx.mergeSystem;
        this._synergySystem = ctx.synergySystem;
        this._eventManager = ctx.eventManager;
        this._timerManager = ctx.timerManager as unknown as typeof this._timerManager;
        this._renderer = ctx.renderer as typeof this._renderer;
        this._dataTableManager = ctx.dataTableManager as unknown as typeof this._dataTableManager;
        this._disabled = false;

        // 1. 增加回合计数
        this._gameData.round++;
        Logger.info(TAG, `准备阶段开始 — 第 ${this._gameData.round} 回合`);

        // 2. 增加收入
        const oldGold = this._gameData.gold;
        this._gameData.gold += BASE_INCOME;
        this._eventManager.emit(AutoChessEvents.GOLD_CHANGED, {
            oldGold,
            newGold: this._gameData.gold,
        });
        Logger.info(TAG, `收入 +${BASE_INCOME} 金币，当前 ${this._gameData.gold}`);

        // 3. 刷新商店（如未锁定）
        if (!this._shopSystem.isLocked) {
            const configs = (this._dataTableManager?.getAllRows?.('chess_piece_config') ??
                []) as unknown as ChessPieceConfigRow[];
            this._shopSystem.refreshShop(configs);
        }

        // 4. 发射 ROUND_START 事件
        this._eventManager.emit(AutoChessEvents.ROUND_START, {
            round: this._gameData.round,
        });

        // 5. 创建 30s 倒计时
        this._timerId = this._timerManager!.addTimer(PREPARE_TIME_SECONDS, () =>
            this.onPrepareComplete(),
        );
        Logger.info(TAG, `倒计时已启动: ${PREPARE_TIME_SECONDS}s`);

        // 6. 渲染
        this._renderer?.log?.(`=== 第 ${this._gameData.round} 回合准备阶段 ===`);
    }

    /**
     * 购买棋子
     *
     * @param slotIndex 商店槽位索引
     */
    handleBuyPiece(slotIndex: number): void {
        if (this._disabled || !this._gameData || !this._shopSystem) {
            return;
        }

        const result = this._shopSystem.buyPiece(slotIndex, this._gameData.gold);
        if (!result) {
            return;
        }

        // 扣金
        const oldGold = this._gameData.gold;
        this._gameData.gold -= result.cost;

        // 创建棋子运行时状态并添加到 bench
        const piece = this._gameData.createPieceState(result.config, 1, 'player');
        this._gameData.benchPieces.push(piece);

        // 发射事件
        this._eventManager!.emit(AutoChessEvents.CHESS_BOUGHT, {
            pieceId: piece.id,
            configId: result.config.id,
            cost: result.cost,
        });
        this._eventManager!.emit(AutoChessEvents.GOLD_CHANGED, {
            oldGold,
            newGold: this._gameData.gold,
        });

        Logger.info(
            TAG,
            `购买棋子: ${result.config.name}，花费 ${result.cost}，剩余 ${this._gameData.gold}`,
        );

        // 检查合成
        this._checkMerge();
    }

    /**
     * 放置棋子到棋盘
     *
     * @param pieceId 棋子 ID
     * @param row 行号
     * @param col 列号
     */
    handlePlacePiece(pieceId: number, row: number, col: number): void {
        if (this._disabled || !this._gameData || !this._boardSystem) {
            return;
        }

        const piece = this._gameData.getPiece(pieceId);
        if (!piece) {
            Logger.warn(TAG, `找不到棋子: ${pieceId}`);
            return;
        }

        // 尝试放置
        const success = this._boardSystem.placePiece(pieceId, row, col);
        if (!success) {
            return;
        }

        // 从 bench 移除
        const benchIdx = this._gameData.benchPieces.findIndex((p) => p.id === pieceId);
        if (benchIdx >= 0) {
            this._gameData.benchPieces.splice(benchIdx, 1);
        }

        // 更新位置
        piece.position = { row, col };
        this._gameData.boardPieces.set(`${row},${col}`, pieceId);

        // 发射事件
        this._eventManager!.emit(AutoChessEvents.CHESS_PLACED, {
            pieceId,
            row,
            col,
        });

        Logger.info(TAG, `棋子 ${piece.name}(#${pieceId}) 放置到 (${row}, ${col})`);

        // 重新计算羁绊
        this._recalculateSynergies();
    }

    /**
     * 手动刷新商店
     */
    handleRefreshShop(): void {
        if (this._disabled || !this._gameData || !this._shopSystem) {
            return;
        }

        if (this._gameData.gold < REFRESH_COST) {
            Logger.warn(TAG, `金币不足，无法刷新商店: ${this._gameData.gold} < ${REFRESH_COST}`);
            return;
        }

        const oldGold = this._gameData.gold;
        this._gameData.gold -= REFRESH_COST;

        const configs = (this._dataTableManager?.getAllRows?.('chess_piece_config') ??
            []) as unknown as ChessPieceConfigRow[];
        // 刷新前解锁（手动刷新忽略锁定状态）
        this._shopSystem.unlockShop();
        this._shopSystem.refreshShop(configs);

        this._eventManager!.emit(AutoChessEvents.GOLD_CHANGED, {
            oldGold,
            newGold: this._gameData.gold,
        });
        this._eventManager!.emit(AutoChessEvents.SHOP_REFRESHED, {
            slotCount: this._shopSystem.getSlots().length,
        });

        Logger.info(TAG, `手动刷新商店，花费 ${REFRESH_COST}，剩余 ${this._gameData.gold}`);
    }

    /**
     * 准备阶段完成（倒计时结束或手动触发）
     *
     * 移除 Timer → 计算最终羁绊 → 切换到 BattleProcedure
     */
    onPrepareComplete(): void {
        if (this._disabled) {
            return;
        }
        this._disabled = true;

        // 移除倒计时
        if (this._timerId >= 0 && this._timerManager) {
            this._timerManager.removeTimer(this._timerId);
            this._timerId = -1;
        }

        // 计算最终羁绊
        this._recalculateSynergies();

        Logger.info(TAG, '准备阶段结束，切换到战斗阶段');

        this._eventManager?.emit(AutoChessEvents.PHASE_CHANGED, {
            from: 'Prepare',
            to: 'Battle',
        });

        // 延迟导入避免循环引用
        this.changeProcedure(this._fsm!, BattleProcedure);
    }

    /**
     * 离开准备阶段
     *
     * 清理倒计时 Timer，禁用操作
     */
    onLeave(_fsm: IFsm<unknown>): void {
        this._disabled = true;

        // 清理 Timer
        if (this._timerId >= 0 && this._timerManager) {
            this._timerManager.removeTimer(this._timerId);
            this._timerId = -1;
        }

        Logger.info(TAG, '离开准备阶段，已清理资源');

        // 清理引用
        this._fsm = null;
        this._gameData = null;
        this._shopSystem = null;
        this._boardSystem = null;
        this._mergeSystem = null;
        this._synergySystem = null;
        this._eventManager = null;
        this._timerManager = null;
        this._renderer = null;
        this._dataTableManager = null;
    }

    // ─── 私有方法 ──────────────────────────────────────

    /**
     * 检查并执行合成
     */
    private _checkMerge(): void {
        if (!this._mergeSystem || !this._gameData) {
            return;
        }

        // 收集所有玩家棋子（bench + board）
        const allPlayerPieces = this._gameData.getPlayerPieces();
        const mergeResult = this._mergeSystem.checkAndMerge(allPlayerPieces, 2.0);

        if (mergeResult) {
            // 移除被消耗的棋子
            for (const consumedId of mergeResult.consumedIds) {
                // 从 bench 移除
                const benchIdx = this._gameData.benchPieces.findIndex((p) => p.id === consumedId);
                if (benchIdx >= 0) {
                    this._gameData.benchPieces.splice(benchIdx, 1);
                }
                // 从 board 移除
                for (const [key, pid] of this._gameData.boardPieces) {
                    if (pid === consumedId) {
                        this._gameData.boardPieces.delete(key);
                        this._boardSystem?.removePiece(
                            Number(key.split(',')[0]),
                            Number(key.split(',')[1]),
                        );
                        break;
                    }
                }
                // 从 allPieces 移除
                this._gameData.allPieces.delete(consumedId);
            }

            // 分配 ID 并注册合成后的棋子
            const merged = mergeResult.mergedPiece;
            merged.id = this._gameData.nextPieceId++;
            this._gameData.allPieces.set(merged.id, merged);
            this._gameData.benchPieces.push(merged);

            // 发射合成事件
            this._eventManager!.emit(AutoChessEvents.CHESS_MERGED, {
                resultPieceId: merged.id,
                star: merged.star,
                name: merged.name,
            });

            Logger.info(TAG, `合成完成: ${merged.name} ★${merged.star}`);
        }
    }

    /**
     * 重新计算羁绊
     */
    private _recalculateSynergies(): void {
        if (!this._synergySystem || !this._gameData || !this._dataTableManager) {
            return;
        }

        // 只统计棋盘上的棋子
        const boardPieceIds = [...this._gameData.boardPieces.values()];
        const boardPieces = boardPieceIds
            .map((id) => this._gameData!.getPiece(id))
            .filter((p): p is NonNullable<typeof p> => p != null);

        const synergyConfigs = (this._dataTableManager.getAllRows?.('synergy_config') ??
            []) as unknown as SynergyConfigRow[];
        this._gameData.activeSynergies = this._synergySystem.calculateSynergies(
            boardPieces,
            synergyConfigs,
        );
    }
}

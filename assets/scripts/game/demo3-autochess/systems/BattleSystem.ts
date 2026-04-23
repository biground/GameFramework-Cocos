/**
 * 战斗系统 — 驱动自走棋自动战斗
 *
 * 为每个存活棋子创建 AI FSM，统一管理 FSM 生命周期。
 * 提供战斗开始、更新、结束、胜负判定等接口。
 * @module
 */

import { IFsm } from '../../../framework/fsm/FsmDefs';
import { FsmManager } from '../../../framework/fsm/FsmManager';
import { IEventManager } from '../../../framework/interfaces/IEventManager';
import { Logger } from '../../../framework/debug/Logger';
import { CHESS_AI_FSM_PREFIX } from '../AutoChessDefs';
import { ChessPieceRuntimeState, ChessPieceSide } from '../data/AutoChessGameData';
import { BoardSystem } from './BoardSystem';
import { IChessAiBlackboard, ChessAiDataKeys } from '../fsm/ChessAiFsmDefs';
import { IdleState } from '../fsm/chess-ai/IdleState';
import { MoveToState } from '../fsm/chess-ai/MoveToState';
import { AttackState } from '../fsm/chess-ai/AttackState';
import { DeadState } from '../fsm/chess-ai/DeadState';

export class BattleSystem {
    private static readonly TAG = 'BattleSystem';

    /** FSM 管理器引用 */
    private _fsmManager: FsmManager | null = null;
    /** 棋盘系统引用 */
    private _boardSystem: BoardSystem | null = null;
    /** 事件管理器引用 */
    private _eventManager: IEventManager | null = null;

    /** 棋子 ID → AI FSM 映射 */
    private _chessFsms: Map<number, IFsm<string>> = new Map();

    /** 玩家方棋子列表 */
    private _playerPieces: ChessPieceRuntimeState[] = [];
    /** 敌方棋子列表 */
    private _enemyPieces: ChessPieceRuntimeState[] = [];

    /** 战斗是否激活 */
    private _battleActive: boolean = false;

    /** 时间缩放（默认 1） */
    private _timeScale: number = 1;

    // ─── 公开属性 ─────────────────────────────────────

    /** 战斗是否正在进行 */
    get battleActive(): boolean {
        return this._battleActive;
    }

    /** 时间缩放，影响 updateBattle 的 deltaTime */
    get timeScale(): number {
        return this._timeScale;
    }

    set timeScale(value: number) {
        if (value <= 0) {
            Logger.warn(
                BattleSystem.TAG,
                `timeScale 不能为 0 或负值，保持当前值 ${this._timeScale}`,
            );
            return;
        }
        this._timeScale = value;
    }

    // ─── 公开方法 ─────────────────────────────────────

    /**
     * 开始战斗，为每个存活棋子创建 AI FSM
     * @param fsmManager FSM 管理器
     * @param boardSystem 棋盘系统
     * @param eventManager 事件管理器
     * @param playerPieces 玩家方棋子列表
     * @param enemyPieces 敌方棋子列表
     */
    startBattle(
        fsmManager: FsmManager,
        boardSystem: BoardSystem,
        eventManager: IEventManager,
        playerPieces: ChessPieceRuntimeState[],
        enemyPieces: ChessPieceRuntimeState[],
    ): void {
        this._fsmManager = fsmManager;
        this._boardSystem = boardSystem;
        this._eventManager = eventManager;
        this._playerPieces = playerPieces;
        this._enemyPieces = enemyPieces;
        this._chessFsms.clear();

        // 为所有存活棋子创建 AI FSM
        const allPieces = [...playerPieces, ...enemyPieces];
        for (const piece of allPieces) {
            if (!piece.isAlive) {
                continue;
            }
            this._createChessFsm(piece);
        }

        this._battleActive = true;
        Logger.info(
            BattleSystem.TAG,
            `战斗开始：玩家 ${playerPieces.filter((p) => p.isAlive).length} vs 敌方 ${enemyPieces.filter((p) => p.isAlive).length}`,
        );
    }

    /**
     * 更新战斗，遍历所有 AI FSM 执行 update
     * @param deltaTime 帧间隔时间（秒）
     */
    updateBattle(deltaTime: number): void {
        if (!this._battleActive) {
            return;
        }

        const scaledDt = deltaTime * this._timeScale;

        // 遍历所有 FSM 执行更新
        for (const fsm of this._chessFsms.values()) {
            if (!fsm.isDestroyed && fsm.currentState) {
                fsm.currentState.onUpdate(fsm, scaledDt);
            }
        }
    }

    /**
     * 判断战斗是否结束（一方全灭）
     * @returns 战斗未开始返回 false，一方全灭返回 true
     */
    isBattleOver(): boolean {
        if (!this._battleActive) {
            return false;
        }

        const playerAlive = this._playerPieces.some((p) => p.isAlive);
        const enemyAlive = this._enemyPieces.some((p) => p.isAlive);

        return !playerAlive || !enemyAlive;
    }

    /**
     * 获取战斗结果
     * @returns 胜利方和存活棋子数
     */
    getBattleResult(): { winner: ChessPieceSide; survivingCount: number } {
        const playerAlive = this._playerPieces.filter((p) => p.isAlive);
        const enemyAlive = this._enemyPieces.filter((p) => p.isAlive);

        if (enemyAlive.length === 0) {
            return { winner: 'player', survivingCount: playerAlive.length };
        }
        return { winner: 'enemy', survivingCount: enemyAlive.length };
    }

    /**
     * 结束战斗，销毁所有棋子 AI FSM
     */
    endBattle(): void {
        if (!this._fsmManager) {
            return;
        }

        for (const pieceId of this._chessFsms.keys()) {
            const fsmName = CHESS_AI_FSM_PREFIX + pieceId;
            this._fsmManager.destroyFsm(fsmName);
        }

        this._chessFsms.clear();
        this._battleActive = false;

        Logger.info(BattleSystem.TAG, '战斗结束，所有 AI FSM 已销毁');
    }

    // ─── 私有方法 ─────────────────────────────────────

    /**
     * 为单个棋子创建 AI FSM
     * @param piece 棋子运行时状态
     */
    private _createChessFsm(piece: ChessPieceRuntimeState): void {
        if (!this._fsmManager || !this._boardSystem || !this._eventManager) {
            Logger.error(BattleSystem.TAG, '依赖未初始化，无法创建 FSM');
            return;
        }

        const fsmName = CHESS_AI_FSM_PREFIX + piece.id;
        const isPlayerSide = piece.side === 'player';

        // 创建 FSM
        const fsm = this._fsmManager.createFsm<string>(
            fsmName,
            fsmName,
            new IdleState(),
            new MoveToState(),
            new AttackState(),
            new DeadState(),
        );

        // 构建黑板数据
        const blackboard: IChessAiBlackboard = {
            pieceState: piece,
            boardSystem: this._boardSystem,
            allEnemies: () => {
                const enemies = isPlayerSide ? this._enemyPieces : this._playerPieces;
                return enemies.filter((e) => e.isAlive);
            },
            target: null,
            eventManager: this._eventManager,
        };

        // 写入黑板
        fsm.setData(ChessAiDataKeys.BLACKBOARD, blackboard);

        // 启动 FSM，初始状态 Idle
        fsm.start(IdleState);

        this._chessFsms.set(piece.id, fsm);

        Logger.debug(BattleSystem.TAG, `棋子 #${piece.id} AI FSM 已创建: ${fsmName}`);
    }
}

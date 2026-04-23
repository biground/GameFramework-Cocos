/**
 * Auto-chess 战斗阶段流程
 *
 * 驱动自动战斗：生成敌方棋阵、启动战斗、逐帧更新、判定胜负并切换到结算流程。
 * @module
 */

import { ProcedureBase } from '../../../framework/procedure/ProcedureBase';
import { IFsm } from '../../../framework/fsm/FsmDefs';
import { Logger } from '../../../framework/debug/Logger';
import { AutoChessEvents } from '../AutoChessDefs';
import { IAutoChessProcedureContext, AUTO_CHESS_CONTEXT_KEY } from './AutoChessProcedureContext';
import { SettleProcedure } from './SettleProcedure';
import { EnemyGenerator } from '../factory/EnemyGenerator';
import { ChessPieceRuntimeState } from '../data/AutoChessGameData';

const TAG = 'BattleProcedure';

/** 战斗结果存入 FSM 数据的键 */
export const BATTLE_RESULT_KEY = '__battle_result__';

/**
 * 战斗阶段流程
 *
 * - onEnter: 生成敌方棋子 → 收集己方棋子 → 启动战斗 → 发射 BATTLE_START
 * - onUpdate: 驱动战斗更新 → 检查战斗是否结束 → 切换到 SettleProcedure
 * - onLeave: 结束战斗 → 清理所有实体
 */
export class BattleProcedure extends ProcedureBase {
    /** 流程上下文引用（onEnter 初始化） */
    private _ctx: IAutoChessProcedureContext | null = null;

    /** 本轮敌方棋子列表 */
    private _enemyPieces: ChessPieceRuntimeState[] = [];

    /** 本轮己方棋子列表 */
    private _playerPieces: ChessPieceRuntimeState[] = [];

    /** 进入战斗阶段 */
    onEnter(fsm: IFsm<unknown>): void {
        const ctx = fsm.getData<IAutoChessProcedureContext>(AUTO_CHESS_CONTEXT_KEY);
        if (!ctx) {
            Logger.error(TAG, 'Auto-chess Procedure 上下文缺失');
            throw new Error(`[${TAG}] Auto-chess Procedure 上下文缺失`);
        }
        this._ctx = ctx;

        const {
            gameData,
            battleSystem,
            boardSystem,
            fsmManager,
            eventManager,
            entityManager,
            renderer,
        } = ctx;
        const round = gameData.round;

        Logger.info(TAG, `进入战斗阶段 — 回合 ${round}`);

        // 1. 收集己方棋盘上的棋子
        this._playerPieces = gameData.getPlayerPieces();

        // 2. 生成敌方棋子（通过 EnemyGenerator 工厂）
        const configMap = new Map<number, ChessPieceRuntimeState>();
        for (const piece of gameData.allPieces.values()) {
            if (!configMap.has(piece.configId)) {
                configMap.set(piece.configId, piece);
            }
        }
        const configs = [...configMap.values()].map((p) => ({
            id: p.configId,
            name: p.name,
            race: p.race,
            hp: p.maxHp,
            atk: p.atk,
            atkSpeed: p.atkSpeed,
            range: p.range,
            cost: 1,
            star2Mult: 2.0,
        }));

        // 如果没有可用配置，使用默认配置
        const enemyConfigs =
            configs.length > 0
                ? configs
                : [
                      {
                          id: 1,
                          name: '剑士',
                          race: 'warrior',
                          hp: 600,
                          atk: 50,
                          atkSpeed: 1.0,
                          range: 1,
                          cost: 1,
                          star2Mult: 2.0,
                      },
                  ];

        this._enemyPieces = EnemyGenerator.generate(round, enemyConfigs);

        // 注册敌方棋子到 gameData
        for (const enemy of this._enemyPieces) {
            gameData.allPieces.set(enemy.id, enemy);
        }

        // 2.5 将敌方棋子放置到棋盘网格（AI 寻敌依赖 boardSystem 格子数据）
        for (const enemy of this._enemyPieces) {
            boardSystem.placePiece(enemy.id, enemy.position.row, enemy.position.col);
        }

        // 3. 创建实体（通过 EntityManager）
        for (const enemy of this._enemyPieces) {
            entityManager.showEntity('enemy_chess', {
                configId: enemy.configId,
                name: enemy.name,
                race: enemy.race,
                hp: enemy.hp,
                atk: enemy.atk,
                atkSpeed: enemy.atkSpeed,
                range: enemy.range,
                star: enemy.star,
                position: enemy.position,
            });
        }

        for (const player of this._playerPieces) {
            entityManager.showEntity('player_chess', {
                configId: player.configId,
                name: player.name,
                race: player.race,
                hp: player.hp,
                atk: player.atk,
                atkSpeed: player.atkSpeed,
                range: player.range,
                star: player.star,
                position: player.position,
            });
        }

        // 4. 启动战斗系统
        battleSystem.startBattle(
            fsmManager,
            boardSystem,
            eventManager,
            this._playerPieces,
            this._enemyPieces,
        );

        // 5. 渲染战斗信息
        if (renderer && typeof (renderer as Record<string, unknown>)['log'] === 'function') {
            (renderer as { log: (msg: string) => void }).log(
                `⚔️ 回合 ${round} 战斗开始！玩家 ${this._playerPieces.length} vs 敌方 ${this._enemyPieces.length}`,
            );
        }

        // 6. 发射 BATTLE_START 事件
        eventManager.emit(AutoChessEvents.BATTLE_START, { round });

        Logger.info(
            TAG,
            `战斗启动完成：玩家 ${this._playerPieces.length} vs 敌方 ${this._enemyPieces.length}`,
        );
    }

    /** 每帧更新战斗 */
    onUpdate(fsm: IFsm<unknown>, deltaTime: number): void {
        if (!this._ctx) {
            return;
        }

        const { battleSystem } = this._ctx;

        // 驱动战斗更新
        battleSystem.updateBattle(deltaTime);

        // 检查战斗是否结束
        if (battleSystem.isBattleOver()) {
            const result = battleSystem.getBattleResult();
            Logger.info(
                TAG,
                `战斗结束：${result.winner === 'player' ? '胜利' : '失败'}，存活 ${result.survivingCount}`,
            );

            // 存入 FSM 数据供 SettleProcedure 读取
            fsm.setData(BATTLE_RESULT_KEY, result);

            // 切换到结算流程
            this.changeProcedure(fsm, SettleProcedure);
        }
    }

    /** 离开战斗阶段，清理资源 */
    onLeave(_fsm: IFsm<unknown>): void {
        if (!this._ctx) {
            return;
        }

        const { battleSystem, entityManager, boardSystem } = this._ctx;

        // 结束战斗（销毁 AI FSM）
        battleSystem.endBattle();

        // 清理棋盘上的敌方棋子
        for (const enemy of this._enemyPieces) {
            boardSystem.removePiece(enemy.position.row, enemy.position.col);
        }
        // 清理棋盘上的玩家棋子
        for (const player of this._playerPieces) {
            if (player.position.row >= 0 && player.position.col >= 0) {
                boardSystem.removePiece(player.position.row, player.position.col);
            }
        }

        // 清理实体
        entityManager.hideAllEntities('player_chess');
        entityManager.hideAllEntities('enemy_chess');

        // 清除敌方棋子数据
        if (this._ctx.gameData) {
            for (const enemy of this._enemyPieces) {
                this._ctx.gameData.allPieces.delete(enemy.id);
            }
        }

        this._enemyPieces = [];
        this._playerPieces = [];
        this._ctx = null;

        Logger.info(TAG, '离开战斗阶段，资源已清理');
    }
}

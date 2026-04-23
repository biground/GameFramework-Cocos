/**
 * Auto-chess 结算流程
 *
 * 战斗结束后进入：根据胜负计算 HP 和金币变化，发射事件，决定下一个流程。
 * - 胜利：不扣 HP，奖励 BASE_INCOME + 存活棋子数
 * - 失败：扣 HP = 敌方存活数 × 5，奖励 BASE_INCOME
 * @module
 */

import { ProcedureBase } from '../../../framework/procedure/ProcedureBase';
import { IFsm } from '../../../framework/fsm/FsmDefs';
import { Logger } from '../../../framework/debug/Logger';
import { AutoChessEvents, BASE_INCOME } from '../AutoChessDefs';
import { IAutoChessProcedureContext, AUTO_CHESS_CONTEXT_KEY } from './AutoChessProcedureContext';
import { PrepareProcedure } from './PrepareProcedure';
import { GameOverProcedure } from './GameOverProcedure';
import { ChessPieceSide } from '../data/AutoChessGameData';

const TAG = 'SettleProcedure';

/** 每个敌方存活棋子造成的 HP 伤害 */
export const HP_DAMAGE_PER_ENEMY = 5;

/** FSM 共享数据键：战斗结果 */
export const BATTLE_RESULT_DATA_KEY = '__battle_result__';

/** 战斗结果数据 */
export interface BattleResultData {
    /** 胜利方 */
    winner: ChessPieceSide;
    /** 胜利方存活棋子数 */
    survivingCount: number;
}

/**
 * 结算流程
 *
 * 根据战斗结果计算 HP/金币变化，发射事件，决定切换到准备阶段或游戏结束。
 */
export class SettleProcedure extends ProcedureBase {
    /** 进入结算流程 */
    onEnter(fsm: IFsm<unknown>): void {
        const ctx = fsm.getData<IAutoChessProcedureContext>(AUTO_CHESS_CONTEXT_KEY);
        if (!ctx) {
            Logger.error(TAG, 'Auto-chess Procedure 上下文缺失');
            throw new Error(`[${TAG}] Auto-chess Procedure 上下文缺失`);
        }

        const battleResult = fsm.getData<BattleResultData>(BATTLE_RESULT_DATA_KEY);
        if (!battleResult) {
            Logger.error(TAG, '战斗结果缺失');
            throw new Error(`[${TAG}] 战斗结果缺失`);
        }

        const { gameData, eventManager, renderer } = ctx;
        const isWin = battleResult.winner === 'player';

        const oldHp = gameData.hp;
        const oldGold = gameData.gold;

        if (isWin) {
            // 胜利：不扣 HP，奖励金币 = BASE_INCOME + 存活棋子数
            const goldReward = BASE_INCOME + battleResult.survivingCount;
            gameData.gold += goldReward;

            Logger.info(
                TAG,
                `胜利结算：金币 +${goldReward}（基础 ${BASE_INCOME} + 存活 ${battleResult.survivingCount}）`,
            );
        } else {
            // 失败：扣 HP = 敌方存活数 × HP_DAMAGE_PER_ENEMY，奖励基础金币
            const damage = battleResult.survivingCount * HP_DAMAGE_PER_ENEMY;
            gameData.hp = Math.max(0, gameData.hp - damage);
            gameData.gold += BASE_INCOME;

            Logger.info(
                TAG,
                `失败结算：HP -${damage}（${battleResult.survivingCount} × ${HP_DAMAGE_PER_ENEMY}），金币 +${BASE_INCOME}`,
            );

            // 发射 HP_CHANGED 事件
            eventManager.emit(AutoChessEvents.HP_CHANGED, {
                oldHp,
                newHp: gameData.hp,
                damage,
            });
        }

        // 发射 ROUND_END 事件
        eventManager.emit(AutoChessEvents.ROUND_END, {
            round: gameData.round,
            result: isWin ? 'win' : 'lose',
        });

        // 发射 GOLD_CHANGED 事件
        eventManager.emit(AutoChessEvents.GOLD_CHANGED, {
            oldGold,
            newGold: gameData.gold,
        });

        // 渲染结算日志
        if (renderer && typeof (renderer as Record<string, unknown>).log === 'function') {
            const r = renderer as { log: (msg: string, color?: string) => void };
            if (isWin) {
                r.log(
                    `🏆 第 ${gameData.round} 轮胜利！金币 +${gameData.gold - oldGold}`,
                    '#4CAF50',
                );
            } else {
                r.log(
                    `💔 第 ${gameData.round} 轮失败！HP -${oldHp - gameData.hp}，金币 +${BASE_INCOME}`,
                    '#F44336',
                );
            }
        }

        // 回合递增
        gameData.round++;

        // 决定下一个流程
        if (gameData.hp <= 0) {
            Logger.info(TAG, 'HP 耗尽，进入游戏结束流程');
            this.changeProcedure(fsm, GameOverProcedure);
        } else {
            Logger.info(TAG, '进入下一轮准备阶段');
            this.changeProcedure(fsm, PrepareProcedure);
        }
    }
}

/**
 * 结算流程 —— 战斗结束后的奖励结算与清理
 *
 * 计算经验/金币奖励、处理角色升级、清理 BUFF、停止 BGM、销毁 BattleFsm。
 * @module
 */

import { ProcedureBase } from '@framework/procedure/ProcedureBase';
import { IFsm } from '@framework/fsm/FsmDefs';
import { Logger } from '@framework/debug/Logger';
import { IRpgProcedureContext, RPG_PROCEDURE_CONTEXT_KEY } from './RpgProcedureContext';
import { BATTLE_RESULT_KEY, BattleResultData } from './BattleProcedure';
import { LobbyProcedure } from './LobbyProcedure';
import { RpgGameData } from '../data/RpgGameData';
import { BuffSystem } from '../systems/BuffSystem';

const TAG = 'SettleProcedure';

/** 每级所需经验 */
const EXP_PER_LEVEL = 100;

/**
 * 结算流程
 *
 * 战斗结束后进入：计算奖励、检查升级、清理战斗状态。
 */
export class SettleProcedure extends ProcedureBase {
    /**
     * 进入结算流程
     *
     * 1. 获取上下文和战斗结果
     * 2. 计算并发放奖励
     * 3. 检查角色升级
     * 4. 清理 BUFF、停止 BGM、销毁 BattleFsm
     * 5. 恢复角色状态（HP/MP/isAlive）
     * 6. 展示结算界面与返回大厅按钮
     */
    onEnter(fsm: IFsm<unknown>): void {
        const ctx = fsm.getData<IRpgProcedureContext>(RPG_PROCEDURE_CONTEXT_KEY);
        if (!ctx) {
            Logger.error(TAG, 'Procedure 上下文缺失');
            throw new Error(`[${TAG}] Procedure 上下文缺失`);
        }

        const result = fsm.getData<BattleResultData>(BATTLE_RESULT_KEY);
        const gameData = ctx.gameData as RpgGameData;
        const buffSystem = ctx.buffSystem as BuffSystem;
        const { renderer } = ctx;

        Logger.info(TAG, '进入结算流程');

        // 发放奖励（仅胜利时）
        if (result && result.victory) {
            gameData.gold += result.goldReward;
            gameData.totalExp += result.expReward;

            // 更新每个角色的经验并检查升级
            for (const player of gameData.playerCharacters) {
                player.exp += result.expReward;
                this._checkLevelUp(player, gameData);
            }

            Logger.info(TAG, `胜利结算：获得 ${result.expReward} 经验, ${result.goldReward} 金币`);
        } else {
            Logger.info(TAG, '战斗失败，无奖励');
        }

        // 清理 BUFF
        buffSystem.clearAll();

        // 停止 BGM
        ctx.audioManager.stopMusic();

        // 销毁 BattleFsm（防止下次战斗创建同名 FSM 时报错）
        ctx.fsmManager.destroyFsm('battle_fsm');

        // 恢复玩家角色状态（为下一轮战斗做准备）
        for (const player of gameData.playerCharacters) {
            player.hp = player.maxHp;
            player.mp = player.maxMp;
            player.isAlive = true;
            player.buffs = [];
        }

        // 展示结算界面
        renderer.separator('战斗结束');
        if (result && result.victory) {
            renderer.log(
                `🎉 胜利！获得 ${result.expReward} 经验、${result.goldReward} 金币`,
                '#4CAF50',
            );
        } else {
            renderer.log('😵 战斗失败...', '#F44336');
        }

        // 返回大厅按钮
        const actionGroup = renderer.createButtonGroup('操作');
        renderer.addButton(actionGroup, '返回大厅', () => {
            this.changeProcedure(fsm, LobbyProcedure);
        });

        Logger.info(TAG, '结算完成');
    }

    /**
     * 检查角色升级
     *
     * 每 100 经验升一级，升级时恢复全 HP/MP。
     * @param player - 角色状态
     * @param _gameData - 游戏数据（预留扩展）
     */
    private _checkLevelUp(
        player: {
            level: number;
            exp: number;
            hp: number;
            maxHp: number;
            mp: number;
            maxMp: number;
        },
        _gameData: RpgGameData,
    ): void {
        const targetLevel = 1 + Math.floor(player.exp / EXP_PER_LEVEL);
        if (targetLevel > player.level) {
            const oldLevel = player.level;
            player.level = targetLevel;
            // 升级恢复全 HP/MP
            player.hp = player.maxHp;
            player.mp = player.maxMp;
            Logger.info(TAG, `角色升级：Lv.${oldLevel} → Lv.${targetLevel}`);
        }
    }
}

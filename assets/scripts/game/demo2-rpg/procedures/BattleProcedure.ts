/**
 * 战斗流程 —— 驱动 BattleFsm 并监听战斗结束事件
 *
 * 进入时启动 BattleFsm、注册胜负事件监听；
 * 收到 BATTLE_VICTORY / BATTLE_DEFEAT 后切换到 SettleProcedure。
 * @module
 */

import { ProcedureBase } from '@framework/procedure/ProcedureBase';
import { IFsm } from '@framework/fsm/FsmDefs';
import { Logger } from '@framework/debug/Logger';
import { IRpgProcedureContext, RPG_PROCEDURE_CONTEXT_KEY } from './RpgProcedureContext';
import { SettleProcedure } from './SettleProcedure';
import { RpgEvents } from '../events/RpgEvents';

const TAG = 'BattleProcedure';

/** 战斗结算数据键（存入 FSM 共享数据，供 SettleProcedure 读取） */
export const BATTLE_RESULT_KEY = '__battle_result__';

/** 战斗结算数据 */
export interface BattleResultData {
    /** 是否胜利 */
    victory: boolean;
    /** 经验奖励 */
    expReward: number;
    /** 金币奖励 */
    goldReward: number;
}

/**
 * 战斗流程
 *
 * 管理战斗阶段：启动 BattleFsm、监听战斗结束事件、切换到结算流程。
 */
export class BattleProcedure extends ProcedureBase {
    /** 胜利事件回调引用（用于 off） */
    private _onVictory: ((data: { expReward: number; goldReward: number }) => void) | null = null;
    /** 失败事件回调引用（用于 off） */
    private _onDefeat: ((data: Record<string, never>) => void) | null = null;
    /** 当前上下文引用 */
    private _ctx: IRpgProcedureContext | null = null;

    /**
     * 进入战斗流程
     *
     * 1. 获取上下文
     * 2. 注册 BATTLE_VICTORY / BATTLE_DEFEAT 事件监听
     */
    onEnter(fsm: IFsm<unknown>): void {
        const ctx = fsm.getData<IRpgProcedureContext>(RPG_PROCEDURE_CONTEXT_KEY);
        if (!ctx) {
            Logger.error(TAG, 'Procedure 上下文缺失');
            throw new Error(`[${TAG}] Procedure 上下文缺失`);
        }

        this._ctx = ctx;

        // 注册胜利事件
        this._onVictory = (data: { expReward: number; goldReward: number }) => {
            Logger.info(TAG, `战斗胜利，经验=${data.expReward}，金币=${data.goldReward}`);
            fsm.setData<BattleResultData>(BATTLE_RESULT_KEY, {
                victory: true,
                expReward: data.expReward,
                goldReward: data.goldReward,
            });
            this.changeProcedure(fsm, SettleProcedure);
        };

        // 注册失败事件
        this._onDefeat = () => {
            Logger.info(TAG, '战斗失败');
            fsm.setData<BattleResultData>(BATTLE_RESULT_KEY, {
                victory: false,
                expReward: 0,
                goldReward: 0,
            });
            this.changeProcedure(fsm, SettleProcedure);
        };

        ctx.eventManager.on(RpgEvents.BATTLE_VICTORY, this._onVictory, this);
        ctx.eventManager.on(RpgEvents.BATTLE_DEFEAT, this._onDefeat, this);

        Logger.info(TAG, '战斗开始');
    }

    /**
     * 离开战斗流程
     *
     * 取消所有事件监听
     */
    onLeave(fsm: IFsm<unknown>): void {
        const ctx = this._ctx ?? fsm.getData<IRpgProcedureContext>(RPG_PROCEDURE_CONTEXT_KEY);
        if (ctx) {
            if (this._onVictory) {
                ctx.eventManager.off(RpgEvents.BATTLE_VICTORY, this._onVictory, this);
            }
            if (this._onDefeat) {
                ctx.eventManager.off(RpgEvents.BATTLE_DEFEAT, this._onDefeat, this);
            }
        }

        this._onVictory = null;
        this._onDefeat = null;
        this._ctx = null;

        Logger.info(TAG, '离开战斗');
    }
}

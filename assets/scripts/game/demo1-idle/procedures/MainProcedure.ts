/**
 * 主游戏流程 —— 游戏核心循环
 *
 * 启动建筑生产、自动存档、成就检测，响应 UI 交互。
 * 可切换到 SettingsProcedure。
 * @module
 */

import { ProcedureBase } from '@framework/procedure/ProcedureBase';
import { IFsm } from '@framework/fsm/FsmDefs';
import { Logger } from '@framework/debug/Logger';
import { TIMER_REPEAT_FOREVER } from '@framework/timer/TimerDefs';
import { IProcedureContext, PROCEDURE_CONTEXT_KEY } from './ProcedureContext';
import { SettingsProcedure } from './SettingsProcedure';
import { PROCEDURE_CHANGED } from '@game/demo1-idle/events/IdleEvents';

const TAG = 'MainProcedure';

/** 自动保存间隔（秒） */
const AUTO_SAVE_INTERVAL = 30;

/** 成就检测间隔（秒） */
const ACHIEVEMENT_CHECK_INTERVAL = 2;

/**
 * 主游戏流程
 *
 * 游戏主循环：驱动建筑生产、定期检测成就、自动存档。
 */
export class MainProcedure extends ProcedureBase {
    private _autoSaveTimerId: number | null = null;
    private _achievementCheckTimer = 0;
    private _settingsRequested = false;

    /** 进入主游戏流程 */
    onEnter(fsm: IFsm<unknown>): void {
        Logger.info(TAG, '进入主游戏流程');

        const ctx = fsm.getData<IProcedureContext>(PROCEDURE_CONTEXT_KEY);
        if (!ctx) {
            Logger.error(TAG, 'Procedure 上下文缺失');
            throw new Error(`[${TAG}] Procedure 上下文缺失`);
        }

        // 启动所有已拥有建筑的生产 Timer
        ctx.buildingSystem.startAllProduction();

        // 启动自动存档 Timer
        this._autoSaveTimerId = ctx.timerManager.addTimer(
            AUTO_SAVE_INTERVAL,
            () => {
                ctx.saveSystem.save(ctx.gameData);
                Logger.debug(TAG, '自动存档完成');
            },
            { repeat: TIMER_REPEAT_FOREVER },
        );

        this._achievementCheckTimer = 0;
        this._settingsRequested = false;

        ctx.eventManager.emit(PROCEDURE_CHANGED, { from: 'OfflineSettle', to: 'Main' });
        Logger.info(TAG, '建筑生产和自动存档已启动');
    }

    /**
     * 每帧更新：驱动成就检测
     */
    onUpdate(fsm: IFsm<unknown>, dt: number): void {
        const ctx = fsm.getData<IProcedureContext>(PROCEDURE_CONTEXT_KEY);
        if (!ctx) {
            return;
        }

        // 定期检测成就
        this._achievementCheckTimer += dt;
        if (this._achievementCheckTimer >= ACHIEVEMENT_CHECK_INTERVAL) {
            this._achievementCheckTimer -= ACHIEVEMENT_CHECK_INTERVAL;
            ctx.achievementSystem.checkAchievements();
        }

        // 检测是否请求打开设置
        if (this._settingsRequested) {
            this._settingsRequested = false;
            this.changeProcedure(fsm, SettingsProcedure);
        }
    }

    /** 离开主游戏流程 */
    onLeave(fsm: IFsm<unknown>): void {
        const ctx = fsm.getData<IProcedureContext>(PROCEDURE_CONTEXT_KEY);
        if (!ctx) {
            return;
        }

        // 停止自动存档 Timer
        if (this._autoSaveTimerId !== null) {
            ctx.timerManager.removeTimer(this._autoSaveTimerId);
            this._autoSaveTimerId = null;
        }

        // 停止所有建筑生产
        ctx.buildingSystem.stopAllProduction();

        // 离开前保存一次
        ctx.saveSystem.save(ctx.gameData);

        Logger.info(TAG, '离开主游戏流程，已停止生产和自动存档');
    }

    /**
     * 请求打开设置界面
     *
     * 由 UI 按钮回调调用，下一帧切换到 SettingsProcedure。
     */
    requestSettings(): void {
        this._settingsRequested = true;
    }
}

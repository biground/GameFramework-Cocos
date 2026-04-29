import type { IFsm } from '@framework/fsm/FsmDefs';
import { Logger } from '@framework/debug/Logger';
import { ProcedureBase } from '@framework/procedure/ProcedureBase';

import { RUNTIME_GAME_CONTEXT_KEY, RuntimeGameContext } from '../RuntimeGameContext';
import { ProcedureConfigLoad } from './ProcedureConfigLoad';

const TAG = 'ProcedureHotUpdateCheck';

/**
 * 热更新检查流程
 *
 * 职责：
 * 1. 从 context 获取 hotUpdateManager
 * 2. 调用 checkForUpdate() 检查是否有新版本
 * 3. 有更新 → 记录日志（demo 模式暂不实现下载），切换到 ProcedureConfigLoad
 *    无更新 / 不需要热更新（hotUpdateManager 未配置）→ 切换到 ProcedureConfigLoad
 *
 * 注意：如果 hotUpdateManager 未配置，直接跳过进入下一个流程。
 */
export class ProcedureHotUpdateCheck extends ProcedureBase {
    /** 进入流程时触发热更新检查（或跳过）。 */
    public override onEnter(fsm: IFsm<unknown>): void {
        const context = this.getContext<RuntimeGameContext>(fsm, RUNTIME_GAME_CONTEXT_KEY);

        if (!context.hotUpdateManager) {
            Logger.info(TAG, '未配置热更新管理器，跳过热更新检查');
            this.changeProcedure(fsm, ProcedureConfigLoad);
            return;
        }

        context.hotUpdateManager
            .checkForUpdate()
            .then((hasUpdate) => {
                if (hasUpdate) {
                    Logger.info(TAG, '发现新版本，跳过下载（demo 模式）');
                } else {
                    Logger.info(TAG, '已是最新版本，无需更新');
                }
                this.changeProcedure(fsm, ProcedureConfigLoad);
            })
            .catch((err: Error) => {
                Logger.warn(TAG, `热更新检查失败（容错继续）：${err.message}`);
                context.lastFailure = err;
                this.changeProcedure(fsm, ProcedureConfigLoad);
            });
    }
}

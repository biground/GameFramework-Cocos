import type { IFsm } from '@framework/fsm/FsmDefs';
import { Logger } from '@framework/debug/Logger';
import { ProcedureBase } from '@framework/procedure/ProcedureBase';

import { RUNTIME_GAME_CONTEXT_KEY, RuntimeGameContext } from '../RuntimeGameContext';
import { ProcedureScenePreload } from './ProcedureScenePreload';

const TAG = 'ProcedureConfigLoad';
const OWNER = 'ProcedureConfigLoad';

/**
 * 配置加载流程
 *
 * 职责：
 * 1. 从 context 获取 configDirs（需要加载的资源目录列表）
 * 2. 如果 configDirs 为空/未定义，直接跳过到 ProcedureScenePreload
 * 3. 并行加载所有目录（对每个目录调用 context.resourceManager.loadDir）
 * 4. 全部完成 → 切换到 ProcedureScenePreload
 * 5. 任意失败 → 记录 lastFailure + 容错切换到 ProcedureScenePreload
 *
 * 并行策略：使用内部计数器追踪完成数量，第一个失败立即触发跳转。
 */
export class ProcedureConfigLoad extends ProcedureBase {
    private _totalDirs: number = 0;
    private _completedDirs: number = 0;
    private _hasFailed: boolean = false;

    /** 进入流程时并行加载所有配置目录。 */
    public override onEnter(fsm: IFsm<unknown>): void {
        this._totalDirs = 0;
        this._completedDirs = 0;
        this._hasFailed = false;

        const context = this.getContext<RuntimeGameContext>(fsm, RUNTIME_GAME_CONTEXT_KEY);
        const configDirs = context.configDirs ?? [];

        if (configDirs.length === 0) {
            Logger.info(TAG, '无需加载配置目录，跳过');
            this.changeProcedure(fsm, ProcedureScenePreload);
            return;
        }

        this._totalDirs = configDirs.length;

        for (const dir of configDirs) {
            context.resourceManager.loadDir(dir, OWNER, {
                onSuccess: () => {
                    if (this._hasFailed) {
                        return;
                    }
                    this._completedDirs++;
                    Logger.info(
                        TAG,
                        `目录加载完成：${dir}（${this._completedDirs}/${this._totalDirs}）`,
                    );
                    if (this._completedDirs === this._totalDirs) {
                        this.changeProcedure(fsm, ProcedureScenePreload);
                    }
                },
                onFailure: (error: string) => {
                    if (this._hasFailed) {
                        return;
                    }
                    this._hasFailed = true;
                    Logger.warn(TAG, `目录加载失败（容错继续）：${dir}，原因：${error}`);
                    context.lastFailure = new Error(
                        `[ProcedureConfigLoad] 目录 ${dir} 加载失败：${error}`,
                    );
                    this.changeProcedure(fsm, ProcedureScenePreload);
                },
            });
        }
    }
}

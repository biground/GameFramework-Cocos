/**
 * 启动流程 —— 框架初始化完成后的第一个流程
 *
 * 仅做日志记录，立即切换到 PreloadProcedure。
 * @module
 */

import { ProcedureBase } from '@framework/procedure/ProcedureBase';
import { IFsm } from '@framework/fsm/FsmDefs';
import { Logger } from '@framework/debug/Logger';
import { PreloadProcedure } from './PreloadProcedure';

const TAG = 'LaunchProcedure';

/**
 * 启动流程
 *
 * 框架所有模块初始化完成后进入此流程，记录启动日志后立即切换到预加载流程。
 */
export class LaunchProcedure extends ProcedureBase {
    /** 进入启动流程 */
    onEnter(fsm: IFsm<unknown>): void {
        Logger.info(TAG, '框架初始化完成，进入启动流程');

        this.changeProcedure(fsm, PreloadProcedure);
    }
}

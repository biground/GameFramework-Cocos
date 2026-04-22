/**
 * 失败状态
 *
 * 发射 BATTLE_DEFEAT 事件 → 播放失败音效
 * @module
 */

import { FsmState } from '@framework/fsm/FsmState';
import { IFsm } from '@framework/fsm/FsmDefs';
import { Logger } from '@framework/debug/Logger';
import { IBattleBlackboard, BattleFsmDataKeys } from '../BattleFsmDefs';
import { RpgEvents } from '../../events/RpgEvents';

const TAG = 'BattleFSM';

/**
 * 从 FSM 共享数据中获取黑板
 */
function getBlackboard(fsm: IFsm<IBattleBlackboard>): IBattleBlackboard {
    const bb = fsm.getData<IBattleBlackboard>(BattleFsmDataKeys.BLACKBOARD);
    if (!bb) {
        throw new Error(`[${TAG}] 黑板数据缺失，FSM="${fsm.name}"`);
    }
    return bb;
}

/**
 * 失败状态
 *
 * 进入时发射 BATTLE_DEFEAT 事件并播放失败音效。
 */
export class DefeatState extends FsmState<IBattleBlackboard> {
    /** 进入失败状态 */
    onEnter(fsm: IFsm<IBattleBlackboard>): void {
        const bb = getBlackboard(fsm);

        Logger.info(TAG, '💀 战斗失败...');

        // 发射失败事件
        bb.eventManager.emit(RpgEvents.BATTLE_DEFEAT, {} as Record<string, never>);

        // 播放失败音效
        bb.audioManager.playSound('sfx_defeat');
    }
}

/**
 * 角色死亡状态（终态）
 *
 * 角色阵亡，标记 isAlive = false 并发出死亡事件。
 * 无出口状态。
 * @module
 */

import { FsmState } from '@framework/fsm/FsmState';
import { IFsm } from '@framework/fsm/FsmDefs';
import { Logger } from '@framework/debug/Logger';
import { ICharacterBlackboard, CharacterFsmDataKeys } from '@game/demo2-rpg/fsm/CharacterFsmDefs';
import { RpgEvents } from '@game/demo2-rpg/events/RpgEvents';

const TAG = 'CharacterFSM';

/**
 * 从 FSM 共享数据中获取黑板
 */
function getBlackboard(fsm: IFsm<ICharacterBlackboard>): ICharacterBlackboard {
    const bb = fsm.getData<ICharacterBlackboard>(CharacterFsmDataKeys.BLACKBOARD);
    if (!bb) {
        throw new Error(`[${TAG}] 黑板数据缺失，FSM="${fsm.name}"`);
    }
    return bb;
}

/**
 * 角色死亡状态（终态）
 *
 * 进入后标记角色 isAlive = false，发出 CHARACTER_DEAD 事件。
 * 不会切换到任何其他状态。
 */
export class CharDeadState extends FsmState<ICharacterBlackboard> {
    /** 进入死亡状态，标记角色阵亡并发出事件 */
    onEnter(fsm: IFsm<ICharacterBlackboard>): void {
        const bb = getBlackboard(fsm);
        bb.characterState.isAlive = false;

        Logger.info(TAG, `[${fsm.name}] 角色 #${bb.characterId} 阵亡`);

        bb.eventManager.emit(RpgEvents.CHARACTER_DEAD, {
            characterId: bb.characterId,
            group: bb.characterState.group,
        });
    }
}

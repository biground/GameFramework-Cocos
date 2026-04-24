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
import { ICharacterBlackboard } from '@game/demo2-rpg/fsm/CharacterFsmDefs';
import { RpgEvents } from '@game/demo2-rpg/events/RpgEvents';

const TAG = 'CharacterFSM';

/**
 * 角色死亡状态（终态）
 *
 * 进入后标记角色 isAlive = false，发出 CHARACTER_DEAD 事件。
 * 不会切换到任何其他状态。
 */
export class CharDeadState extends FsmState<ICharacterBlackboard, ICharacterBlackboard> {
    /** 进入死亡状态，标记角色阵亡并发出事件 */
    onEnter(fsm: IFsm<ICharacterBlackboard, ICharacterBlackboard>): void {
        const bb = fsm.blackboard;
        bb.characterState.isAlive = false;

        Logger.info(TAG, `[${fsm.name}] 角色 #${bb.characterId} 阵亡`);

        bb.eventManager.emit(RpgEvents.CHARACTER_DEAD, {
            characterId: bb.characterId,
            group: bb.characterState.group,
        });
    }
}

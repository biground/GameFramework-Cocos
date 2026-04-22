/**
 * 角色眩晕状态
 *
 * 角色被眩晕，跳过行动。通过黑板的 stunRounds 计数递减，
 * 眩晕结束后回到 Idle。HP<=0 时切换到 Dead。
 * @module
 */

import { FsmState } from '@framework/fsm/FsmState';
import { IFsm } from '@framework/fsm/FsmDefs';
import { Logger } from '@framework/debug/Logger';
import { ICharacterBlackboard, CharacterFsmDataKeys } from '@game/demo2-rpg/fsm/CharacterFsmDefs';
import { CharIdleState } from './CharIdleState';
import { CharDeadState } from './CharDeadState';

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
 * 角色眩晕状态
 *
 * 角色处于眩晕中，无法行动。每次 update 递减 stunRounds，
 * 递减至 0 时切换回 Idle。HP <= 0 时切换到 Dead。
 */
export class CharStunnedState extends FsmState<ICharacterBlackboard> {
    /** 进入眩晕状态 */
    onEnter(fsm: IFsm<ICharacterBlackboard>): void {
        const bb = getBlackboard(fsm);
        Logger.info(
            TAG,
            `[${fsm.name}] 角色 #${bb.characterId} 进入眩晕状态，剩余 ${bb.stunRounds} 回合`,
        );
    }

    /**
     * 每帧检测眩晕状态
     * - HP <= 0 → Dead
     * - stunRounds 递减 → 0 时切换回 Idle
     */
    onUpdate(fsm: IFsm<ICharacterBlackboard>, _dt: number): void {
        const bb = getBlackboard(fsm);

        // 优先检测死亡
        if (bb.characterState.hp <= 0) {
            this.changeState(fsm, CharDeadState);
            return;
        }

        // 递减眩晕回合
        bb.stunRounds--;
        if (bb.stunRounds <= 0) {
            bb.stunRounds = 0;
            Logger.info(TAG, `[${fsm.name}] 角色 #${bb.characterId} 眩晕结束`);
            this.changeState(fsm, CharIdleState);
        }
    }

    /** 离开眩晕状态 */
    onLeave(fsm: IFsm<ICharacterBlackboard>): void {
        const bb = getBlackboard(fsm);
        Logger.debug(TAG, `[${fsm.name}] 角色 #${bb.characterId} 离开眩晕状态`);
    }
}

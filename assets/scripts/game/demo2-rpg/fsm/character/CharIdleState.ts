/**
 * 角色空闲状态
 *
 * 角色等待行动，可被外部触发切换到 Acting（轮到行动时）或 Dead（HP<=0）。
 * @module
 */

import { FsmState } from '@framework/fsm/FsmState';
import { IFsm } from '@framework/fsm/FsmDefs';
import { Logger } from '@framework/debug/Logger';
import { ICharacterBlackboard, CharacterFsmDataKeys } from '@game/demo2-rpg/fsm/CharacterFsmDefs';
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
 * 角色空闲状态
 *
 * 角色在战斗中等待行动。外部可通过 changeState 触发切换到 Acting。
 * 每帧检测 HP <= 0 自动切换到 Dead。
 */
export class CharIdleState extends FsmState<ICharacterBlackboard> {
    /** 进入空闲状态 */
    onEnter(fsm: IFsm<ICharacterBlackboard>): void {
        const bb = getBlackboard(fsm);
        Logger.info(TAG, `[${fsm.name}] 角色 #${bb.characterId} 进入空闲状态`);
    }

    /**
     * 每帧检测角色是否死亡
     * HP <= 0 时切换到 Dead
     */
    onUpdate(fsm: IFsm<ICharacterBlackboard>, _dt: number): void {
        const bb = getBlackboard(fsm);
        if (bb.characterState.hp <= 0) {
            this.changeState(fsm, CharDeadState);
        }
    }
}

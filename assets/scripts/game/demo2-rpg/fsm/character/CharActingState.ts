/**
 * 角色行动状态
 *
 * 角色执行行动中（由 BattleFsm 的 ExecuteAction 驱动）。
 * 行动完成后回到 Idle，HP<=0 时切换到 Dead。
 * @module
 */

import { FsmState } from '@framework/fsm/FsmState';
import { IFsm } from '@framework/fsm/FsmDefs';
import { Logger } from '@framework/debug/Logger';
import { ICharacterBlackboard } from '@game/demo2-rpg/fsm/CharacterFsmDefs';
import { CharIdleState } from './CharIdleState';
import { CharDeadState } from './CharDeadState';

const TAG = 'CharacterFSM';

/**
 * 角色行动状态
 *
 * 角色正在执行行动。行动完成后回到 Idle，
 * 若行动中 HP <= 0（如被反击致死）则切换到 Dead。
 */
export class CharActingState extends FsmState<ICharacterBlackboard, ICharacterBlackboard> {
    /** 进入行动状态 */
    onEnter(fsm: IFsm<ICharacterBlackboard, ICharacterBlackboard>): void {
        const bb = fsm.blackboard;
        Logger.info(TAG, `[${fsm.name}] 角色 #${bb.characterId} 进入行动状态`);
    }

    /**
     * 每帧检测行动完成
     * - HP <= 0 → Dead
     * - 否则行动完成 → 回到 Idle
     */
    onUpdate(fsm: IFsm<ICharacterBlackboard, ICharacterBlackboard>, _dt: number): void {
        const bb = fsm.blackboard;

        // 优先检测死亡
        if (bb.characterState.hp <= 0) {
            this.changeState(fsm, CharDeadState);
            return;
        }

        // 行动完成，回到空闲
        this.changeState(fsm, CharIdleState);
    }

    /** 离开行动状态 */
    onLeave(fsm: IFsm<ICharacterBlackboard, ICharacterBlackboard>): void {
        const bb = fsm.blackboard;
        Logger.debug(TAG, `[${fsm.name}] 角色 #${bb.characterId} 离开行动状态`);
    }
}

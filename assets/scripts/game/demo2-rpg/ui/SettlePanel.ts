/**
 * 结算面板
 *
 * 使用 HtmlRenderer 显示战斗结算信息：胜负结果、经验/金币奖励、角色升级。
 * @module
 */

import { HtmlRenderer, LOG_COLORS } from '@game/shared/HtmlRenderer';
import { CharacterState } from '@game/demo2-rpg/data/RpgGameData';
import { Logger } from '@framework/debug/Logger';

const TAG = 'SettlePanel';

/** 结算数据 */
export interface SettleResult {
    /** 是否胜利 */
    victory: boolean;
    /** 经验奖励 */
    expReward: number;
    /** 金币奖励 */
    goldReward: number;
    /** 存活角色列表 */
    survivingCharacters: CharacterState[];
    /** 返回大厅回调 */
    onReturnToLobby?: () => void;
}

/**
 * 结算面板
 *
 * 显示战斗结算信息，包括胜负、奖励、角色状态和升级信息。
 */
export class SettlePanel {
    /**
     * 渲染结算界面
     * @param renderer HTML 渲染器
     * @param result 结算数据
     */
    render(renderer: HtmlRenderer, result: SettleResult): void {
        // 胜负标题
        const title = result.victory ? '🎉 战斗胜利！' : '💀 战斗失败';
        const titleColor = result.victory ? LOG_COLORS.SUCCESS : LOG_COLORS.ERROR;
        renderer.separator('战斗结算');
        renderer.log(title, titleColor);

        // 奖励信息面板
        const rewardPanel = renderer.createStatusPanel('settle-reward', '战斗奖励');
        rewardPanel.update('经验', String(result.expReward));
        rewardPanel.update('金币', String(result.goldReward));

        // 存活角色
        if (result.survivingCharacters.length > 0) {
            const charPanel = renderer.createStatusPanel('settle-chars', '存活角色');
            for (const char of result.survivingCharacters) {
                charPanel.update(char.name, `HP: ${char.hp}/${char.maxHp}  Lv.${char.level}`);
            }
        }

        // 返回大厅按钮
        const btnGroup = renderer.createButtonGroup('操作');
        renderer.addButton(
            btnGroup,
            '返回大厅',
            result.onReturnToLobby ?? (() => Logger.info(TAG, '返回大厅（未绑定回调）')),
        );

        Logger.info(TAG, `结算面板已渲染: ${result.victory ? '胜利' : '失败'}`);
    }

    /**
     * 显示角色升级信息
     * @param renderer HTML 渲染器
     * @param character 升级的角色
     * @param newLevel 升级后的等级
     */
    showLevelUp(renderer: HtmlRenderer, character: CharacterState, newLevel: number): void {
        renderer.log(
            `⬆ ${character.name} 升级！Lv.${character.level} → Lv.${newLevel}`,
            LOG_COLORS.SUCCESS,
        );
    }
}

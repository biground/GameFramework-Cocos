/**
 * 战斗面板
 *
 * 使用 HtmlRenderer 渲染回合制战斗界面，包括角色状态、技能按钮、战斗日志。
 * @module
 */

import { HtmlRenderer, StatusPanel, LOG_COLORS } from '@game/shared/HtmlRenderer';
import { CharacterState } from '@game/demo2-rpg/data/RpgGameData';
import { Logger } from '@framework/debug/Logger';

const TAG = 'BattlePanel';

/** 技能简要信息（供 UI 显示） */
export interface SkillInfo {
    /** 技能 ID */
    id: number;
    /** 技能名称 */
    name: string;
    /** MP 消耗 */
    mpCost: number;
}

/** 战斗事件（由外部战斗流程派发） */
export interface BattleEvent {
    /** 事件类型 */
    type:
        | 'round_start'
        | 'attack'
        | 'character_hurt'
        | 'character_dead'
        | 'character_healed'
        | 'skill_used'
        | 'buff_applied';
    /** 事件数据 */
    data: Record<string, unknown>;
    /** 角色 ID → 名称映射（可选） */
    characterNames?: Record<number, string>;
    /** 技能 ID → 名称映射（可选） */
    skillNames?: Record<number, string>;
}

/**
 * 战斗面板
 *
 * 负责渲染战斗 UI：角色状态面板、技能按钮组、战斗日志区。
 */
export class BattlePanel {
    private _statusPanel: StatusPanel | null = null;
    private _roundPanel: StatusPanel | null = null;
    private _characters: CharacterState[] = [];
    private _skillGroup: HTMLElement | null = null;

    /**
     * 初始渲染战斗界面
     * @param renderer HTML 渲染器
     * @param characters 所有参战角色
     * @param round 当前回合数
     */
    render(renderer: HtmlRenderer, characters: CharacterState[], round: number): void {
        this._characters = characters;

        // 回合信息面板
        this._roundPanel = renderer.createStatusPanel('battle-round', '战斗信息');
        this._roundPanel.update('回合', String(round));

        // 角色状态面板
        this._statusPanel = renderer.createStatusPanel('battle-status', '角色状态');
        this._updateStatusEntries();

        // 技能按钮组
        this._skillGroup = renderer.createButtonGroup('技能');

        renderer.separator('战斗日志');
        Logger.info(TAG, '战斗面板已渲染');
    }

    /**
     * 更新所有角色的 HP/MP 状态显示
     * @param characters 当前角色列表
     */
    updateCharacterStatus(characters: CharacterState[]): void {
        this._characters = characters;
        this._updateStatusEntries();
    }

    /**
     * 显示技能选择按钮
     * @param renderer HTML 渲染器
     * @param skills 可用技能列表
     * @param callback 选择技能后的回调（参数为技能 ID）
     */
    showSkillButtons(
        renderer: HtmlRenderer,
        skills: SkillInfo[],
        callback: (skillId: number) => void,
    ): void {
        if (!this._skillGroup) {
            Logger.warn(TAG, '技能按钮组未初始化，请先调用 render');
            return;
        }

        // 清空旧按钮
        const row = this._skillGroup.querySelector('[data-role="button-row"]');
        if (row) {
            row.innerHTML = '';
        }

        for (const skill of skills) {
            const label = skill.mpCost > 0 ? `${skill.name} (MP:${skill.mpCost})` : skill.name;

            renderer.addButton(this._skillGroup, label, () => callback(skill.id));
        }
    }

    /**
     * 追加战斗日志
     * @param renderer HTML 渲染器
     * @param message 日志消息
     * @param color CSS 颜色值
     */
    addBattleLog(renderer: HtmlRenderer, message: string, color: string): void {
        renderer.log(message, color);
    }

    /**
     * 处理战斗事件，更新面板显示
     * @param renderer HTML 渲染器
     * @param event 战斗事件
     */
    onBattleEvent(renderer: HtmlRenderer, event: BattleEvent): void {
        const names = event.characterNames ?? {};
        const skillNames = event.skillNames ?? {};

        switch (event.type) {
            case 'round_start': {
                const roundNum = event.data['roundNumber'] as number;
                if (this._roundPanel) {
                    this._roundPanel.update('回合', String(roundNum));
                }
                renderer.separator(`第 ${roundNum} 回合`);
                break;
            }
            case 'attack': {
                const atkId = event.data['attackerId'] as number;
                const defId = event.data['defenderId'] as number;
                const dmg = event.data['damage'] as number;
                const sId = event.data['skillId'] as number;
                const atkName = names[atkId] ?? `角色${atkId}`;
                const defName = names[defId] ?? `角色${defId}`;
                const sName = skillNames[sId] ?? `技能${sId}`;
                renderer.log(
                    `${atkName} 使用 ${sName} 对 ${defName} 造成 ${dmg} 点伤害`,
                    LOG_COLORS.COMBAT,
                );
                break;
            }
            case 'character_hurt': {
                const cId = event.data['characterId'] as number;
                const damage = event.data['damage'] as number;
                const remaining = event.data['remainingHp'] as number;
                const cName = names[cId] ?? `角色${cId}`;
                renderer.log(
                    `${cName} 受到 ${damage} 点伤害，剩余 HP: ${remaining}`,
                    LOG_COLORS.WARNING,
                );
                break;
            }
            case 'character_dead': {
                const cId = event.data['characterId'] as number;
                const cName = names[cId] ?? `角色${cId}`;
                renderer.log(`${cName} 已阵亡`, LOG_COLORS.ERROR);
                break;
            }
            case 'character_healed': {
                const cId = event.data['characterId'] as number;
                const amount = event.data['amount'] as number;
                const remaining = event.data['remainingHp'] as number;
                const cName = names[cId] ?? `角色${cId}`;
                renderer.log(
                    `${cName} 恢复 ${amount} 点 HP，当前 HP: ${remaining}`,
                    LOG_COLORS.SUCCESS,
                );
                break;
            }
            default:
                Logger.debug(TAG, `未处理的事件类型: ${event.type}`);
        }
    }

    // ─── 私有方法 ──────────────────────────────────────

    /** 更新状态面板中的角色条目 */
    private _updateStatusEntries(): void {
        if (!this._statusPanel) {
            return;
        }

        for (const char of this._characters) {
            const groupLabel = char.group === 'player' ? '【我方】' : '【敌方】';
            this._statusPanel.update(
                `${groupLabel}${char.name}`,
                `HP: ${char.hp}/${char.maxHp}  MP: ${char.mp}/${char.maxMp}`,
            );
        }
    }
}

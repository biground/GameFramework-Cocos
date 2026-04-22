/**
 * @jest-environment jsdom
 */

import { HtmlRenderer, LOG_COLORS } from '@game/shared/HtmlRenderer';
import { BattlePanel } from '@game/demo2-rpg/ui/BattlePanel';
import { SettlePanel } from '@game/demo2-rpg/ui/SettlePanel';
import { CharacterState } from '@game/demo2-rpg/data/RpgGameData';

// ─── 辅助工具 ──────────────────────────────────────────

/** 创建角色模板 */
function makeCharacter(
    overrides: Partial<CharacterState> & { id: number; name: string },
): CharacterState {
    return {
        maxHp: 100,
        hp: 100,
        maxMp: 50,
        mp: 50,
        atk: 20,
        def: 10,
        spd: 10,
        skills: [1, 2],
        level: 1,
        exp: 0,
        isAlive: true,
        group: 'player',
        buffs: [],
        ...overrides,
    };
}

/** 技能名称映射 */
const SKILL_NAMES: Record<number, string> = {
    1: '普通攻击',
    2: '重击',
    3: '火球术',
};

// ─── BattlePanel 测试 ─────────────────────────────────

describe('BattlePanel', () => {
    let container: HTMLElement;
    let renderer: HtmlRenderer;
    let panel: BattlePanel;

    beforeEach(() => {
        container = document.createElement('div');
        renderer = new HtmlRenderer('战斗测试', container);
        panel = new BattlePanel();
    });

    describe('render', () => {
        it('应该创建状态面板和战斗日志区', () => {
            const characters = [
                makeCharacter({ id: 1, name: '战士', group: 'player' }),
                makeCharacter({ id: 2, name: '哥布林', group: 'enemy', hp: 60, maxHp: 60 }),
            ];

            panel.render(renderer, characters, 1);

            const html = container.innerHTML;
            // 状态面板应包含角色名称
            expect(html).toContain('战士');
            expect(html).toContain('哥布林');
            // 应包含回合数
            expect(html).toContain('1');
        });
    });

    describe('updateCharacterStatus', () => {
        it('应该更新角色的 HP/MP 显示', () => {
            const characters = [makeCharacter({ id: 1, name: '战士', group: 'player' })];

            panel.render(renderer, characters, 1);

            // 修改角色状态
            characters[0].hp = 50;
            characters[0].mp = 30;
            panel.updateCharacterStatus(characters);

            const html = container.innerHTML;
            expect(html).toContain('50');
            expect(html).toContain('30');
        });
    });

    describe('showSkillButtons', () => {
        it('应该显示技能按钮并在点击时调用回调', () => {
            const characters = [makeCharacter({ id: 1, name: '战士' })];
            panel.render(renderer, characters, 1);

            const skills = [
                { id: 1, name: '普通攻击', mpCost: 0 },
                { id: 2, name: '重击', mpCost: 10 },
            ];
            const callback = jest.fn();

            panel.showSkillButtons(renderer, skills, callback);

            // 查找技能按钮
            const buttons = container.querySelectorAll('button');
            const skillButtons = Array.from(buttons).filter(
                (b) => b.textContent?.includes('普通攻击') || b.textContent?.includes('重击'),
            );
            expect(skillButtons.length).toBe(2);

            // 点击第一个技能按钮
            skillButtons[0].click();
            expect(callback).toHaveBeenCalledWith(1);
        });

        it('应该显示 MP 消耗信息', () => {
            const characters = [makeCharacter({ id: 1, name: '战士' })];
            panel.render(renderer, characters, 1);

            const skills = [{ id: 3, name: '火球术', mpCost: 20 }];
            panel.showSkillButtons(renderer, skills, jest.fn());

            const html = container.innerHTML;
            expect(html).toContain('火球术');
            expect(html).toContain('20');
        });
    });

    describe('addBattleLog', () => {
        it('应该追加彩色战斗日志', () => {
            const characters = [makeCharacter({ id: 1, name: '战士' })];
            panel.render(renderer, characters, 1);

            panel.addBattleLog(renderer, '战士 对 哥布林 造成 25 点伤害', LOG_COLORS.COMBAT);

            const html = container.innerHTML;
            expect(html).toContain('战士 对 哥布林 造成 25 点伤害');
        });

        it('应该支持多条日志追加', () => {
            const characters = [makeCharacter({ id: 1, name: '战士' })];
            panel.render(renderer, characters, 1);

            panel.addBattleLog(renderer, '第一条日志', LOG_COLORS.INFO);
            panel.addBattleLog(renderer, '第二条日志', LOG_COLORS.COMBAT);

            const html = container.innerHTML;
            expect(html).toContain('第一条日志');
            expect(html).toContain('第二条日志');
        });
    });

    describe('onBattleEvent', () => {
        it('应该处理回合开始事件', () => {
            const characters = [makeCharacter({ id: 1, name: '战士' })];
            panel.render(renderer, characters, 1);

            panel.onBattleEvent(renderer, {
                type: 'round_start',
                data: { roundNumber: 2 },
            });

            const html = container.innerHTML;
            expect(html).toContain('2');
        });

        it('应该处理攻击事件并追加日志', () => {
            const characters = [
                makeCharacter({ id: 1, name: '战士', group: 'player' }),
                makeCharacter({ id: 2, name: '哥布林', group: 'enemy' }),
            ];
            panel.render(renderer, characters, 1);

            panel.onBattleEvent(renderer, {
                type: 'attack',
                data: { attackerId: 1, defenderId: 2, damage: 25, skillId: 1 },
                characterNames: { 1: '战士', 2: '哥布林' },
                skillNames: SKILL_NAMES,
            });

            const html = container.innerHTML;
            expect(html).toContain('战士');
            expect(html).toContain('25');
        });

        it('应该处理角色死亡事件', () => {
            const characters = [
                makeCharacter({ id: 1, name: '战士', group: 'player' }),
                makeCharacter({ id: 2, name: '哥布林', group: 'enemy' }),
            ];
            panel.render(renderer, characters, 1);

            panel.onBattleEvent(renderer, {
                type: 'character_dead',
                data: { characterId: 2, group: 'enemy' },
                characterNames: { 1: '战士', 2: '哥布林' },
            });

            const html = container.innerHTML;
            expect(html).toContain('哥布林');
        });

        it('应该处理角色受伤事件', () => {
            const characters = [makeCharacter({ id: 1, name: '战士', group: 'player' })];
            panel.render(renderer, characters, 1);

            panel.onBattleEvent(renderer, {
                type: 'character_hurt',
                data: { characterId: 1, damage: 15, remainingHp: 85 },
                characterNames: { 1: '战士' },
            });

            const html = container.innerHTML;
            // 应包含伤害信息
            expect(html).toContain('15');
        });

        it('应该处理治愈事件', () => {
            const characters = [makeCharacter({ id: 1, name: '战士', group: 'player', hp: 50 })];
            panel.render(renderer, characters, 1);

            panel.onBattleEvent(renderer, {
                type: 'character_healed',
                data: { characterId: 1, amount: 30, remainingHp: 80 },
                characterNames: { 1: '战士' },
            });

            const html = container.innerHTML;
            expect(html).toContain('30');
        });
    });
});

// ─── SettlePanel 测试 ─────────────────────────────────

describe('SettlePanel', () => {
    let container: HTMLElement;
    let renderer: HtmlRenderer;
    let panel: SettlePanel;

    beforeEach(() => {
        container = document.createElement('div');
        renderer = new HtmlRenderer('结算测试', container);
        panel = new SettlePanel();
    });

    describe('render', () => {
        it('应该显示胜利结算信息', () => {
            panel.render(renderer, {
                victory: true,
                expReward: 150,
                goldReward: 200,
                survivingCharacters: [makeCharacter({ id: 1, name: '战士', hp: 60 })],
            });

            const html = container.innerHTML;
            expect(html).toContain('胜利');
            expect(html).toContain('150');
            expect(html).toContain('200');
        });

        it('应该显示失败结算信息', () => {
            panel.render(renderer, {
                victory: false,
                expReward: 50,
                goldReward: 0,
                survivingCharacters: [],
            });

            const html = container.innerHTML;
            expect(html).toContain('失败');
        });

        it('应该显示存活角色信息', () => {
            panel.render(renderer, {
                victory: true,
                expReward: 100,
                goldReward: 100,
                survivingCharacters: [
                    makeCharacter({ id: 1, name: '战士', hp: 60 }),
                    makeCharacter({ id: 2, name: '法师', hp: 30, maxHp: 80 }),
                ],
            });

            const html = container.innerHTML;
            expect(html).toContain('战士');
            expect(html).toContain('法师');
        });
    });

    describe('showLevelUp', () => {
        it('应该显示角色升级信息', () => {
            panel.render(renderer, {
                victory: true,
                expReward: 100,
                goldReward: 100,
                survivingCharacters: [makeCharacter({ id: 1, name: '战士' })],
            });

            panel.showLevelUp(renderer, makeCharacter({ id: 1, name: '战士' }), 2);

            const html = container.innerHTML;
            expect(html).toContain('战士');
            expect(html).toContain('2');
        });
    });

    describe('返回按钮', () => {
        it('应该包含返回大厅按钮并支持回调', () => {
            const callback = jest.fn();

            panel.render(renderer, {
                victory: true,
                expReward: 100,
                goldReward: 100,
                survivingCharacters: [],
                onReturnToLobby: callback,
            });

            // 查找返回按钮
            const buttons = container.querySelectorAll('button');
            const returnBtn = Array.from(buttons).find(
                (b) => b.textContent?.includes('返回') || b.textContent?.includes('大厅'),
            );

            expect(returnBtn).toBeDefined();
            returnBtn?.click();
            expect(callback).toHaveBeenCalled();
        });
    });
});

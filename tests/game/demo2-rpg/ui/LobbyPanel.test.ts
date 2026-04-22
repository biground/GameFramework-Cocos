/**
 * @jest-environment jsdom
 */

/**
 * LobbyPanel 大厅面板单元测试
 */

import { LobbyPanel, LobbyPanelCallbacks } from '@game/demo2-rpg/ui/LobbyPanel';
import { HtmlRenderer } from '@game/shared/HtmlRenderer';
import { RpgGameData, CharacterState } from '@game/demo2-rpg/data/RpgGameData';
import { StageConfigRow, STAGE_DATA } from '@game/demo2-rpg/data/StageConfigRow';

// ─── Mock DOM 环境 ────────────────────────────────────

function createMockContainer(): HTMLElement {
    const el = document.createElement('div');
    document.body.appendChild(el);
    return el;
}

function createTestCharacter(overrides: Partial<CharacterState> = {}): CharacterState {
    return {
        id: 1,
        name: '战士',
        maxHp: 200,
        hp: 200,
        maxMp: 50,
        mp: 50,
        atk: 30,
        def: 20,
        spd: 12,
        skills: [1, 2],
        level: 1,
        exp: 0,
        isAlive: true,
        group: 'player',
        buffs: [],
        ...overrides,
    };
}

function loadStageConfigs(): StageConfigRow[] {
    return STAGE_DATA.map((raw) => {
        const row = new StageConfigRow();
        row.parseRow(raw);
        return row;
    });
}

function createMockCallbacks(): LobbyPanelCallbacks {
    return {
        onSelectStage: jest.fn(),
        onDepart: jest.fn(),
    };
}

describe('LobbyPanel', () => {
    let container: HTMLElement;
    let renderer: HtmlRenderer;
    let gameData: RpgGameData;
    let stages: StageConfigRow[];
    let panel: LobbyPanel;

    beforeEach(() => {
        container = createMockContainer();
        renderer = new HtmlRenderer('RPG Demo', container);
        gameData = new RpgGameData();
        stages = loadStageConfigs();

        // 初始化角色
        gameData.gold = 100;
        gameData.totalExp = 50;
        gameData.playerCharacters = [
            createTestCharacter({ id: 1, name: '战士', atk: 30, def: 20 }),
            createTestCharacter({
                id: 2,
                name: '法师',
                hp: 120,
                maxHp: 120,
                mp: 150,
                maxMp: 150,
                atk: 40,
                def: 10,
                spd: 8,
            }),
        ];

        panel = new LobbyPanel(renderer, gameData, stages);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('初始化和渲染', () => {
        it('应成功创建 LobbyPanel 实例', () => {
            expect(panel).toBeDefined();
        });

        it('setup 后应创建状态面板', () => {
            const callbacks = createMockCallbacks();
            panel.setup(callbacks);

            // 状态面板存在于 DOM 中
            const statusArea = container.querySelector('[data-role="panel-body"]');
            expect(statusArea).not.toBeNull();
        });

        it('setup 后应显示金币和经验', () => {
            const callbacks = createMockCallbacks();
            panel.setup(callbacks);

            const html = container.innerHTML;
            expect(html).toContain('100');
            expect(html).toContain('50');
        });
    });

    describe('角色信息显示', () => {
        it('应在角色面板中显示角色名称', () => {
            const callbacks = createMockCallbacks();
            panel.setup(callbacks);

            const html = container.innerHTML;
            expect(html).toContain('战士');
            expect(html).toContain('法师');
        });

        it('updateStatus 后应更新金币显示', () => {
            const callbacks = createMockCallbacks();
            panel.setup(callbacks);

            gameData.gold = 999;
            panel.updateStatus();

            const html = container.innerHTML;
            expect(html).toContain('999');
        });
    });

    describe('按钮创建', () => {
        it('应创建 3 个关卡选择按钮', () => {
            const callbacks = createMockCallbacks();
            panel.setup(callbacks);

            const buttons = container.querySelectorAll('button');
            const stageButtons = Array.from(buttons).filter(
                (btn) =>
                    btn.textContent?.includes('新手村') ||
                    btn.textContent?.includes('黑暗森林') ||
                    btn.textContent?.includes('火山洞穴'),
            );
            expect(stageButtons.length).toBe(3);
        });

        it('应创建出发按钮', () => {
            const callbacks = createMockCallbacks();
            panel.setup(callbacks);

            const buttons = container.querySelectorAll('button');
            const departBtn = Array.from(buttons).find((btn) => btn.textContent?.includes('出发'));
            expect(departBtn).toBeDefined();
        });

        it('点击关卡按钮应触发 onSelectStage 回调', () => {
            const callbacks = createMockCallbacks();
            panel.setup(callbacks);

            const buttons = container.querySelectorAll('button');
            const stageBtn = Array.from(buttons).find((btn) => btn.textContent?.includes('新手村'));
            stageBtn?.click();

            expect(callbacks.onSelectStage).toHaveBeenCalledWith(1);
        });

        it('点击出发按钮应触发 onDepart 回调', () => {
            const callbacks = createMockCallbacks();
            panel.setup(callbacks);

            const buttons = container.querySelectorAll('button');
            const departBtn = Array.from(buttons).find((btn) => btn.textContent?.includes('出发'));
            departBtn?.click();

            expect(callbacks.onDepart).toHaveBeenCalled();
        });
    });
});

/**
 * RPG Demo — 大厅面板
 *
 * 纯展示层，使用 HtmlRenderer 渲染玩家状态、角色信息、关卡选择和出发按钮。
 * 逻辑由 Procedure 驱动，面板只负责展示和回调转发。
 * @module
 */

import { HtmlRenderer, StatusPanel } from '@game/shared/HtmlRenderer';
import { Logger } from '@framework/debug/Logger';
import { RpgGameData } from '@game/demo2-rpg/data/RpgGameData';
import { StageConfigRow } from '@game/demo2-rpg/data/StageConfigRow';

const TAG = 'LobbyPanel';

/** 大厅面板按钮回调集合 */
export interface LobbyPanelCallbacks {
    /** 选择关卡 */
    onSelectStage: (stageId: number) => void;
    /** 点击出发 */
    onDepart: () => void;
}

/**
 * 大厅面板
 *
 * 显示玩家金币/经验、队伍角色属性、关卡选择按钮和出发按钮。
 * 所有交互通过回调接口转发给 Procedure 层处理。
 */
export class LobbyPanel {
    private readonly _renderer: HtmlRenderer;
    private readonly _gameData: RpgGameData;
    private readonly _stages: StageConfigRow[];

    private _playerPanel: StatusPanel | null = null;
    private _charPanels: Map<number, StatusPanel> = new Map();

    /**
     * 构造大厅面板
     * @param renderer HTML 渲染器
     * @param gameData RPG 运行时数据
     * @param stages 关卡配置列表
     */
    constructor(renderer: HtmlRenderer, gameData: RpgGameData, stages: StageConfigRow[]) {
        this._renderer = renderer;
        this._gameData = gameData;
        this._stages = stages;
    }

    /**
     * 创建所有 UI 元素
     * @param callbacks 按钮回调集合
     */
    setup(callbacks: LobbyPanelCallbacks): void {
        // 玩家状态面板
        this._playerPanel = this._renderer.createStatusPanel('player-status', '玩家信息');
        this._playerPanel.update('金币', String(this._gameData.gold));
        this._playerPanel.update('经验', String(this._gameData.totalExp));

        // 角色属性面板
        for (const char of this._gameData.playerCharacters) {
            const panel = this._renderer.createStatusPanel(
                `char-${char.id}`,
                `${char.name} (Lv.${char.level})`,
            );
            panel.update('HP', `${char.hp}/${char.maxHp}`);
            panel.update('MP', `${char.mp}/${char.maxMp}`);
            panel.update('ATK', String(char.atk));
            panel.update('DEF', String(char.def));
            panel.update('SPD', String(char.spd));
            this._charPanels.set(char.id, panel);
        }

        // 关卡选择按钮组
        const stageGroup = this._renderer.createButtonGroup('关卡选择');
        for (const stage of this._stages) {
            this._renderer.addButton(stageGroup, stage.name, () =>
                callbacks.onSelectStage(stage.id),
            );
        }

        // 出发按钮组
        const actionGroup = this._renderer.createButtonGroup('行动');
        this._renderer.addButton(actionGroup, '出发', () => callbacks.onDepart());

        Logger.info(TAG, '大厅面板创建完成');
    }

    /**
     * 刷新玩家状态和角色属性显示
     */
    updateStatus(): void {
        if (this._playerPanel) {
            this._playerPanel.update('金币', String(this._gameData.gold));
            this._playerPanel.update('经验', String(this._gameData.totalExp));
        }

        for (const char of this._gameData.playerCharacters) {
            const panel = this._charPanels.get(char.id);
            if (!panel) {
                continue;
            }
            panel.update('HP', `${char.hp}/${char.maxHp}`);
            panel.update('MP', `${char.mp}/${char.maxMp}`);
            panel.update('ATK', String(char.atk));
            panel.update('DEF', String(char.def));
            panel.update('SPD', String(char.spd));
        }
    }
}

/**
 * 大厅流程 —— 角色初始化、关卡选择、出发
 *
 * 进入时从 character_config DataTable 读取角色基础属性，
 * 初始化玩家队伍，展示大厅界面供玩家选择关卡并出发。
 * @module
 */

import { ProcedureBase } from '@framework/procedure/ProcedureBase';
import { IFsm } from '@framework/fsm/FsmDefs';
import { Logger } from '@framework/debug/Logger';
import { IRpgProcedureContext, RPG_PROCEDURE_CONTEXT_KEY } from './RpgProcedureContext';
import { RpgGameData, CharacterState } from '../data/RpgGameData';
import { CharacterConfigRow } from '../data/CharacterConfigRow';
import { StageConfigRow } from '../data/StageConfigRow';
import { RpgEvents } from '../events/RpgEvents';
import { StatusPanel } from '@game/shared/HtmlRenderer';
import { BattlePrepProcedure } from './BattlePrepProcedure';

const TAG = 'LobbyProcedure';

/**
 * 大厅流程
 *
 * 职责：
 * 1. 从配置表初始化玩家角色队伍
 * 2. 展示大厅 UI（角色列表、关卡选择、出发按钮）
 * 3. 处理关卡选择和出发交互
 */
export class LobbyProcedure extends ProcedureBase {
    /** 大厅状态面板 */
    private _lobbyPanel: StatusPanel | null = null;

    /** 进入大厅流程 */
    onEnter(fsm: IFsm<unknown>): void {
        const ctx = this.getContext<IRpgProcedureContext>(fsm, RPG_PROCEDURE_CONTEXT_KEY);

        const gameData = ctx.gameData as RpgGameData;
        const { renderer, dataTableManager, eventManager } = ctx;

        // ── 0. 清理上一次的 UI（防止重复进入时出现重复按钮/面板）──
        renderer.clearButtons();
        renderer.clearStatusPanels();

        // ── 1. 初始化玩家角色（仅首次进入时从配置表创建）──
        if (gameData.playerCharacters.length === 0) {
            const charRows = dataTableManager.getAllRows<CharacterConfigRow>('character_config');
            const characters: CharacterState[] = charRows.map((row) =>
                this._createCharacterState(row),
            );
            gameData.playerCharacters = characters;
        }

        Logger.info(TAG, `进入大厅，队伍 ${gameData.playerCharacters.length} 个角色`);

        // ── 2. 展示大厅信息 ─────────────────────────────────
        renderer.log('═══ 欢迎来到大厅 ═══');
        renderer.separator('队伍信息');

        // 创建状态面板展示角色列表
        this._lobbyPanel = renderer.createStatusPanel('lobby', '队伍角色');
        for (const char of gameData.playerCharacters) {
            this._lobbyPanel.update(
                char.name,
                `HP:${char.hp}/${char.maxHp} ATK:${char.atk} DEF:${char.def} SPD:${char.spd}`,
            );
        }

        // ── 3. 关卡选择按钮 ─────────────────────────────────
        const stageRows = dataTableManager.getAllRows<StageConfigRow>('stage_config');
        const stageGroup = renderer.createButtonGroup('关卡选择');

        for (const stage of stageRows) {
            renderer.addButton(stageGroup, `${stage.name} (Lv.${stage.id})`, () => {
                gameData.selectedStageId = stage.id;
                eventManager.emit(RpgEvents.STAGE_SELECTED, { stageId: stage.id });
                renderer.log(`已选择关卡：${stage.name}`, '#2196F3');
                Logger.info(TAG, `关卡已选择: ${stage.id} - ${stage.name}`);
            });
        }

        // ── 4. 出发按钮 ─────────────────────────────────────
        const actionGroup = renderer.createButtonGroup('操作');
        renderer.addButton(actionGroup, '出发', () => {
            Logger.info(TAG, `出发前往关卡 ${gameData.selectedStageId}`);
            this.changeProcedure(fsm, BattlePrepProcedure);
        });

        renderer.log(`当前选中关卡：${gameData.selectedStageId}`, '#2196F3');
    }

    /** 离开大厅流程 */
    onLeave(_fsm: IFsm<unknown>): void {
        this._lobbyPanel = null;
        Logger.info(TAG, '离开大厅流程');
    }

    /**
     * 从配置行创建角色运行时状态
     * @param row 角色配置行
     * @returns 角色运行时状态
     */
    private _createCharacterState(row: CharacterConfigRow): CharacterState {
        return {
            id: row.id,
            name: row.name,
            maxHp: row.hp,
            hp: row.hp,
            maxMp: row.mp,
            mp: row.mp,
            atk: row.atk,
            def: row.def,
            spd: row.spd,
            skills: row.skills ? row.skills.split(',').map(Number) : [],
            level: 1,
            exp: 0,
            isAlive: true,
            group: 'player',
            buffs: [],
        };
    }
}

/**
 * RPG 预加载流程 —— 注册配置表并初始化游戏数据
 *
 * 从 DataTableManager 使用 createTableFromRawData 注册 4 张配置表
 * （角色、怪物、技能、关卡），记录加载进度日志，然后切换到 LobbyProcedure。
 * @module
 */

import { ProcedureBase } from '@framework/procedure/ProcedureBase';
import { IFsm } from '@framework/fsm/FsmDefs';
import { Logger } from '@framework/debug/Logger';
import { IRpgProcedureContext, RPG_PROCEDURE_CONTEXT_KEY } from './RpgProcedureContext';
import { RpgEvents } from '@game/demo2-rpg/events/RpgEvents';
import { CharacterConfigRow } from '@game/demo2-rpg/data/CharacterConfigRow';
import { MonsterConfigRow } from '@game/demo2-rpg/data/MonsterConfigRow';
import { SkillConfigRow } from '@game/demo2-rpg/data/SkillConfigRow';
import { StageConfigRow } from '@game/demo2-rpg/data/StageConfigRow';
import { LobbyProcedure } from './LobbyProcedure';

const TAG = 'PreloadProcedure';

/** 角色配置原始数据 */
const CHARACTER_RAW_DATA: Partial<CharacterConfigRow>[] = [
    { id: 1, name: '战士', hp: 200, mp: 50, atk: 30, def: 20, spd: 10, skills: '1,2' },
    { id: 2, name: '法师', hp: 120, mp: 150, atk: 45, def: 10, spd: 12, skills: '3,4' },
    { id: 3, name: '牧师', hp: 150, mp: 120, atk: 15, def: 15, spd: 11, skills: '5,6' },
];

/** 怪物配置原始数据 */
const MONSTER_RAW_DATA: Partial<MonsterConfigRow>[] = [
    { id: 1, name: '史莱姆', hp: 50, atk: 10, def: 5, spd: 5, expReward: 10, goldReward: 5 },
    { id: 2, name: '哥布林', hp: 80, atk: 15, def: 8, spd: 8, expReward: 20, goldReward: 10 },
    { id: 3, name: '骷髅兵', hp: 120, atk: 20, def: 12, spd: 6, expReward: 30, goldReward: 15 },
];

/** 技能配置原始数据 */
const SKILL_RAW_DATA: Partial<SkillConfigRow>[] = [
    { id: 1, name: '重斩', mpCost: 10, damageRate: 1.5, target: 'single_enemy' },
    { id: 2, name: '横扫', mpCost: 20, damageRate: 0.8, target: 'all_enemy' },
    { id: 3, name: '火球术', mpCost: 15, damageRate: 2.0, target: 'single_enemy' },
    { id: 4, name: '暴风雪', mpCost: 30, damageRate: 1.2, target: 'all_enemy' },
    { id: 5, name: '治疗术', mpCost: 12, damageRate: 1.0, target: 'single_ally' },
    { id: 6, name: '群体治愈', mpCost: 25, damageRate: 0.6, target: 'all_ally' },
];

/** 关卡配置原始数据 */
const STAGE_RAW_DATA: Partial<StageConfigRow>[] = [
    { id: 1, name: '草原之路', monsters: '1,1,2', bgm: 'bgm_field', maxRound: 10 },
    { id: 2, name: '暗影森林', monsters: '2,2,3', bgm: 'bgm_forest', maxRound: 12 },
    { id: 3, name: '骷髅地牢', monsters: '3,3,3', bgm: 'bgm_dungeon', maxRound: 15 },
];

/**
 * RPG 预加载流程
 *
 * 注册 4 张配置表（角色、怪物、技能、关卡），
 * 记录加载进度，然后切换到大厅流程。
 */
export class PreloadProcedure extends ProcedureBase {
    /** 进入预加载流程 */
    onEnter(fsm: IFsm<unknown>): void {
        Logger.info(TAG, '进入预加载流程，注册配置表...');

        const ctx = this.getContext<IRpgProcedureContext>(fsm, RPG_PROCEDURE_CONTEXT_KEY);

        const dtMgr = ctx.dataTableManager;

        // 注册角色配置表
        dtMgr.createTableFromRawData<CharacterConfigRow>('character_config', CHARACTER_RAW_DATA);
        Logger.info(TAG, `角色配置表注册完成: ${CHARACTER_RAW_DATA.length} 条`);

        // 注册怪物配置表
        dtMgr.createTableFromRawData<MonsterConfigRow>('monster_config', MONSTER_RAW_DATA);
        Logger.info(TAG, `怪物配置表注册完成: ${MONSTER_RAW_DATA.length} 条`);

        // 注册技能配置表
        dtMgr.createTableFromRawData<SkillConfigRow>('skill_config', SKILL_RAW_DATA);
        Logger.info(TAG, `技能配置表注册完成: ${SKILL_RAW_DATA.length} 条`);

        // 注册关卡配置表
        dtMgr.createTableFromRawData<StageConfigRow>('stage_config', STAGE_RAW_DATA);
        Logger.info(TAG, `关卡配置表注册完成: ${STAGE_RAW_DATA.length} 条`);

        Logger.info(TAG, '全部配置表加载完成 (4/4)，切换到大厅流程');

        ctx.eventManager.emit(RpgEvents.PROCEDURE_CHANGED, {
            from: 'Preload',
            to: 'Lobby',
        });

        this.changeProcedure(fsm, LobbyProcedure);
    }
}

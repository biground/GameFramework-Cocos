/**
 * 战斗准备流程
 *
 * 负责从配置表读取关卡数据、创建敌人、初始化 BattleFsm，
 * 然后切换到 BattleProcedure 进入战斗循环。
 * @module
 */

import { ProcedureBase } from '@framework/procedure/ProcedureBase';
import { IFsm } from '@framework/fsm/FsmDefs';
import { Logger } from '@framework/debug/Logger';
import { IRpgProcedureContext, RPG_PROCEDURE_CONTEXT_KEY } from './RpgProcedureContext';
import { RpgGameData, CharacterState } from '../data/RpgGameData';
import { StageConfigRow } from '../data/StageConfigRow';
import { MonsterConfigRow } from '../data/MonsterConfigRow';
import { SkillConfigRow } from '../data/SkillConfigRow';
import { IBattleBlackboard, BattleFsmDataKeys } from '../fsm/BattleFsmDefs';
import { RoundStartState } from '../fsm/battle/RoundStartState';
import { SelectActionState } from '../fsm/battle/SelectActionState';
import { ExecuteActionState } from '../fsm/battle/ExecuteActionState';
import { RoundEndState } from '../fsm/battle/RoundEndState';
import { VictoryState } from '../fsm/battle/VictoryState';
import { DefeatState } from '../fsm/battle/DefeatState';
import { BattleProcedure } from './BattleProcedure';

const TAG = 'BattlePrepProcedure';

/** 敌人 ID 起始偏移（与玩家 ID 区分） */
const ENEMY_ID_OFFSET = 2000;

/**
 * 战斗准备流程
 *
 * 在进入战斗前完成以下准备工作：
 * 1. 从关卡配置表读取怪物列表
 * 2. 从怪物配置表创建敌人 CharacterState
 * 3. 创建 BattleFsm 并设置黑板数据
 * 4. 播放战斗 BGM
 * 5. 重置战斗状态
 * 6. 切换到 BattleProcedure
 */
export class BattlePrepProcedure extends ProcedureBase {
    /**
     * 进入战斗准备流程
     * @param fsm 所属流程状态机
     */
    onEnter(fsm: IFsm<unknown>): void {
        // 1. 获取上下文
        const ctx = fsm.getData<IRpgProcedureContext>(RPG_PROCEDURE_CONTEXT_KEY);
        if (!ctx) {
            throw new Error(`[${TAG}] 无法获取 RPG Procedure 上下文`);
        }

        const gameData = ctx.gameData as RpgGameData;
        const { dataTableManager, fsmManager, audioManager } = ctx;

        // 2. 从 stage_config 读取当前关卡配置
        const stageRow = dataTableManager.getRow<StageConfigRow>(
            'stage_config',
            gameData.selectedStageId,
        );
        if (!stageRow) {
            throw new Error(`[${TAG}] 找不到关卡配置: stageId=${gameData.selectedStageId}`);
        }

        Logger.info(TAG, `准备关卡: ${stageRow.name} (ID=${stageRow.id})`);

        // 3. 解析怪物列表，创建敌人 CharacterState
        const monsterIds = stageRow.monsters.split(',').map((s) => Number(s.trim()));

        const enemies: CharacterState[] = monsterIds.map((monsterId, index) => {
            const monsterRow = dataTableManager.getRow<MonsterConfigRow>(
                'monster_config',
                monsterId,
            );
            if (!monsterRow) {
                throw new Error(`[${TAG}] 找不到怪物配置: monsterId=${monsterId}`);
            }
            return {
                id: ENEMY_ID_OFFSET + index,
                name: monsterRow.name,
                maxHp: monsterRow.hp,
                hp: monsterRow.hp,
                maxMp: 0,
                mp: 0,
                atk: monsterRow.atk,
                def: monsterRow.def,
                spd: monsterRow.spd,
                skills: [1], // 怪物默认使用普通攻击
                level: 1,
                exp: 0,
                isAlive: true,
                group: 'enemy' as const,
                buffs: [],
            };
        });

        // 4. 合并所有角色
        const allCharacters: CharacterState[] = [...gameData.playerCharacters, ...enemies];

        // 5. 获取技能和怪物配置表数据
        const skillTable = dataTableManager.getAllRows<SkillConfigRow>(
            'skill_config',
        ) as SkillConfigRow[];
        const monsterTable = dataTableManager.getAllRows<MonsterConfigRow>(
            'monster_config',
        ) as MonsterConfigRow[];

        // 6. 创建 BattleFsm（owner 占位，实际数据通过黑板共享）
        const battleFsm = fsmManager.createFsm<IBattleBlackboard>(
            'battle_fsm',
            {} as IBattleBlackboard,
            new RoundStartState(),
            new SelectActionState(),
            new ExecuteActionState(),
            new RoundEndState(),
            new VictoryState(),
            new DefeatState(),
        );

        // 7. 设置 BattleFsm 黑板数据
        const blackboard: IBattleBlackboard = {
            battleSystem: ctx.battleSystem as IBattleBlackboard['battleSystem'],
            buffSystem: ctx.buffSystem as IBattleBlackboard['buffSystem'],
            gameData: gameData,
            turnOrder: [],
            currentActorIndex: 0,
            actionDecision: null,
            renderer: ctx.renderer,
            eventManager: ctx.eventManager,
            audioManager: ctx.audioManager,
            allCharacters: allCharacters,
            skillTable: skillTable,
            monsterTable: monsterTable,
            maxRound: stageRow.maxRound,
        };
        battleFsm.setData(BattleFsmDataKeys.BLACKBOARD, blackboard);

        // 8. 播放战斗 BGM
        audioManager.playMusic(stageRow.bgm);

        // 9. 重置战斗状态
        gameData.currentRound = 0;
        gameData.battleLog = [];

        // 10. 日志输出战前信息
        Logger.info(
            TAG,
            `战斗准备完成 — 关卡: ${stageRow.name}, 敌人数: ${enemies.length}, 最大回合: ${stageRow.maxRound}`,
        );
        for (const enemy of enemies) {
            Logger.debug(
                TAG,
                `  敌人: ${enemy.name} (HP=${enemy.hp}, ATK=${enemy.atk}, DEF=${enemy.def}, SPD=${enemy.spd})`,
            );
        }

        // 11. 切换到 BattleProcedure
        this.changeProcedure(fsm, BattleProcedure);
    }
}

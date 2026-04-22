/**
 * Turn-based RPG Demo 主入口类
 *
 * 继承 DemoBase，串联所有 RPG 游戏系统和流程，
 * 注册 4 张配置表、初始化 Procedure 流程链、注册战斗事件监听并启动主循环。
 * @module
 */

import { DemoBase } from '@game/shared/DemoBase';
import { LOG_COLORS } from '@game/shared/HtmlRenderer';
import { Logger } from '@framework/debug/Logger';
import { EventManager } from '@framework/event/EventManager';
import { TimerManager } from '@framework/timer/TimerManager';
import { FsmManager } from '@framework/fsm/FsmManager';
import { ProcedureManager } from '@framework/procedure/ProcedureManager';
import { DataTableManager } from '@framework/datatable/DataTableManager';
import { AudioManager } from '@framework/audio/AudioManager';
import { UIManager } from '@framework/ui/UIManager';
import { EntityManager } from '@framework/entity/EntityManager';
import { ReferencePool } from '@framework/objectpool/ReferencePool';
import { RpgGameData } from '@game/demo2-rpg/data/RpgGameData';
import { CharacterConfigRow } from '@game/demo2-rpg/data/CharacterConfigRow';
import { MonsterConfigRow } from '@game/demo2-rpg/data/MonsterConfigRow';
import { SkillConfigRow } from '@game/demo2-rpg/data/SkillConfigRow';
import { StageConfigRow } from '@game/demo2-rpg/data/StageConfigRow';
import { BattleSystem } from '@game/demo2-rpg/systems/BattleSystem';
import { BuffSystem } from '@game/demo2-rpg/systems/BuffSystem';
import { DamageCalculator } from '@game/demo2-rpg/systems/DamageCalculator';
import { EnemyAI } from '@game/demo2-rpg/systems/EnemyAI';
import {
    IRpgProcedureContext,
    RPG_PROCEDURE_CONTEXT_KEY,
} from '@game/demo2-rpg/procedures/RpgProcedureContext';
import { LaunchProcedure } from '@game/demo2-rpg/procedures/LaunchProcedure';
import { PreloadProcedure } from '@game/demo2-rpg/procedures/PreloadProcedure';
import { LobbyProcedure } from '@game/demo2-rpg/procedures/LobbyProcedure';
import { BattlePrepProcedure } from '@game/demo2-rpg/procedures/BattlePrepProcedure';
import { BattleProcedure } from '@game/demo2-rpg/procedures/BattleProcedure';
import { SettleProcedure } from '@game/demo2-rpg/procedures/SettleProcedure';
import { RpgEvents } from '@game/demo2-rpg/events/RpgEvents';

const TAG = 'TurnBasedRpgDemo';

/**
 * 回合制 RPG Demo
 *
 * 深度验证 Procedure、FSM、DataTable、Event、Entity、Audio 等框架模块。
 * 完整的回合制战斗系统，包含 BUFF、技能、敌方 AI、关卡选择等功能。
 */
export class TurnBasedRpgDemo extends DemoBase {
    /** 游戏运行时状态数据 */
    private _gameData!: RpgGameData;
    /** 战斗系统 */
    private _battleSystem!: BattleSystem;
    /** BUFF 系统 */
    private _buffSystem!: BuffSystem;
    /** 引用池 */
    private _referencePool!: ReferencePool;

    constructor() {
        super('Turn-based RPG Demo');
        this._gameData = new RpgGameData();
    }

    /**
     * 实现 DemoBase.setupProcedures
     *
     * 创建游戏系统实例、构建 IRpgProcedureContext、注册 6 个 Procedure 并写入共享数据。
     */
    setupProcedures(): void {
        const eventMgr = this.getModule<EventManager>('EventManager');
        const timerMgr = this.getModule<TimerManager>('TimerManager');
        const fsmMgr = this.getModule<FsmManager>('FsmManager');
        const dtMgr = this.getModule<DataTableManager>('DataTableManager');
        const procMgr = this.getModule<ProcedureManager>('ProcedureManager');
        const audioMgr = this.getModule<AudioManager>('AudioManager');
        const uiMgr = this.getModule<UIManager>('UIManager');
        const entityMgr = this.getModule<EntityManager>('EntityManager');

        // 创建游戏系统
        this._buffSystem = new BuffSystem();
        this._battleSystem = new BattleSystem(this._buffSystem);
        this._referencePool = new ReferencePool();

        // 构建 Procedure 共享上下文
        const ctx: IRpgProcedureContext = {
            gameData: this._gameData,
            renderer: this.htmlRenderer,
            battleSystem: this._battleSystem,
            buffSystem: this._buffSystem,
            damageCalculator: DamageCalculator,
            enemyAI: EnemyAI,
            eventManager: eventMgr,
            timerManager: timerMgr,
            fsmManager: fsmMgr,
            entityManager: entityMgr,
            audioManager: audioMgr,
            uiManager: uiMgr,
            dataTableManager: dtMgr,
            referencePool: this._referencePool,
        };

        // 注册全部 6 个 Procedure
        procMgr.initialize(
            new LaunchProcedure(),
            new PreloadProcedure(),
            new LobbyProcedure(),
            new BattlePrepProcedure(),
            new BattleProcedure(),
            new SettleProcedure(),
        );

        // 写入共享数据
        procMgr.setData<IRpgProcedureContext>(RPG_PROCEDURE_CONTEXT_KEY, ctx);

        Logger.info(TAG, '游戏系统和流程初始化完成');
    }

    /**
     * 实现 DemoBase.setupDataTables
     *
     * 注册 4 张配置表：character_config, monster_config, skill_config, stage_config。
     */
    setupDataTables(): void {
        const dtMgr = this.getModule<DataTableManager>('DataTableManager');

        dtMgr.createTableFromRawData<CharacterConfigRow>('character_config', []);
        dtMgr.createTableFromRawData<MonsterConfigRow>('monster_config', []);
        dtMgr.createTableFromRawData<SkillConfigRow>('skill_config', []);
        dtMgr.createTableFromRawData<StageConfigRow>('stage_config', []);

        Logger.info(
            TAG,
            '数据表注册完成: character_config, monster_config, skill_config, stage_config',
        );
    }

    /**
     * 启动 RPG Demo
     *
     * 依次执行：bootstrap → 注册战斗事件监听 → 启动 Procedure → 启动主循环。
     */
    start(): void {
        Logger.info(TAG, '启动 Turn-based RPG Demo...');

        // 1. 初始化框架和游戏系统（内部调用 setupProcedures + setupDataTables）
        this.bootstrap();

        // 2. 注册战斗事件监听（音效、日志）
        this._registerEventListeners();

        // 3. 启动 Procedure 流程链
        const procMgr = this.getModule<ProcedureManager>('ProcedureManager');
        procMgr.startProcedure(LaunchProcedure);

        // 4. 启动主循环
        this.startMainLoop(30);

        this.htmlRenderer.log('⚔️ Turn-based RPG Demo 已启动！', LOG_COLORS.SUCCESS);
        Logger.info(TAG, 'Turn-based RPG Demo 启动完成');
    }

    /**
     * 注册战斗事件监听器，输出日志和音效
     */
    private _registerEventListeners(): void {
        const eventMgr = this.getModule<EventManager>('EventManager');

        eventMgr.on(RpgEvents.ATTACK, (data) => {
            this.htmlRenderer.log(
                `⚔️ 角色#${data.attackerId} 攻击 角色#${data.defenderId}，造成 ${data.damage} 伤害`,
                LOG_COLORS.INFO,
            );
        });

        eventMgr.on(RpgEvents.CHARACTER_HURT, (data) => {
            this.htmlRenderer.log(
                `💥 角色#${data.characterId} 受到 ${data.damage} 伤害，剩余 HP: ${data.remainingHp}`,
                LOG_COLORS.WARNING,
            );
        });

        eventMgr.on(RpgEvents.CHARACTER_DEAD, (data) => {
            this.htmlRenderer.log(
                `💀 角色#${data.characterId}（${data.group}）阵亡`,
                LOG_COLORS.ERROR,
            );
        });

        eventMgr.on(RpgEvents.CHARACTER_HEALED, (data) => {
            this.htmlRenderer.log(
                `💚 角色#${data.characterId} 恢复 ${data.amount} HP，当前 HP: ${data.remainingHp}`,
                LOG_COLORS.SUCCESS,
            );
        });

        eventMgr.on(RpgEvents.ROUND_START, (data) => {
            this.htmlRenderer.log(`═══ 第 ${data.roundNumber} 回合开始 ═══`, LOG_COLORS.INFO);
        });

        eventMgr.on(RpgEvents.ROUND_END, (data) => {
            this.htmlRenderer.log(`─── 第 ${data.roundNumber} 回合结束 ───`, LOG_COLORS.DEBUG);
        });

        eventMgr.on(RpgEvents.SKILL_USED, (data) => {
            this.htmlRenderer.log(
                `✨ 角色#${data.casterId} 使用技能#${data.skillId}，目标: [${data.targetIds.join(', ')}]`,
                LOG_COLORS.INFO,
            );
        });

        eventMgr.on(RpgEvents.BUFF_APPLIED, (data) => {
            this.htmlRenderer.log(
                `🛡️ 角色#${data.targetId} 获得 BUFF [${data.buffType}]，持续 ${data.duration} 回合`,
                LOG_COLORS.INFO,
            );
        });

        eventMgr.on(RpgEvents.BUFF_EXPIRED, (data) => {
            this.htmlRenderer.log(
                `⏰ 角色#${data.targetId} 的 BUFF [${data.buffType}] 已过期`,
                LOG_COLORS.DEBUG,
            );
        });

        eventMgr.on(RpgEvents.BATTLE_VICTORY, (data) => {
            this.htmlRenderer.log(
                `🎉 战斗胜利！获得 ${data.expReward} 经验、${data.goldReward} 金币`,
                LOG_COLORS.SUCCESS,
            );
        });

        eventMgr.on(RpgEvents.BATTLE_DEFEAT, () => {
            this.htmlRenderer.log('😵 战斗失败...', LOG_COLORS.ERROR);
        });

        eventMgr.on(RpgEvents.PROCEDURE_CHANGED, (data) => {
            this.htmlRenderer.log(`📋 流程切换: ${data.from} → ${data.to}`, LOG_COLORS.INFO);
        });

        Logger.info(TAG, '战斗事件监听注册完成');
    }
}

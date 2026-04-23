/**
 * Auto-chess Lite Demo 主入口类
 *
 * 继承 DemoBase，串联所有自走棋游戏系统和流程，
 * 注册 Procedure 流程链、覆盖 EntityFactory、注册战斗事件监听并启动主循环。
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
import { EntityManager } from '@framework/entity/EntityManager';
import { AutoChessGameData } from './data/AutoChessGameData';
import { BoardSystem } from './systems/BoardSystem';
import { ShopSystem } from './systems/ShopSystem';
import { MergeSystem } from './systems/MergeSystem';
import { SynergySystem } from './systems/SynergySystem';
import { BattleSystem } from './systems/BattleSystem';
import { AutoChessRenderer } from './ui/AutoChessRenderer';
import { AutoChessEntityFactory } from './factory/AutoChessEntityFactory';
import {
    IAutoChessProcedureContext,
    AUTO_CHESS_CONTEXT_KEY,
} from './procedures/AutoChessProcedureContext';
import { LaunchProcedure } from './procedures/LaunchProcedure';
import { PreloadProcedure } from './procedures/PreloadProcedure';
import { PrepareProcedure } from './procedures/PrepareProcedure';
import { BattleProcedure } from './procedures/BattleProcedure';
import { SettleProcedure } from './procedures/SettleProcedure';
import { GameOverProcedure } from './procedures/GameOverProcedure';
import { AutoChessEvents } from './AutoChessDefs';

const TAG = 'AutoChessDemo';

/**
 * 自走棋 Lite Demo
 *
 * 深度验证 EntityManager、ObjectPool、FSM、Timer、Event、Procedure、DataTable
 * 等框架模块在大量实体管理与 AI 自动对战场景下的协作能力。
 */
export class AutoChessDemo extends DemoBase {
    /** 游戏运行时状态数据 */
    private _gameData: AutoChessGameData;
    /** 棋盘系统 */
    private _boardSystem!: BoardSystem;
    /** 商店系统 */
    private _shopSystem!: ShopSystem;
    /** 合成系统 */
    private _mergeSystem!: MergeSystem;
    /** 羁绊系统 */
    private _synergySystem!: SynergySystem;
    /** 战斗系统 */
    private _battleSystem!: BattleSystem;
    /** 自走棋渲染器 */
    private _renderer!: AutoChessRenderer;

    constructor() {
        super('Auto-chess Lite Demo');
        this._gameData = new AutoChessGameData();
    }

    /**
     * 实现 DemoBase.setupProcedures
     *
     * 创建游戏系统实例、构建 IAutoChessProcedureContext、
     * 覆盖 EntityFactory、注册 6 个 Procedure 并写入共享数据。
     */
    setupProcedures(): void {
        // 1. 获取各模块引用
        const eventMgr = this.getModule<EventManager>('EventManager');
        const timerMgr = this.getModule<TimerManager>('TimerManager');
        const fsmMgr = this.getModule<FsmManager>('FsmManager');
        const procMgr = this.getModule<ProcedureManager>('ProcedureManager');
        const entityMgr = this.getModule<EntityManager>('EntityManager');
        const audioMgr = this.getModule<AudioManager>('AudioManager');
        const dtMgr = this.getModule<DataTableManager>('DataTableManager');

        // 2. 创建系统实例
        this._boardSystem = new BoardSystem();
        this._shopSystem = new ShopSystem();
        this._mergeSystem = new MergeSystem();
        this._synergySystem = new SynergySystem();
        this._battleSystem = new BattleSystem();

        // 3. 创建渲染器
        this._renderer = new AutoChessRenderer(this.htmlRenderer);

        // 4. 覆盖 EntityFactory
        entityMgr.setEntityFactory(new AutoChessEntityFactory());

        // 5. 构建 Procedure 共享上下文
        const ctx: IAutoChessProcedureContext = {
            gameData: this._gameData,
            renderer: this._renderer,
            boardSystem: this._boardSystem,
            shopSystem: this._shopSystem,
            mergeSystem: this._mergeSystem,
            synergySystem: this._synergySystem,
            battleSystem: this._battleSystem,
            eventManager: eventMgr,
            timerManager: timerMgr,
            fsmManager: fsmMgr,
            entityManager: entityMgr,
            audioManager: audioMgr,
            dataTableManager: dtMgr,
        };

        // 6. 初始化 ProcedureManager（注册全部 6 个 Procedure）
        procMgr.initialize(
            new LaunchProcedure(),
            new PreloadProcedure(),
            new PrepareProcedure(),
            new BattleProcedure(),
            new SettleProcedure(),
            new GameOverProcedure(),
        );

        // 7. 写入 FSM 共享数据
        procMgr.setData<IAutoChessProcedureContext>(AUTO_CHESS_CONTEXT_KEY, ctx);

        Logger.info(TAG, '游戏系统和流程初始化完成');
    }

    /**
     * 实现 DemoBase.setupDataTables
     *
     * DataTable 的实际注册在 PreloadProcedure 中完成（带真实配置数据），
     * 此处不重复创建，避免 "数据表已存在" 错误。
     */
    setupDataTables(): void {
        Logger.info(TAG, 'DataTable 将在 PreloadProcedure 中注册');
    }

    /**
     * 启动 Auto-chess Demo
     *
     * 依次执行：bootstrap → 注册战斗事件监听 → 启动 Procedure → 启动主循环。
     */
    start(): void {
        Logger.info(TAG, '启动 Auto-chess Lite Demo...');

        // 1. 初始化框架和游戏系统
        this.bootstrap();

        // 2. 注册战斗事件监听（日志输出）
        this._registerEventListeners();

        // 3. 启动 Procedure 流程链
        const procMgr = this.getModule<ProcedureManager>('ProcedureManager');
        procMgr.startProcedure(LaunchProcedure);

        // 4. 启动主循环
        this.startMainLoop(30);

        this.htmlRenderer.log('♟️ Auto-chess Lite Demo 已启动！', LOG_COLORS.SUCCESS);
        Logger.info(TAG, 'Auto-chess Lite Demo 启动完成');
    }

    /**
     * 注册战斗事件监听器，输出彩色日志
     */
    private _registerEventListeners(): void {
        const eventMgr = this.getModule<EventManager>('EventManager');

        eventMgr.on(AutoChessEvents.CHESS_ATTACK, (data) => {
            this.htmlRenderer.log(
                `⚔️ 棋子#${data.attackerId} 攻击 棋子#${data.defenderId}，造成 ${data.damage} 伤害`,
                LOG_COLORS.COMBAT,
            );
        });

        eventMgr.on(AutoChessEvents.CHESS_KILLED, (data) => {
            this.htmlRenderer.log(
                `💀 棋子#${data.pieceId} 被 棋子#${data.killerPieceId} 击杀`,
                LOG_COLORS.ERROR,
            );
        });

        eventMgr.on(AutoChessEvents.CHESS_BOUGHT, (data) => {
            this.htmlRenderer.log(
                `🛒 购买棋子#${data.pieceId}（配置#${data.configId}），花费 ${data.cost} 金币`,
                LOG_COLORS.INFO,
            );
        });

        eventMgr.on(AutoChessEvents.CHESS_PLACED, (data) => {
            this.htmlRenderer.log(
                `📍 棋子#${data.pieceId} 放置到 (${data.row}, ${data.col})`,
                LOG_COLORS.INFO,
            );
        });

        eventMgr.on(AutoChessEvents.CHESS_MERGED, (data) => {
            this.htmlRenderer.log(
                `✨ ${data.name} 合成为 ★${data.star}（棋子#${data.resultPieceId}）`,
                LOG_COLORS.SUCCESS,
            );
        });

        eventMgr.on(AutoChessEvents.ROUND_START, (data) => {
            this.htmlRenderer.log(`═══ 第 ${data.round} 回合开始 ═══`, LOG_COLORS.INFO);
        });

        eventMgr.on(AutoChessEvents.ROUND_END, (data) => {
            this.htmlRenderer.log(
                `─── 第 ${data.round} 回合结束（${data.result}）───`,
                LOG_COLORS.DEBUG,
            );
        });

        eventMgr.on(AutoChessEvents.PHASE_CHANGED, (data) => {
            this.htmlRenderer.log(`📋 流程切换: ${data.from} → ${data.to}`, LOG_COLORS.INFO);
        });

        eventMgr.on(AutoChessEvents.SYNERGY_ACTIVATED, (data) => {
            this.htmlRenderer.log(
                `🔗 羁绊激活: ${data.race}（${data.threshold}）— ${data.effect}`,
                LOG_COLORS.SUCCESS,
            );
        });

        eventMgr.on(AutoChessEvents.SHOP_REFRESHED, (data) => {
            this.htmlRenderer.log(`🔄 商店刷新，${data.slotCount} 个槽位`, LOG_COLORS.DEBUG);
        });

        eventMgr.on(AutoChessEvents.HP_CHANGED, (data) => {
            this.htmlRenderer.log(
                `💔 HP: ${data.oldHp} → ${data.newHp}（-${data.damage}）`,
                LOG_COLORS.WARNING,
            );
        });

        eventMgr.on(AutoChessEvents.GOLD_CHANGED, (data) => {
            this.htmlRenderer.log(`💰 金币: ${data.oldGold} → ${data.newGold}`, LOG_COLORS.INFO);
        });

        eventMgr.on(AutoChessEvents.BATTLE_START, (data) => {
            this.htmlRenderer.log(`⚔️ 战斗开始（第 ${data.round} 回合）`, LOG_COLORS.COMBAT);
        });

        eventMgr.on(AutoChessEvents.BATTLE_END, (data) => {
            this.htmlRenderer.log(
                `🏁 战斗结束（第 ${data.round} 回合）— 胜利方: ${data.winner}`,
                LOG_COLORS.COMBAT,
            );
        });

        eventMgr.on(AutoChessEvents.GAME_OVER, (data) => {
            this.htmlRenderer.log(
                `🎮 游戏结束！坚持到第 ${data.finalRound} 回合 — ${data.result}`,
                LOG_COLORS.ERROR,
            );
        });

        Logger.info(TAG, '战斗事件监听注册完成');
    }
}

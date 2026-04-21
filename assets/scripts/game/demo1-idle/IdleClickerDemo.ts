/**
 * Idle Clicker Demo 主入口类
 *
 * 继承 DemoBase，串联所有游戏系统和流程，
 * 注册数据表、初始化 Procedure、创建 UI 面板并启动主循环。
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
import { IdleGameData } from '@game/demo1-idle/data/IdleGameData';
import { BuildingConfigRow, BUILDING_CONFIG_DATA } from '@game/demo1-idle/data/BuildingConfigRow';
import { UpgradeCurveRow, UPGRADE_CURVE_DATA } from '@game/demo1-idle/data/UpgradeCurveRow';
import {
    AchievementConfigRow,
    ACHIEVEMENT_CONFIG_DATA,
} from '@game/demo1-idle/data/AchievementConfigRow';
import { BuildingSystem } from '@game/demo1-idle/systems/BuildingSystem';
import { AchievementSystem } from '@game/demo1-idle/systems/AchievementSystem';
import { OfflineRewardSystem } from '@game/demo1-idle/systems/OfflineRewardSystem';
import { SaveSystem } from '@game/demo1-idle/systems/SaveSystem';
import { IdleMainPanel } from '@game/demo1-idle/ui/IdleMainPanel';
import { IdleSettingsPanel } from '@game/demo1-idle/ui/IdleSettingsPanel';
import { IProcedureContext, PROCEDURE_CONTEXT_KEY } from '@game/demo1-idle/procedures/ProcedureContext';
import { LaunchProcedure } from '@game/demo1-idle/procedures/LaunchProcedure';
import { PreloadProcedure } from '@game/demo1-idle/procedures/PreloadProcedure';
import { OfflineSettleProcedure } from '@game/demo1-idle/procedures/OfflineSettleProcedure';
import { MainProcedure } from '@game/demo1-idle/procedures/MainProcedure';
import { SettingsProcedure } from '@game/demo1-idle/procedures/SettingsProcedure';
import {
    GOLD_CHANGED,
    CLICK_MINE,
    BUILDING_PURCHASED,
    BUILDING_UPGRADED,
    BUILDING_OUTPUT,
    ACHIEVEMENT_UNLOCKED,
    OFFLINE_REWARD,
    GAME_SAVED,
    PROCEDURE_CHANGED,
} from '@game/demo1-idle/events/IdleEvents';
import { TIMER_REPEAT_FOREVER } from '@framework/timer/TimerDefs';

const TAG = 'IdleClickerDemo';

/** UI 刷新间隔（秒） */
const UI_REFRESH_INTERVAL = 0.5;

/**
 * Idle Clicker Demo
 *
 * 挂机放置游戏演示，深度验证 Timer、DataTable、Procedure、Event 等框架模块。
 * 使用 HtmlRenderer 展示游戏状态和交互。
 */
export class IdleClickerDemo extends DemoBase {
    private _gameData: IdleGameData;
    private _buildingSystem!: BuildingSystem;
    private _achievementSystem!: AchievementSystem;
    private _offlineRewardSystem!: OfflineRewardSystem;
    private _saveSystem!: SaveSystem;
    private _mainPanel!: IdleMainPanel;
    private _settingsPanel!: IdleSettingsPanel;

    constructor() {
        super('Idle Clicker Demo');
        this._gameData = new IdleGameData();
    }

    /**
     * 实现 DemoBase.setupProcedures
     *
     * 创建游戏系统、构建 ProcedureContext、初始化流程链。
     * 注意：不在此处调用 startProcedure，由 start() 在数据表注册后启动。
     */
    setupProcedures(): void {
        const eventMgr = this.getModule<EventManager>('EventManager');
        const timerMgr = this.getModule<TimerManager>('TimerManager');
        const fsmMgr = this.getModule<FsmManager>('FsmManager');
        const dtMgr = this.getModule<DataTableManager>('DataTableManager');
        const procMgr = this.getModule<ProcedureManager>('ProcedureManager');

        // 创建游戏系统
        this._buildingSystem = new BuildingSystem(this._gameData, eventMgr, timerMgr);
        this._achievementSystem = new AchievementSystem(this._gameData, eventMgr);
        this._offlineRewardSystem = new OfflineRewardSystem(eventMgr);
        this._saveSystem = new SaveSystem('idle-clicker-save', eventMgr, timerMgr);

        // 构建流程共享上下文
        const ctx: IProcedureContext = {
            gameData: this._gameData,
            buildingSystem: this._buildingSystem,
            achievementSystem: this._achievementSystem,
            offlineRewardSystem: this._offlineRewardSystem,
            saveSystem: this._saveSystem,
            eventManager: eventMgr,
            timerManager: timerMgr,
            dataTableManager: dtMgr,
            fsmManager: fsmMgr,
        };

        // 注册全部流程
        procMgr.initialize(
            new LaunchProcedure(),
            new PreloadProcedure(),
            new OfflineSettleProcedure(),
            new MainProcedure(),
            new SettingsProcedure(),
        );

        // 写入共享数据
        procMgr.setData<IProcedureContext>(PROCEDURE_CONTEXT_KEY, ctx);

        Logger.info(TAG, '游戏系统和流程初始化完成');
    }

    /**
     * 实现 DemoBase.setupDataTables
     *
     * 注册建筑配置、升级曲线、成就配置三张数据表。
     */
    setupDataTables(): void {
        const dtMgr = this.getModule<DataTableManager>('DataTableManager');

        dtMgr.createTableFromRawData<BuildingConfigRow>('building_config', BUILDING_CONFIG_DATA);
        dtMgr.createTableFromRawData<UpgradeCurveRow>('upgrade_curve', UPGRADE_CURVE_DATA);
        dtMgr.createTableFromRawData<AchievementConfigRow>(
            'achievement_config',
            ACHIEVEMENT_CONFIG_DATA,
        );

        Logger.info(TAG, '数据表注册完成: building_config, upgrade_curve, achievement_config');
    }

    /**
     * 启动游戏
     *
     * 依次执行 bootstrap → 启动流程 → 创建 UI → 启动主循环 → 注册事件日志。
     */
    async start(): Promise<void> {
        Logger.info(TAG, '启动 Idle Clicker Demo...');

        // 1. 初始化框架和游戏系统
        this.bootstrap();

        // 2. 启动流程链（此时数据表已注册）
        const procMgr = this.getModule<ProcedureManager>('ProcedureManager');
        procMgr.startProcedure(LaunchProcedure);

        // 3. 创建 UI 面板
        this._setupUI();

        // 4. 注册事件日志监听
        this._registerEventListeners();

        // 5. 启动主循环
        this.startMainLoop(30);

        // 6. 启动 UI 定时刷新
        this._startUIRefresh();

        this.htmlRenderer.log('🎮 Idle Clicker Demo 已启动！', LOG_COLORS.SUCCESS);
        Logger.info(TAG, 'Idle Clicker Demo 启动完成');
    }

    /**
     * 创建主界面和设置面板
     */
    private _setupUI(): void {
        const procMgr = this.getModule<ProcedureManager>('ProcedureManager');

        // 主界面面板
        this._mainPanel = new IdleMainPanel(
            this.htmlRenderer,
            this._gameData,
            this._buildingSystem,
        );
        this._mainPanel.setup({
            onClickMine: () => {
                this._buildingSystem.clickMine();
                this._mainPanel.updateStatus();
                this._mainPanel.updateButtons();
            },
            onPurchaseBuilding: (id: number) => {
                const success = this._buildingSystem.purchaseBuilding(id);
                if (success) {
                    this.htmlRenderer.log(
                        `✅ 成功购买建筑 #${id}`,
                        LOG_COLORS.SUCCESS,
                    );
                }
                this._mainPanel.updateStatus();
                this._mainPanel.updateButtons();
            },
            onUpgradeBuilding: (id: number) => {
                const success = this._buildingSystem.upgradeBuilding(id);
                if (success) {
                    this.htmlRenderer.log(
                        `⬆️ 建筑 #${id} 升级成功`,
                        LOG_COLORS.INFO,
                    );
                }
                this._mainPanel.updateStatus();
                this._mainPanel.updateButtons();
            },
            onOpenSettings: () => {
                const currentProc = procMgr.currentProcedure;
                if (currentProc instanceof MainProcedure) {
                    currentProc.requestSettings();
                    this.htmlRenderer.log('⚙️ 切换到设置界面', LOG_COLORS.INFO);
                }
            },
            onSimulateOffline: () => {
                this._simulateOffline(30 * 60);
            },
            onViewAchievements: () => {
                this._showAchievements();
            },
        });

        // 设置面板
        this._settingsPanel = new IdleSettingsPanel(this.htmlRenderer);
        this._settingsPanel.setup({
            onBack: () => {
                const currentProc = procMgr.currentProcedure;
                if (currentProc instanceof SettingsProcedure) {
                    currentProc.requestBack();
                    this.htmlRenderer.log('↩️ 返回主界面', LOG_COLORS.INFO);
                }
            },
            onDeleteSave: () => {
                this._saveSystem.clearSave();
                this._gameData.reset();
                this.htmlRenderer.log('🗑️ 存档已删除，游戏数据已重置', LOG_COLORS.WARNING);
                this._mainPanel.updateStatus();
                this._mainPanel.updateButtons();
            },
            onToggleMute: () => {
                const audioMgr = this.getModule<AudioManager>('AudioManager');
                const muted = audioMgr.isMuted();
                audioMgr.setMuted(!muted);
                this.htmlRenderer.log(
                    `🔊 音频${muted ? '已恢复' : '已静音'}`,
                    LOG_COLORS.INFO,
                );
            },
        });

        Logger.info(TAG, 'UI 面板创建完成');
    }

    /**
     * 注册事件监听器，输出日志到 HtmlRenderer
     */
    private _registerEventListeners(): void {
        const eventMgr = this.getModule<EventManager>('EventManager');

        eventMgr.on(GOLD_CHANGED, (data) => {
            const diff = data.newGold - data.oldGold;
            const sign = diff >= 0 ? '+' : '';
            this.htmlRenderer.log(
                `💰 金币: ${data.oldGold} → ${data.newGold} (${sign}${diff})`,
                LOG_COLORS.TIMER,
            );
        });

        eventMgr.on(CLICK_MINE, (data) => {
            this.htmlRenderer.log(`⛏️ 挖矿 +${data.amount}`, LOG_COLORS.DEBUG);
        });

        eventMgr.on(BUILDING_PURCHASED, (data) => {
            this.htmlRenderer.log(
                `🏗️ 购买建筑 #${data.buildingId}，花费 ${data.cost}`,
                LOG_COLORS.SUCCESS,
            );
        });

        eventMgr.on(BUILDING_UPGRADED, (data) => {
            this.htmlRenderer.log(
                `⬆️ 建筑 #${data.buildingId} 升级: Lv.${data.oldLevel} → Lv.${data.newLevel}，花费 ${data.cost}`,
                LOG_COLORS.INFO,
            );
        });

        eventMgr.on(BUILDING_OUTPUT, (data) => {
            this.htmlRenderer.log(
                `🏭 建筑 #${data.buildingId} 产出 ${data.amount} 金币`,
                LOG_COLORS.TIMER,
            );
        });

        eventMgr.on(ACHIEVEMENT_UNLOCKED, (data) => {
            this.htmlRenderer.log(
                `🏆 成就解锁！ID=${data.achievementId}，奖励 ${data.reward} 金币`,
                LOG_COLORS.COMBAT,
            );
        });

        eventMgr.on(OFFLINE_REWARD, (data) => {
            this.htmlRenderer.log(
                `⏰ 离线收益: ${data.offlineSeconds}s → +${data.totalReward} 金币`,
                LOG_COLORS.WARNING,
            );
        });

        eventMgr.on(GAME_SAVED, (data) => {
            const time = new Date(data.timestamp).toLocaleTimeString('zh-CN', { hour12: false });
            this.htmlRenderer.log(`💾 游戏已保存 (${time})`, LOG_COLORS.DEBUG);
        });

        eventMgr.on(PROCEDURE_CHANGED, (data) => {
            this.htmlRenderer.log(
                `🔄 流程切换: ${data.from} → ${data.to}`,
                LOG_COLORS.NETWORK,
            );
        });

        Logger.info(TAG, '事件日志监听器注册完成');
    }

    /**
     * 启动 UI 定时刷新
     */
    private _startUIRefresh(): void {
        const timerMgr = this.getModule<TimerManager>('TimerManager');
        timerMgr.addTimer(
            UI_REFRESH_INTERVAL,
            () => {
                this._mainPanel.updateStatus();
                this._mainPanel.updateButtons();
            },
            { repeat: TIMER_REPEAT_FOREVER },
        );
    }

    /**
     * 模拟离线（设置 lastOnlineTime 回退指定秒数，重新计算收益）
     * @param seconds 模拟离线秒数
     */
    private _simulateOffline(seconds: number): void {
        this.htmlRenderer.separator('模拟离线');
        this.htmlRenderer.log(
            `⏰ 模拟离线 ${seconds} 秒（${Math.floor(seconds / 60)} 分钟）...`,
            LOG_COLORS.WARNING,
        );

        // 先保存当前状态
        this._saveSystem.save(this._gameData);

        // 回退在线时间
        this._gameData.lastOnlineTime = Date.now() - seconds * 1000;

        // 计算离线收益
        const dtMgr = this.getModule<DataTableManager>('DataTableManager');
        const buildingConfigs = [...dtMgr.getAllRows<BuildingConfigRow>('building_config')];
        const upgradeCurveRows = [...dtMgr.getAllRows<UpgradeCurveRow>('upgrade_curve')];

        const upgradeCurves = new Map<number, UpgradeCurveRow[]>();
        for (const row of upgradeCurveRows) {
            const list = upgradeCurves.get(row.buildingId);
            if (list) {
                list.push(row);
            } else {
                upgradeCurves.set(row.buildingId, [row]);
            }
        }

        const reward = this._offlineRewardSystem.calculateReward(
            this._gameData,
            buildingConfigs,
            upgradeCurves,
            Date.now(),
        );

        if (reward > 0) {
            this._offlineRewardSystem.settleReward(this._gameData, reward);
        } else {
            this.htmlRenderer.log('无离线收益（无产出建筑）', LOG_COLORS.DEBUG);
        }

        this._mainPanel.updateStatus();
        this._mainPanel.updateButtons();
    }

    /**
     * 显示成就列表
     */
    private _showAchievements(): void {
        this.htmlRenderer.separator('成就列表');

        const unlocked = this._achievementSystem.getUnlockedAchievements();
        const locked = this._achievementSystem.getLockedAchievements();

        if (unlocked.length > 0) {
            this.htmlRenderer.log(`已解锁 (${unlocked.length}):`, LOG_COLORS.SUCCESS);
            for (const a of unlocked) {
                this.htmlRenderer.log(`  ✅ ${a.name} — ${a.desc}`, LOG_COLORS.SUCCESS);
            }
        }

        if (locked.length > 0) {
            this.htmlRenderer.log(`未解锁 (${locked.length}):`, LOG_COLORS.DEBUG);
            for (const a of locked) {
                this.htmlRenderer.log(`  🔒 ${a.name} — ${a.desc}`, LOG_COLORS.DEBUG);
            }
        }

        if (unlocked.length === 0 && locked.length === 0) {
            this.htmlRenderer.log('暂无成就数据', LOG_COLORS.DEBUG);
        }
    }
}

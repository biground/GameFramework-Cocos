/**
 * Idle Clicker 主界面面板
 *
 * 使用 HtmlRenderer 展示游戏状态和按钮交互。
 * @module
 */

import { HtmlRenderer, StatusPanel } from '@game/shared/HtmlRenderer';
import { Logger } from '@framework/debug/Logger';
import { IdleGameData } from '@game/demo1-idle/data/IdleGameData';
import { BuildingSystem } from '@game/demo1-idle/systems/BuildingSystem';
import { BuildingConfigRow } from '@game/demo1-idle/data/BuildingConfigRow';

const TAG = 'IdleMainPanel';

/** 建筑显示名称映射（配置 name → 中文） */
const BUILDING_DISPLAY_NAMES: Record<string, string> = {
    building_lemonade: '柠檬汁摊',
    building_newspaper: '报摊',
    building_carwash: '洗车场',
    building_pizza: '披萨店',
    building_bank: '银行',
};

/** UI 按钮回调集合 */
export interface IdleMainPanelCallbacks {
    /** 点击挖矿 */
    onClickMine: () => void;
    /** 购买建筑 */
    onPurchaseBuilding: (id: number) => void;
    /** 升级建筑 */
    onUpgradeBuilding: (id: number) => void;
    /** 打开设置 */
    onOpenSettings: () => void;
    /** 模拟离线 */
    onSimulateOffline: () => void;
    /** 查看成就 */
    onViewAchievements: () => void;
}

/**
 * 主界面面板
 *
 * 创建并管理状态面板、操作按钮组和建筑按钮组，
 * 负责刷新游戏状态显示和按钮可用状态。
 */
export class IdleMainPanel {
    private _renderer: HtmlRenderer;
    private _gameData: IdleGameData;
    private _buildingSystem: BuildingSystem;
    private _statusPanel: StatusPanel | null = null;
    private _purchaseButtons: Map<number, HTMLButtonElement> = new Map();
    private _upgradeButtons: Map<number, HTMLButtonElement> = new Map();

    /**
     * 构造主界面面板
     * @param renderer HTML 渲染器
     * @param gameData 游戏状态数据
     * @param buildingSystem 建筑系统
     */
    constructor(renderer: HtmlRenderer, gameData: IdleGameData, buildingSystem: BuildingSystem) {
        this._renderer = renderer;
        this._gameData = gameData;
        this._buildingSystem = buildingSystem;
    }

    /**
     * 创建所有 UI 元素
     * @param callbacks 按钮回调集合
     */
    setup(callbacks: IdleMainPanelCallbacks): void {
        // 状态面板
        this._statusPanel = this._renderer.createStatusPanel('main-status', '游戏状态');
        this._statusPanel.update('金币', '0');
        this._statusPanel.update('每秒产出', '0');

        // 操作按钮组
        const actionGroup = this._renderer.createButtonGroup('操作');
        this._renderer.addButton(actionGroup, '点击挖矿', callbacks.onClickMine);

        // 建筑按钮组 — 购买
        const purchaseGroup = this._renderer.createButtonGroup('建筑');
        const configs = this._getAllBuildingConfigs();
        for (const config of configs) {
            const displayName = this._getDisplayName(config.name);
            const btn = this._renderer.addButton(
                purchaseGroup,
                `购买${displayName}`,
                () => callbacks.onPurchaseBuilding(config.id),
            );
            this._purchaseButtons.set(config.id, btn);
        }

        // 升级按钮组
        const upgradeGroup = this._renderer.createButtonGroup('升级');
        for (const config of configs) {
            const displayName = this._getDisplayName(config.name);
            const btn = this._renderer.addButton(
                upgradeGroup,
                `升级${displayName}`,
                () => callbacks.onUpgradeBuilding(config.id),
                true, // 默认禁用，直到拥有建筑
            );
            this._upgradeButtons.set(config.id, btn);
        }

        // 其他按钮组
        const miscGroup = this._renderer.createButtonGroup('其他');
        this._renderer.addButton(miscGroup, '打开设置', callbacks.onOpenSettings);
        this._renderer.addButton(miscGroup, '模拟离线30分钟', callbacks.onSimulateOffline);
        this._renderer.addButton(miscGroup, '查看成就', callbacks.onViewAchievements);

        Logger.info(TAG, 'UI 面板创建完成');
    }

    /**
     * 更新状态面板显示
     */
    updateStatus(): void {
        if (!this._statusPanel) {
            return;
        }

        this._statusPanel.update('金币', this._formatNumber(this._gameData.gold));
        this._statusPanel.update(
            '每秒产出',
            this._formatNumber(Math.floor(this._buildingSystem.getTotalOutputPerSecond())),
        );

        // 显示已拥有建筑的等级和产出
        for (const state of this._gameData.buildings) {
            if (!state.owned) {
                continue;
            }
            const config = this._buildingSystem.getBuildingConfig(state.id);
            if (!config) {
                continue;
            }
            const displayName = this._getDisplayName(config.name);
            const output = this._buildingSystem.getBuildingOutput(state.id);
            this._statusPanel.update(
                displayName,
                `Lv.${state.level} (产出: ${output}/次)`,
            );
        }
    }

    /**
     * 更新按钮状态（可用/禁用）
     */
    updateButtons(): void {
        const configs = this._getAllBuildingConfigs();

        for (const config of configs) {
            // 购买按钮
            const purchaseBtn = this._purchaseButtons.get(config.id);
            if (purchaseBtn) {
                const state = this._gameData.buildings.find((b) => b.id === config.id);
                const alreadyOwned = state !== undefined && state.owned;
                const canAfford = this._gameData.gold >= config.baseCost;
                const isUnlocked = this._buildingSystem.isBuildingUnlocked(config.id);
                const disabled = alreadyOwned || !canAfford || !isUnlocked;
                this._setButtonDisabled(purchaseBtn, disabled);
            }

            // 升级按钮
            const upgradeBtn = this._upgradeButtons.get(config.id);
            if (upgradeBtn) {
                const state = this._gameData.buildings.find((b) => b.id === config.id);
                const owned = state !== undefined && state.owned;
                if (!owned) {
                    this._setButtonDisabled(upgradeBtn, true);
                    continue;
                }
                const atMaxLevel = state.level >= config.maxLevel;
                const upgradeCost = this._buildingSystem.getUpgradeCost(config.id);
                const canAfford = this._gameData.gold >= upgradeCost;
                this._setButtonDisabled(upgradeBtn, atMaxLevel || !canAfford);
            }
        }
    }

    /**
     * 获取所有建筑配置（按 ID 顺序）
     */
    private _getAllBuildingConfigs(): BuildingConfigRow[] {
        const configs: BuildingConfigRow[] = [];
        for (let id = 1; id <= 5; id++) {
            const config = this._buildingSystem.getBuildingConfig(id);
            if (config) {
                configs.push(config);
            }
        }
        return configs;
    }

    /**
     * 获取建筑显示名称
     * @param configName 配置名称（i18n key）
     * @returns 中文显示名称
     */
    private _getDisplayName(configName: string): string {
        return BUILDING_DISPLAY_NAMES[configName] ?? configName;
    }

    /**
     * 格式化数字（千位分隔符）
     * @param n 数值
     * @returns 格式化后的字符串
     */
    private _formatNumber(n: number): string {
        return n.toLocaleString('zh-CN');
    }

    /**
     * 设置按钮禁用状态
     * @param btn 按钮元素
     * @param disabled 是否禁用
     */
    private _setButtonDisabled(btn: HTMLButtonElement, disabled: boolean): void {
        btn.disabled = disabled;
        btn.style.opacity = disabled ? '0.5' : '1';
        btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
    }
}

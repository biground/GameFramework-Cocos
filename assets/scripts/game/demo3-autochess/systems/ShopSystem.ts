/**
 * 商店系统 — 管理商店刷新、购买、锁定
 * @module
 */

import { Logger } from '../../../framework/debug/Logger';
import { ChessPieceConfigRow } from '../data/ChessPieceConfigRow';
import type { ShopSlot } from '../data/AutoChessGameData';
import { SHOP_SIZE } from '../AutoChessDefs';

/**
 * ShopSystem — 管理自走棋商店的刷新/购买/锁定逻辑
 *
 * 每回合准备阶段开始时自动刷新商店（除非锁定），
 * 玩家可从槽位中购买棋子（金币不足或已售出则拒绝）。
 */
export class ShopSystem {
    private static readonly TAG = 'ShopSystem';

    /** 商店槽位列表 */
    private _slots: ShopSlot[] = [];

    /** 商店是否锁定 */
    private _isLocked: boolean = false;

    /** 是否锁定 */
    get isLocked(): boolean {
        return this._isLocked;
    }

    /**
     * 刷新商店——从配置列表中随机抽取棋子填充槽位
     *
     * 如果商店已锁定则跳过刷新。
     * 配置列表为空时，槽位 config 设为 null。
     *
     * @param configs 可选棋子配置池
     * @param slotCount 槽位数量，默认 SHOP_SIZE
     */
    refreshShop(configs: ChessPieceConfigRow[], slotCount: number = SHOP_SIZE): void {
        if (this._isLocked) {
            Logger.debug(ShopSystem.TAG, '商店已锁定，跳过刷新');
            return;
        }

        this._slots = [];
        for (let i = 0; i < slotCount; i++) {
            if (configs.length === 0) {
                this._slots.push({ config: null, sold: false });
            } else {
                const idx = Math.floor(Math.random() * configs.length);
                this._slots.push({ config: configs[idx], sold: false });
            }
        }

        Logger.debug(ShopSystem.TAG, `商店已刷新，共 ${slotCount} 个槽位`);
    }

    /**
     * 购买指定槽位的棋子
     *
     * @param slotIndex 槽位索引
     * @param currentGold 当前持有金币
     * @returns 购买结果（config + cost），失败返回 null
     */
    buyPiece(
        slotIndex: number,
        currentGold: number,
    ): { config: ChessPieceConfigRow; cost: number } | null {
        if (slotIndex < 0 || slotIndex >= this._slots.length) {
            Logger.warn(ShopSystem.TAG, `槽位索引越界: ${slotIndex}`);
            return null;
        }

        const slot = this._slots[slotIndex];

        if (slot.sold) {
            Logger.debug(ShopSystem.TAG, `槽位 ${slotIndex} 已售出`);
            return null;
        }

        if (slot.config === null) {
            Logger.debug(ShopSystem.TAG, `槽位 ${slotIndex} 为空`);
            return null;
        }

        if (currentGold < slot.config.cost) {
            Logger.debug(ShopSystem.TAG, `金币不足: 需要 ${slot.config.cost}，当前 ${currentGold}`);
            return null;
        }

        slot.sold = true;
        const config = slot.config as ChessPieceConfigRow;
        Logger.info(ShopSystem.TAG, `购买棋子: ${config.name}，花费 ${config.cost} 金币`);
        return { config, cost: config.cost };
    }

    /** 锁定商店（下次刷新时跳过） */
    lockShop(): void {
        this._isLocked = true;
        Logger.debug(ShopSystem.TAG, '商店已锁定');
    }

    /** 解锁商店 */
    unlockShop(): void {
        this._isLocked = false;
        Logger.debug(ShopSystem.TAG, '商店已解锁');
    }

    /**
     * 获取所有槽位（只读）
     */
    getSlots(): readonly ShopSlot[] {
        return this._slots;
    }

    /**
     * 获取未售出的可用槽位
     */
    getAvailableSlots(): ShopSlot[] {
        return this._slots.filter((s) => !s.sold && s.config !== null);
    }

    /**
     * 重置商店状态
     */
    reset(): void {
        this._slots = [];
        this._isLocked = false;
        Logger.debug(ShopSystem.TAG, '商店已重置');
    }
}

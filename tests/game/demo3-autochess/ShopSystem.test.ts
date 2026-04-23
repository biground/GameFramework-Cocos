/**
 * ShopSystem 单元测试
 */
import { ShopSystem } from '@game/demo3-autochess/systems/ShopSystem';
import {
    ChessPieceConfigRow,
    CHESS_PIECE_DATA,
} from '@game/demo3-autochess/data/ChessPieceConfigRow';
import type { ShopSlot } from '@game/demo3-autochess/data/AutoChessGameData';
import { SHOP_SIZE } from '@game/demo3-autochess/AutoChessDefs';

// ShopSlot 类型仅在类型注解中使用，此处声明供 TypeScript 检查
const _typeCheck: ShopSlot | undefined = undefined;
void _typeCheck;

// ─── 辅助：解析配置数据 ──────────────────────────────────

function parseConfigs(): ChessPieceConfigRow[] {
    return CHESS_PIECE_DATA.map((raw) => {
        const row = new ChessPieceConfigRow();
        row.parseRow(raw);
        return row;
    });
}

describe('ShopSystem', () => {
    let shop: ShopSystem;
    let configs: ChessPieceConfigRow[];

    beforeEach(() => {
        shop = new ShopSystem();
        configs = parseConfigs();
    });

    // ─── 初始状态 ──────────────────────────────────────

    describe('初始状态', () => {
        it('商店初始未锁定', () => {
            expect(shop.isLocked).toBe(false);
        });

        it('初始槽位为空数组', () => {
            expect(shop.getSlots()).toHaveLength(0);
        });
    });

    // ─── refreshShop ────────────────────────────────────

    describe('refreshShop', () => {
        it('刷新后槽位数等于 SHOP_SIZE（默认 5）', () => {
            shop.refreshShop(configs);
            expect(shop.getSlots()).toHaveLength(SHOP_SIZE);
        });

        it('刷新后每个槽位 config 不为 null 且 sold 为 false', () => {
            shop.refreshShop(configs);
            const slots = shop.getSlots();
            for (const slot of slots) {
                expect(slot.config).not.toBeNull();
                expect(slot.sold).toBe(false);
            }
        });

        it('支持自定义 slotCount', () => {
            shop.refreshShop(configs, 3);
            expect(shop.getSlots()).toHaveLength(3);
        });

        it('锁定商店后刷新不生效', () => {
            shop.refreshShop(configs);
            const before = shop.getSlots().map((s) => s.config?.id);
            shop.lockShop();
            shop.refreshShop(configs);
            const after = shop.getSlots().map((s) => s.config?.id);
            expect(after).toEqual(before);
        });

        it('解锁后可以正常刷新', () => {
            shop.refreshShop(configs, 3);
            shop.lockShop();
            shop.unlockShop();
            shop.refreshShop(configs, 3);
            // 只要不抛异常且长度正确即可
            expect(shop.getSlots()).toHaveLength(3);
        });

        it('传入空配置列表时所有槽位为空', () => {
            shop.refreshShop([]);
            const slots = shop.getSlots();
            expect(slots).toHaveLength(SHOP_SIZE);
            for (const slot of slots) {
                expect(slot.config).toBeNull();
            }
        });
    });

    // ─── buyPiece ───────────────────────────────────────

    describe('buyPiece', () => {
        beforeEach(() => {
            shop.refreshShop(configs);
        });

        it('金币充足时购买返回 config 和 cost', () => {
            const slot = shop.getSlots()[0];
            const expectedCost = slot.config!.cost;
            const result = shop.buyPiece(0, 100);
            expect(result).not.toBeNull();
            expect(result!.config).toBeDefined();
            expect(result!.cost).toBe(expectedCost);
        });

        it('购买后该槽位标记为 sold', () => {
            shop.buyPiece(0, 100);
            expect(shop.getSlots()[0].sold).toBe(true);
        });

        it('金币不足时返回 null', () => {
            const result = shop.buyPiece(0, 0);
            expect(result).toBeNull();
        });

        it('已售出槽位返回 null', () => {
            shop.buyPiece(0, 100);
            const result = shop.buyPiece(0, 100);
            expect(result).toBeNull();
        });

        it('槽位索引越界返回 null', () => {
            expect(shop.buyPiece(-1, 100)).toBeNull();
            expect(shop.buyPiece(99, 100)).toBeNull();
        });

        it('空槽位（config 为 null）返回 null', () => {
            shop.refreshShop([]);
            const result = shop.buyPiece(0, 100);
            expect(result).toBeNull();
        });
    });

    // ─── lockShop / unlockShop ──────────────────────────

    describe('锁定/解锁', () => {
        it('lockShop 设置 isLocked 为 true', () => {
            shop.lockShop();
            expect(shop.isLocked).toBe(true);
        });

        it('unlockShop 设置 isLocked 为 false', () => {
            shop.lockShop();
            shop.unlockShop();
            expect(shop.isLocked).toBe(false);
        });
    });

    // ─── getAvailableSlots ──────────────────────────────

    describe('getAvailableSlots', () => {
        it('全部未售出时返回全部', () => {
            shop.refreshShop(configs);
            expect(shop.getAvailableSlots()).toHaveLength(SHOP_SIZE);
        });

        it('购买一个后可用数减 1', () => {
            shop.refreshShop(configs);
            shop.buyPiece(0, 100);
            expect(shop.getAvailableSlots()).toHaveLength(SHOP_SIZE - 1);
        });

        it('全部售出后返回空数组', () => {
            shop.refreshShop(configs);
            for (let i = 0; i < SHOP_SIZE; i++) {
                shop.buyPiece(i, 9999);
            }
            expect(shop.getAvailableSlots()).toHaveLength(0);
        });
    });

    // ─── reset ──────────────────────────────────────────

    describe('reset', () => {
        it('重置后槽位清空且解锁', () => {
            shop.refreshShop(configs);
            shop.lockShop();
            shop.buyPiece(0, 100);
            shop.reset();
            expect(shop.getSlots()).toHaveLength(0);
            expect(shop.isLocked).toBe(false);
        });
    });
});

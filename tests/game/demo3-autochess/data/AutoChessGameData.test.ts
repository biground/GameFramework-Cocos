/**
 * AutoChessGameData 单元测试
 */
import {
    AutoChessGameData,
    INITIAL_GOLD,
    INITIAL_HP,
} from '@game/demo3-autochess/data/AutoChessGameData';
import type {
    ChessPieceRuntimeState,
    ShopSlot,
    ActiveSynergy,
    MergeResult,
    BattleResult,
    ChessPieceSide,
} from '@game/demo3-autochess/data/AutoChessGameData';

// ─── 辅助：模拟 ChessPieceConfigRow ─────────────────────

function makeConfig(
    overrides: Partial<{
        id: number;
        name: string;
        race: string;
        hp: number;
        atk: number;
        atkSpeed: number;
        range: number;
        cost: number;
        star2Mult: number;
    }> = {},
) {
    return {
        id: overrides.id ?? 1,
        name: overrides.name ?? '战士',
        race: overrides.race ?? 'warrior',
        hp: overrides.hp ?? 100,
        atk: overrides.atk ?? 20,
        atkSpeed: overrides.atkSpeed ?? 1.0,
        range: overrides.range ?? 1,
        cost: overrides.cost ?? 3,
        star2Mult: overrides.star2Mult ?? 2.0,
        parseRow: jest.fn(),
    };
}

// ─── 类型编译检查 ─────────────────────────────────────────

describe('类型定义', () => {
    it('ChessPieceSide 应只接受 player 或 enemy', () => {
        const p: ChessPieceSide = 'player';
        const e: ChessPieceSide = 'enemy';
        expect(p).toBe('player');
        expect(e).toBe('enemy');
    });

    it('BattleResult 应只接受 win 或 lose', () => {
        const w: BattleResult = 'win';
        const l: BattleResult = 'lose';
        expect(w).toBe('win');
        expect(l).toBe('lose');
    });

    it('ShopSlot 应可构造', () => {
        const slot: ShopSlot = { config: null, sold: false };
        expect(slot.config).toBeNull();
        expect(slot.sold).toBe(false);
    });

    it('ActiveSynergy 应可构造', () => {
        const synergy: ActiveSynergy = {
            race: 'warrior',
            count: 3,
            threshold: 3,
            effect: 'atk_boost',
            value: 20,
            isActive: true,
        };
        expect(synergy.race).toBe('warrior');
        expect(synergy.isActive).toBe(true);
    });

    it('MergeResult 应可构造', () => {
        const state: ChessPieceRuntimeState = {
            id: 10,
            configId: 1,
            name: '战士',
            race: 'warrior',
            hp: 200,
            maxHp: 200,
            atk: 40,
            atkSpeed: 1.0,
            range: 1,
            star: 2,
            side: 'player',
            position: { row: 0, col: 0 },
            isAlive: true,
        };
        const result: MergeResult = {
            mergedPiece: state,
            consumedIds: [1, 2, 3],
        };
        expect(result.consumedIds).toHaveLength(3);
    });
});

// ─── 常量 ─────────────────────────────────────────────

describe('常量', () => {
    it('INITIAL_GOLD 应为 10', () => {
        expect(INITIAL_GOLD).toBe(10);
    });

    it('INITIAL_HP 应为 100', () => {
        expect(INITIAL_HP).toBe(100);
    });
});

// ─── AutoChessGameData ───────────────────────────────

describe('AutoChessGameData', () => {
    let gameData: AutoChessGameData;

    beforeEach(() => {
        gameData = new AutoChessGameData();
    });

    // ── 初始化 ──────────────────────────────────────

    describe('初始化', () => {
        it('gold 应为 INITIAL_GOLD', () => {
            expect(gameData.gold).toBe(INITIAL_GOLD);
        });

        it('hp 应为 INITIAL_HP', () => {
            expect(gameData.hp).toBe(INITIAL_HP);
        });

        it('round 应为 1', () => {
            expect(gameData.round).toBe(1);
        });

        it('boardPieces 应为空 Map', () => {
            expect(gameData.boardPieces).toBeInstanceOf(Map);
            expect(gameData.boardPieces.size).toBe(0);
        });

        it('benchPieces 应为空数组', () => {
            expect(gameData.benchPieces).toEqual([]);
        });

        it('shopSlots 应为空数组', () => {
            expect(gameData.shopSlots).toEqual([]);
        });

        it('shopLocked 应为 false', () => {
            expect(gameData.shopLocked).toBe(false);
        });

        it('activeSynergies 应为空数组', () => {
            expect(gameData.activeSynergies).toEqual([]);
        });

        it('allPieces 应为空 Map', () => {
            expect(gameData.allPieces).toBeInstanceOf(Map);
            expect(gameData.allPieces.size).toBe(0);
        });

        it('nextPieceId 应为 1', () => {
            expect(gameData.nextPieceId).toBe(1);
        });
    });

    // ── reset() ─────────────────────────────────────

    describe('reset()', () => {
        it('应将所有字段恢复为默认值', () => {
            // 修改所有字段
            gameData.gold = 999;
            gameData.hp = 50;
            gameData.round = 10;
            gameData.boardPieces.set('0,0', 1);
            gameData.benchPieces.push({
                id: 1,
                configId: 1,
                name: '战士',
                race: 'warrior',
                hp: 100,
                maxHp: 100,
                atk: 20,
                atkSpeed: 1,
                range: 1,
                star: 1,
                side: 'player',
                position: { row: 0, col: 0 },
                isAlive: true,
            });
            gameData.shopSlots.push({ config: null, sold: true });
            gameData.shopLocked = true;
            gameData.activeSynergies.push({
                race: 'warrior',
                count: 3,
                threshold: 3,
                effect: 'atk_boost',
                value: 20,
                isActive: true,
            });
            gameData.allPieces.set(1, gameData.benchPieces[0]);
            gameData.nextPieceId = 10;

            // 重置
            gameData.reset();

            // 验证
            expect(gameData.gold).toBe(INITIAL_GOLD);
            expect(gameData.hp).toBe(INITIAL_HP);
            expect(gameData.round).toBe(1);
            expect(gameData.boardPieces.size).toBe(0);
            expect(gameData.benchPieces).toEqual([]);
            expect(gameData.shopSlots).toEqual([]);
            expect(gameData.shopLocked).toBe(false);
            expect(gameData.activeSynergies).toEqual([]);
            expect(gameData.allPieces.size).toBe(0);
            expect(gameData.nextPieceId).toBe(1);
        });

        it('reset 应创建新的集合引用', () => {
            const oldBoard = gameData.boardPieces;
            const oldBench = gameData.benchPieces;
            const oldShop = gameData.shopSlots;
            const oldSynergies = gameData.activeSynergies;
            const oldAllPieces = gameData.allPieces;

            gameData.reset();

            expect(gameData.boardPieces).not.toBe(oldBoard);
            expect(gameData.benchPieces).not.toBe(oldBench);
            expect(gameData.shopSlots).not.toBe(oldShop);
            expect(gameData.activeSynergies).not.toBe(oldSynergies);
            expect(gameData.allPieces).not.toBe(oldAllPieces);
        });
    });

    // ── createPieceState() ──────────────────────────

    describe('createPieceState()', () => {
        it('应生成正确的 ★1 棋子状态', () => {
            const config = makeConfig({
                id: 2,
                name: '法师',
                race: 'mage',
                hp: 80,
                atk: 30,
                atkSpeed: 0.8,
                range: 3,
            });
            const piece = gameData.createPieceState(config, 1, 'player');

            expect(piece.id).toBe(1); // 第一个自增 ID
            expect(piece.configId).toBe(2);
            expect(piece.name).toBe('法师');
            expect(piece.race).toBe('mage');
            expect(piece.hp).toBe(80);
            expect(piece.maxHp).toBe(80);
            expect(piece.atk).toBe(30);
            expect(piece.atkSpeed).toBe(0.8);
            expect(piece.range).toBe(3);
            expect(piece.star).toBe(1);
            expect(piece.side).toBe('player');
            expect(piece.isAlive).toBe(true);
            expect(piece.position).toEqual({ row: -1, col: -1 });
        });

        it('应生成正确的 ★2 棋子状态（属性翻倍）', () => {
            const config = makeConfig({ hp: 100, atk: 20, star2Mult: 2.0 });
            const piece = gameData.createPieceState(config, 2, 'enemy');

            expect(piece.hp).toBe(200);
            expect(piece.maxHp).toBe(200);
            expect(piece.atk).toBe(40);
            expect(piece.star).toBe(2);
            expect(piece.side).toBe('enemy');
        });

        it('应自增 pieceId', () => {
            const config = makeConfig();
            const p1 = gameData.createPieceState(config, 1, 'player');
            const p2 = gameData.createPieceState(config, 1, 'player');
            const p3 = gameData.createPieceState(config, 1, 'enemy');

            expect(p1.id).toBe(1);
            expect(p2.id).toBe(2);
            expect(p3.id).toBe(3);
            expect(gameData.nextPieceId).toBe(4);
        });

        it('应自动注册到 allPieces', () => {
            const config = makeConfig();
            const piece = gameData.createPieceState(config, 1, 'player');

            expect(gameData.allPieces.get(piece.id)).toBe(piece);
            expect(gameData.allPieces.size).toBe(1);
        });

        it('★2 应使用 config.star2Mult 倍率', () => {
            const config = makeConfig({ hp: 50, atk: 10, star2Mult: 3.0 });
            const piece = gameData.createPieceState(config, 2, 'player');

            expect(piece.hp).toBe(150);
            expect(piece.atk).toBe(30);
        });
    });

    // ── getPiece() ──────────────────────────────────

    describe('getPiece()', () => {
        it('应返回已注册的棋子', () => {
            const config = makeConfig({ name: '游侠' });
            const piece = gameData.createPieceState(config, 1, 'player');

            expect(gameData.getPiece(piece.id)).toBe(piece);
        });

        it('不存在的 ID 应返回 undefined', () => {
            expect(gameData.getPiece(999)).toBeUndefined();
        });
    });

    // ── getPlayerPieces() / getEnemyPieces() ────────

    describe('getPlayerPieces() / getEnemyPieces()', () => {
        beforeEach(() => {
            const config = makeConfig();
            gameData.createPieceState(config, 1, 'player');
            gameData.createPieceState(config, 1, 'player');
            gameData.createPieceState(config, 1, 'enemy');
            gameData.createPieceState(config, 1, 'enemy');
            gameData.createPieceState(config, 1, 'enemy');
        });

        it('getPlayerPieces 应只返回 player 侧棋子', () => {
            const players = gameData.getPlayerPieces();
            expect(players).toHaveLength(2);
            players.forEach((p) => expect(p.side).toBe('player'));
        });

        it('getEnemyPieces 应只返回 enemy 侧棋子', () => {
            const enemies = gameData.getEnemyPieces();
            expect(enemies).toHaveLength(3);
            enemies.forEach((p) => expect(p.side).toBe('enemy'));
        });

        it('无棋子时应返回空数组', () => {
            gameData.reset();
            expect(gameData.getPlayerPieces()).toEqual([]);
            expect(gameData.getEnemyPieces()).toEqual([]);
        });

        it('应只返回存活棋子', () => {
            // 标记第一个 player 为死亡
            const allPlayers = gameData.getPlayerPieces();
            allPlayers[0].isAlive = false;

            const alive = gameData.getPlayerPieces();
            expect(alive).toHaveLength(1);
        });
    });
});

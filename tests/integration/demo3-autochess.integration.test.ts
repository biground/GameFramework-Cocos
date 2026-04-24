/**
 * @jest-environment jsdom
 */

/**
 * Demo 3 Auto-chess Lite 集成测试
 *
 * 验证完整游戏生命周期和各系统协作：
 * 1. 完整游戏循环（bootstrap → Prepare → 买棋 → Battle → Settle → 下一轮）
 * 2. 棋子合成（购买 3 个同名 → ★2）
 * 3. ObjectPool/Entity 复用（战斗后实体回收）
 * 4. 羁绊激活（warrior 羁绊 → ATK+20%）
 * 5. Game Over（HP<=0 → GameOverProcedure → reset 重开）
 * 6. Entity 峰值（16 个棋子无泄漏）
 * @module
 */

import { GameModule } from '@framework/core/GameModule';
import { EventManager } from '@framework/event/EventManager';
import { ProcedureManager } from '@framework/procedure/ProcedureManager';
import { DataTableManager } from '@framework/datatable/DataTableManager';
import { EntityManager } from '@framework/entity/EntityManager';
import { AutoChessDemo } from '@game/demo3-autochess/AutoChessDemo';
import { AutoChessGameData, IChessPieceConfig } from '@game/demo3-autochess/data/AutoChessGameData';
import { AutoChessEvents, INITIAL_GOLD, INITIAL_HP } from '@game/demo3-autochess/AutoChessDefs';
import { LaunchProcedure } from '@game/demo3-autochess/procedures/LaunchProcedure';
import { PrepareProcedure } from '@game/demo3-autochess/procedures/PrepareProcedure';
import { BattleProcedure } from '@game/demo3-autochess/procedures/BattleProcedure';
import { GameOverProcedure } from '@game/demo3-autochess/procedures/GameOverProcedure';
import { SynergyConfigRow } from '@game/demo3-autochess/data/SynergyConfigRow';
import { ChessPieceConfigRow } from '@game/demo3-autochess/data/ChessPieceConfigRow';
import { BoardSystem } from '@game/demo3-autochess/systems/BoardSystem';
import { ShopSystem } from '@game/demo3-autochess/systems/ShopSystem';
import { MergeSystem } from '@game/demo3-autochess/systems/MergeSystem';
import { SynergySystem } from '@game/demo3-autochess/systems/SynergySystem';
import { BattleSystem } from '@game/demo3-autochess/systems/BattleSystem';
import { EnemyGenerator } from '@game/demo3-autochess/factory/EnemyGenerator';

// ─── Mock Logger ────────────────────────────────────────

jest.mock('@framework/debug/Logger', () => {
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    class MockLogger {
        moduleName = 'Logger';
        priority = 0;
        onInit = jest.fn();
        onUpdate = jest.fn();
        onShutdown = jest.fn();

        static debug = jest.fn();
        static info = jest.fn();
        static warn = jest.fn();
        static error = jest.fn();
    }
    return { Logger: MockLogger };
});

// ─── 可测试子类 ────────────────────────────────────────

/**
 * 测试用 AutoChessDemo 子类
 *
 * 覆写 start()：跳过 Procedure 同步链式切换（FSM 不允许递归 changeState），
 * 手动执行各 Procedure 的初始化逻辑，暴露内部系统供断言。
 */
class TestAutoChessDemo extends AutoChessDemo {
    /** 获取游戏数据 */
    get gameData(): AutoChessGameData {
        return (this as unknown as { _gameData: AutoChessGameData })._gameData;
    }

    /** 获取棋盘系统 */
    get boardSystem(): BoardSystem {
        return (this as unknown as { _boardSystem: BoardSystem })._boardSystem;
    }

    /** 获取商店系统 */
    get shopSystem(): ShopSystem {
        return (this as unknown as { _shopSystem: ShopSystem })._shopSystem;
    }

    /** 获取合成系统 */
    get mergeSystem(): MergeSystem {
        return (this as unknown as { _mergeSystem: MergeSystem })._mergeSystem;
    }

    /** 获取羁绊系统 */
    get synergySystem(): SynergySystem {
        return (this as unknown as { _synergySystem: SynergySystem })._synergySystem;
    }

    /** 获取战斗系统 */
    get battleSystem(): BattleSystem {
        return (this as unknown as { _battleSystem: BattleSystem })._battleSystem;
    }

    /**
     * 覆写 start()：bootstrap + 启动 Procedure 链 + 主循环
     *
     * Launch → Preload → Prepare 在 onEnter 中同步链式完成，
     * 主循环必须在 Procedure 链完成后才启动（避免 setInterval 导致无限定时器）。
     */
    startAndFlush(): void {
        // 1. bootstrap（注册模块 + setupProcedures + setupDataTables）
        this.bootstrap();

        // 2. 启动 Procedure（同步链式：Launch → Preload → Prepare）
        const procMgr = GameModule.getModule<ProcedureManager>('ProcedureManager');
        procMgr.startProcedure(LaunchProcedure);

        // 3. 启动主循环（30fps → 每 ~33ms 一帧）
        this.startMainLoop(30);

        // 4. 推进少量时间让第一帧 update 执行
        jest.advanceTimersByTime(100);
    }
}

// ─── 工具函数 ──────────────────────────────────────────

// ─── 测试主体 ──────────────────────────────────────────

describe('Demo 3 Auto-chess Lite 集成测试', () => {
    let demo: TestAutoChessDemo;

    beforeEach(() => {
        jest.useFakeTimers();
        GameModule.shutdownAll();
        EnemyGenerator.resetIdCounter();
        demo = new TestAutoChessDemo();
    });

    afterEach(() => {
        demo.shutdown();
        GameModule.shutdownAll();
        document.body.innerHTML = '';
        jest.useRealTimers();
    });

    // ═══════════════════════════════════════════════════
    // 场景 1：完整游戏循环
    // ═══════════════════════════════════════════════════

    describe('完整游戏循环', () => {
        it('bootstrap → Prepare → 买棋 → Battle → Settle → 下一轮', () => {
            demo.startAndFlush();
            const procMgr = GameModule.getModule<ProcedureManager>('ProcedureManager');
            const eventMgr = GameModule.getModule<EventManager>('EventManager');

            // 验证已到达 PrepareProcedure
            expect(procMgr.currentProcedure).toBeInstanceOf(PrepareProcedure);

            // 第一个 Prepare 阶段的 round：初始 0 + Prepare.onEnter++ = 1
            const roundAfterFirstPrepare = demo.gameData.round;
            expect(roundAfterFirstPrepare).toBe(1);

            // 金币 = INITIAL_GOLD（第一轮无收入，收入由 SettleProcedure 发放）
            expect(demo.gameData.gold).toBe(INITIAL_GOLD);

            // 购买棋子：先刷新商店让棋子可购买
            const configs = [
                ...GameModule.getModule<DataTableManager>(
                    'DataTableManager',
                ).getAllRows<ChessPieceConfigRow>('chess_piece_config'),
            ];
            // 手动刷新商店，确保有棋子可买
            demo.shopSystem.unlockShop();
            demo.shopSystem.refreshShop(configs);

            // 购买第一个槽位的棋子
            const prepareProcedure = procMgr.currentProcedure as PrepareProcedure;
            const slot = demo.shopSystem.getSlots()[0];
            const cost = slot.config?.cost ?? 0;
            const goldBefore = demo.gameData.gold;
            prepareProcedure.handleBuyPiece(0);

            expect(demo.gameData.gold).toBe(goldBefore - cost);
            expect(demo.gameData.benchPieces.length).toBeGreaterThanOrEqual(1);

            // 放置棋子到棋盘
            const piece = demo.gameData.benchPieces[0];
            prepareProcedure.handlePlacePiece(piece.id, 0, 0);
            expect(demo.boardSystem.getPieceAt(0, 0)).toBe(piece.id);

            // 完成准备阶段，进入战斗
            const roundEndSpy = jest.fn();
            eventMgr.on(AutoChessEvents.ROUND_END, roundEndSpy);

            prepareProcedure.onPrepareComplete();
            jest.advanceTimersByTime(200);

            // 现在应在 BattleProcedure
            expect(procMgr.currentProcedure).toBeInstanceOf(BattleProcedure);

            // 驱动战斗直到结束
            for (let i = 0; i < 500; i++) {
                GameModule.update(0.1);
                if (!(procMgr.currentProcedure instanceof BattleProcedure)) {
                    break;
                }
            }

            // 战斗结束后应切换到 SettleProcedure 并自动到下一个 PrepareProcedure
            jest.advanceTimersByTime(200);
            jest.advanceTimersByTime(200);

            // Settle 发射了 ROUND_END
            expect(roundEndSpy).toHaveBeenCalled();

            // round 应已递增（Settle.round++ + 下一个 Prepare.round++）
            expect(demo.gameData.round).toBeGreaterThan(roundAfterFirstPrepare);
        });

        it('回合递增和金币变化正确', () => {
            demo.startAndFlush();
            const procMgr = GameModule.getModule<ProcedureManager>('ProcedureManager');

            // 第一轮 Prepare：round = 1, gold = INITIAL_GOLD
            expect(demo.gameData.round).toBe(1);
            expect(demo.gameData.gold).toBe(INITIAL_GOLD);

            // 完成准备，进入战斗
            const prepareProcedure = procMgr.currentProcedure as PrepareProcedure;
            prepareProcedure.onPrepareComplete();
            jest.advanceTimersByTime(200);

            // 驱动战斗到结束
            for (let i = 0; i < 500; i++) {
                GameModule.update(0.1);
                if (!(procMgr.currentProcedure instanceof BattleProcedure)) {
                    break;
                }
            }
            jest.advanceTimersByTime(200);
            jest.advanceTimersByTime(200);

            // Settle 增加金币（无论胜负都有 BASE_INCOME），然后进入下一轮 Prepare
            // 金币至少增长了
            expect(demo.gameData.gold).toBeGreaterThan(0);

            // round 增长了：Settle 不加 + Prepare++ = +1
            expect(demo.gameData.round).toBeGreaterThan(1);
        });
    });

    // ═══════════════════════════════════════════════════
    // 场景 2：棋子合成集成测试
    // ═══════════════════════════════════════════════════

    describe('棋子合成', () => {
        it('购买 3 个同名 ★1 棋子自动合成为 ★2，属性翻倍', () => {
            demo.startAndFlush();
            const procMgr = GameModule.getModule<ProcedureManager>('ProcedureManager');
            const eventMgr = GameModule.getModule<EventManager>('EventManager');

            // 记录合成事件
            const mergeSpy = jest.fn();
            eventMgr.on(AutoChessEvents.CHESS_MERGED, mergeSpy);

            // 给足金币以便购买
            demo.gameData.gold = 1000;

            // 创建只包含"剑士"的商店（确保 3 个同名棋子）
            const swordConfig = new ChessPieceConfigRow();
            swordConfig.parseRow({
                id: 1,
                name: '剑士',
                race: 'warrior',
                hp: 600,
                atk: 50,
                atkSpeed: 1.0,
                range: 1,
                cost: 1,
                star2Mult: 2.0,
            });

            const prepareProcedure = procMgr.currentProcedure as PrepareProcedure;

            // 购买 3 个剑士（每次购买后商店需重新刷新）
            for (let i = 0; i < 3; i++) {
                demo.shopSystem.unlockShop();
                demo.shopSystem.refreshShop([swordConfig], 5);
                prepareProcedure.handleBuyPiece(0);
            }

            // 验证合成发生
            expect(mergeSpy).toHaveBeenCalled();
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const mergeData = mergeSpy.mock.calls[0][0] as {
                resultPieceId: number;
                star: number;
                name: string;
            };
            expect(mergeData.star).toBe(2);
            expect(mergeData.name).toBe('剑士');

            // 验证合成后只剩 1 个棋子（3 个 ★1 消耗，生成 1 个 ★2）
            const playerPieces = demo.gameData.getPlayerPieces();
            const swordPieces = playerPieces.filter((p) => p.name === '剑士');
            expect(swordPieces.length).toBe(1);
            expect(swordPieces[0].star).toBe(2);

            // 验证属性翻倍（star2Mult = 2.0）
            expect(swordPieces[0].hp).toBe(600 * 2);
            expect(swordPieces[0].atk).toBe(50 * 2);
        });
    });

    // ═══════════════════════════════════════════════════
    // 场景 3：ObjectPool/Entity 复用测试
    // ═══════════════════════════════════════════════════

    describe('ObjectPool 复用', () => {
        it('战斗后实体回收，getEntitiesByGroup 返回空', () => {
            demo.startAndFlush();
            const procMgr = GameModule.getModule<ProcedureManager>('ProcedureManager');
            const entityMgr = GameModule.getModule<EntityManager>('EntityManager');

            // 给足金币，购买并放置棋子
            demo.gameData.gold = 1000;
            const configs = [
                ...GameModule.getModule<DataTableManager>(
                    'DataTableManager',
                ).getAllRows<ChessPieceConfigRow>('chess_piece_config'),
            ];
            demo.shopSystem.unlockShop();
            demo.shopSystem.refreshShop(configs);

            const prepareProcedure = procMgr.currentProcedure as PrepareProcedure;
            prepareProcedure.handleBuyPiece(0);

            // 放置棋子到棋盘
            if (demo.gameData.benchPieces.length > 0) {
                const piece = demo.gameData.benchPieces[0];
                prepareProcedure.handlePlacePiece(piece.id, 0, 0);
            }

            // 完成准备阶段
            prepareProcedure.onPrepareComplete();
            jest.advanceTimersByTime(200);

            // 确认进入战斗阶段且有实体
            expect(procMgr.currentProcedure).toBeInstanceOf(BattleProcedure);
            const playerEntitiesDuringBattle = entityMgr.getEntitiesByGroup('player_chess');
            const enemyEntitiesDuringBattle = entityMgr.getEntitiesByGroup('enemy_chess');
            expect(
                playerEntitiesDuringBattle.length + enemyEntitiesDuringBattle.length,
            ).toBeGreaterThan(0);

            // 驱动战斗到结束
            for (let i = 0; i < 500; i++) {
                GameModule.update(0.1);
                if (!(procMgr.currentProcedure instanceof BattleProcedure)) {
                    break;
                }
            }
            jest.advanceTimersByTime(200);
            jest.advanceTimersByTime(200);

            // 战斗结束后，BattleProcedure.onLeave 应已清理所有实体
            const playerEntitiesAfter = entityMgr.getEntitiesByGroup('player_chess');
            const enemyEntitiesAfter = entityMgr.getEntitiesByGroup('enemy_chess');
            expect(playerEntitiesAfter.length).toBe(0);
            expect(enemyEntitiesAfter.length).toBe(0);
        });
    });

    // ═══════════════════════════════════════════════════
    // 场景 4：羁绊激活集成测试
    // ═══════════════════════════════════════════════════

    describe('羁绊激活', () => {
        it('放置 2 个 warrior 棋子触发 warrior 羁绊，ATK+20%', () => {
            demo.startAndFlush();
            const procMgr = GameModule.getModule<ProcedureManager>('ProcedureManager');

            // 给足金币
            demo.gameData.gold = 1000;

            // 创建 warrior 配置——使用"剑士"和"狂战"
            const swordConfig = new ChessPieceConfigRow();
            swordConfig.parseRow({
                id: 1,
                name: '剑士',
                race: 'warrior',
                hp: 600,
                atk: 50,
                atkSpeed: 1.0,
                range: 1,
                cost: 1,
                star2Mult: 2.0,
            });
            const berserkerConfig = new ChessPieceConfigRow();
            berserkerConfig.parseRow({
                id: 6,
                name: '狂战',
                race: 'warrior',
                hp: 550,
                atk: 65,
                atkSpeed: 0.9,
                range: 1,
                cost: 2,
                star2Mult: 2.0,
            });

            const prepareProcedure = procMgr.currentProcedure as PrepareProcedure;

            // 购买 2 个 warrior（threshold 在 PreloadProcedure 配置中是 2）
            demo.shopSystem.unlockShop();
            demo.shopSystem.refreshShop([swordConfig]);
            prepareProcedure.handleBuyPiece(0);
            const piece1 = demo.gameData.benchPieces[demo.gameData.benchPieces.length - 1];

            demo.shopSystem.unlockShop();
            demo.shopSystem.refreshShop([berserkerConfig]);
            prepareProcedure.handleBuyPiece(0);
            const piece2 = demo.gameData.benchPieces[demo.gameData.benchPieces.length - 1];

            // 放置到棋盘
            prepareProcedure.handlePlacePiece(piece1.id, 0, 0);
            prepareProcedure.handlePlacePiece(piece2.id, 0, 1);

            // 羁绊应被计算（handlePlacePiece 内部调用 _recalculateSynergies）
            const activeSynergies = demo.gameData.activeSynergies;
            const warriorSynergy = activeSynergies.find((s) => s.race === 'warrior' && s.isActive);
            expect(warriorSynergy).toBeDefined();
            expect(warriorSynergy!.effect).toBe('atk_boost');
            expect(warriorSynergy!.value).toBe(20);
        });

        it('warrior 羁绊 applySynergyBuffs 后 ATK 实际提升 20%', () => {
            demo.startAndFlush();
            const dtMgr = GameModule.getModule<DataTableManager>('DataTableManager');

            // 直接创建 warrior 棋子并放到 gameData
            const config: IChessPieceConfig = {
                id: 1,
                name: '剑士',
                race: 'warrior',
                hp: 600,
                atk: 50,
                atkSpeed: 1.0,
                range: 1,
                cost: 1,
                star2Mult: 2.0,
            };
            const p1 = demo.gameData.createPieceState(config, 1, 'player');
            const p2 = demo.gameData.createPieceState(
                { ...config, id: 6, name: '狂战', atk: 65 },
                1,
                'player',
            );

            const baseAtk1 = p1.atk; // 50
            const baseAtk2 = p2.atk; // 65

            // 获取羁绊配置
            const synergyConfigs = [...dtMgr.getAllRows<SynergyConfigRow>('synergy_config')];

            // 计算羁绊
            const synergies = demo.synergySystem.calculateSynergies([p1, p2], synergyConfigs);
            const warriorSynergy = synergies.find((s) => s.race === 'warrior');
            expect(warriorSynergy?.isActive).toBe(true);

            // 应用 buff
            demo.synergySystem.applySynergyBuffs([p1, p2], synergies);

            // 验证 ATK +20%
            expect(p1.atk).toBe(baseAtk1 + Math.floor((baseAtk1 * 20) / 100));
            expect(p2.atk).toBe(baseAtk2 + Math.floor((baseAtk2 * 20) / 100));
        });
    });

    // ═══════════════════════════════════════════════════
    // 场景 5：Game Over 测试
    // ═══════════════════════════════════════════════════

    describe('Game Over', () => {
        it('HP <= 0 时切换到 GameOverProcedure，reset 后可重新开始', () => {
            demo.startAndFlush();
            const procMgr = GameModule.getModule<ProcedureManager>('ProcedureManager');
            // 记录 GAME_OVER 事件
            const eventMgrGO = GameModule.getModule<EventManager>('EventManager');
            const gameOverSpy = jest.fn();
            eventMgrGO.on(AutoChessEvents.GAME_OVER, gameOverSpy);

            // 将 HP 设为很低，让失败结算后 HP 归零
            demo.gameData.hp = 1;

            // 完成准备阶段
            const prepareProcedure = procMgr.currentProcedure as PrepareProcedure;
            prepareProcedure.onPrepareComplete();
            jest.advanceTimersByTime(200);

            // 强制让所有玩家棋子死亡以确保失败
            for (const piece of demo.gameData.allPieces.values()) {
                if (piece.side === 'player') {
                    piece.isAlive = false;
                    piece.hp = 0;
                }
            }

            // 驱动战斗结束
            for (let i = 0; i < 500; i++) {
                GameModule.update(0.1);
                if (!(procMgr.currentProcedure instanceof BattleProcedure)) {
                    break;
                }
            }
            jest.advanceTimersByTime(200);
            jest.advanceTimersByTime(200);

            // 验证切换到 GameOverProcedure
            expect(procMgr.currentProcedure).toBeInstanceOf(GameOverProcedure);

            // 验证 GAME_OVER 事件被触发
            expect(gameOverSpy).toHaveBeenCalled();

            // 调用 restart 重新开始
            const gameOverProcedure = procMgr.currentProcedure as GameOverProcedure;
            gameOverProcedure.restart();
            jest.advanceTimersByTime(200);
            jest.advanceTimersByTime(200);

            // 验证 reset 后数据恢复初始值
            expect(demo.gameData.hp).toBe(INITIAL_HP);
            expect(demo.gameData.gold).toBe(INITIAL_GOLD); // reset 后 Prepare 不再加收入

            // 验证进入 PrepareProcedure
            expect(procMgr.currentProcedure).toBeInstanceOf(PrepareProcedure);
        });
    });

    // ═══════════════════════════════════════════════════
    // 场景 6：Entity 峰值测试
    // ═══════════════════════════════════════════════════

    describe('Entity 峰值', () => {
        it('16 个棋子实体（8 player + 8 enemy）无泄漏，战斗后全部回收', () => {
            demo.startAndFlush();
            const procMgr = GameModule.getModule<ProcedureManager>('ProcedureManager');
            const entityMgr = GameModule.getModule<EntityManager>('EntityManager');

            // 给足金币
            demo.gameData.gold = 10000;

            // 使用远程棋子（range=3 跨半场攻击），高 ATK 确保快速击杀
            const config: IChessPieceConfig = {
                id: 1,
                name: '弓箭手',
                race: 'ranger',
                hp: 100,
                atk: 2000,
                atkSpeed: 0.1,
                range: 3,
                cost: 1,
                star2Mult: 2.0,
            };

            // 用不同名称创建 8 个棋子（避免合成触发）
            const pieceNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
            const positions = [
                [0, 0],
                [0, 1],
                [0, 2],
                [0, 3],
                [1, 0],
                [1, 1],
                [1, 2],
                [1, 3],
            ];
            for (let i = 0; i < 8; i++) {
                const piece = demo.gameData.createPieceState(
                    { ...config, id: 100 + i, name: pieceNames[i] },
                    1,
                    'player',
                );
                piece.position = { row: positions[i][0], col: positions[i][1] };
                demo.boardSystem.placePiece(piece.id, positions[i][0], positions[i][1]);
                demo.gameData.boardPieces.set(`${positions[i][0]},${positions[i][1]}`, piece.id);
            }

            // 完成准备阶段 → 进入战斗
            const prepareProcedure = procMgr.currentProcedure as PrepareProcedure;
            prepareProcedure.onPrepareComplete();
            jest.advanceTimersByTime(100);

            // 驱动战斗结束：直接调用 GameModule.update
            for (let i = 0; i < 500; i++) {
                GameModule.update(0.1);
                if (!(procMgr.currentProcedure instanceof BattleProcedure)) {
                    break;
                }
            }
            jest.advanceTimersByTime(200);
            jest.advanceTimersByTime(200);

            // 确认战斗已结束
            expect(procMgr.currentProcedure).not.toBeInstanceOf(BattleProcedure);

            // 战斗结束后所有实体应已回收
            const playerEntitiesAfter = entityMgr.getEntitiesByGroup('player_chess');
            const enemyEntitiesAfter = entityMgr.getEntitiesByGroup('enemy_chess');
            expect(playerEntitiesAfter.length).toBe(0);
            expect(enemyEntitiesAfter.length).toBe(0);
        });
    });
});

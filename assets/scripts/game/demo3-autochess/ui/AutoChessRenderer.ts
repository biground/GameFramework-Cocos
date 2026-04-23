/**
 * Auto-chess Lite Demo — HTML 渲染器
 *
 * 封装 HtmlRenderer，提供自走棋专用的棋盘、商店、状态面板、按钮组渲染。
 * 使用 updateLog 原地更新高频内容（棋盘、商店），避免日志爆炸。
 * @module
 */

import { HtmlRenderer, LOG_COLORS, StatusPanel } from '../../shared/HtmlRenderer';
import { BOARD_ROWS, BOARD_COLS } from '../AutoChessDefs';
import {
    ChessPieceRuntimeState,
    ShopSlot,
    ActiveSynergy,
    AutoChessGameData,
} from '../data/AutoChessGameData';

/** 准备阶段按钮回调 */
export interface PrepareButtonCallbacks {
    onBuy: (slotIndex: number) => void;
    onPlace: (row: number, col: number) => void;
    onRefresh: () => void;
    onReady: () => void;
    onLock: () => void;
}

/** 战斗阶段按钮回调 */
export interface BattleButtonCallbacks {
    onSpeedUp: (scale: number) => void;
}

/**
 * 自走棋专用 HTML 渲染器
 *
 * 封装 HtmlRenderer，提供：
 * - renderBoard: ASCII 4×4 棋盘（原地更新）
 * - renderShop: 商店槽位展示（原地更新）
 * - renderStatus: HP/金币/回合/羁绊 状态面板
 * - renderBenchPieces: 备战席棋子列表（原地更新）
 * - setupPrepareButtons / setupBattleButtons / clearButtons
 */
export class AutoChessRenderer {
    private readonly _renderer: HtmlRenderer;
    private _statusPanel: StatusPanel | null = null;
    private _synergyPanel: StatusPanel | null = null;

    /**
     * @param renderer HtmlRenderer 实例
     */
    constructor(renderer: HtmlRenderer) {
        this._renderer = renderer;
    }

    /**
     * 渲染 4×4 ASCII 棋盘（原地更新）
     *
     * @param boardPieces 棋盘棋子映射 'row,col' → pieceId
     * @param allPieces 全局棋子注册表 pieceId → 运行时状态
     * @param round 当前回合数
     */
    renderBoard(
        boardPieces: Map<string, number>,
        allPieces: Map<number, ChessPieceRuntimeState>,
        round: number,
    ): void {
        const lines: string[] = [];
        lines.push(`=== 战斗棋盘 (Round ${round}) ===`);
        lines.push('      1    2    3    4');

        // 从上到下渲染（行 3 → 0，高行号在上）
        for (let r = BOARD_ROWS - 1; r >= 0; r--) {
            // 顶部边框
            if (r === BOARD_ROWS - 1) {
                lines.push('    ┌────┬────┬────┬────┐');
            } else {
                lines.push('    ├────┼────┼────┼────┤');
            }

            // 格子内容行
            let row = '    │';
            for (let c = 0; c < BOARD_COLS; c++) {
                const cell = this._formatCell(boardPieces, allPieces, r, c);
                row += cell + '│';
            }
            row += ` ${r + 1}`;
            lines.push(row);
        }
        // 底部边框
        lines.push('    └────┴────┴────┴────┘');

        this._renderer.updateLog('board', lines.join('\n'), LOG_COLORS.INFO);
    }

    /**
     * 渲染商店面板（原地更新）
     *
     * @param slots 商店槽位数组
     */
    renderShop(slots: ShopSlot[]): void {
        const lines: string[] = ['=== 商店 ==='];
        slots.forEach((slot, i) => {
            if (slot.sold) {
                lines.push(`  [${i + 1}] 已售`);
            } else if (!slot.config) {
                lines.push(`  [${i + 1}] 空`);
            } else {
                const c = slot.config;
                lines.push(`  [${i + 1}] ${c.name} (${c.race}) - ${c.cost}金`);
            }
        });

        this._renderer.updateLog('shop', lines.join('\n'), LOG_COLORS.WARNING);
    }

    /**
     * 渲染状态面板：HP、金币、回合、已激活羁绊
     *
     * @param gameData 游戏运行时数据
     * @param synergies 已激活羁绊列表
     */
    renderStatus(gameData: AutoChessGameData, synergies: ActiveSynergy[]): void {
        // 创建或复用状态面板
        if (!this._statusPanel) {
            this._statusPanel = this._renderer.createStatusPanel('ace-status', '游戏状态');
        }
        this._statusPanel.update('生命', `${gameData.hp}`);
        this._statusPanel.update('金币', `${gameData.gold}`);
        this._statusPanel.update('回合', `${gameData.round}`);

        // 羁绊面板
        if (!this._synergyPanel) {
            this._synergyPanel = this._renderer.createStatusPanel('ace-synergy', '羁绊');
        }
        if (synergies.length === 0) {
            this._synergyPanel.update('状态', '无');
        } else {
            synergies.forEach((s) => {
                const mark = s.isActive ? '✓' : '✗';
                this._synergyPanel!.update(s.race, `${mark} ${s.count}/${s.threshold} ${s.effect}`);
            });
        }
    }

    /**
     * 渲染备战席棋子列表（原地更新）
     *
     * @param bench 备战席棋子数组
     */
    renderBenchPieces(bench: ChessPieceRuntimeState[]): void {
        const lines: string[] = ['=== 备战席 ==='];
        if (bench.length === 0) {
            lines.push('  (空)');
        } else {
            bench.forEach((p, i) => {
                const starMark = p.star >= 2 ? '★' : '☆';
                lines.push(`  [${i + 1}] ${p.name} ${starMark} HP:${p.hp}/${p.maxHp} ATK:${p.atk}`);
            });
        }
        this._renderer.updateLog('bench', lines.join('\n'), LOG_COLORS.DEBUG);
    }

    /**
     * 创建准备阶段按钮组
     *
     * @param callbacks 按钮回调集合
     */
    setupPrepareButtons(callbacks: PrepareButtonCallbacks): void {
        this._renderer.clearButtons();

        // 商店操作组
        const shopGroup = this._renderer.createButtonGroup('商店操作');
        // 购买按钮（5 个槽位）
        for (let i = 0; i < 5; i++) {
            this._renderer.addButton(shopGroup, `购买#${i + 1}`, () => callbacks.onBuy(i));
        }
        this._renderer.addButton(shopGroup, '刷新商店', () => callbacks.onRefresh());
        this._renderer.addButton(shopGroup, '锁定商店', () => callbacks.onLock());

        // 布阵操作组
        const placeGroup = this._renderer.createButtonGroup('布阵操作');
        // 提供 2×4 玩家区域的放置按钮
        for (let r = 0; r < 2; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                this._renderer.addButton(placeGroup, `放(${r + 1},${c + 1})`, () =>
                    callbacks.onPlace(r, c),
                );
            }
        }

        // 准备完成
        const readyGroup = this._renderer.createButtonGroup('就绪');
        this._renderer.addButton(readyGroup, '准备完成', () => callbacks.onReady());
    }

    /**
     * 创建战斗阶段按钮组
     *
     * @param callbacks 按钮回调集合
     */
    setupBattleButtons(callbacks: BattleButtonCallbacks): void {
        this._renderer.clearButtons();

        const group = this._renderer.createButtonGroup('战斗控制');
        this._renderer.addButton(group, '1× 速度', () => callbacks.onSpeedUp(1));
        this._renderer.addButton(group, '2× 加速', () => callbacks.onSpeedUp(2));
        this._renderer.addButton(group, '4× 加速', () => callbacks.onSpeedUp(4));
    }

    /**
     * 清空所有按钮
     */
    clearButtons(): void {
        this._renderer.clearButtons();
    }

    /**
     * 格式化单个棋盘格子
     *
     * @param boardPieces 棋盘映射
     * @param allPieces 棋子注册表
     * @param row 行号
     * @param col 列号
     * @returns 4 字符宽的格子内容
     */
    private _formatCell(
        boardPieces: Map<string, number>,
        allPieces: Map<number, ChessPieceRuntimeState>,
        row: number,
        col: number,
    ): string {
        const key = `${row},${col}`;
        const pieceId = boardPieces.get(key);

        if (pieceId === undefined) {
            return '    '; // 4 空格
        }

        const piece = allPieces.get(pieceId);
        if (!piece) {
            return '    ';
        }

        // 前缀：P = player，E = enemy
        const prefix = piece.side === 'player' ? 'P' : 'E';
        // 星级标记
        const starMark = piece.star >= 2 ? '★' : '';
        // 格子内容：如 P1★ 或 E2
        const label = `${prefix}${piece.id}${starMark}`;

        // 补齐到 4 字符宽
        return label.padEnd(4, ' ');
    }
}

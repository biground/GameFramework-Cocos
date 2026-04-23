/**
 * 棋盘系统 — 管理 4×4 网格棋盘
 *
 * 负责棋子的放置、移除、移动、查询、寻敌等操作。
 * 内部维护二维数组 _grid，存储 pieceId 或 null。
 * @module
 */

import { BOARD_ROWS, BOARD_COLS, PLAYER_ROWS, ENEMY_ROWS, IGridPosition } from '../AutoChessDefs';
import { Logger } from '../../../framework/debug/Logger';

export class BoardSystem {
    private static readonly TAG = 'BoardSystem';

    /** 4×4 网格，存储 pieceId 或 null */
    private _grid: (number | null)[][];

    constructor() {
        this._grid = this._createEmptyGrid();
    }

    // ─── 公开方法 ─────────────────────────────────────

    /**
     * 放置棋子到指定格子
     * @param pieceId 棋子 ID
     * @param row 行号
     * @param col 列号
     * @returns 成功返回 true，格子已占用或越界返回 false
     */
    placePiece(pieceId: number, row: number, col: number): boolean {
        if (!this.isValidPosition(row, col)) {
            Logger.warn(BoardSystem.TAG, `放置失败：坐标越界 (${row}, ${col})`);
            return false;
        }
        if (this._grid[row][col] !== null) {
            Logger.warn(
                BoardSystem.TAG,
                `放置失败：格子 (${row}, ${col}) 已被棋子 ${this._grid[row][col]} 占用`,
            );
            return false;
        }
        this._grid[row][col] = pieceId;
        Logger.debug(BoardSystem.TAG, `棋子 ${pieceId} 放置到 (${row}, ${col})`);
        return true;
    }

    /**
     * 移除指定格子的棋子
     * @param row 行号
     * @param col 列号
     * @returns 移除的 pieceId，空格或越界返回 null
     */
    removePiece(row: number, col: number): number | null {
        if (!this.isValidPosition(row, col)) {
            return null;
        }
        const pieceId = this._grid[row][col];
        if (pieceId === null) {
            return null;
        }
        this._grid[row][col] = null;
        Logger.debug(BoardSystem.TAG, `棋子 ${pieceId} 从 (${row}, ${col}) 移除`);
        return pieceId;
    }

    /**
     * 移动棋子从一格到另一格
     * @returns 成功返回 true，源格为空/目标已占用/越界返回 false
     */
    movePiece(fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
        if (!this.isValidPosition(fromRow, fromCol) || !this.isValidPosition(toRow, toCol)) {
            Logger.warn(BoardSystem.TAG, `移动失败：坐标越界`);
            return false;
        }
        const pieceId = this._grid[fromRow][fromCol];
        if (pieceId === null) {
            Logger.warn(BoardSystem.TAG, `移动失败：源格 (${fromRow}, ${fromCol}) 为空`);
            return false;
        }
        if (this._grid[toRow][toCol] !== null) {
            Logger.warn(BoardSystem.TAG, `移动失败：目标格 (${toRow}, ${toCol}) 已占用`);
            return false;
        }
        this._grid[fromRow][fromCol] = null;
        this._grid[toRow][toCol] = pieceId;
        Logger.debug(
            BoardSystem.TAG,
            `棋子 ${pieceId} 从 (${fromRow}, ${fromCol}) 移动到 (${toRow}, ${toCol})`,
        );
        return true;
    }

    /**
     * 查询指定格子的棋子 ID
     * @returns pieceId 或 null
     */
    getPieceAt(row: number, col: number): number | null {
        if (!this.isValidPosition(row, col)) {
            return null;
        }
        return this._grid[row][col];
    }

    /**
     * 在敌方区域寻找距离最近的敌方棋子位置（曼哈顿距离）
     * @param pos 当前位置
     * @param isPlayerSide true 表示查找敌方（row 2-3），false 表示查找玩家方（row 0-1）
     * @returns 最近敌方棋子的坐标，无敌方棋子返回 null
     */
    findNearestEnemy(pos: IGridPosition, isPlayerSide: boolean): IGridPosition | null {
        const targetRows = isPlayerSide ? ENEMY_ROWS : PLAYER_ROWS;
        let nearest: IGridPosition | null = null;
        let minDist = Infinity;

        for (const row of targetRows) {
            for (let col = 0; col < BOARD_COLS; col++) {
                if (this._grid[row][col] !== null) {
                    const dist = this.getDistance(pos, { row, col });
                    if (dist < minDist) {
                        minDist = dist;
                        nearest = { row, col };
                    }
                }
            }
        }
        return nearest;
    }

    /**
     * 计算两点曼哈顿距离
     */
    getDistance(a: IGridPosition, b: IGridPosition): number {
        return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
    }

    /**
     * 判断目标是否在攻击范围内
     */
    isInRange(attacker: IGridPosition, target: IGridPosition, range: number): boolean {
        return this.getDistance(attacker, target) <= range;
    }

    /**
     * 清空棋盘
     */
    clearBoard(): void {
        this._grid = this._createEmptyGrid();
        Logger.debug(BoardSystem.TAG, '棋盘已清空');
    }

    /**
     * 获取所有已占用的格子
     */
    getOccupiedCells(): { row: number; col: number; pieceId: number }[] {
        const result: { row: number; col: number; pieceId: number }[] = [];
        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                const pid = this._grid[r][c];
                if (pid !== null) {
                    result.push({ row: r, col: c, pieceId: pid });
                }
            }
        }
        return result;
    }

    /**
     * 判断坐标是否在棋盘范围内
     */
    isValidPosition(row: number, col: number): boolean {
        return row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS;
    }

    // ─── 私有方法 ─────────────────────────────────────

    /** 创建空网格 */
    private _createEmptyGrid(): (number | null)[][] {
        const grid: (number | null)[][] = [];
        for (let r = 0; r < BOARD_ROWS; r++) {
            grid.push(new Array<number | null>(BOARD_COLS).fill(null));
        }
        return grid;
    }
}

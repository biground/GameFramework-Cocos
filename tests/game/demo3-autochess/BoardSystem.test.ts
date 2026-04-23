/**
 * BoardSystem 单元测试
 * 覆盖：放置/移除/移动/查询/寻敌/距离计算/范围判断/清空/越界
 */
import { BoardSystem } from '@game/demo3-autochess/systems/BoardSystem';
import { BOARD_ROWS, BOARD_COLS } from '@game/demo3-autochess/AutoChessDefs';

describe('BoardSystem', () => {
    let board: BoardSystem;

    beforeEach(() => {
        board = new BoardSystem();
    });

    // ─── 构造与初始状态 ───────────────────────────────
    describe('初始状态', () => {
        it('新建棋盘所有格子为空', () => {
            for (let r = 0; r < BOARD_ROWS; r++) {
                for (let c = 0; c < BOARD_COLS; c++) {
                    expect(board.getPieceAt(r, c)).toBeNull();
                }
            }
        });

        it('新建棋盘无占用格子', () => {
            expect(board.getOccupiedCells()).toHaveLength(0);
        });
    });

    // ─── isValidPosition ─────────────────────────────
    describe('isValidPosition', () => {
        it('合法坐标返回 true', () => {
            expect(board.isValidPosition(0, 0)).toBe(true);
            expect(board.isValidPosition(3, 3)).toBe(true);
            expect(board.isValidPosition(2, 1)).toBe(true);
        });

        it('行越界返回 false', () => {
            expect(board.isValidPosition(-1, 0)).toBe(false);
            expect(board.isValidPosition(BOARD_ROWS, 0)).toBe(false);
        });

        it('列越界返回 false', () => {
            expect(board.isValidPosition(0, -1)).toBe(false);
            expect(board.isValidPosition(0, BOARD_COLS)).toBe(false);
        });
    });

    // ─── placePiece ──────────────────────────────────
    describe('placePiece', () => {
        it('放置到空格返回 true 且可查询', () => {
            expect(board.placePiece(1, 0, 0)).toBe(true);
            expect(board.getPieceAt(0, 0)).toBe(1);
        });

        it('放置到已占用格子返回 false', () => {
            board.placePiece(1, 0, 0);
            expect(board.placePiece(2, 0, 0)).toBe(false);
            // 原始棋子不变
            expect(board.getPieceAt(0, 0)).toBe(1);
        });

        it('越界坐标返回 false', () => {
            expect(board.placePiece(1, -1, 0)).toBe(false);
            expect(board.placePiece(1, 0, BOARD_COLS)).toBe(false);
            expect(board.placePiece(1, BOARD_ROWS, 0)).toBe(false);
        });

        it('可在不同格子放置多个棋子', () => {
            board.placePiece(10, 0, 0);
            board.placePiece(20, 1, 1);
            board.placePiece(30, 3, 3);
            expect(board.getPieceAt(0, 0)).toBe(10);
            expect(board.getPieceAt(1, 1)).toBe(20);
            expect(board.getPieceAt(3, 3)).toBe(30);
        });
    });

    // ─── removePiece ─────────────────────────────────
    describe('removePiece', () => {
        it('移除存在的棋子返回 pieceId', () => {
            board.placePiece(5, 2, 3);
            expect(board.removePiece(2, 3)).toBe(5);
            expect(board.getPieceAt(2, 3)).toBeNull();
        });

        it('移除空格返回 null', () => {
            expect(board.removePiece(0, 0)).toBeNull();
        });

        it('越界坐标返回 null', () => {
            expect(board.removePiece(-1, 0)).toBeNull();
            expect(board.removePiece(0, BOARD_COLS)).toBeNull();
        });
    });

    // ─── movePiece ───────────────────────────────────
    describe('movePiece', () => {
        it('移动棋子到空格返回 true', () => {
            board.placePiece(7, 0, 0);
            expect(board.movePiece(0, 0, 1, 1)).toBe(true);
            expect(board.getPieceAt(0, 0)).toBeNull();
            expect(board.getPieceAt(1, 1)).toBe(7);
        });

        it('源格子为空返回 false', () => {
            expect(board.movePiece(0, 0, 1, 1)).toBe(false);
        });

        it('目标格子已占用返回 false', () => {
            board.placePiece(1, 0, 0);
            board.placePiece(2, 1, 1);
            expect(board.movePiece(0, 0, 1, 1)).toBe(false);
            // 两个棋子位置不变
            expect(board.getPieceAt(0, 0)).toBe(1);
            expect(board.getPieceAt(1, 1)).toBe(2);
        });

        it('源/目标越界返回 false', () => {
            board.placePiece(1, 0, 0);
            expect(board.movePiece(0, 0, -1, 0)).toBe(false);
            expect(board.movePiece(-1, 0, 0, 0)).toBe(false);
        });
    });

    // ─── getDistance ──────────────────────────────────
    describe('getDistance', () => {
        it('计算曼哈顿距离', () => {
            expect(board.getDistance({ row: 0, col: 0 }, { row: 3, col: 3 })).toBe(6);
            expect(board.getDistance({ row: 1, col: 2 }, { row: 3, col: 0 })).toBe(4);
            expect(board.getDistance({ row: 0, col: 0 }, { row: 0, col: 0 })).toBe(0);
        });
    });

    // ─── isInRange ───────────────────────────────────
    describe('isInRange', () => {
        it('距离 <= range 返回 true', () => {
            expect(board.isInRange({ row: 0, col: 0 }, { row: 0, col: 1 }, 1)).toBe(true);
            expect(board.isInRange({ row: 0, col: 0 }, { row: 1, col: 1 }, 2)).toBe(true);
        });

        it('距离 > range 返回 false', () => {
            expect(board.isInRange({ row: 0, col: 0 }, { row: 3, col: 3 }, 2)).toBe(false);
        });

        it('同一位置距离为 0，range=0 返回 true', () => {
            expect(board.isInRange({ row: 1, col: 1 }, { row: 1, col: 1 }, 0)).toBe(true);
        });
    });

    // ─── findNearestEnemy ────────────────────────────
    describe('findNearestEnemy', () => {
        it('玩家方查找敌方区域（row 2-3）最近棋子', () => {
            // 玩家棋子在 (0,0)
            board.placePiece(1, 0, 0);
            // 敌方棋子在 (2,0) 和 (3,3)
            board.placePiece(100, 2, 0);
            board.placePiece(101, 3, 3);

            const nearest = board.findNearestEnemy({ row: 0, col: 0 }, true);
            // (2,0) 距离 2，(3,3) 距离 6 → 最近是 (2,0)
            expect(nearest).toEqual({ row: 2, col: 0 });
        });

        it('敌方查找玩家区域（row 0-1）最近棋子', () => {
            // 敌方棋子在 (3,3)
            board.placePiece(100, 3, 3);
            // 玩家棋子在 (0,0) 和 (1,2)
            board.placePiece(1, 0, 0);
            board.placePiece(2, 1, 2);

            const nearest = board.findNearestEnemy({ row: 3, col: 3 }, false);
            // (0,0) 距离 6，(1,2) 距离 3 → 最近是 (1,2)
            expect(nearest).toEqual({ row: 1, col: 2 });
        });

        it('敌方区域无棋子返回 null', () => {
            board.placePiece(1, 0, 0);
            const nearest = board.findNearestEnemy({ row: 0, col: 0 }, true);
            expect(nearest).toBeNull();
        });
    });

    // ─── clearBoard ──────────────────────────────────
    describe('clearBoard', () => {
        it('清空后所有格子为空', () => {
            board.placePiece(1, 0, 0);
            board.placePiece(2, 1, 1);
            board.placePiece(3, 3, 3);
            board.clearBoard();

            for (let r = 0; r < BOARD_ROWS; r++) {
                for (let c = 0; c < BOARD_COLS; c++) {
                    expect(board.getPieceAt(r, c)).toBeNull();
                }
            }
        });

        it('清空后 occupiedCells 为空', () => {
            board.placePiece(1, 0, 0);
            board.clearBoard();
            expect(board.getOccupiedCells()).toHaveLength(0);
        });
    });

    // ─── getOccupiedCells ────────────────────────────
    describe('getOccupiedCells', () => {
        it('返回所有已占用格子', () => {
            board.placePiece(10, 0, 0);
            board.placePiece(20, 2, 3);
            const cells = board.getOccupiedCells();
            expect(cells).toHaveLength(2);
            expect(cells).toEqual(
                expect.arrayContaining([
                    { row: 0, col: 0, pieceId: 10 },
                    { row: 2, col: 3, pieceId: 20 },
                ]),
            );
        });
    });
});

import { EventKey } from '@framework/event/EventDefs';
import {
    AutoChessEvents,
    BOARD_ROWS,
    BOARD_COLS,
    PLAYER_ROWS,
    ENEMY_ROWS,
    INITIAL_HP,
    INITIAL_GOLD,
    BASE_INCOME,
    REFRESH_COST,
    PREPARE_TIME_SECONDS,
    SHOP_SIZE,
    MAX_BENCH_SIZE,
    ChessAiStateNames,
    GamePhaseStateNames,
    GAME_PHASE_FSM_NAME,
    CHESS_AI_FSM_PREFIX,
} from '@game/demo3-autochess/AutoChessDefs';
import type {
    IGridPosition,
    IChessPieceShowData,
    IBoardCell,
} from '@game/demo3-autochess/AutoChessDefs';

// ─── EventKey 测试 ─────────────────────────────────────

describe('AutoChessEvents', () => {
    const entries = Object.entries(AutoChessEvents);

    it('所有事件键应为 EventKey 实例', () => {
        for (const [, key] of entries) {
            expect(key).toBeInstanceOf(EventKey);
        }
    });

    it('所有事件键 description 应包含 "ace:" 前缀', () => {
        for (const [, key] of entries) {
            expect((key as unknown as EventKey).description).toMatch(/^ace:/);
        }
    });

    it('应包含 15 个事件键', () => {
        expect(entries).toHaveLength(15);
    });

    it.each([
        ['CHESS_BOUGHT', 'ace:chess_bought'],
        ['CHESS_PLACED', 'ace:chess_placed'],
        ['CHESS_MERGED', 'ace:chess_merged'],
        ['CHESS_ATTACK', 'ace:chess_attack'],
        ['CHESS_KILLED', 'ace:chess_killed'],
        ['ROUND_START', 'ace:round_start'],
        ['ROUND_END', 'ace:round_end'],
        ['PHASE_CHANGED', 'ace:phase_changed'],
        ['SYNERGY_ACTIVATED', 'ace:synergy_activated'],
        ['SHOP_REFRESHED', 'ace:shop_refreshed'],
        ['HP_CHANGED', 'ace:hp_changed'],
        ['GOLD_CHANGED', 'ace:gold_changed'],
        ['GAME_OVER', 'ace:game_over'],
        ['BATTLE_START', 'ace:battle_start'],
        ['BATTLE_END', 'ace:battle_end'],
    ])('%s 的 description 应为 "%s"', (name, expected) => {
        const key = AutoChessEvents[name as keyof typeof AutoChessEvents];
        expect(key).toBeDefined();
        expect((key as unknown as EventKey).description).toBe(expected);
    });
});

// ─── 常量测试 ──────────────────────────────────────────

describe('自走棋常量', () => {
    it('棋盘尺寸应为 4×4', () => {
        expect(BOARD_ROWS).toBe(4);
        expect(BOARD_COLS).toBe(4);
    });

    it('玩家行为 [0,1]，敌方行为 [2,3]', () => {
        expect(PLAYER_ROWS).toEqual([0, 1]);
        expect(ENEMY_ROWS).toEqual([2, 3]);
    });

    it('初始 HP=100, 初始金币=10, 基础收入=5', () => {
        expect(INITIAL_HP).toBe(100);
        expect(INITIAL_GOLD).toBe(10);
        expect(BASE_INCOME).toBe(5);
    });

    it('刷新费用=2, 准备时间=30s', () => {
        expect(REFRESH_COST).toBe(2);
        expect(PREPARE_TIME_SECONDS).toBe(30);
    });

    it('商店大小=5, 备战席上限=8', () => {
        expect(SHOP_SIZE).toBe(5);
        expect(MAX_BENCH_SIZE).toBe(8);
    });
});

// ─── 接口类型测试（编译期+运行时构造） ──────────────────

describe('接口类型', () => {
    it('IGridPosition 对象可正确构造', () => {
        const pos: IGridPosition = { row: 2, col: 3 };
        expect(pos.row).toBe(2);
        expect(pos.col).toBe(3);
    });

    it('IChessPieceShowData 对象可正确构造', () => {
        const data: IChessPieceShowData = {
            configId: 1,
            name: '战士',
            race: 'warrior',
            hp: 100,
            atk: 20,
            atkSpeed: 1.0,
            range: 1,
            star: 1,
            position: { row: 0, col: 0 },
        };
        expect(data.configId).toBe(1);
        expect(data.name).toBe('战士');
        expect(data.race).toBe('warrior');
        expect(data.hp).toBe(100);
        expect(data.atk).toBe(20);
        expect(data.atkSpeed).toBe(1.0);
        expect(data.range).toBe(1);
        expect(data.star).toBe(1);
        expect(data.position).toEqual({ row: 0, col: 0 });
    });

    it('IBoardCell 对象可正确构造（有棋子和无棋子）', () => {
        const empty: IBoardCell = { pieceId: null, row: 0, col: 0 };
        expect(empty.pieceId).toBeNull();

        const occupied: IBoardCell = { pieceId: 42, row: 1, col: 2 };
        expect(occupied.pieceId).toBe(42);
    });
});

// ─── FSM 状态名常量测试 ────────────────────────────────

describe('FSM 状态名常量', () => {
    it('ChessAiStateNames 包含 4 个状态', () => {
        expect(ChessAiStateNames.IDLE).toBe('Idle');
        expect(ChessAiStateNames.MOVE_TO).toBe('MoveTo');
        expect(ChessAiStateNames.ATTACK).toBe('Attack');
        expect(ChessAiStateNames.DEAD).toBe('Dead');
        expect(Object.keys(ChessAiStateNames)).toHaveLength(4);
    });

    it('GamePhaseStateNames 包含 3 个状态', () => {
        expect(GamePhaseStateNames.PREPARE).toBe('Prepare');
        expect(GamePhaseStateNames.BATTLE).toBe('Battle');
        expect(GamePhaseStateNames.SETTLE).toBe('Settle');
        expect(Object.keys(GamePhaseStateNames)).toHaveLength(3);
    });

    it('FSM 名称常量定义正确', () => {
        expect(GAME_PHASE_FSM_NAME).toBe('AutoChess_GamePhase');
        expect(CHESS_AI_FSM_PREFIX).toBe('AutoChess_ChessAI_');
    });
});

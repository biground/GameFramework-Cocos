/**
 * Auto-chess 预加载流程 — 注册配置表与实体分组
 *
 * 从 DataTableManager 注册 chess_piece_config 和 synergy_config 两张配置表，
 * 从 EntityManager 注册 player_chess 和 enemy_chess 两个实体分组，
 * 然后切换到 PrepareProcedure。
 * @module
 */

import { ProcedureBase } from '../../../framework/procedure/ProcedureBase';
import { IFsm } from '../../../framework/fsm/FsmDefs';
import { Logger } from '../../../framework/debug/Logger';
import { AutoChessEvents } from '../AutoChessDefs';
import { IAutoChessProcedureContext, AUTO_CHESS_CONTEXT_KEY } from './AutoChessProcedureContext';
import { ChessPieceConfigRow } from '../data/ChessPieceConfigRow';
import { SynergyConfigRow } from '../data/SynergyConfigRow';
import { PrepareProcedure } from './PrepareProcedure';

const TAG = 'PreloadProcedure';

/** 棋子配置原始数据 */
const CHESS_PIECE_RAW_DATA: Partial<ChessPieceConfigRow>[] = [
    {
        id: 1,
        name: '剑士',
        race: 'warrior',
        hp: 600,
        atk: 50,
        atkSpeed: 1.0,
        range: 1,
        cost: 1,
        star2Mult: 2.0,
    },
    {
        id: 2,
        name: '法师',
        race: 'mage',
        hp: 400,
        atk: 70,
        atkSpeed: 1.2,
        range: 3,
        cost: 2,
        star2Mult: 2.0,
    },
    {
        id: 3,
        name: '游侠',
        race: 'ranger',
        hp: 500,
        atk: 60,
        atkSpeed: 0.8,
        range: 2,
        cost: 2,
        star2Mult: 2.0,
    },
    {
        id: 4,
        name: '重甲',
        race: 'tank',
        hp: 900,
        atk: 30,
        atkSpeed: 1.5,
        range: 1,
        cost: 3,
        star2Mult: 2.0,
    },
    {
        id: 5,
        name: '火法',
        race: 'mage',
        hp: 350,
        atk: 80,
        atkSpeed: 1.4,
        range: 3,
        cost: 3,
        star2Mult: 2.0,
    },
    {
        id: 6,
        name: '狂战',
        race: 'warrior',
        hp: 550,
        atk: 65,
        atkSpeed: 0.9,
        range: 1,
        cost: 2,
        star2Mult: 2.0,
    },
];

/** 羁绊配置原始数据 */
const SYNERGY_RAW_DATA: Partial<SynergyConfigRow>[] = [
    {
        id: 1,
        race: 'warrior',
        threshold: 2,
        effect: 'atk_boost',
        value: 20,
        desc: '2 战士: 攻击 +20%',
    },
    {
        id: 2,
        race: 'mage',
        threshold: 2,
        effect: 'atk_boost',
        value: 30,
        desc: '2 法师: 攻击 +30%',
    },
    {
        id: 3,
        race: 'ranger',
        threshold: 2,
        effect: 'spd_boost',
        value: 25,
        desc: '2 游侠: 攻速 +25%',
    },
    { id: 4, race: 'tank', threshold: 2, effect: 'hp_boost', value: 30, desc: '2 重甲: 生命 +30%' },
];

/**
 * Auto-chess 预加载流程
 *
 * 注册 2 张配置表（棋子、羁绊）和 2 个实体分组（玩家棋子、敌方棋子），
 * 记录加载进度，然后切换到准备流程。
 */
export class PreloadProcedure extends ProcedureBase {
    /** 进入预加载流程 */
    onEnter(fsm: IFsm<unknown>): void {
        Logger.info(TAG, '进入预加载流程，注册配置表与实体分组...');

        const ctx = this.getContext<IAutoChessProcedureContext>(fsm, AUTO_CHESS_CONTEXT_KEY);

        const dtMgr = ctx.dataTableManager;

        // 注册棋子配置表
        dtMgr.createTableFromRawData<ChessPieceConfigRow>(
            'chess_piece_config',
            CHESS_PIECE_RAW_DATA,
        );
        Logger.info(TAG, `棋子配置表注册完成: ${CHESS_PIECE_RAW_DATA.length} 条`);

        // 注册羁绊配置表
        dtMgr.createTableFromRawData<SynergyConfigRow>('synergy_config', SYNERGY_RAW_DATA);
        Logger.info(TAG, `羁绊配置表注册完成: ${SYNERGY_RAW_DATA.length} 条`);

        // 注册实体分组
        ctx.entityManager.registerGroup('player_chess');
        Logger.info(TAG, '实体分组注册: player_chess');

        ctx.entityManager.registerGroup('enemy_chess');
        Logger.info(TAG, '实体分组注册: enemy_chess');

        Logger.info(TAG, '全部配置加载完成，切换到准备流程');

        ctx.eventManager.emit(AutoChessEvents.PHASE_CHANGED, {
            from: 'Preload',
            to: 'Prepare',
        });

        this.changeProcedure(fsm, PrepareProcedure);
    }
}

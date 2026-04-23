/**
 * 棋子配置表行类型
 * @module
 */

import { IDataRow } from '@framework/datatable/DataTableDefs';

/**
 * 棋子配置行——描述一个棋子的基础属性
 *
 * 对应 DataTable: `chess_piece_config`
 */
export class ChessPieceConfigRow implements IDataRow {
    /** 棋子 ID（主键） */
    readonly id: number = 0;
    /** 棋子名称 */
    name: string = '';
    /** 种族（warrior / mage / ranger / tank） */
    race: string = '';
    /** 生命值 */
    hp: number = 0;
    /** 攻击力 */
    atk: number = 0;
    /** 攻击间隔（秒） */
    atkSpeed: number = 0;
    /** 攻击范围（格数） */
    range: number = 0;
    /** 商店购买价格 */
    cost: number = 0;
    /** ★2 属性倍率 */
    star2Mult: number = 2.0;

    /**
     * 从原始数据填充字段
     * @param data 一行原始数据（键值对）
     */
    parseRow(data: Record<string, unknown>): void {
        (this as { id: number }).id = Number(data['id'] ?? 0);
        this.name = String(data['name'] ?? '');
        this.race = String(data['race'] ?? '');
        this.hp = Number(data['hp'] ?? 0);
        this.atk = Number(data['atk'] ?? 0);
        this.atkSpeed = Number(data['atkSpeed'] ?? 0);
        this.range = Number(data['range'] ?? 0);
        this.cost = Number(data['cost'] ?? 0);
        const mult = data['star2Mult'];
        this.star2Mult = mult !== undefined && mult !== null ? Number(mult) : 2.0;
    }
}

// ─── 静态配置数据（8 个棋子） ─────────────────────────────

/** 棋子配置数据 */
export const CHESS_PIECE_DATA: Record<string, unknown>[] = [
    { id: 1, name: '剑士', race: 'warrior', hp: 100, atk: 20, atkSpeed: 1.0, range: 1, cost: 1 },
    { id: 2, name: '狂战士', race: 'warrior', hp: 120, atk: 25, atkSpeed: 1.2, range: 1, cost: 2 },
    { id: 3, name: '火法师', race: 'mage', hp: 60, atk: 35, atkSpeed: 1.5, range: 3, cost: 2 },
    { id: 4, name: '冰法师', race: 'mage', hp: 70, atk: 30, atkSpeed: 1.4, range: 3, cost: 2 },
    { id: 5, name: '弓箭手', race: 'ranger', hp: 65, atk: 22, atkSpeed: 0.8, range: 3, cost: 1 },
    { id: 6, name: '猎人', race: 'ranger', hp: 75, atk: 28, atkSpeed: 0.7, range: 2, cost: 2 },
    { id: 7, name: '铁盾', race: 'tank', hp: 180, atk: 10, atkSpeed: 1.6, range: 1, cost: 1 },
    { id: 8, name: '石像', race: 'tank', hp: 220, atk: 8, atkSpeed: 2.0, range: 1, cost: 3 },
];

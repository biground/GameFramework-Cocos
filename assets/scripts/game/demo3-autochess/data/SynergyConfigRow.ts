/**
 * 羁绊配置表行类型
 * @module
 */

import { IDataRow } from '@framework/datatable/DataTableDefs';

/**
 * 羁绊配置行——描述一条种族羁绊的触发条件与效果
 *
 * 对应 DataTable: `synergy_config`
 */
export class SynergyConfigRow implements IDataRow {
    /** 羁绊 ID（主键） */
    readonly id: number = 0;
    /** 种族 */
    race: string = '';
    /** 触发所需同族棋子数量 */
    threshold: number = 0;
    /** 效果类型（atk_boost / hp_boost / spd_boost） */
    effect: string = '';
    /** 加成百分比值（如 20 表示 +20%） */
    value: number = 0;
    /** 描述文本 */
    desc: string = '';

    /**
     * 从原始数据填充字段
     * @param data 一行原始数据（键值对）
     */
    parseRow(data: Record<string, unknown>): void {
        (this as { id: number }).id = Number(data['id'] ?? 0);
        this.race = String(data['race'] ?? '');
        this.threshold = Number(data['threshold'] ?? 0);
        this.effect = String(data['effect'] ?? '');
        this.value = Number(data['value'] ?? 0);
        this.desc = String(data['desc'] ?? '');
    }
}

// ─── 静态配置数据（3 条羁绊） ─────────────────────────────

/** 羁绊配置数据 */
export const SYNERGY_DATA: Record<string, unknown>[] = [
    {
        id: 1,
        race: 'warrior',
        threshold: 3,
        effect: 'atk_boost',
        value: 20,
        desc: '战士×3 ATK+20%',
    },
    { id: 2, race: 'mage', threshold: 2, effect: 'hp_boost', value: 30, desc: '法师×2 HP+30%' },
    { id: 3, race: 'ranger', threshold: 3, effect: 'spd_boost', value: 25, desc: '游侠×3 SPD+25%' },
];

/**
 * 关卡配置表行类型
 * @module
 */

import { IDataRow } from '@framework/datatable/DataTableDefs';

/**
 * 关卡配置行——描述一个关卡的怪物组成和限制
 *
 * 对应 DataTable: `stage_config`
 */
export class StageConfigRow implements IDataRow {
    /** 关卡 ID（主键） */
    readonly id: number = 0;
    /** 关卡名称 */
    name: string = '';
    /** 怪物 ID 列表（逗号分隔） */
    monsters: string = '';
    /** 背景音乐资源键 */
    bgm: string = '';
    /** 最大回合数 */
    maxRound: number = 0;

    /**
     * 从原始数据填充字段
     * @param data 一行原始数据（键值对）
     */
    parseRow(data: Record<string, unknown>): void {
        (this as { id: number }).id = Number(data['id'] ?? 0);
        this.name = String(data['name'] ?? '');
        this.monsters = String(data['monsters'] ?? '');
        this.bgm = String(data['bgm'] ?? '');
        this.maxRound = Number(data['maxRound'] ?? 0);
    }
}

// ─── 静态配置数据（3 个关卡） ─────────────────────────────

/** 关卡配置数据 */
export const STAGE_DATA: Record<string, unknown>[] = [
    { id: 1, name: '新手村', monsters: '1,1,2', bgm: 'bgm_village', maxRound: 10 },
    { id: 2, name: '黑暗森林', monsters: '2,3,3,4', bgm: 'bgm_forest', maxRound: 15 },
    { id: 3, name: '火山洞穴', monsters: '4,5,5,6', bgm: 'bgm_volcano', maxRound: 20 },
];

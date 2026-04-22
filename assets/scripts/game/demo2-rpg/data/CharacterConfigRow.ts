/**
 * 角色配置表行类型
 * @module
 */

import { IDataRow } from '@framework/datatable/DataTableDefs';

/**
 * 角色配置行——描述一个角色的基础属性
 *
 * 对应 DataTable: `character_config`
 */
export class CharacterConfigRow implements IDataRow {
    /** 角色 ID（主键） */
    readonly id: number = 0;
    /** 角色名称 */
    name: string = '';
    /** 生命值 */
    hp: number = 0;
    /** 魔法值 */
    mp: number = 0;
    /** 攻击力 */
    atk: number = 0;
    /** 防御力 */
    def: number = 0;
    /** 速度 */
    spd: number = 0;
    /** 可用技能 ID 列表（逗号分隔） */
    skills: string = '';

    /**
     * 从原始数据填充字段
     * @param data 一行原始数据（键值对）
     */
    parseRow(data: Record<string, unknown>): void {
        (this as { id: number }).id = Number(data['id'] ?? 0);
        this.name = String(data['name'] ?? '');
        this.hp = Number(data['hp'] ?? 0);
        this.mp = Number(data['mp'] ?? 0);
        this.atk = Number(data['atk'] ?? 0);
        this.def = Number(data['def'] ?? 0);
        this.spd = Number(data['spd'] ?? 0);
        this.skills = String(data['skills'] ?? '');
    }
}

// ─── 静态配置数据（3 个角色） ─────────────────────────────

/** 角色配置数据 */
export const CHAR_DATA: Record<string, unknown>[] = [
    { id: 1, name: '战士', hp: 200, mp: 50, atk: 30, def: 20, spd: 12, skills: '1,2' },
    { id: 2, name: '法师', hp: 120, mp: 150, atk: 40, def: 10, spd: 8, skills: '1,3,4' },
    { id: 3, name: '牧师', hp: 150, mp: 120, atk: 15, def: 15, spd: 10, skills: '1,5,6' },
];

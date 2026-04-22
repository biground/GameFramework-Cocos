/**
 * 怪物配置表行类型
 * @module
 */

import { IDataRow } from '@framework/datatable/DataTableDefs';

/**
 * 怪物配置行——描述一种怪物的基础属性和奖励
 *
 * 对应 DataTable: `monster_config`
 */
export class MonsterConfigRow implements IDataRow {
    /** 怪物 ID（主键） */
    readonly id: number = 0;
    /** 怪物名称 */
    name: string = '';
    /** 生命值 */
    hp: number = 0;
    /** 攻击力 */
    atk: number = 0;
    /** 防御力 */
    def: number = 0;
    /** 速度 */
    spd: number = 0;
    /** 击败后获得经验值 */
    expReward: number = 0;
    /** 击败后获得金币 */
    goldReward: number = 0;

    /**
     * 从原始数据填充字段
     * @param data 一行原始数据（键值对）
     */
    parseRow(data: Record<string, unknown>): void {
        (this as { id: number }).id = Number(data['id'] ?? 0);
        this.name = String(data['name'] ?? '');
        this.hp = Number(data['hp'] ?? 0);
        this.atk = Number(data['atk'] ?? 0);
        this.def = Number(data['def'] ?? 0);
        this.spd = Number(data['spd'] ?? 0);
        this.expReward = Number(data['expReward'] ?? 0);
        this.goldReward = Number(data['goldReward'] ?? 0);
    }
}

// ─── 静态配置数据（6 种怪物） ─────────────────────────────

/** 怪物配置数据 */
export const MONSTER_DATA: Record<string, unknown>[] = [
    { id: 1, name: '史莱姆', hp: 50, atk: 8, def: 3, spd: 5, expReward: 10, goldReward: 5 },
    { id: 2, name: '骷髅兵', hp: 80, atk: 15, def: 8, spd: 7, expReward: 20, goldReward: 12 },
    { id: 3, name: '暗影狼', hp: 100, atk: 20, def: 6, spd: 14, expReward: 30, goldReward: 18 },
    { id: 4, name: '火焰蜥蜴', hp: 150, atk: 25, def: 12, spd: 9, expReward: 50, goldReward: 30 },
    { id: 5, name: '石像鬼', hp: 200, atk: 18, def: 25, spd: 4, expReward: 60, goldReward: 40 },
    { id: 6, name: '骨龙', hp: 500, atk: 40, def: 20, spd: 10, expReward: 200, goldReward: 150 },
];

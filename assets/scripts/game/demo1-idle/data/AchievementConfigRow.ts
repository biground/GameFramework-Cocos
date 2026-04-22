/**
 * 成就配置表行类型
 * @module
 */

import { IDataRow } from '@framework/datatable/DataTableDefs';

/**
 * 成就类型枚举
 */
export type AchievementType = 'totalGold' | 'buildingLevel' | 'buildingCount';

/**
 * 成就配置行——描述一个成就的解锁条件和奖励
 *
 * 对应 DataTable: `achievement_config`
 */
export class AchievementConfigRow implements IDataRow {
    /** 成就 ID（主键） */
    readonly id: number = 0;
    /** 成就名称 */
    name: string = '';
    /** 成就描述 */
    desc: string = '';
    /** 成就类型：totalGold / buildingLevel / buildingCount */
    type: AchievementType = 'totalGold';
    /** 达成目标值 */
    target: number = 0;
    /** 奖励金币数 */
    reward: number = 0;

    /**
     * 从原始数据填充字段
     * @param data 一行原始数据（键值对）
     */
    parseRow(data: Record<string, unknown>): void {
        (this as { id: number }).id = Number(data['id'] ?? 0);
        this.name = String(data['name'] ?? '');
        this.desc = String(data['desc'] ?? '');
        this.type = (data['type'] as AchievementType) ?? 'totalGold';
        this.target = Number(data['target'] ?? 0);
        this.reward = Number(data['reward'] ?? 0);
    }
}

// ─── 测试用配置数据（5 条） ─────────────────────────────

/** 成就配置测试数据 */
export const ACHIEVEMENT_CONFIG_DATA: Record<string, unknown>[] = [
    { id: 1, name: '初次收入', desc: '累计获得 10 金币', type: 'totalGold', target: 10, reward: 5 },
    { id: 2, name: '小小投资者', desc: '拥有 3 种建筑', type: 'buildingCount', target: 3, reward: 50 },
    { id: 3, name: '商业大亨', desc: '累计获得 10000 金币', type: 'totalGold', target: 10000, reward: 100 },
    { id: 4, name: '建筑大师', desc: '任意建筑升至 10 级', type: 'buildingLevel', target: 10, reward: 500 },
    { id: 5, name: '淘金热', desc: '累计获得 1000000 金币', type: 'totalGold', target: 1000000, reward: 2000 },
];

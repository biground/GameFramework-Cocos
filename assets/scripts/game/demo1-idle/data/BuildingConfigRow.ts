/**
 * 建筑配置表行类型
 * @module
 */

import { IDataRow } from '@framework/datatable/DataTableDefs';

/**
 * 建筑配置行——描述一种建筑的基础属性
 *
 * 对应 DataTable: `building_config`
 */
export class BuildingConfigRow implements IDataRow {
    /** 建筑 ID（主键） */
    readonly id: number = 0;
    /** 建筑名称（i18n key） */
    name: string = '';
    /** 基础购买价格 */
    baseCost: number = 0;
    /** 基础每秒产出 */
    baseOutput: number = 0;
    /** 产出间隔（秒） */
    outputInterval: number = 0;
    /** 升级费用倍率（指数增长基数） */
    costMultiplier: number = 0;
    /** 每级增加产出量 */
    outputPerLevel: number = 0;
    /** 最大等级 */
    maxLevel: number = 0;
    /** 解锁所需历史累计金币数 */
    unlockCondition: number = 0;

    /**
     * 从原始数据填充字段
     * @param data 一行原始数据（键值对）
     */
    parseRow(data: Record<string, unknown>): void {
        // readonly id 需通过 Object.defineProperty 或类型断言赋值
        (this as { id: number }).id = Number(data['id'] ?? 0);
        this.name = String(data['name'] ?? '');
        this.baseCost = Number(data['baseCost'] ?? 0);
        this.baseOutput = Number(data['baseOutput'] ?? 0);
        this.outputInterval = Number(data['outputInterval'] ?? 0);
        this.costMultiplier = Number(data['costMultiplier'] ?? 0);
        this.outputPerLevel = Number(data['outputPerLevel'] ?? 0);
        this.maxLevel = Number(data['maxLevel'] ?? 0);
        this.unlockCondition = Number(data['unlockCondition'] ?? 0);
    }
}

// ─── 测试用配置数据（5 条） ─────────────────────────────

/** 建筑配置测试数据 */
export const BUILDING_CONFIG_DATA: Record<string, unknown>[] = [
    { id: 1, name: 'building_lemonade', baseCost: 10, baseOutput: 1, outputInterval: 1, costMultiplier: 1.15, outputPerLevel: 1, maxLevel: 10, unlockCondition: 0 },
    { id: 2, name: 'building_newspaper', baseCost: 100, baseOutput: 5, outputInterval: 2, costMultiplier: 1.2, outputPerLevel: 3, maxLevel: 10, unlockCondition: 50 },
    { id: 3, name: 'building_carwash', baseCost: 1000, baseOutput: 25, outputInterval: 3, costMultiplier: 1.25, outputPerLevel: 10, maxLevel: 10, unlockCondition: 500 },
    { id: 4, name: 'building_pizza', baseCost: 10000, baseOutput: 100, outputInterval: 5, costMultiplier: 1.3, outputPerLevel: 40, maxLevel: 10, unlockCondition: 5000 },
    { id: 5, name: 'building_bank', baseCost: 100000, baseOutput: 500, outputInterval: 8, costMultiplier: 1.35, outputPerLevel: 150, maxLevel: 10, unlockCondition: 50000 },
];

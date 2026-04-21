/**
 * 升级曲线配置表行类型
 * @module
 */

import { IDataRow } from '@framework/datatable/DataTableDefs';

/**
 * 升级曲线行——描述特定建筑在特定等级的升级参数
 *
 * 对应 DataTable: `upgrade_curve`
 */
export class UpgradeCurveRow implements IDataRow {
    /** 行 ID（主键） */
    readonly id: number = 0;
    /** 所属建筑 ID */
    buildingId: number = 0;
    /** 等级 */
    level: number = 0;
    /** 该等级升级费用 */
    cost: number = 0;
    /** 该等级产出量 */
    output: number = 0;
    /** 升级所需时间（秒） */
    upgradeTime: number = 0;

    /**
     * 从原始数据填充字段
     * @param data 一行原始数据（键值对）
     */
    parseRow(data: Record<string, unknown>): void {
        (this as { id: number }).id = Number(data['id'] ?? 0);
        this.buildingId = Number(data['buildingId'] ?? 0);
        this.level = Number(data['level'] ?? 0);
        this.cost = Number(data['cost'] ?? 0);
        this.output = Number(data['output'] ?? 0);
        this.upgradeTime = Number(data['upgradeTime'] ?? 0);
    }
}

// ─── 测试用配置数据（5 栋 × 10 级 = 50 条） ──────────────

/** 生成单栋建筑的升级曲线数据 */
function generateCurve(
    startId: number,
    buildingId: number,
    baseCost: number,
    baseOutput: number,
    costMul: number,
    outputAdd: number,
): Record<string, unknown>[] {
    const rows: Record<string, unknown>[] = [];
    for (let lvl = 1; lvl <= 10; lvl++) {
        rows.push({
            id: startId + lvl - 1,
            buildingId,
            level: lvl,
            cost: Math.floor(baseCost * Math.pow(costMul, lvl - 1)),
            output: baseOutput + outputAdd * (lvl - 1),
            upgradeTime: lvl,
        });
    }
    return rows;
}

/** 升级曲线测试数据（50 条） */
export const UPGRADE_CURVE_DATA: Record<string, unknown>[] = [
    ...generateCurve(1, 1, 10, 1, 1.15, 1),
    ...generateCurve(11, 2, 100, 5, 1.2, 3),
    ...generateCurve(21, 3, 1000, 25, 1.25, 10),
    ...generateCurve(31, 4, 10000, 100, 1.3, 40),
    ...generateCurve(41, 5, 100000, 500, 1.35, 150),
];

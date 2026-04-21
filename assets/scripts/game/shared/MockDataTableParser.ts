import {
    IDataTableParser,
    IDataRow,
} from '@framework/datatable/DataTableDefs';

/**
 * 模拟数据表解析器
 * 用于 Demo 和测试环境的数据表解析模拟
 * 
 * @description
 * 实现 IDataTableParser 接口，在不依赖真实文件 I/O 的情况下
 * 模拟 CSV/JSON 数据解析，用于单元测试和 Demo 演示。
 */
export class MockDataTableParser implements IDataTableParser {
    private static readonly TAG = 'MockDataTableParser';

    // Constructor
    constructor() {
        // TODO: 初始化数据表解析器配置
    }

    /**
     * 将原始数据解析为行对象数组（模拟）
     * @param rawData 原始数据（通常是 string 或 object）
     * @returns 解析后的行对象数组
     */
    public parse<T extends IDataRow>(rawData: unknown): T[] {
        // TODO: 实现模拟数据解析逻辑
        if (typeof rawData === 'string') {
            // 模拟 CSV 解析
            return this.parseCsv<T>(rawData);
        } else if (Array.isArray(rawData)) {
            // 模拟 JSON 数组解析
            return rawData as T[];
        }

        return [];
    }

    /**
     * 解析 CSV 格式数据（内部方法）
     * @param csvData CSV 字符串
     * @returns 解析后的行对象数组
     */
    private parseCsv<T extends IDataRow>(csvData: string): T[] {
        // TODO: 实现 CSV 解析逻辑
        const lines = csvData.trim().split('\n');
        if (lines.length <= 1) {
            return [];
        }

        // 跳过标题行，解析数据行
        const result: T[] = [];
        for (let i = 1; i < lines.length; i++) {
            // 简化的 CSV 解析，实际实现需要处理引号、转义等
            // TODO: 根据实际 CSV 结构映射到 T 类型
            void lines[i];
        }

        return result;
    }
}

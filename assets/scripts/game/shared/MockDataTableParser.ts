import {
    IDataTableParser,
    IDataRow,
} from '@framework/datatable/DataTableDefs';
import { Logger } from '@framework/debug/Logger';

/**
 * 模拟数据表解析器调用记录
 */
export interface IParseCallRecord {
    /** 原始输入数据 */
    readonly rawData: unknown;
    /** 解析结果数量 */
    readonly resultCount: number;
}

/**
 * 模拟数据表解析器
 * 用于 Demo 和测试环境的数据表解析模拟
 *
 * @description
 * 实现 IDataTableParser 接口，在不依赖真实文件 I/O 的情况下
 * 模拟 JSON 数据解析，用于单元测试和 Demo 演示。
 *
 * 功能特性：
 * - 支持 JSON 字符串和对象数组的直接解析
 * - 支持预设表数据（registerData）
 * - 支持调用追踪（parseCalls）
 * - 支持错误模拟（setParseError）
 */
export class MockDataTableParser implements IDataTableParser {
    private static readonly TAG = 'MockDataTableParser';

    /** 预设表数据存储（表名 → 数据数组） */
    private _registeredData: Map<string, IDataRow[]> = new Map();

    /** 调用历史记录 */
    private _parseCalls: IParseCallRecord[] = [];

    /** 模拟错误（非 null 时 parse 方法将抛出此错误） */
    private _parseError: Error | null = null;

    /**
     * 构造函数
     */
    constructor() {
        Logger.debug(MockDataTableParser.TAG, 'MockDataTableParser 已创建');
    }

    /**
     * 获取调用历史记录
     * @returns 所有 parse 调用的记录数组
     */
    public get parseCalls(): ReadonlyArray<IParseCallRecord> {
        return this._parseCalls;
    }

    /**
     * 注册预设表数据
     * @param tableName 表名
     * @param data 数据行数组
     */
    public registerData(tableName: string, data: IDataRow[]): void {
        this._registeredData.set(tableName, data);
        Logger.debug(MockDataTableParser.TAG, `注册表数据: ${tableName}, 行数: ${data.length}`);
    }

    /**
     * 设置模拟错误（用于测试错误处理）
     * @param error 错误对象，传入 null 清除错误
     */
    public setParseError(error: Error | null): void {
        this._parseError = error;
        if (error) {
            Logger.warn(MockDataTableParser.TAG, `设置模拟错误: ${error.message}`);
        } else {
            Logger.debug(MockDataTableParser.TAG, '清除模拟错误');
        }
    }

    /**
     * 将原始数据解析为行对象数组
     * @param rawData 原始数据（JSON 字符串、对象数组或表名）
     * @returns 解析后的行对象数组
     * @throws 当数据无效或设置了模拟错误时抛出异常
     */
    public parse<T extends IDataRow>(rawData: unknown): T[] {
        // 错误模拟优先
        if (this._parseError !== null) {
            const error = this._parseError;
            Logger.error(MockDataTableParser.TAG, '模拟错误触发', error);
            throw error;
        }

        let result: T[];

        if (typeof rawData === 'string') {
            result = this._parseString(rawData);
        } else if (Array.isArray(rawData)) {
            result = this._parseArray(rawData);
        } else {
            const errorMsg = `[MockDataTableParser] 不支持的数据类型: ${typeof rawData}`;
            Logger.error(MockDataTableParser.TAG, errorMsg);
            throw new Error(errorMsg);
        }

        // 记录调用
        this._parseCalls.push({
            rawData,
            resultCount: result.length,
        });

        Logger.debug(MockDataTableParser.TAG, `解析完成，结果数量: ${result.length}`);
        return result;
    }

    /**
     * 解析字符串数据（JSON 格式或表名）
     * @param str 字符串数据
     * @returns 解析后的行对象数组
     */
    private _parseString<T extends IDataRow>(str: string): T[] {
        // 先检查是否为注册的表名
        const registeredData = this._registeredData.get(str);
        if (registeredData !== undefined) {
            Logger.debug(MockDataTableParser.TAG, `使用预设表数据: ${str}`);
            return registeredData as T[];
        }

        // 尝试 JSON 解析
        try {
            const parsed = JSON.parse(str);
            if (Array.isArray(parsed)) {
                Logger.debug(MockDataTableParser.TAG, 'JSON 字符串解析成功');
                return parsed as T[];
            }

            const errorMsg = `[MockDataTableParser] JSON 解析结果不是数组`;
            Logger.error(MockDataTableParser.TAG, errorMsg);
            throw new Error(errorMsg);
        } catch (error) {
            const errorMsg = `[MockDataTableParser] JSON 解析失败: ${error instanceof Error ? error.message : String(error)}`;
            Logger.error(MockDataTableParser.TAG, errorMsg);
            throw new Error(errorMsg);
        }
    }

    /**
     * 解析数组数据
     * @param arr 对象数组
     * @returns 类型安全的行对象数组
     */
    private _parseArray<T extends IDataRow>(arr: unknown[]): T[] {
        // 验证数组元素是否满足 IDataRow 约束
        for (let i = 0; i < arr.length; i++) {
            const item = arr[i];
            if (item === null || typeof item !== 'object') {
                const errorMsg = `[MockDataTableParser] 数组元素 ${i} 不是有效对象`;
                Logger.error(MockDataTableParser.TAG, errorMsg);
                throw new Error(errorMsg);
            }

            const row = item as Record<string, unknown>;
            if (typeof row.id !== 'number' && typeof row.id !== 'string') {
                const errorMsg = `[MockDataTableParser] 数组元素 ${i} 缺少有效的 id 字段`;
                Logger.error(MockDataTableParser.TAG, errorMsg);
                throw new Error(errorMsg);
            }
        }

        Logger.debug(MockDataTableParser.TAG, `数组验证通过，元素数量: ${arr.length}`);
        return arr as T[];
    }

    /**
     * 清除所有预设数据和调用记录
     */
    public reset(): void {
        this._registeredData.clear();
        this._parseCalls = [];
        this._parseError = null;
        Logger.debug(MockDataTableParser.TAG, '已重置所有状态');
    }
}

import { ModuleBase } from '../core/ModuleBase';
import { Logger } from '../debug/Logger';
import { DataTable } from './DataTable';
import {
    DataTableStorageMode,
    IDataRow,
    IDataTableInfo,
    IDataTableOptions,
    IDataTableParser,
} from './DataTableDefs';

/**
 * 数据表管理器
 *
 * 管理所有游戏配置数据表的加载、解析、存储和查询。
 * 通过 IDataTableParser 策略注入实现解析逻辑与框架解耦。
 *
 * @example
 * ```typescript
 * const dataMgr = GameEntry.getModule<DataTableManager>('DataTableManager');
 * dataMgr.setParser(new JsonDataTableParser());
 *
 * // 直接用已解析的数据创建表
 * dataMgr.createTable<MonsterRow>('monster', parsedRows);
 *
 * // 用 parser 从原始数据创建表
 * dataMgr.createTableFromRawData<MonsterRow>('monster', rawJsonString);
 *
 * const row = dataMgr.getRow<MonsterRow>('monster', 1001);
 * ```
 */
export class DataTableManager extends ModuleBase {
    // ─── ModuleBase ────────────────────────────────────

    public get moduleName(): string {
        return 'DataTableManager';
    }

    public get priority(): number {
        return 300;
    }

    // ─── 内部状态 ──────────────────────────────────────

    /** 表名 → DataTable 实例 */
    private _tables: Map<string, DataTable<IDataRow>> = new Map();

    /** 数据解析器（策略注入） */
    private _parser: IDataTableParser | null = null;

    // ─── 生命周期 ──────────────────────────────────────

    public onInit(): void {
        Logger.info('[DataTableManager] 初始化完成');
    }

    public onUpdate(_deltaTime: number): void {
        // 数据表不需要每帧更新
    }

    public onShutdown(): void {
        this.removeAllTables();
        Logger.info('[DataTableManager] 已关闭，所有数据表已释放');
    }

    // ─── 策略注入 ──────────────────────────────────────

    /**
     * 设置数据表解析器
     * @param parser 解析器实现
     */
    public setParser(parser: IDataTableParser): void {
        this._parser = parser;
    }

    // ─── 表管理 ────────────────────────────────────────

    /**
     * 用已解析的行数据创建数据表
     * @param name 表名（唯一标识）
     * @param rows 已解析的行数据数组
     * @param options 可选配置（存储模式等）
     * @throws 表名已存在时抛出错误
     */
    public createTable<T extends IDataRow>(
        name: string,
        rows: T[],
        options?: IDataTableOptions,
    ): void {
        if (this._tables.has(name)) {
            throw new Error(`[DataTableManager] 数据表已存在: ${name}`);
        }

        const storageMode = options?.storageMode ?? DataTableStorageMode.Map;
        const table = new DataTable<T>(name, storageMode);
        table.addRows(rows);
        // DataTable<T> 是 DataTable<IDataRow> 的子类型（T extends IDataRow）
        this._tables.set(name, table as unknown as DataTable<IDataRow>);
        Logger.info(
            `[DataTableManager] 数据表 "${name}" 已创建，共 ${table.rowCount} 行（${storageMode} 模式）`,
        );
    }

    /**
     * 用原始数据 + Parser 创建数据表
     * @param name 表名
     * @param rawData 原始数据
     * @param options 可选配置
     * @throws 未设置 Parser 或表名已存在时抛出错误
     */
    public createTableFromRawData<T extends IDataRow>(
        name: string,
        rawData: unknown,
        options?: IDataTableOptions,
    ): void {
        if (!this._parser) {
            throw new Error('[DataTableManager] 未设置 Parser，请先调用 setParser()');
        }
        const rows = this._parser.parse<T>(rawData);
        this.createTable<T>(name, rows, options);
    }

    /**
     * 移除指定数据表
     * @param name 表名
     * @returns 是否成功移除
     */
    public removeTable(name: string): boolean {
        const table = this._tables.get(name);
        if (!table) {
            return false;
        }
        table.clear();
        this._tables.delete(name);
        return true;
    }

    /**
     * 移除所有数据表
     */
    public removeAllTables(): void {
        for (const table of this._tables.values()) {
            table.clear();
        }
        this._tables.clear();
    }

    /**
     * 检查数据表是否存在
     * @param name 表名
     */
    public hasTable(name: string): boolean {
        return this._tables.has(name);
    }

    // ─── 数据查询（快捷方法，委托给 DataTable） ────────

    /**
     * 按 id 查询指定表的单行
     * @param tableName 表名
     * @param id 行 ID
     * @returns 行数据，不存在返回 undefined
     * @throws 表不存在时抛出错误
     */
    public getRow<T extends IDataRow>(tableName: string, id: number): T | undefined {
        return this._getTable(tableName).getRow(id) as T | undefined;
    }

    /**
     * 获取指定表的所有行
     * @param tableName 表名
     * @returns 只读行数组
     * @throws 表不存在时抛出错误
     */
    public getAllRows<T extends IDataRow>(tableName: string): readonly T[] {
        return this._getTable(tableName).getAllRows() as readonly T[];
    }

    /**
     * 获取指定表的信息
     * @param tableName 表名
     * @returns 表信息，不存在返回 undefined
     */
    public getTableInfo(tableName: string): IDataTableInfo | undefined {
        const table = this._tables.get(tableName);
        return table?.getInfo();
    }

    /**
     * 获取所有已注册的表名
     */
    public getTableNames(): string[] {
        return Array.from(this._tables.keys());
    }

    // ─── 内部方法 ──────────────────────────────────────

    /**
     * 获取指定表实例（内部使用）
     * @throws 表不存在时抛出错误
     */
    private _getTable(name: string): DataTable<IDataRow> {
        const table = this._tables.get(name);
        if (!table) {
            throw new Error(`[DataTableManager] 数据表不存在: ${name}`);
        }
        return table;
    }
}

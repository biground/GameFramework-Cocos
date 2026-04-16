import { DataTableStorageMode, IDataRow, IDataTableInfo } from './DataTableDefs';

/**
 * 数据表容器
 *
 * 泛型容器，存储和查询特定类型的配置数据行。
 * 支持 Map（随机查询）和 Array（顺序遍历）两种存储模式。
 *
 * @typeParam T 行数据类型，必须实现 IDataRow
 *
 * @example
 * ```typescript
 * const table = new DataTable<MonsterRow>('monster');
 * table.addRows(parsedRows);
 * const dragon = table.getRow(1003); // 类型安全
 * ```
 */
export class DataTable<T extends IDataRow> {
    /** 表名 */
    private readonly _name: string;

    /** 存储模式 */
    private readonly _storageMode: DataTableStorageMode;

    /** Map 模式存储 */
    private _dataMap: Map<number, T> | null = null;

    /** Array 模式存储 */
    private _dataArray: T[] | null = null;

    /** Array 模式的 id → index 索引（保证 Array 模式 getRow 也是 O(1)） */
    private _indexMap: Map<number, number> | null = null;

    /**
     * @param name 表名
     * @param storageMode 存储模式，默认 Map
     */
    constructor(name: string, storageMode: DataTableStorageMode = DataTableStorageMode.Map) {
        this._name = name;
        this._storageMode = storageMode;

        if (storageMode === DataTableStorageMode.Map) {
            this._dataMap = new Map();
        } else {
            this._dataArray = [];
            this._indexMap = new Map();
        }
    }

    // ─── 只读属性 ──────────────────────────────────────

    /** 表名 */
    public get name(): string {
        return this._name;
    }

    /** 行数 */
    public get rowCount(): number {
        if (this._storageMode === DataTableStorageMode.Map) {
            return this._dataMap!.size;
        }
        return this._dataArray!.length;
    }

    /** 存储模式 */
    public get storageMode(): DataTableStorageMode {
        return this._storageMode;
    }

    // ─── 数据写入 ──────────────────────────────────────

    /**
     * 批量添加行数据
     * @param rows 行数据数组
     * @throws 如果发现重复 id
     */
    public addRows(rows: T[]): void {
        for (const row of rows) {
            // 检查重复 id
            if (this._storageMode === DataTableStorageMode.Map) {
                if (this._dataMap!.has(row.id)) {
                    throw new Error(`[DataTable:${this._name}] 重复的行 id: ${row.id}`);
                }
                this._dataMap!.set(row.id, row);
            } else {
                if (this._indexMap!.has(row.id)) {
                    throw new Error(`[DataTable:${this._name}] 重复的行 id: ${row.id}`);
                }
                // 先记录 index，再 push
                this._indexMap!.set(row.id, this._dataArray!.length);
                this._dataArray!.push(row);
            }
        }
    }

    // ─── 查询 ──────────────────────────────────────────

    /**
     * 按 id 查询单行
     * @param id 行 ID
     * @returns 行数据，不存在返回 undefined
     */
    public getRow(id: number): T | undefined {
        if (this._storageMode === DataTableStorageMode.Map) {
            return this._dataMap!.get(id);
        }
        // Array 模式：通过 indexMap 实现 O(1) 查找
        const index = this._indexMap!.get(id);
        return index !== undefined ? this._dataArray![index] : undefined;
    }

    /**
     * 获取所有行（只读数组）
     * @returns 行数据的只读数组
     */
    public getAllRows(): readonly T[] {
        if (this._storageMode === DataTableStorageMode.Map) {
            return Array.from(this._dataMap!.values());
        }
        // Array 模式直接返回内部数组（readonly 保护，避免拷贝）
        return this._dataArray!;
    }

    /**
     * 检查是否存在指定 id 的行
     * @param id 行 ID
     */
    public hasRow(id: number): boolean {
        if (this._storageMode === DataTableStorageMode.Map) {
            return this._dataMap!.has(id);
        }
        return this._indexMap!.has(id);
    }

    /**
     * 按条件查询行
     * @param predicate 过滤条件
     * @returns 满足条件的行数组
     */
    public where(predicate: (row: T) => boolean): T[] {
        return this.getAllRows().filter(predicate);
    }

    /**
     * 获取表信息（只读视图）
     */
    public getInfo(): IDataTableInfo {
        return {
            name: this._name,
            rowCount: this.rowCount,
            storageMode: this._storageMode,
        };
    }

    /**
     * 清空表数据
     */
    public clear(): void {
        if (this._storageMode === DataTableStorageMode.Map) {
            this._dataMap!.clear();
        } else {
            this._dataArray!.length = 0;
            this._indexMap!.clear();
        }
    }
}

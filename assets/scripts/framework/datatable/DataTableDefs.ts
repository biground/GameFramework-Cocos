// ─── 枚举 ──────────────────────────────────────────────

/**
 * 数据表存储模式
 * - Map：适合随机按 id 查询（装备表、怪物表），O(1) 查找
 * - Array：适合顺序遍历（关卡波次表、剧情对话表），cache-friendly
 */
export enum DataTableStorageMode {
    /** 使用 Map<number, T> 存储，O(1) 随机查询 */
    Map = 'map',
    /** 使用 T[] 存储，顺序遍历更友好 */
    Array = 'array',
}

// ─── 核心接口 ──────────────────────────────────────────

/**
 * 数据行基础接口
 * 所有配置表行结构必须实现此接口
 *
 * @example
 * ```typescript
 * interface MonsterRow extends IDataRow {
 *     readonly name: string;
 *     readonly hp: number;
 *     readonly atk: number;
 * }
 * ```
 */
export interface IDataRow {
    /** 行唯一标识（主键） */
    readonly id: number;
}

/**
 * 数据表解析器接口（策略注入）
 *
 * Framework 层定义接口，Runtime 层注入具体实现（CSV / JSON / 二进制等）。
 * 与 IResourceLoader / IAudioPlayer / ISceneLoader 一致的策略模式。
 */
export interface IDataTableParser {
    /**
     * 将原始数据解析为行对象数组
     * @param rawData 原始数据（通常是 string 或 object）
     * @returns 解析后的行对象数组
     */
    parse<T extends IDataRow>(rawData: unknown): T[];
}

/**
 * 数据表配置选项
 */
export interface IDataTableOptions {
    /**
     * 存储模式
     * @default DataTableStorageMode.Map
     */
    storageMode?: DataTableStorageMode;
}

/**
 * 数据表信息（只读外部视图）
 */
export interface IDataTableInfo {
    /** 表名 */
    readonly name: string;
    /** 行数 */
    readonly rowCount: number;
    /** 存储模式 */
    readonly storageMode: DataTableStorageMode;
}

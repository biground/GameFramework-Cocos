# DataTableManager（数据表管理器）

## 职责
管理游戏配置数据表的加载、解析、存储和查询。提供类型安全的行数据访问 API。
**不负责**：文件 I/O（委托给 ResourceManager）、具体解析格式（委托给 IDataTableParser）。

## 对外 API

```typescript
// DataTableManager（ModuleBase，priority=300）
setParser(parser: IDataTableParser): void
createTable<T extends IDataRow>(name: string, rows: T[], options?: IDataTableOptions): void
createTableFromRawData<T extends IDataRow>(name: string, rawData: unknown, options?: IDataTableOptions): void
removeTable(name: string): boolean
removeAllTables(): void
hasTable(name: string): boolean
getRow<T extends IDataRow>(tableName: string, id: number): T | undefined
getAllRows<T extends IDataRow>(tableName: string): readonly T[]
getTableInfo(tableName: string): IDataTableInfo | undefined
getTableNames(): string[]

// DataTable<T extends IDataRow>（核心容器）
addRows(rows: T[]): void
getRow(id: number): T | undefined
getAllRows(): readonly T[]
hasRow(id: number): boolean
where(predicate: (row: T) => boolean): T[]
clear(): void
getInfo(): IDataTableInfo
```

## 设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 存储结构 | 双模式（Map / Array） | Map 适合随机查询 O(1)；Array 适合顺序遍历（cache-friendly），getAllRows 零拷贝 |
| Array 模式查询 | indexMap（id → arrayIndex） | 空间换时间，保证 getRow 在两种模式下都是 O(1) |
| 解析策略 | IDataTableParser 接口注入 | Framework 层不耦合具体格式（CSV/JSON/二进制），Runtime 层注入实现 |
| 表名主键 | string | 业务语义清晰（'monster' / 'item'），比 number 更易读 |
| 行主键 | number（IDataRow.id） | 游戏配置表的行 ID 几乎都是整数 |

## 依赖
- ResourceManager（加载原始配置文件，运行时通过 IDataTableParser 间接依赖）

## 被谁依赖
- Game 层业务代码

## 已知限制
- 全量加载：整张表一次性载入内存，超大表（10 万行+）可能影响内存
- 查询能力有限：仅支持 id 主键查询 + where 条件过滤，无多字段索引
- 无热更新：表加载后数据不可变，需 removeTable + 重新 createTable
- Map 模式 getAllRows 每次都创建新数组（O(n) 拷贝）

## 后续拓展方向
- 支持二级索引（高频查询字段建索引）
- 支持增量热更新（只替换变化的行）
- 支持二进制序列化（减少解析耗时和包体大小）

## 关联测试
- 测试文件路径：`tests/datatable/data-table-manager.test.ts`
- 测试数量：41 个
- 覆盖范围：Map/Array 双模式、CRUD、策略注入、多表并存、生命周期、边界情况

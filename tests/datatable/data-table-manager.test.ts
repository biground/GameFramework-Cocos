import { DataTable } from '@framework/datatable/DataTable';
import { DataTableManager } from '@framework/datatable/DataTableManager';
import {
    DataTableStorageMode,
    IDataRow,
    IDataTableParser,
} from '@framework/datatable/DataTableDefs';

// ─── 测试用行结构 ──────────────────────────────────────

interface MonsterRow extends IDataRow {
    readonly id: number;
    readonly name: string;
    readonly hp: number;
    readonly atk: number;
}

interface ItemRow extends IDataRow {
    readonly id: number;
    readonly name: string;
    readonly price: number;
}

// ─── 测试数据 ──────────────────────────────────────────

const MONSTER_DATA: MonsterRow[] = [
    { id: 1001, name: '哥布林', hp: 100, atk: 15 },
    { id: 1002, name: '骷髅兵', hp: 200, atk: 25 },
    { id: 1003, name: '暗黑龙', hp: 50000, atk: 800 },
];

const ITEM_DATA: ItemRow[] = [
    { id: 2001, name: '生命药水', price: 50 },
    { id: 2002, name: '魔法卷轴', price: 200 },
];

// ─── Mock Parser ───────────────────────────────────────

class MockJsonParser implements IDataTableParser {
    parse<T extends IDataRow>(rawData: unknown): T[] {
        if (typeof rawData === 'string') {
            return JSON.parse(rawData) as T[];
        }
        return rawData as T[];
    }
}

// ════════════════════════════════════════════════════════
//  DataTable<T> 核心容器
// ════════════════════════════════════════════════════════

describe('DataTable', () => {
    // ─── Map 模式（默认）──────────────────────────────

    describe('Map 模式（默认）', () => {
        let table: DataTable<MonsterRow>;

        beforeEach(() => {
            table = new DataTable<MonsterRow>('monster');
        });

        test('新建表初始行数为 0', () => {
            expect(table.rowCount).toBe(0);
            expect(table.name).toBe('monster');
            expect(table.storageMode).toBe(DataTableStorageMode.Map);
        });

        test('addRows 后 rowCount 正确', () => {
            table.addRows(MONSTER_DATA);
            expect(table.rowCount).toBe(3);
        });

        test('getRow 按 id 查询返回正确行', () => {
            table.addRows(MONSTER_DATA);
            const dragon = table.getRow(1003);
            expect(dragon).toBeDefined();
            expect(dragon!.name).toBe('暗黑龙');
            expect(dragon!.hp).toBe(50000);
        });

        test('getRow 查询不存在的 id 返回 undefined', () => {
            table.addRows(MONSTER_DATA);
            expect(table.getRow(9999)).toBeUndefined();
        });

        test('hasRow 正确判断行是否存在', () => {
            table.addRows(MONSTER_DATA);
            expect(table.hasRow(1001)).toBe(true);
            expect(table.hasRow(9999)).toBe(false);
        });

        test('getAllRows 返回所有行', () => {
            table.addRows(MONSTER_DATA);
            const rows = table.getAllRows();
            expect(rows).toHaveLength(3);
        });

        test('addRows 遇到重复 id 抛错', () => {
            table.addRows([MONSTER_DATA[0]]);
            expect(() => table.addRows([MONSTER_DATA[0]])).toThrow(/重复的行 id/);
        });

        test('where 条件查询', () => {
            table.addRows(MONSTER_DATA);
            const strong = table.where((row) => row.atk > 20);
            expect(strong).toHaveLength(2);
            expect(strong.map((r) => r.name)).toContain('骷髅兵');
            expect(strong.map((r) => r.name)).toContain('暗黑龙');
        });

        test('clear 清空表数据', () => {
            table.addRows(MONSTER_DATA);
            table.clear();
            expect(table.rowCount).toBe(0);
            expect(table.getRow(1001)).toBeUndefined();
        });

        test('getInfo 返回表信息', () => {
            table.addRows(MONSTER_DATA);
            const info = table.getInfo();
            expect(info.name).toBe('monster');
            expect(info.rowCount).toBe(3);
            expect(info.storageMode).toBe(DataTableStorageMode.Map);
        });
    });

    // ─── Array 模式 ──────────────────────────────────

    describe('Array 模式', () => {
        let table: DataTable<MonsterRow>;

        beforeEach(() => {
            table = new DataTable<MonsterRow>('monster', DataTableStorageMode.Array);
        });

        test('新建表初始行数为 0，存储模式为 Array', () => {
            expect(table.rowCount).toBe(0);
            expect(table.storageMode).toBe(DataTableStorageMode.Array);
        });

        test('addRows 后 rowCount 正确', () => {
            table.addRows(MONSTER_DATA);
            expect(table.rowCount).toBe(3);
        });

        test('getRow 通过 indexMap 实现 O(1) 查询', () => {
            table.addRows(MONSTER_DATA);
            const goblin = table.getRow(1001);
            expect(goblin).toBeDefined();
            expect(goblin!.name).toBe('哥布林');
        });

        test('getAllRows 返回数组引用（cache-friendly）', () => {
            table.addRows(MONSTER_DATA);
            const rows = table.getAllRows();
            expect(rows).toHaveLength(3);
            // Array 模式下 getAllRows 应该直接返回内部数组（只读），避免拷贝
        });

        test('hasRow 正确判断', () => {
            table.addRows(MONSTER_DATA);
            expect(table.hasRow(1002)).toBe(true);
            expect(table.hasRow(9999)).toBe(false);
        });

        test('addRows 遇到重复 id 抛错', () => {
            table.addRows(MONSTER_DATA);
            expect(() => table.addRows([MONSTER_DATA[0]])).toThrow(/重复的行 id/);
        });

        test('where 条件查询', () => {
            table.addRows(MONSTER_DATA);
            const weak = table.where((row) => row.hp < 300);
            expect(weak).toHaveLength(2);
        });

        test('clear 清空 Array + indexMap', () => {
            table.addRows(MONSTER_DATA);
            table.clear();
            expect(table.rowCount).toBe(0);
            expect(table.hasRow(1001)).toBe(false);
        });
    });

    // ─── 边界情况 ────────────────────────────────────

    describe('边界情况', () => {
        test('addRows 空数组不抛错', () => {
            const table = new DataTable<MonsterRow>('empty');
            expect(() => table.addRows([])).not.toThrow();
            expect(table.rowCount).toBe(0);
        });

        test('where 无匹配返回空数组', () => {
            const table = new DataTable<MonsterRow>('monster');
            table.addRows(MONSTER_DATA);
            const result = table.where((row) => row.hp > 999999);
            expect(result).toHaveLength(0);
        });

        test('clear 后可以重新 addRows', () => {
            const table = new DataTable<MonsterRow>('monster');
            table.addRows(MONSTER_DATA);
            table.clear();
            // 清空后应该可以重新添加相同的数据
            expect(() => table.addRows(MONSTER_DATA)).not.toThrow();
            expect(table.rowCount).toBe(3);
        });
    });
});

// ════════════════════════════════════════════════════════
//  DataTableManager 模块管理器
// ════════════════════════════════════════════════════════

describe('DataTableManager', () => {
    let mgr: DataTableManager;

    beforeEach(() => {
        mgr = new DataTableManager();
        mgr.onInit();
    });

    afterEach(() => {
        mgr.onShutdown();
    });

    // ─── 表管理 ──────────────────────────────────────

    describe('表管理', () => {
        test('createTable 创建并存储表', () => {
            mgr.createTable<MonsterRow>('monster', MONSTER_DATA);
            expect(mgr.hasTable('monster')).toBe(true);
        });

        test('createTable 表名重复抛错', () => {
            mgr.createTable<MonsterRow>('monster', MONSTER_DATA);
            expect(() => mgr.createTable<MonsterRow>('monster', MONSTER_DATA)).toThrow(
                /数据表已存在/,
            );
        });

        test('createTable 支持指定存储模式', () => {
            mgr.createTable<MonsterRow>('monster', MONSTER_DATA, {
                storageMode: DataTableStorageMode.Array,
            });
            const info = mgr.getTableInfo('monster');
            expect(info).toBeDefined();
            expect(info!.storageMode).toBe(DataTableStorageMode.Array);
        });

        test('removeTable 移除已存在的表', () => {
            mgr.createTable<MonsterRow>('monster', MONSTER_DATA);
            expect(mgr.removeTable('monster')).toBe(true);
            expect(mgr.hasTable('monster')).toBe(false);
        });

        test('removeTable 移除不存在的表返回 false', () => {
            expect(mgr.removeTable('nonexistent')).toBe(false);
        });

        test('removeAllTables 清空所有表', () => {
            mgr.createTable<MonsterRow>('monster', MONSTER_DATA);
            mgr.createTable<ItemRow>('item', ITEM_DATA);
            mgr.removeAllTables();
            expect(mgr.hasTable('monster')).toBe(false);
            expect(mgr.hasTable('item')).toBe(false);
        });

        test('getTableNames 返回所有表名', () => {
            mgr.createTable<MonsterRow>('monster', MONSTER_DATA);
            mgr.createTable<ItemRow>('item', ITEM_DATA);
            const names = mgr.getTableNames();
            expect(names).toHaveLength(2);
            expect(names).toContain('monster');
            expect(names).toContain('item');
        });

        test('getTableInfo 返回表信息', () => {
            mgr.createTable<MonsterRow>('monster', MONSTER_DATA);
            const info = mgr.getTableInfo('monster');
            expect(info).toBeDefined();
            expect(info!.name).toBe('monster');
            expect(info!.rowCount).toBe(3);
        });

        test('getTableInfo 不存在的表返回 undefined', () => {
            expect(mgr.getTableInfo('nonexistent')).toBeUndefined();
        });
    });

    // ─── 数据查询（快捷方法）───────────────────────

    describe('数据查询', () => {
        beforeEach(() => {
            mgr.createTable<MonsterRow>('monster', MONSTER_DATA);
        });

        test('getRow 查询存在的行', () => {
            const row = mgr.getRow<MonsterRow>('monster', 1001);
            expect(row).toBeDefined();
            expect(row!.name).toBe('哥布林');
        });

        test('getRow 查询不存在的行返回 undefined', () => {
            expect(mgr.getRow<MonsterRow>('monster', 9999)).toBeUndefined();
        });

        test('getRow 查询不存在的表抛错', () => {
            expect(() => mgr.getRow<MonsterRow>('nonexistent', 1)).toThrow(/数据表不存在/);
        });

        test('getAllRows 返回全部行', () => {
            const rows = mgr.getAllRows<MonsterRow>('monster');
            expect(rows).toHaveLength(3);
        });

        test('getAllRows 查询不存在的表抛错', () => {
            expect(() => mgr.getAllRows<MonsterRow>('nonexistent')).toThrow(/数据表不存在/);
        });
    });

    // ─── Parser 策略注入 ──────────────────────────────

    describe('Parser 策略注入', () => {
        test('setParser 后可用 createTableFromRawData', () => {
            mgr.setParser(new MockJsonParser());
            const rawJson = JSON.stringify(MONSTER_DATA);
            mgr.createTableFromRawData<MonsterRow>('monster', rawJson);
            expect(mgr.hasTable('monster')).toBe(true);
            expect(mgr.getRow<MonsterRow>('monster', 1001)?.name).toBe('哥布林');
        });

        test('未设置 Parser 就调用 createTableFromRawData 抛错', () => {
            expect(() => mgr.createTableFromRawData<MonsterRow>('monster', '[]')).toThrow(
                /未设置 Parser/,
            );
        });

        test('Parser 可以被替换', () => {
            const parser1 = new MockJsonParser();
            const parser2 = new MockJsonParser();
            mgr.setParser(parser1);
            mgr.setParser(parser2);
            // 不抛错，说明替换成功
            mgr.createTableFromRawData<MonsterRow>('monster', JSON.stringify(MONSTER_DATA));
            expect(mgr.hasTable('monster')).toBe(true);
        });
    });

    // ─── 生命周期 ────────────────────────────────────

    describe('生命周期', () => {
        test('onShutdown 清空所有表', () => {
            mgr.createTable<MonsterRow>('monster', MONSTER_DATA);
            mgr.createTable<ItemRow>('item', ITEM_DATA);
            mgr.onShutdown();
            expect(mgr.hasTable('monster')).toBe(false);
            expect(mgr.hasTable('item')).toBe(false);
        });
    });

    // ─── 多表并存 ────────────────────────────────────

    describe('多表并存', () => {
        test('不同表独立存储，互不影响', () => {
            mgr.createTable<MonsterRow>('monster', MONSTER_DATA);
            mgr.createTable<ItemRow>('item', ITEM_DATA);

            expect(mgr.getRow<MonsterRow>('monster', 1001)?.name).toBe('哥布林');
            expect(mgr.getRow<ItemRow>('item', 2001)?.name).toBe('生命药水');

            // 移除一张表不影响另一张
            mgr.removeTable('monster');
            expect(mgr.hasTable('item')).toBe(true);
            expect(mgr.getRow<ItemRow>('item', 2002)?.price).toBe(200);
        });

        test('不同表可以使用不同存储模式', () => {
            mgr.createTable<MonsterRow>('monster', MONSTER_DATA, {
                storageMode: DataTableStorageMode.Map,
            });
            mgr.createTable<ItemRow>('item', ITEM_DATA, {
                storageMode: DataTableStorageMode.Array,
            });

            const monsterInfo = mgr.getTableInfo('monster');
            const itemInfo = mgr.getTableInfo('item');
            expect(monsterInfo!.storageMode).toBe(DataTableStorageMode.Map);
            expect(itemInfo!.storageMode).toBe(DataTableStorageMode.Array);
        });
    });
});

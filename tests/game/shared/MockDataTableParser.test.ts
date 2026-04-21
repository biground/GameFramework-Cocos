import { MockDataTableParser } from '@game/shared/MockDataTableParser';
import { IDataRow } from '@framework/datatable/DataTableDefs';

interface TestRow extends IDataRow {
    readonly id: number;
    readonly name: string;
    readonly value: number;
}

describe('MockDataTableParser', () => {
    let parser: MockDataTableParser;

    beforeEach(() => {
        parser = new MockDataTableParser();
    });

    afterEach(() => {
        parser.reset();
    });

    describe('parse() 数组输入', () => {
        it('解析有效的对象数组', () => {
            const data: TestRow[] = [
                { id: 1, name: '剑', value: 100 },
                { id: 2, name: '盾', value: 200 },
            ];

            const result = parser.parse<TestRow>(data);

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('剑');
            expect(result[1].value).toBe(200);
        });

        it('空数组返回空结果', () => {
            const result = parser.parse<TestRow>([]);
            expect(result).toHaveLength(0);
        });

        it('数组元素非对象时抛出错误', () => {
            expect(() => parser.parse([1, 2, 3])).toThrow('不是有效对象');
        });

        it('数组元素缺少 id 字段时抛出错误', () => {
            expect(() => parser.parse([{ name: '无id' }])).toThrow('缺少有效的 id 字段');
        });

        it('数组元素为 null 时抛出错误', () => {
            expect(() => parser.parse([null])).toThrow('不是有效对象');
        });
    });

    describe('parse() JSON 字符串输入', () => {
        it('解析有效的 JSON 数组字符串', () => {
            const jsonStr = JSON.stringify([
                { id: 1, name: 'A' },
                { id: 2, name: 'B' },
            ]);

            const result = parser.parse<TestRow>(jsonStr);

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe(1);
        });

        it('无效 JSON 字符串抛出错误', () => {
            expect(() => parser.parse('not-json')).toThrow('JSON 解析失败');
        });

        it('JSON 解析结果不是数组时抛出错误', () => {
            const jsonStr = JSON.stringify({ id: 1 });
            expect(() => parser.parse(jsonStr)).toThrow('不是数组');
        });
    });

    describe('parse() 不支持的类型', () => {
        it('传入数字类型抛出错误', () => {
            expect(() => parser.parse(42)).toThrow('不支持的数据类型');
        });

        it('传入 undefined 抛出错误', () => {
            expect(() => parser.parse(undefined)).toThrow('不支持的数据类型');
        });

        it('传入 boolean 抛出错误', () => {
            expect(() => parser.parse(true)).toThrow('不支持的数据类型');
        });
    });

    describe('registerData 预设数据', () => {
        it('通过表名字符串获取预设数据', () => {
            const presetData: TestRow[] = [
                { id: 10, name: '龙', value: 999 },
            ];
            parser.registerData('monsters', presetData);

            const result = parser.parse<TestRow>('monsters');

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('龙');
        });

        it('未注册的表名字符串尝试 JSON 解析', () => {
            expect(() => parser.parse('unknown_table')).toThrow('JSON 解析失败');
        });
    });

    describe('setParseError 错误模拟', () => {
        it('设置错误后 parse 抛出该错误', () => {
            const error = new Error('模拟解析失败');
            parser.setParseError(error);

            expect(() => parser.parse([{ id: 1 }])).toThrow('模拟解析失败');
        });

        it('设置 null 清除错误后恢复正常解析', () => {
            parser.setParseError(new Error('临时错误'));
            parser.setParseError(null);

            const result = parser.parse<TestRow>([{ id: 1, name: 'ok', value: 1 }]);
            expect(result).toHaveLength(1);
        });
    });

    describe('parseCalls 调用追踪', () => {
        it('成功解析后记录调用信息', () => {
            const data = [{ id: 1, name: 'X', value: 10 }];
            parser.parse<TestRow>(data);

            expect(parser.parseCalls).toHaveLength(1);
            expect(parser.parseCalls[0].rawData).toBe(data);
            expect(parser.parseCalls[0].resultCount).toBe(1);
        });

        it('多次解析累积调用记录', () => {
            parser.parse<TestRow>([{ id: 1, name: 'A', value: 1 }]);
            parser.parse<TestRow>([{ id: 2, name: 'B', value: 2 }, { id: 3, name: 'C', value: 3 }]);

            expect(parser.parseCalls).toHaveLength(2);
            expect(parser.parseCalls[0].resultCount).toBe(1);
            expect(parser.parseCalls[1].resultCount).toBe(2);
        });

        it('错误时不记录调用（setParseError）', () => {
            parser.setParseError(new Error('fail'));
            try { parser.parse([{ id: 1 }]); } catch { /* 预期错误 */ }

            expect(parser.parseCalls).toHaveLength(0);
        });

        it('reset() 清除调用记录', () => {
            parser.parse<TestRow>([{ id: 1, name: 'Z', value: 0 }]);
            parser.reset();

            expect(parser.parseCalls).toHaveLength(0);
        });
    });
});

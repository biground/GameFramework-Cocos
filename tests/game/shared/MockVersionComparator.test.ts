import { MockVersionComparator } from '@game/shared/MockVersionComparator';
import { VersionCompareResult } from '@framework/hotupdate/HotUpdateDefs';

describe('MockVersionComparator', () => {
    let comparator: MockVersionComparator;

    beforeEach(() => {
        comparator = new MockVersionComparator();
    });

    afterEach(() => {
        comparator.reset();
    });

    describe('默认 semver 比较', () => {
        it('远程版本更新返回 Newer', () => {
            const result = comparator.compare('1.0.0', '1.0.1');
            expect(result).toBe(VersionCompareResult.Newer);
        });

        it('远程版本更旧返回 Older', () => {
            const result = comparator.compare('2.0.0', '1.9.9');
            expect(result).toBe(VersionCompareResult.Older);
        });

        it('版本相同返回 Same', () => {
            const result = comparator.compare('1.2.3', '1.2.3');
            expect(result).toBe(VersionCompareResult.Same);
        });

        it('主版本号不同', () => {
            expect(comparator.compare('1.0.0', '2.0.0')).toBe(VersionCompareResult.Newer);
            expect(comparator.compare('3.0.0', '1.0.0')).toBe(VersionCompareResult.Older);
        });

        it('次版本号不同', () => {
            expect(comparator.compare('1.1.0', '1.2.0')).toBe(VersionCompareResult.Newer);
            expect(comparator.compare('1.5.0', '1.3.0')).toBe(VersionCompareResult.Older);
        });

        it('版本号长度不同时缺失部分视为 0', () => {
            expect(comparator.compare('1.0', '1.0.1')).toBe(VersionCompareResult.Newer);
            expect(comparator.compare('1.0.1', '1.0')).toBe(VersionCompareResult.Older);
            expect(comparator.compare('1.0', '1.0.0')).toBe(VersionCompareResult.Same);
        });
    });

    describe('setForcedResult 强制结果', () => {
        it('设置后始终返回强制结果', () => {
            comparator.setForcedResult(VersionCompareResult.Newer);

            expect(comparator.compare('9.9.9', '1.0.0')).toBe(VersionCompareResult.Newer);
            expect(comparator.compare('1.0.0', '1.0.0')).toBe(VersionCompareResult.Newer);
        });

        it('设置 null 恢复正常比较', () => {
            comparator.setForcedResult(VersionCompareResult.Same);
            comparator.setForcedResult(null);

            expect(comparator.compare('1.0.0', '2.0.0')).toBe(VersionCompareResult.Newer);
        });
    });

    describe('setVersionMap 自定义映射', () => {
        it('匹配版本对时返回映射结果', () => {
            const map = new Map<string, VersionCompareResult>();
            map.set('1.0.0|2.0.0', VersionCompareResult.Same);
            comparator.setVersionMap(map);

            expect(comparator.compare('1.0.0', '2.0.0')).toBe(VersionCompareResult.Same);
        });

        it('未匹配版本对时使用默认 semver 比较', () => {
            const map = new Map<string, VersionCompareResult>();
            map.set('1.0.0|2.0.0', VersionCompareResult.Same);
            comparator.setVersionMap(map);

            expect(comparator.compare('3.0.0', '1.0.0')).toBe(VersionCompareResult.Older);
        });

        it('forcedResult 优先于 versionMap', () => {
            const map = new Map<string, VersionCompareResult>();
            map.set('1.0.0|2.0.0', VersionCompareResult.Older);
            comparator.setVersionMap(map);
            comparator.setForcedResult(VersionCompareResult.Newer);

            expect(comparator.compare('1.0.0', '2.0.0')).toBe(VersionCompareResult.Newer);
        });
    });

    describe('compareCalls 调用追踪', () => {
        it('记录每次比较的参数和结果', () => {
            comparator.compare('1.0.0', '2.0.0');
            comparator.compare('2.0.0', '1.0.0');

            expect(comparator.compareCalls).toHaveLength(2);
            expect(comparator.compareCalls[0]).toEqual({
                local: '1.0.0',
                remote: '2.0.0',
                result: VersionCompareResult.Newer,
            });
            expect(comparator.compareCalls[1]).toEqual({
                local: '2.0.0',
                remote: '1.0.0',
                result: VersionCompareResult.Older,
            });
        });

        it('reset() 清空调用记录', () => {
            comparator.compare('1.0.0', '1.0.0');
            comparator.reset();

            expect(comparator.compareCalls).toHaveLength(0);
        });
    });

    describe('setErrorOnCompare 错误模拟', () => {
        it('设置后下一次 compare 抛出错误', () => {
            comparator.setErrorOnCompare(new Error('版本比较失败'));

            expect(() => comparator.compare('1.0.0', '2.0.0')).toThrow('版本比较失败');
        });

        it('错误只触发一次，之后恢复正常', () => {
            comparator.setErrorOnCompare(new Error('一次性错误'));

            expect(() => comparator.compare('1.0.0', '2.0.0')).toThrow('一次性错误');
            expect(comparator.compare('1.0.0', '2.0.0')).toBe(VersionCompareResult.Newer);
        });

        it('设置 null 清除错误', () => {
            comparator.setErrorOnCompare(new Error('将被清除'));
            comparator.setErrorOnCompare(null);

            expect(comparator.compare('1.0.0', '2.0.0')).toBe(VersionCompareResult.Newer);
        });

        it('抛出错误时不记录到 compareCalls', () => {
            comparator.setErrorOnCompare(new Error('fail'));
            try { comparator.compare('1.0.0', '2.0.0'); } catch { /* 预期错误 */ }

            expect(comparator.compareCalls).toHaveLength(0);
        });
    });

    describe('reset 重置', () => {
        it('reset() 清除所有状态', () => {
            comparator.setForcedResult(VersionCompareResult.Same);
            comparator.setErrorOnCompare(new Error('err'));
            const map = new Map<string, VersionCompareResult>();
            map.set('a|b', VersionCompareResult.Newer);
            comparator.setVersionMap(map);

            comparator.reset();

            // 强制结果已清除，使用默认比较
            expect(comparator.compare('1.0.0', '2.0.0')).toBe(VersionCompareResult.Newer);
            // 错误已清除
            expect(() => comparator.compare('1.0.0', '1.0.0')).not.toThrow();
            // 调用记录只有 reset 后的调用
            expect(comparator.compareCalls).toHaveLength(2);
        });
    });
});

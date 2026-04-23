import { DebugManager } from '@framework/debug/DebugManager';
import { IDebugDataSource, DebugSectionData } from '@framework/debug/DebugDefs';
import { Logger } from '@framework/debug/Logger';

// ─── 测试用 Mock DataSource ─────────────────────

class MockDataSource implements IDebugDataSource {
    public readonly name: string;
    public collectCallCount = 0;

    constructor(name: string) {
        this.name = name;
    }

    public collect(): DebugSectionData {
        this.collectCallCount++;
        return {
            title: this.name,
            entries: [{ label: 'test', value: 'mock' }],
        };
    }
}

// ─── 测试用例 ──────────────────────────────────

describe('DebugManager', () => {
    let debugManager: DebugManager;
    let logger: Logger;

    beforeEach(() => {
        jest.spyOn(console, 'debug').mockImplementation();
        jest.spyOn(console, 'info').mockImplementation();
        jest.spyOn(console, 'warn').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();

        logger = new Logger();
        logger.onInit();

        debugManager = new DebugManager();
        debugManager.onInit();
    });

    afterEach(() => {
        debugManager.onShutdown();
        logger.onShutdown();
        jest.restoreAllMocks();
    });

    // ─── 初始化 ────────────────────────────────

    describe('初始化', () => {
        test('moduleName 为 DebugManager', () => {
            expect(debugManager.moduleName).toBe('DebugManager');
        });

        test('priority 为 400', () => {
            expect(debugManager.priority).toBe(400);
        });
    });

    // ─── DataSource 注册与注销 ──────────────────

    describe('DataSource 注册与注销', () => {
        test('成功注册一个 DataSource', () => {
            const source = new MockDataSource('test');
            debugManager.registerDataSource(source);
            expect(debugManager.getDataSource('test')).toBe(source);
        });

        test('重复注册同名 DataSource 应警告且不覆盖', () => {
            const source1 = new MockDataSource('test');
            const source2 = new MockDataSource('test');
            debugManager.registerDataSource(source1);
            debugManager.registerDataSource(source2);
            expect(debugManager.getDataSource('test')).toBe(source1);
        });

        test('成功注销已注册的 DataSource', () => {
            const source = new MockDataSource('test');
            debugManager.registerDataSource(source);
            expect(debugManager.unregisterDataSource('test')).toBe(true);
            expect(debugManager.getDataSource('test')).toBeUndefined();
        });

        test('注销不存在的 DataSource 返回 false', () => {
            expect(debugManager.unregisterDataSource('nonexistent')).toBe(false);
        });
    });

    // ─── 数据采集 ────────────────────────────────

    describe('数据采集', () => {
        test('collectAll 返回所有 DataSource 的数据', () => {
            debugManager.registerDataSource(new MockDataSource('A'));
            debugManager.registerDataSource(new MockDataSource('B'));
            const snapshot = debugManager.collectAll();
            expect(snapshot.sections).toHaveLength(2);
            expect(snapshot.sections[0].title).toBe('A');
            expect(snapshot.sections[1].title).toBe('B');
        });

        test('collectAll 快照包含正确的 timestamp', () => {
            const before = Date.now();
            const snapshot = debugManager.collectAll();
            const after = Date.now();
            expect(snapshot.timestamp).toBeGreaterThanOrEqual(before);
            expect(snapshot.timestamp).toBeLessThanOrEqual(after);
        });

        test('无 DataSource 时 collectAll 返回空 sections', () => {
            const snapshot = debugManager.collectAll();
            expect(snapshot.sections).toEqual([]);
        });
    });

    // ─── 采集节流 ────────────────────────────────

    describe('采集节流', () => {
        test('onUpdate 在 collectInterval 内不重复采集', () => {
            const source = new MockDataSource('test');
            debugManager.registerDataSource(source);
            debugManager.onUpdate(0.3);
            debugManager.onUpdate(0.3);
            debugManager.onUpdate(0.3);
            // 0.9s < 1s（默认 collectInterval），不应触发采集
            expect(source.collectCallCount).toBe(0);
        });

        test('onUpdate 超过 collectInterval 后触发采集', () => {
            const source = new MockDataSource('test');
            debugManager.registerDataSource(source);
            debugManager.onUpdate(0.5);
            debugManager.onUpdate(0.6); // 累计 1.1s >= 1.0s
            expect(source.collectCallCount).toBe(1);
        });
    });

    // ─── 格式化输出 ──────────────────────────────

    describe('格式化输出', () => {
        test('getSnapshot 返回包含所有 section 的格式化字符串', () => {
            debugManager.registerDataSource(new MockDataSource('TestSection'));
            const snapshot = debugManager.getSnapshot();
            expect(snapshot).toContain('Debug Snapshot');
            expect(snapshot).toContain('[TestSection]');
            expect(snapshot).toContain('test: mock');
        });

        test('getSnapshot 无数据时返回空快照提示', () => {
            const snapshot = debugManager.getSnapshot();
            expect(snapshot).toContain('Debug Snapshot');
            expect(snapshot).toContain('无数据源');
        });
    });
});

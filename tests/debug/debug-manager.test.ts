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
            // TODO: 学员实现 - 验证 moduleName
        });

        test('priority 为 400', () => {
            // TODO: 学员实现 - 验证 priority
        });
    });

    // ─── DataSource 注册与注销 ──────────────────

    describe('DataSource 注册与注销', () => {
        test('成功注册一个 DataSource', () => {
            // TODO: 学员实现 - 注册后用 getDataSource 验证
            const source = new MockDataSource('test');
            expect(source).toBeDefined();
        });

        test('重复注册同名 DataSource 应警告且不覆盖', () => {
            // TODO: 学员实现 - 注册两次，验证警告和数据不变
        });

        test('成功注销已注册的 DataSource', () => {
            // TODO: 学员实现 - 注册后注销，验证 getDataSource 返回 undefined
        });

        test('注销不存在的 DataSource 返回 false', () => {
            // TODO: 学员实现 - 直接注销不存在的名称
        });
    });

    // ─── 数据采集 ────────────────────────────────

    describe('数据采集', () => {
        test('collectAll 返回所有 DataSource 的数据', () => {
            // TODO: 学员实现 - 注册多个 DataSource，验证快照包含所有 section
        });

        test('collectAll 快照包含正确的 timestamp', () => {
            // TODO: 学员实现 - 验证 timestamp 接近 Date.now()
        });

        test('无 DataSource 时 collectAll 返回空 sections', () => {
            // TODO: 学员实现 - 不注册任何 DataSource，验证 sections 为空数组
        });
    });

    // ─── 采集节流 ────────────────────────────────

    describe('采集节流', () => {
        test('onUpdate 在 collectInterval 内不重复采集', () => {
            // TODO: 学员实现 - 模拟多次 onUpdate，验证 collect 调用次数
        });

        test('onUpdate 超过 collectInterval 后触发采集', () => {
            // TODO: 学员实现 - 累积足够的 deltaTime，验证触发采集
        });
    });

    // ─── 格式化输出 ──────────────────────────────

    describe('格式化输出', () => {
        test('getSnapshot 返回包含所有 section 的格式化字符串', () => {
            // TODO: 学员实现 - 注册 DataSource 后调用 getSnapshot，验证包含标题和条目
        });

        test('getSnapshot 无数据时返回空快照提示', () => {
            // TODO: 学员实现 - 不注册 DataSource，验证返回值
        });
    });
});

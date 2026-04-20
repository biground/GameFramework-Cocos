import { EventDataSource } from '@framework/debug/datasources/EventDataSource';
import { Logger } from '@framework/debug/Logger';

// ─── 测试用例 ──────────────────────────────────

describe('EventDataSource', () => {
    let dataSource: EventDataSource;
    let logger: Logger;

    beforeEach(() => {
        jest.spyOn(console, 'debug').mockImplementation();
        jest.spyOn(console, 'info').mockImplementation();
        jest.spyOn(console, 'warn').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();

        logger = new Logger();
        logger.onInit();

        dataSource = new EventDataSource();
    });

    afterEach(() => {
        logger.onShutdown();
        jest.restoreAllMocks();
    });

    describe('基础属性', () => {
        test('name 为 Events', () => {
            // TODO: 学员实现 - 验证 name 属性
            expect(dataSource).toBeDefined();
        });
    });

    describe('数据采集', () => {
        test('collect 返回正确的 title', () => {
            // TODO: 学员实现 - 验证 collect 返回的 title 为 "Events"
        });

        test('collect 返回事件绑定统计信息', () => {
            // TODO: 学员实现 - 注册事件监听后验证 entries 包含统计信息
        });

        test('无事件监听时 collect 返回空 entries', () => {
            // TODO: 学员实现 - 不注册事件，验证 entries 为空数组
        });
    });
});

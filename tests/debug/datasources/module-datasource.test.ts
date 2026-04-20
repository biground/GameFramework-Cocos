import { ModuleDataSource } from '@framework/debug/datasources/ModuleDataSource';
import { Logger } from '@framework/debug/Logger';

// ─── 测试用例 ──────────────────────────────────

describe('ModuleDataSource', () => {
    let dataSource: ModuleDataSource;
    let logger: Logger;

    beforeEach(() => {
        jest.spyOn(console, 'debug').mockImplementation();
        jest.spyOn(console, 'info').mockImplementation();
        jest.spyOn(console, 'warn').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();

        logger = new Logger();
        logger.onInit();

        dataSource = new ModuleDataSource();
    });

    afterEach(() => {
        logger.onShutdown();
        jest.restoreAllMocks();
    });

    describe('基础属性', () => {
        test('name 为 Modules', () => {
            // TODO: 学员实现 - 验证 name 属性
            expect(dataSource).toBeDefined();
        });
    });

    describe('数据采集', () => {
        test('collect 返回正确的 title', () => {
            // TODO: 学员实现 - 验证 collect 返回的 title 为 "Modules"
        });

        test('collect 返回已注册模块的信息', () => {
            // TODO: 学员实现 - 注册模块后验证 entries 包含模块信息
        });

        test('无模块注册时 collect 返回空 entries', () => {
            // TODO: 学员实现 - 不注册模块，验证 entries 为空数组
        });
    });
});

import { ModuleDataSource } from '@framework/debug/datasources/ModuleDataSource';
import { Logger } from '@framework/debug/Logger';
import { GameModule } from '@framework/core/GameModule';
import { ModuleBase } from '@framework/core/ModuleBase';

// ─── 测试用 Mock Module ─────────────────────

class MockModule extends ModuleBase {
    private readonly _name: string;
    private readonly _priority: number;

    constructor(name: string, priority: number) {
        super();
        this._name = name;
        this._priority = priority;
    }

    public get moduleName(): string {
        return this._name;
    }

    public get priority(): number {
        return this._priority;
    }

    public onInit(): void {
        /* empty */
    }

    public onShutdown(): void {
        /* empty */
    }
}

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
        GameModule.shutdownAll();
        logger.onShutdown();
        jest.restoreAllMocks();
    });

    describe('基础属性', () => {
        test('name 为 Modules', () => {
            expect(dataSource.name).toBe('Modules');
        });
    });

    describe('数据采集', () => {
        test('collect 返回正确的 title', () => {
            const section = dataSource.collect();
            expect(section.title).toBe('Modules');
        });

        test('collect 返回已注册模块的信息', () => {
            GameModule.register(new MockModule('TestModule', 100));
            const section = dataSource.collect();
            expect(section.entries.length).toBeGreaterThan(0);
            expect(section.entries[0]).toEqual({ label: '模块数量', value: '1' });
            expect(section.entries[1]).toEqual({
                label: 'TestModule',
                value: 'priority=100',
            });
        });

        test('无模块注册时 collect 返回空 entries', () => {
            const section = dataSource.collect();
            expect(section.entries).toEqual([]);
        });
    });
});

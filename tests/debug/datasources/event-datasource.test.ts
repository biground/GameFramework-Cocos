import { EventDataSource } from '@framework/debug/datasources/EventDataSource';
import { Logger } from '@framework/debug/Logger';
import { EventManager } from '@framework/event/EventManager';
import { GameModule } from '@framework/core/GameModule';
import { EventKey } from '@framework/event/EventDefs';

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
        GameModule.shutdownAll();
        logger.onShutdown();
        jest.restoreAllMocks();
    });

    describe('基础属性', () => {
        test('name 为 Events', () => {
            expect(dataSource.name).toBe('Events');
        });
    });

    describe('数据采集', () => {
        test('collect 返回正确的 title', () => {
            const section = dataSource.collect();
            expect(section.title).toBe('Events');
        });

        test('collect 返回事件绑定统计信息', () => {
            const eventMgr = new EventManager();
            GameModule.register(eventMgr);

            const TEST_EVENT = new EventKey<number>('Test.Event');
            eventMgr.on(TEST_EVENT, () => {
                /* noop */
            });

            const section = dataSource.collect();
            expect(section.entries.length).toBeGreaterThan(0);
            expect(section.entries[0]).toEqual({ label: '事件类型数', value: '1' });
            expect(section.entries[1]).toEqual({ label: '总监听器数', value: '1' });
            expect(section.entries[2]).toEqual({
                label: 'Test.Event',
                value: 'listeners=1',
            });
        });

        test('无事件监听时 collect 返回空 entries', () => {
            const section = dataSource.collect();
            expect(section.entries).toEqual([]);
        });
    });
});

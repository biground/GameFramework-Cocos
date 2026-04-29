import { Logger, ConsoleLogOutput } from '@framework/debug/Logger';
import { LogLevel, LogEntry, ILogOutput } from '@framework/debug/LoggerDefs';

// ─── 测试用 Mock 输出 ──────────────────────────

class MockLogOutput implements ILogOutput {
    public entries: LogEntry[] = [];
    public log(entry: LogEntry): void {
        this.entries.push(entry);
    }
}

// ─── 测试用例 ──────────────────────────────────────

describe('Logger', () => {
    let logger: Logger;
    let spyDebug: jest.SpyInstance;
    let spyInfo: jest.SpyInstance;
    let spyWarn: jest.SpyInstance;
    let spyError: jest.SpyInstance;

    beforeEach(() => {
        // Mock console 方法（在 onInit 之前，因为 onInit 会创建 ConsoleLogOutput）
        spyDebug = jest.spyOn(console, 'debug').mockImplementation();
        spyInfo = jest.spyOn(console, 'info').mockImplementation();
        spyWarn = jest.spyOn(console, 'warn').mockImplementation();
        spyError = jest.spyOn(console, 'error').mockImplementation();

        // 创建新实例并初始化
        logger = new Logger();
        logger.onInit();
    });

    afterEach(() => {
        logger.onShutdown();
        jest.restoreAllMocks();
    });

    // ─── 初始化 ────────────────────────────────────

    describe('初始化', () => {
        test('moduleName 为 Logger', () => {
            expect(logger.moduleName).toBe('Logger');
        });

        test('priority 为 0', () => {
            expect(logger.priority).toBe(0);
        });

        test('默认日志级别为 Debug', () => {
            expect(logger.getLogLevel()).toBe(LogLevel.Debug);
        });

        test('onInit 后默认有一个 ConsoleLogOutput', () => {
            const outputs = Logger.getOutputs();
            expect(outputs.length).toBe(1);
            expect(outputs[0]).toBeInstanceOf(ConsoleLogOutput);
        });
    });

    // ─── 级别过滤 ──────────────────────────────────

    describe('级别过滤', () => {
        test('默认级别 Debug 下所有级别的日志都输出', () => {
            Logger.debug('Test', '调试消息');
            Logger.info('Test', '信息消息');
            Logger.warn('Test', '警告消息');
            Logger.error('Test', '错误消息');

            expect(spyDebug).toHaveBeenCalledTimes(1);
            expect(spyInfo).toHaveBeenCalledTimes(1);
            expect(spyWarn).toHaveBeenCalledTimes(1);
            expect(spyError).toHaveBeenCalledTimes(1);
        });

        test('设为 Warn 级别后 Debug 和 Info 被过滤', () => {
            Logger.setLevel(LogLevel.Warn);

            Logger.debug('Test', '调试消息');
            Logger.info('Test', '信息消息');
            Logger.warn('Test', '警告消息');
            Logger.error('Test', '错误消息');

            expect(spyDebug).not.toHaveBeenCalled();
            expect(spyInfo).not.toHaveBeenCalled();
            expect(spyWarn).toHaveBeenCalledTimes(1);
            expect(spyError).toHaveBeenCalledTimes(1);
        });

        test('设为 Error 级别后只有 Error 输出', () => {
            Logger.setLevel(LogLevel.Error);

            Logger.debug('Test', '调试消息');
            Logger.info('Test', '信息消息');
            Logger.warn('Test', '警告消息');
            Logger.error('Test', '错误消息');

            expect(spyDebug).not.toHaveBeenCalled();
            expect(spyInfo).not.toHaveBeenCalled();
            expect(spyWarn).not.toHaveBeenCalled();
            expect(spyError).toHaveBeenCalledTimes(1);
        });

        test('设为 None 级别后所有日志都被过滤', () => {
            Logger.setLevel(LogLevel.None);

            Logger.debug('Test', '调试消息');
            Logger.info('Test', '信息消息');
            Logger.warn('Test', '警告消息');
            Logger.error('Test', '错误消息');

            expect(spyDebug).not.toHaveBeenCalled();
            expect(spyInfo).not.toHaveBeenCalled();
            expect(spyWarn).not.toHaveBeenCalled();
            expect(spyError).not.toHaveBeenCalled();
        });
    });

    // ─── 格式化输出（带时间戳） ────────────────────

    describe('格式化输出', () => {
        test('输出包含时间戳、级别和 tag', () => {
            Logger.debug('MyModule', '消息内容', 42);
            expect(spyDebug).toHaveBeenCalledTimes(1);
            // 带颜色格式：%c[HH:MM:SS.mmm][DEBUG][MyModule]
            const callArgs = spyDebug.mock.calls[0] as unknown[];
            expect(callArgs[0]).toMatch(/^%c\[\d{2}:\d{2}:\d{2}\.\d{3}\]\[DEBUG\]\[MyModule\]$/);
            // 第二个参数是颜色样式
            expect(String(callArgs[1])).toContain('color:');
            // 后续参数是日志内容
            expect(callArgs[2]).toBe('消息内容');
            expect(callArgs[3]).toBe(42);
        });

        test('四个级别都正确输出', () => {
            Logger.debug('M', 'debug');
            Logger.info('M', 'info');
            Logger.warn('M', 'warn');
            Logger.error('M', 'error');

            expect(String((spyDebug.mock.calls[0] as unknown[])[0])).toContain('[DEBUG][M]');
            expect(String((spyInfo.mock.calls[0] as unknown[])[0])).toContain('[INFO][M]');
            expect(String((spyWarn.mock.calls[0] as unknown[])[0])).toContain('[WARN][M]');
            expect(String((spyError.mock.calls[0] as unknown[])[0])).toContain('[ERROR][M]');
        });
    });

    // ─── 静态 API ──────────────────────────────────

    describe('静态 API', () => {
        test('Logger.debug 静态调用正确输出', () => {
            Logger.debug('App', '启动完成');
            expect(spyDebug).toHaveBeenCalledTimes(1);
        });

        test('Logger.setLevel 改变过滤级别', () => {
            Logger.setLevel(LogLevel.Warn);
            expect(Logger.getLevel()).toBe(LogLevel.Warn);
        });

        test('Logger.getLevel 返回当前级别', () => {
            expect(Logger.getLevel()).toBe(LogLevel.Debug);
            Logger.setLevel(LogLevel.Error);
            expect(Logger.getLevel()).toBe(LogLevel.Error);
        });

        test('Logger.isDebugEnabled 在 Debug 级别下为 true', () => {
            Logger.setLevel(LogLevel.Debug);
            expect(Logger.isDebugEnabled).toBe(true);
        });

        test('Logger.isDebugEnabled 在 Warn 级别下为 false', () => {
            Logger.setLevel(LogLevel.Warn);
            expect(Logger.isDebugEnabled).toBe(false);
        });
    });

    // ─── 性能考量 ──────────────────────────────────

    describe('性能考量', () => {
        test('级别被过滤时 console 方法未被调用', () => {
            Logger.setLevel(LogLevel.Error);

            Logger.debug('Perf', '这条不应输出');
            Logger.info('Perf', '这条不应输出');
            Logger.warn('Perf', '这条不应输出');

            expect(spyDebug).not.toHaveBeenCalled();
            expect(spyInfo).not.toHaveBeenCalled();
            expect(spyWarn).not.toHaveBeenCalled();
        });
    });

    // ─── Tag 过滤 ──────────────────────────────────

    describe('Tag 过滤', () => {
        test('默认所有 tag 启用', () => {
            Logger.debug('ModuleA', '消息A');
            Logger.debug('ModuleB', '消息B');
            expect(spyDebug).toHaveBeenCalledTimes(2);
        });

        test('禁用特定 tag 后不输出该 tag 日志', () => {
            Logger.disableTag('Network');

            Logger.debug('Network', '网络日志');
            Logger.debug('Entity', '实体日志');

            expect(spyDebug).toHaveBeenCalledTimes(1);
        });

        test('启用特定 tag 恢复输出', () => {
            Logger.disableTag('Network');
            Logger.enableTag('Network');

            Logger.debug('Network', '网络日志');
            expect(spyDebug).toHaveBeenCalledTimes(1);
        });

        test('enableAllTags 重置为全部启用', () => {
            Logger.disableTag('A');
            Logger.disableTag('B');
            Logger.enableAllTags();

            Logger.debug('A', '消息');
            Logger.debug('B', '消息');
            expect(spyDebug).toHaveBeenCalledTimes(2);
        });

        test('disableTags 批量禁用', () => {
            Logger.disableTags(['A', 'B', 'C']);

            Logger.debug('A', '消息');
            Logger.debug('B', '消息');
            Logger.debug('C', '消息');
            Logger.debug('D', '消息');

            expect(spyDebug).toHaveBeenCalledTimes(1); // 只有 D
        });

        test('getDisabledTags 返回已禁用列表', () => {
            Logger.disableTag('X');
            Logger.disableTag('Y');
            expect(Logger.getDisabledTags().sort()).toEqual(['X', 'Y']);
        });
    });

    // ─── ILogOutput 策略 ────────────────────────────

    describe('ILogOutput 策略', () => {
        test('默认使用 ConsoleLogOutput', () => {
            Logger.debug('Test', '消息');
            expect(spyDebug).toHaveBeenCalledTimes(1);
        });

        test('可添加自定义 ILogOutput', () => {
            const mock = new MockLogOutput();
            Logger.addOutput(mock);

            Logger.info('Test', '自定义输出');

            expect(mock.entries.length).toBe(1);
            expect(mock.entries[0].tag).toBe('Test');
            expect(mock.entries[0].level).toBe(LogLevel.Info);
        });

        test('多个 output 同时接收日志', () => {
            const mock1 = new MockLogOutput();
            const mock2 = new MockLogOutput();
            Logger.addOutput(mock1);
            Logger.addOutput(mock2);

            Logger.warn('Test', '广播消息');

            // ConsoleLogOutput + mock1 + mock2 = 3 outputs
            expect(spyWarn).toHaveBeenCalledTimes(1); // Console
            expect(mock1.entries.length).toBe(1);
            expect(mock2.entries.length).toBe(1);
        });

        test('可移除特定 output', () => {
            const mock = new MockLogOutput();
            Logger.addOutput(mock);
            Logger.removeOutput(mock);

            Logger.info('Test', '消息');
            expect(mock.entries.length).toBe(0);
        });

        test('clearOutputs 清除所有输出', () => {
            Logger.clearOutputs();
            Logger.debug('Test', '无输出');
            expect(spyDebug).not.toHaveBeenCalled();
        });
    });

    // ─── 时间戳 ────────────────────────────────────

    describe('时间戳', () => {
        test('日志条目包含时间戳', () => {
            const mock = new MockLogOutput();
            Logger.addOutput(mock);

            const before = Date.now();
            Logger.info('Test', '时间戳测试');
            const after = Date.now();

            expect(mock.entries[0].timestamp).toBeGreaterThanOrEqual(before);
            expect(mock.entries[0].timestamp).toBeLessThanOrEqual(after);
        });

        test('控制台输出包含 HH:MM:SS.mmm 格式时间戳', () => {
            Logger.info('Test', '格式测试');
            const prefix = String((spyInfo.mock.calls[0] as unknown[])[0]);
            // 匹配 %c[HH:MM:SS.mmm][INFO][Test] 或 [HH:MM:SS.mmm][INFO][Test]
            expect(prefix).toMatch(/\[\d{2}:\d{2}:\d{2}\.\d{3}\]/);
        });
    });

    // ─── 错误堆栈 ──────────────────────────────────

    describe('错误堆栈', () => {
        test('Error 级别自动附带调用栈', () => {
            const mock = new MockLogOutput();
            Logger.addOutput(mock);

            Logger.error('Test', '严重错误');

            expect(mock.entries[0].stack).toBeDefined();
            expect(mock.entries[0].stack).toContain('Error');
        });

        test('非 Error 级别不附带调用栈', () => {
            const mock = new MockLogOutput();
            Logger.addOutput(mock);

            Logger.debug('Test', '调试');
            Logger.info('Test', '信息');
            Logger.warn('Test', '警告');

            expect(mock.entries[0].stack).toBeUndefined();
            expect(mock.entries[1].stack).toBeUndefined();
            expect(mock.entries[2].stack).toBeUndefined();
        });
    });

    // ─── 历史缓冲 ──────────────────────────────────

    describe('历史缓冲', () => {
        test('保留日志历史', () => {
            Logger.debug('A', '第一条');
            Logger.info('B', '第二条');

            const history = Logger.getHistory();
            expect(history.length).toBe(2);
            expect(history[0].tag).toBe('A');
            expect(history[1].tag).toBe('B');
        });

        test('超过容量时覆盖最旧条目（环形缓冲）', () => {
            Logger.setHistoryCapacity(3);

            Logger.debug('A', '1');
            Logger.debug('B', '2');
            Logger.debug('C', '3');
            Logger.debug('D', '4'); // 覆盖 A

            const history = Logger.getHistory();
            expect(history.length).toBe(3);
            expect(history[0].tag).toBe('B');
            expect(history[1].tag).toBe('C');
            expect(history[2].tag).toBe('D');
        });

        test('getHistoryCount 返回当前条目数', () => {
            Logger.debug('A', '1');
            Logger.debug('B', '2');
            expect(Logger.getHistoryCount()).toBe(2);
        });

        test('clearHistory 清空缓冲', () => {
            Logger.debug('A', '1');
            Logger.clearHistory();

            expect(Logger.getHistory().length).toBe(0);
            expect(Logger.getHistoryCount()).toBe(0);
        });

        test('被级别过滤的日志不记录到历史', () => {
            Logger.setLevel(LogLevel.Error);
            Logger.debug('Test', '被过滤');
            expect(Logger.getHistoryCount()).toBe(0);
        });
    });

    // ─── 颜色编码 ──────────────────────────────────

    describe('颜色编码', () => {
        test('默认启用颜色（输出包含 %c）', () => {
            Logger.debug('Test', '有颜色');
            const prefix = String((spyDebug.mock.calls[0] as unknown[])[0]);
            expect(prefix.startsWith('%c')).toBe(true);
        });

        test('禁用颜色后输出不包含 %c', () => {
            const outputs = Logger.getOutputs();
            const consoleOutput = outputs[0] as ConsoleLogOutput;
            consoleOutput.setColorEnabled(false);

            Logger.debug('Test', '无颜色');
            const prefix = String((spyDebug.mock.calls[0] as unknown[])[0]);
            expect(prefix.startsWith('%c')).toBe(false);
            expect(prefix).toMatch(/^\[\d{2}:\d{2}:\d{2}\.\d{3}\]\[DEBUG\]\[Test\]$/);
        });

        test('不同级别使用不同颜色样式', () => {
            Logger.debug('T', 'd');
            Logger.info('T', 'i');
            Logger.warn('T', 'w');
            Logger.error('T', 'e');

            // 每次调用的第二个参数是颜色样式字符串
            const debugStyle = String((spyDebug.mock.calls[0] as unknown[])[1]);
            const infoStyle = String((spyInfo.mock.calls[0] as unknown[])[1]);
            const warnStyle = String((spyWarn.mock.calls[0] as unknown[])[1]);
            const errorStyle = String((spyError.mock.calls[0] as unknown[])[1]);

            // 各级别颜色不同
            expect(debugStyle).not.toBe(infoStyle);
            expect(infoStyle).not.toBe(warnStyle);
            expect(warnStyle).not.toBe(errorStyle);
        });
    });

    // ─── 生命周期 ──────────────────────────────────

    describe('生命周期', () => {
        test('onInit 后静态方法可用', () => {
            Logger.info('Lifecycle', '初始化完成');
            expect(spyInfo).toHaveBeenCalledTimes(1);
        });

        test('onShutdown 重置状态', () => {
            Logger.setLevel(LogLevel.Error);
            Logger.disableTag('Test');
            logger.onShutdown();

            // shutdown 后级别应重置为默认 Debug
            const newLogger = new Logger();
            newLogger.onInit();
            expect(Logger.getLevel()).toBe(LogLevel.Debug);
            expect(Logger.getDisabledTags()).toEqual([]);
            newLogger.onShutdown();
        });
    });

    // ─── 性能计时 ──────────────────────────────────

    describe('性能计时', () => {
        test('time/timeEnd 输出耗时', () => {
            Logger.time('TestTimer');
            Logger.timeEnd('TestTimer');
            // timeEnd 应该通过 Logger.info 输出
            expect(spyInfo).toHaveBeenCalledTimes(1);
        });

        test('timeEnd 返回耗时毫秒数', () => {
            Logger.time('ReturnTest');
            const elapsed = Logger.timeEnd('ReturnTest');
            expect(elapsed).toBeGreaterThanOrEqual(0);
        });

        test('timeEnd 不存在的 label 返回 -1 并警告', () => {
            const result = Logger.timeEnd('NonExistent');
            expect(result).toBe(-1);
            // 应该有 warn 输出
            expect(spyWarn).toHaveBeenCalledTimes(1);
        });

        test('time 重复启动覆盖旧值', () => {
            Logger.time('Dup');
            Logger.time('Dup'); // 覆盖
            const elapsed = Logger.timeEnd('Dup');
            expect(elapsed).toBeGreaterThanOrEqual(0);
            // 只应输出一次（timeEnd）
            expect(spyInfo).toHaveBeenCalledTimes(1);
        });

        test('onShutdown 清空计时器', () => {
            Logger.time('WillClear');
            logger.onShutdown();
            logger.onInit();
            const result = Logger.timeEnd('WillClear');
            expect(result).toBe(-1);
        });
    });

    // ─── 生产环境裁剪 ──────────────────────────────

    describe('生产环境裁剪', () => {
        test('GFC_DEBUG 在测试环境中为 true', () => {
            expect(GFC_DEBUG).toBe(true);
        });

        test('GFC_DEBUG=true 时 debug/info 正常输出', () => {
            Logger.debug('Test', '调试消息');
            Logger.info('Test', '信息消息');
            expect(spyDebug).toHaveBeenCalledTimes(1);
            expect(spyInfo).toHaveBeenCalledTimes(1);
        });
    });

    describe('createTagLogger', () => {
        it('应返回带有 tag 属性的 TaggedLogger 对象', () => {
            const log = Logger.createTagLogger('TestModule');
            expect(log.tag).toBe('TestModule');
        });

        it('应返回包含 debug/info/warn/error 四个方法的对象', () => {
            const log = Logger.createTagLogger('TestModule');
            expect(typeof log.debug).toBe('function');
            expect(typeof log.info).toBe('function');
            expect(typeof log.warn).toBe('function');
            expect(typeof log.error).toBe('function');
        });

        it('不同 tag 应返回独立的 TaggedLogger 实例', () => {
            const logA = Logger.createTagLogger('ModuleA');
            const logB = Logger.createTagLogger('ModuleB');
            expect(logA).not.toBe(logB);
            expect(logA.tag).toBe('ModuleA');
            expect(logB.tag).toBe('ModuleB');
        });

        it('debug/info/warn/error 方法应为可调用函数（不应抛出）', () => {
            const log = Logger.createTagLogger('SmokeTest');
            expect(() => log.debug('test message')).not.toThrow();
            expect(() => log.info('test message')).not.toThrow();
            expect(() => log.warn('test message')).not.toThrow();
            expect(() => log.error('test message')).not.toThrow();
        });

        it('空 tag 字符串也应正常工作', () => {
            const log = Logger.createTagLogger('');
            expect(log.tag).toBe('');
            expect(typeof log.debug).toBe('function');
        });
    });
});

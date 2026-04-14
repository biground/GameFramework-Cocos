import { Logger } from '@framework/debug/Logger';
import { LogLevel } from '@framework/debug/LoggerDefs';

// ─── 测试用例 ──────────────────────────────────────

describe('Logger', () => {
    let logger: Logger;
    let spyDebug: jest.SpyInstance;
    let spyInfo: jest.SpyInstance;
    let spyWarn: jest.SpyInstance;
    let spyError: jest.SpyInstance;

    beforeEach(() => {
        // 创建新实例并初始化
        logger = new Logger();
        logger.onInit();

        // Mock console 方法
        spyDebug = jest.spyOn(console, 'debug').mockImplementation();
        spyInfo = jest.spyOn(console, 'info').mockImplementation();
        spyWarn = jest.spyOn(console, 'warn').mockImplementation();
        spyError = jest.spyOn(console, 'error').mockImplementation();
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

    // ─── 格式化输出 ────────────────────────────────

    describe('格式化输出', () => {
        test('debug 输出格式为 [DEBUG][tag] ...args', () => {
            Logger.debug('MyModule', '消息内容', 42);
            expect(spyDebug).toHaveBeenCalledWith('[DEBUG][MyModule]', '消息内容', 42);
        });

        test('info 输出格式为 [INFO][tag] ...args', () => {
            Logger.info('MyModule', '消息内容', 42);
            expect(spyInfo).toHaveBeenCalledWith('[INFO][MyModule]', '消息内容', 42);
        });

        test('warn 输出格式为 [WARN][tag] ...args', () => {
            Logger.warn('MyModule', '消息内容', 42);
            expect(spyWarn).toHaveBeenCalledWith('[WARN][MyModule]', '消息内容', 42);
        });

        test('error 输出格式为 [ERROR][tag] ...args', () => {
            Logger.error('MyModule', '消息内容', 42);
            expect(spyError).toHaveBeenCalledWith('[ERROR][MyModule]', '消息内容', 42);
        });
    });

    // ─── 静态 API ──────────────────────────────────

    describe('静态 API', () => {
        test('Logger.debug 静态调用正确输出', () => {
            Logger.debug('App', '启动完成');
            expect(spyDebug).toHaveBeenCalledTimes(1);
            expect(spyDebug).toHaveBeenCalledWith('[DEBUG][App]', '启动完成');
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

    // ─── 生命周期 ──────────────────────────────────

    describe('生命周期', () => {
        test('onInit 后静态方法可用', () => {
            // beforeEach 已调用 onInit，静态方法应正常工作
            Logger.info('Lifecycle', '初始化完成');
            expect(spyInfo).toHaveBeenCalledWith('[INFO][Lifecycle]', '初始化完成');
        });

        test('onShutdown 重置状态', () => {
            Logger.setLevel(LogLevel.Error);
            logger.onShutdown();

            // shutdown 后级别应重置为默认 Debug
            const newLogger = new Logger();
            newLogger.onInit();
            expect(Logger.getLevel()).toBe(LogLevel.Debug);
            newLogger.onShutdown();
        });
    });
});

import 'reflect-metadata';
import {
    Injectable,
    Inject,
    getInjectableMetadata,
    getInjectMetadata,
} from '@framework/di/Decorators';
import { Lifecycle, ServiceKey } from '@framework/di/DITypes';

// ============================================================
// 测试用 ServiceKey
// ============================================================
interface ILogger {
    info(msg: string): void;
}
interface IConfig {
    get(key: string): string;
}
const ILogger = new ServiceKey<ILogger>('ILogger');
const IConfig = new ServiceKey<IConfig>('IConfig');

// ============================================================
// @Injectable 测试
// ============================================================
describe('@Injectable 装饰器', () => {
    test('1. 默认参数应存储 Transient 生命周期', () => {
        @Injectable()
        class DefaultService {}

        expect(getInjectableMetadata(DefaultService)).toBe(Lifecycle.Transient);
    });

    test('2. 指定 Singleton 应正确存储', () => {
        @Injectable(Lifecycle.Singleton)
        class SingletonService {}

        expect(getInjectableMetadata(SingletonService)).toBe(Lifecycle.Singleton);
    });

    test('3. 指定 Transient 应正确存储', () => {
        @Injectable(Lifecycle.Transient)
        class TransientService {}

        expect(getInjectableMetadata(TransientService)).toBe(Lifecycle.Transient);
    });

    test('4. 未标记 @Injectable 的类应返回 undefined', () => {
        class PlainClass {}

        expect(getInjectableMetadata(PlainClass)).toBeUndefined();
    });

    test('5. 不同类的元数据互不干扰', () => {
        @Injectable(Lifecycle.Singleton)
        class ServiceA {}

        @Injectable(Lifecycle.Transient)
        class ServiceB {}

        expect(getInjectableMetadata(ServiceA)).toBe(Lifecycle.Singleton);
        expect(getInjectableMetadata(ServiceB)).toBe(Lifecycle.Transient);
    });
});

// ============================================================
// @Inject 测试
// ============================================================
describe('@Inject 装饰器', () => {
    test('6. 单参数应正确存储 paramIndex → ServiceKey', () => {
        class SingleDep {
            constructor(@Inject(ILogger) public logger: ILogger) {}
        }

        const map = getInjectMetadata(SingleDep);
        expect(map).toBeDefined();
        expect(map!.size).toBe(1);
        expect(map!.get(0)).toBe(ILogger);
    });

    test('7. 多参数应正确映射各自的 ServiceKey', () => {
        class MultiDep {
            constructor(
                @Inject(ILogger) public logger: ILogger,
                @Inject(IConfig) public config: IConfig,
            ) {}
        }

        const map = getInjectMetadata(MultiDep);
        expect(map).toBeDefined();
        expect(map!.size).toBe(2);
        expect(map!.get(0)).toBe(ILogger);
        expect(map!.get(1)).toBe(IConfig);
    });

    test('8. 未标记 @Inject 的类应返回 undefined', () => {
        class NoDeps {
            constructor() {}
        }

        expect(getInjectMetadata(NoDeps)).toBeUndefined();
    });

    test('9. 不同类的 @Inject 元数据互不干扰', () => {
        class ServiceX {
            constructor(@Inject(ILogger) public logger: ILogger) {}
        }
        class ServiceY {
            constructor(@Inject(IConfig) public config: IConfig) {}
        }

        const mapX = getInjectMetadata(ServiceX);
        const mapY = getInjectMetadata(ServiceY);

        expect(mapX!.get(0)).toBe(ILogger);
        expect(mapY!.get(0)).toBe(IConfig);
        expect(mapX!.size).toBe(1);
        expect(mapY!.size).toBe(1);
    });
});

// ============================================================
// 组合使用测试
// ============================================================
describe('@Injectable + @Inject 组合使用', () => {
    test('10. 一个类同时使用 @Injectable 和 @Inject', () => {
        @Injectable(Lifecycle.Singleton)
        class GameService {
            constructor(
                @Inject(ILogger) public logger: ILogger,
                @Inject(IConfig) public config: IConfig,
            ) {}
        }

        // 验证 @Injectable
        expect(getInjectableMetadata(GameService)).toBe(Lifecycle.Singleton);

        // 验证 @Inject
        const map = getInjectMetadata(GameService);
        expect(map).toBeDefined();
        expect(map!.size).toBe(2);
        expect(map!.get(0)).toBe(ILogger);
        expect(map!.get(1)).toBe(IConfig);
    });
});

import 'reflect-metadata';
import { Container } from '../../assets/scripts/framework/di/Container';
import { ServiceKey } from '../../assets/scripts/framework/di/DITypes';
import { Inject } from '../../assets/scripts/framework/di/Decorators';

// ============================================================
// 测试用的接口和实现
// ============================================================

interface ILogger {
    log(msg: string): string;
}

interface IDatabase {
    query(sql: string): string;
}

interface IService {
    execute(): string;
}

const ILogger = new ServiceKey<ILogger>('ILogger');
const IDatabase = new ServiceKey<IDatabase>('IDatabase');
const IService = new ServiceKey<IService>('IService');

class ConsoleLogger implements ILogger {
    log(msg: string): string {
        return `[LOG] ${msg}`;
    }
}

class MockDatabase implements IDatabase {
    query(sql: string): string {
        return `result of: ${sql}`;
    }
}

// ============================================================
// 测试用例
// ============================================================

describe('Container', () => {
    let container: Container;

    beforeEach(() => {
        container = new Container();
    });

    // --- bind + resolve 基本流程 ---

    test('bind 构造函数并 resolve 得到实例', () => {
        container.bind(ILogger).to(ConsoleLogger);
        const logger = container.resolve(ILogger);
        expect(logger).toBeInstanceOf(ConsoleLogger);
        expect(logger.log('hello')).toBe('[LOG] hello');
    });

    test('bind 工厂函数并 resolve 得到实例', () => {
        container.bind(ILogger).toFactory(() => new ConsoleLogger());
        const logger = container.resolve(ILogger);
        expect(logger.log('factory')).toBe('[LOG] factory');
    });

    test('bind toValue 直接绑定已有实例', () => {
        const existing = new ConsoleLogger();
        container.bind(ILogger).toValue(existing);
        const resolved = container.resolve(ILogger);
        expect(resolved).toBe(existing); // 严格相等，同一个引用
    });

    // --- 生命周期 ---

    test('Transient（默认）每次 resolve 返回新实例', () => {
        container.bind(ILogger).to(ConsoleLogger).inTransientScope();
        const a = container.resolve(ILogger);
        const b = container.resolve(ILogger);
        expect(a).not.toBe(b);
    });

    test('Singleton 多次 resolve 返回同一实例', () => {
        container.bind(ILogger).to(ConsoleLogger).inSingletonScope();
        const a = container.resolve(ILogger);
        const b = container.resolve(ILogger);
        expect(a).toBe(b);
    });

    test('toValue 绑定的实例始终是同一个（隐式单例）', () => {
        const instance = new ConsoleLogger();
        container.bind(ILogger).toValue(instance);
        expect(container.resolve(ILogger)).toBe(instance);
        expect(container.resolve(ILogger)).toBe(instance);
    });

    // --- has / unbind ---

    test('has 检测已绑定服务返回 true', () => {
        container.bind(ILogger).to(ConsoleLogger);
        expect(container.has(ILogger)).toBe(true);
    });

    test('has 检测未绑定服务返回 false', () => {
        expect(container.has(ILogger)).toBe(false);
    });

    test('unbind 后 has 返回 false', () => {
        container.bind(ILogger).to(ConsoleLogger);
        container.unbind(ILogger);
        expect(container.has(ILogger)).toBe(false);
    });

    test('resolve 未绑定的服务抛出错误', () => {
        expect(() => container.resolve(ILogger)).toThrow();
    });

    // --- 子容器 ---

    test('子容器可以继承父容器的绑定', () => {
        container.bind(ILogger).to(ConsoleLogger).inSingletonScope();
        const child = container.createChild();
        const logger = child.resolve(ILogger);
        expect(logger).toBeInstanceOf(ConsoleLogger);
    });

    test('子容器的绑定不影响父容器', () => {
        const child = container.createChild();
        child.bind(ILogger).to(ConsoleLogger);
        expect(child.has(ILogger)).toBe(true);
        expect(container.has(ILogger)).toBe(false);
    });

    test('子容器可以覆盖父容器的绑定', () => {
        class ParentLogger implements ILogger {
            log(msg: string): string {
                return `[PARENT] ${msg}`;
            }
        }
        container.bind(ILogger).to(ParentLogger);
        const child = container.createChild();
        child.bind(ILogger).to(ConsoleLogger); // 覆盖
        expect(child.resolve(ILogger)).toBeInstanceOf(ConsoleLogger);
        expect(container.resolve(ILogger)).toBeInstanceOf(ParentLogger);
    });

    // --- clear ---

    test('clear 清除所有绑定', () => {
        container.bind(ILogger).to(ConsoleLogger);
        container.bind(IDatabase).to(MockDatabase);
        container.clear();
        expect(container.has(ILogger)).toBe(false);
        expect(container.has(IDatabase)).toBe(false);
    });

    // --- 重复绑定 ---

    test('重复 bind 同一个 key 应覆盖旧绑定', () => {
        class OldLogger implements ILogger {
            log(msg: string): string {
                return `[OLD] ${msg}`;
            }
        }
        container.bind(ILogger).to(OldLogger);
        container.bind(ILogger).to(ConsoleLogger); // 覆盖
        const logger = container.resolve(ILogger);
        expect(logger).toBeInstanceOf(ConsoleLogger);
    });

    // --- @Inject 自动注入 ---

    test('resolve 自动注入 @Inject 标记的构造函数参数', () => {
        class GameService implements IService {
            constructor(
                @Inject(ILogger) public logger: ILogger,
                @Inject(IDatabase) public db: IDatabase,
            ) {}
            execute(): string {
                return this.logger.log(this.db.query('SELECT 1'));
            }
        }

        container.bind(ILogger).to(ConsoleLogger);
        container.bind(IDatabase).to(MockDatabase);
        container.bind(IService).to(GameService);

        const service = container.resolve(IService);
        expect(service.execute()).toBe('[LOG] result of: SELECT 1');
    });

    test('resolve 无 @Inject 的类仍以无参方式创建', () => {
        container.bind(ILogger).to(ConsoleLogger);
        const logger = container.resolve(ILogger);
        expect(logger).toBeInstanceOf(ConsoleLogger);
    });

    test('resolve 支持多级依赖链（A → B → C）', () => {
        interface IC {
            value(): string;
        }
        const IC = new ServiceKey<IC>('IC');

        class C implements IC {
            value(): string {
                return 'C';
            }
        }

        interface IB {
            value(): string;
        }
        const IB = new ServiceKey<IB>('IB');

        class B implements IB {
            constructor(@Inject(IC) private c: IC) {}
            value(): string {
                return `B(${this.c.value()})`;
            }
        }

        interface IA {
            value(): string;
        }
        const IA = new ServiceKey<IA>('IA');

        class A implements IA {
            constructor(@Inject(IB) private b: IB) {}
            value(): string {
                return `A(${this.b.value()})`;
            }
        }

        container.bind(IC).to(C);
        container.bind(IB).to(B);
        container.bind(IA).to(A);

        const a = container.resolve(IA);
        expect(a.value()).toBe('A(B(C))');
    });

    // --- 循环依赖检测 ---

    test('resolve 检测到循环依赖时抛出错误', () => {
        interface IFoo {
            name: string;
        }
        interface IBar {
            name: string;
        }
        const IFoo = new ServiceKey<IFoo>('IFoo');
        const IBar = new ServiceKey<IBar>('IBar');

        class Foo implements IFoo {
            name = 'foo';
            constructor(@Inject(IBar) public bar: IBar) {}
        }
        class Bar implements IBar {
            name = 'bar';
            constructor(@Inject(IFoo) public foo: IFoo) {}
        }

        container.bind(IFoo).to(Foo);
        container.bind(IBar).to(Bar);

        expect(() => container.resolve(IFoo)).toThrow(/检测到循环依赖/);
    });

    test('Singleton + @Inject：依赖只创建一次', () => {
        let loggerCount = 0;
        class CountedLogger implements ILogger {
            constructor() {
                loggerCount++;
            }
            log(msg: string): string {
                return `[LOG] ${msg}`;
            }
        }

        class ServiceA implements IService {
            constructor(@Inject(ILogger) public logger: ILogger) {}
            execute(): string {
                return 'A';
            }
        }

        container.bind(ILogger).to(CountedLogger).inSingletonScope();
        container.bind(IService).to(ServiceA);

        container.resolve(IService);
        container.resolve(IService);

        expect(loggerCount).toBe(1); // Logger 只创建一次
    });
});

import { ModuleBase } from '../../assets/scripts/framework/core/ModuleBase';
import { GameModule } from '../../assets/scripts/framework/core/GameModule';
import { GameEntry } from '../../assets/scripts/framework/core/GameEntry';

// TODO: 大圆，请实现以下测试用例
//
// 首先，你需要创建一个 MockModule 类继承 ModuleBase，用于测试：
// - 可以自定义 moduleName 和 priority
// - 记录 onInit / onUpdate / onShutdown 的调用次数和顺序
// - 提示：可以用数组记录调用顺序，比如 callLog: string[]

class MockModule extends ModuleBase {
    public get moduleName(): string {
        return 'MockModule';
    }
    public get priority(): number {
        return 100;
    }
    public onInit(): void {
        this.callLog.push(`${this.moduleName} onInit`);
    }
    public onUpdate(deltaTime: number): void {
        this.callLog.push(`${this.moduleName} onUpdate ${deltaTime}`);
    }
    public onShutdown(): void {
        this.callLog.push(`${this.moduleName} onShutdown`);
    }
    public callLog: string[] = [];
}

describe('GameModule', () => {
    // 每个测试前清理注册表，避免测试间相互影响
    afterEach(() => {
        GameModule.shutdownAll();
    });

    it('注册模块后应该能通过 getModule 获取', () => {
        const mockModule = new MockModule();
        GameModule.register(mockModule);
        const retrievedModule = GameModule.getModule<MockModule>('MockModule');
        expect(retrievedModule).toBe(mockModule);
    });

    it('重复注册同名模块应该抛出错误', () => {
        const mockModule1 = new MockModule();
        const mockModule2 = new MockModule();
        GameModule.register(mockModule1);
        expect(() => GameModule.register(mockModule2)).toThrow();
    });

    it('获取不存在的模块应该抛出错误', () => {
        // TODO: 不注册任何模块，直接 getModule 应该抛出 Error
        expect(() => GameModule.getModule<MockModule>('NonExistentModule')).toThrow();
    });

    it('update 应该按 priority 从小到大的顺序调用', () => {
        // TODO: 注册多个不同 priority 的模块，调用 update 后验证调用顺序
        const callLog: string[] = [];
        class MockModuleA extends MockModule {
            public get moduleName(): string {
                return 'MockModuleA';
            }
            public get priority(): number {
                return 50;
            }
            public onUpdate(deltaTime: number): void {
                callLog.push(`${this.moduleName} onUpdate ${deltaTime}`);
            }
        }
        class MockModuleB extends MockModule {
            public get moduleName(): string {
                return 'MockModuleB';
            }
            public get priority(): number {
                return 100;
            }
            public onUpdate(deltaTime: number): void {
                callLog.push(`${this.moduleName} onUpdate ${deltaTime}`);
            }
        }
        const moduleA = new MockModuleA();
        const moduleB = new MockModuleB();
        GameModule.register(moduleA);
        GameModule.register(moduleB);
        GameModule.update(16);
        expect(callLog).toEqual(['MockModuleA onUpdate 16', 'MockModuleB onUpdate 16']);
    });

    it('shutdownAll 应该按 priority 从大到小的逆序调用', () => {
        // TODO: 注册多个不同 priority 的模块，调用 shutdownAll 后验证调用顺序
        const callLog: string[] = [];
        class MockModuleA extends MockModule {
            public get moduleName(): string {
                return 'MockModuleA';
            }
            public get priority(): number {
                return 50;
            }
            public onShutdown(): void {
                callLog.push(`${this.moduleName} onShutdown`);
            }
        }
        class MockModuleB extends MockModule {
            public get moduleName(): string {
                return 'MockModuleB';
            }
            public get priority(): number {
                return 100;
            }
            public onShutdown(): void {
                callLog.push(`${this.moduleName} onShutdown`);
            }
        }
        const moduleA = new MockModuleA();
        const moduleB = new MockModuleB();
        GameModule.register(moduleA);
        GameModule.register(moduleB);
        GameModule.shutdownAll();
        expect(callLog).toEqual(['MockModuleB onShutdown', 'MockModuleA onShutdown']);
    });

    it('shutdownAll 后注册表应该被清空', () => {
        // TODO: 注册模块，shutdownAll 后 hasModule 应该返回 false
        const mockModule = new MockModule();
        GameModule.register(mockModule);
        GameModule.shutdownAll();
        expect(GameModule.hasModule('MockModule')).toBe(false);
    });
});

describe('GameEntry', () => {
    afterEach(() => {
        GameEntry.shutdown();
    });

    it('应该正确委托给 GameModule', () => {
        // TODO: 通过 GameEntry 注册模块，验证功能正确
        const mockModule = new MockModule();
        GameEntry.registerModule(mockModule);
        const retrievedModule = GameEntry.getModule<MockModule>('MockModule');
        expect(retrievedModule).toBe(mockModule);
    });
});

import { ModuleBase } from '../../assets/scripts/framework/core/ModuleBase';
import { GameModule } from '../../assets/scripts/framework/core/GameModule';
import { GameEntry } from '../../assets/scripts/framework/core/GameEntry';

// TODO: 大圆，请实现以下测试用例
//
// 首先，你需要创建一个 MockModule 类继承 ModuleBase，用于测试：
// - 可以自定义 moduleName 和 priority
// - 记录 onInit / onUpdate / onShutdown 的调用次数和顺序
// - 提示：可以用数组记录调用顺序，比如 callLog: string[]

describe('GameModule', () => {
    // 每个测试前清理注册表，避免测试间相互影响
    afterEach(() => {
        GameModule.shutdownAll();
    });

    it('注册模块后应该能通过 getModule 获取', () => {
        // TODO: 创建 MockModule，注册后用 getModule 获取，验证是同一个实例
    });

    it('重复注册同名模块应该抛出错误', () => {
        // TODO: 注册两个同名模块，第二次应该抛出 Error
    });

    it('获取不存在的模块应该抛出错误', () => {
        // TODO: 不注册任何模块，直接 getModule 应该抛出 Error
    });

    it('update 应该按 priority 从小到大的顺序调用', () => {
        // TODO: 注册多个不同 priority 的模块，调用 update 后验证调用顺序
        // 提示：用一个共享数组记录每个模块 onUpdate 被调用时 push 自己的名字
    });

    it('shutdownAll 应该按 priority 从大到小的逆序调用', () => {
        // TODO: 注册多个不同 priority 的模块，调用 shutdownAll 后验证调用顺序
    });

    it('shutdownAll 后注册表应该被清空', () => {
        // TODO: 注册模块，shutdownAll 后 hasModule 应该返回 false
    });
});

describe('GameEntry', () => {
    afterEach(() => {
        GameEntry.shutdown();
    });

    it('应该正确委托给 GameModule', () => {
        // TODO: 通过 GameEntry 注册模块，验证功能正确
    });
});

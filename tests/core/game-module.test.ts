import { ModuleBase } from '../../assets/scripts/framework/core/ModuleBase';
import { GameModule } from '../../assets/scripts/framework/core/GameModule';
import { GameEntry } from '../../assets/scripts/framework/core/GameEntry';

// TODO: 大圆，请实现以下测试用例
// 提示：你需要先创建一个 MockModule 继承 ModuleBase 用于测试

describe('GameModule', () => {
    // 每个测试前清理注册表
    afterEach(() => {
        GameModule.shutdownAll();
    });

    it('should register and retrieve a module', () => {
        // TODO
    });

    it('should throw error when registering duplicate module name', () => {
        // TODO
    });

    it('should throw error when getting non-existent module', () => {
        // TODO
    });

    it('should update modules in priority order (ascending)', () => {
        // TODO
    });

    it('should shutdown modules in reverse priority order (descending)', () => {
        // TODO
    });

    it('should clear all modules after shutdownAll', () => {
        // TODO
    });
});

describe('GameEntry', () => {
    afterEach(() => {
        GameEntry.shutdown();
    });

    it('should delegate to GameModule correctly', () => {
        // TODO
    });
});

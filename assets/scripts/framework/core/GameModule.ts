import { ModuleBase } from './ModuleBase';

/**
 * 游戏模块管理器
 * 负责注册、获取、驱动所有框架模块的生命周期
 *
 * 设计参考：Unity GameFramework 的 GameEntry
 */
export class GameModule {
    // TODO: 大圆，请实现以下内容：
    // 内部存储：Map<string, ModuleBase> + priority 排序数组
    //
    // 静态方法：
    // 1. register(module: ModuleBase): void — 注册模块（重复注册抛 Error）
    // 2. getModule<T extends ModuleBase>(name: string): T — 获取模块（找不到抛 Error）
    // 3. hasModule(name: string): boolean — 检查是否已注册
    // 4. update(deltaTime: number): void — 按 priority 顺序调用 onUpdate
    // 5. shutdownAll(): void — 逆序 shutdown + 清空
}

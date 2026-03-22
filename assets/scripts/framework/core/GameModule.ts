import { ModuleBase } from './ModuleBase';

/**
 * 游戏模块管理器
 * 负责注册、获取、驱动所有框架模块的生命周期
 *
 * 设计参考：Unity GameFramework 的 GameEntry
 */
export class GameModule {
    // TODO: 大圆，请实现以下内容：
    //
    // 私有静态属性：
    // - _modules: Map<string, ModuleBase> — 模块存储映射表
    // - _sortedModules: ModuleBase[] — 按 priority 排序的模块数组
    // - _isDirty: boolean — 标记排序是否需要更新（脏标记优化）
    //
    // 静态方法：
    // 1. register(module: ModuleBase): void
    //    - 注册模块到映射表
    //    - 如果已存在同名模块，抛出 Error
    //    - 调用模块的 onInit()
    //    - 设置脏标记为 true
    //
    // 2. getModule<T extends ModuleBase>(name: string): T
    //    - 从映射表获取模块并转换类型
    //    - 找不到时抛出 Error（不要返回 undefined）
    //
    // 3. hasModule(name: string): boolean
    //    - 检查模块是否已注册
    //
    // 4. update(deltaTime: number): void
    //    - 如果脏标记为 true，重新排序 _sortedModules（按 priority 升序）
    //    - 按顺序调用每个模块的 onUpdate(deltaTime)
    //
    // 5. shutdownAll(): void
    //    - 按 priority 降序调用每个模块的 onShutdown()
    //    - 清空 _modules 和 _sortedModules
    //
    // 提示：
    // - 脏标记（dirty flag）模式可以避免每次 update 都排序
    // - 排序用 Array.sort((a, b) => a.priority - b.priority)
    // - shutdown 时逆序遍历排序后的数组
}

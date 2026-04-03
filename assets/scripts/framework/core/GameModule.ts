import { ModuleBase } from './ModuleBase';

/**
 * 游戏模块管理器
 * 负责注册、获取、驱动所有框架模块的生命周期
 *
 * 设计参考：Unity GameFramework 的 GameEntry
 */
export class GameModule {
    private static _modules: Map<string, ModuleBase> = new Map();
    private static _sortedModules: ModuleBase[] = [];
    private static _isDirty: boolean = false;

    /**
     * 注册模块
     * @param {ModuleBase} module 模块实例
     * @param {boolean} allowReplace 是否允许替换已有同名模块（默认 false）
     * @throws {Error} 如果模块名称已存在且不允许替换
     */
    public static register(module: ModuleBase, allowReplace: boolean = false): void {
        const name = module.moduleName;
        if (this._modules.has(name)) {
            if (!allowReplace) {
                throw new Error(`模块 "${name}" 已经注册。`);
            }
            this._modules.get(name)!.onShutdown();
        }
        this._modules.set(name, module);
        module.onInit();
        this._isDirty = true;
    }
    /**
     * 获取模块
     * @param {string} name 模块名称
     * @returns {T} 模块实例
     * @throws {Error} 如果模块未找到
     */
    public static getModule<T extends ModuleBase>(name: string): T {
        const module = this._modules.get(name);
        if (!module) {
            throw new Error(`模块 "${name}" 未找到。`);
        }
        return module as T;
    }

    /**
     * 检查模块是否已注册
     * @param {string} name 模块名称
     * @returns {boolean} 是否已注册
     */
    public static hasModule(name: string): boolean {
        return this._modules.has(name);
    }

    /**
     * 更新所有模块
     * @param {number} deltaTime 时间增量
     */
    public static update(deltaTime: number): void {
        if (this._isDirty) {
            this._sortedModules = Array.from(this._modules.values()).sort(
                (a, b) => a.priority - b.priority,
            );
            this._isDirty = false;
        }
        for (const mod of this._sortedModules) {
            mod.onUpdate(deltaTime);
        }
    }

    /**
     * 关闭所有模块
     */
    public static shutdownAll(): void {
        // 按 priority 降序调用 onShutdown，倒序遍历已排序数组
        if (this._isDirty) {
            this._sortedModules = Array.from(this._modules.values()).sort(
                (a, b) => a.priority - b.priority,
            );
            this._isDirty = false;
        }
        for (let i = this._sortedModules.length - 1; i >= 0; i--) {
            this._sortedModules[i].onShutdown();
        }
        this._modules.clear();
        this._sortedModules = [];
        this._isDirty = false;
    }
}

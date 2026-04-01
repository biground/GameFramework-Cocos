/**
 * 框架模块基类
 * 所有框架模块都必须继承此类
 *
 * @abstract
 * @example
 * ```typescript
 * class MyManager extends ModuleBase {
 *     get moduleName(): string { return 'MyManager'; }
 *     get priority(): number { return 100; }
 *     onInit(): void { // 初始化逻辑 }
 *     onShutdown(): void { // 清理逻辑 }
 * }
 * ```
 */
export abstract class ModuleBase {
    /**
     * 模块名称，用于注册表查找
     * @returns {string} 模块名称
     */
    public abstract get moduleName(): string;
    /**
     * 执行优先级，数字越小越先执行
     * @returns {number} 模块优先级
     */
    public abstract get priority(): number;
    /**
     * 模块初始化时调用
     */
    public abstract onInit(): void;
    /**
     * 每帧更新，默认空实现
     * @param {number} deltaTime 时间增量
     */
    public onUpdate(_deltaTime: number): void {
        /* 默认空实现 */
    }
    /**
     * 模块销毁时调用
     */
    public abstract onShutdown(): void;
}

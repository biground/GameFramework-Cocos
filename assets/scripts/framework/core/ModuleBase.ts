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
    // TODO: 大圆，请实现以下内容：
    // 1. 只读抽象属性 moduleName: string — 模块名称，用于注册表查找
    // 2. 只读抽象属性 priority: number — 执行优先级，数字越小越先执行
    // 3. 抽象方法 onInit(): void — 模块初始化时调用
    // 4. 可覆盖方法 onUpdate(deltaTime: number): void — 每帧更新，默认空实现
    // 5. 抽象方法 onShutdown(): void — 模块销毁时调用
    //
    // 提示：
    // - 使用 abstract get xxx() 定义只读抽象属性
    // - onUpdate 给一个默认空实现，子类按需覆盖
    // - 所有方法和属性都要有中文 JSDoc 注释
}

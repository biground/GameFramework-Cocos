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
    // 1. 只读属性 moduleName: string（抽象）
    // 2. 只读属性 priority: number（抽象，数字越小越先执行）
    // 3. 抽象方法 onInit(): void
    // 4. 可覆盖方法 onUpdate(deltaTime: number): void（默认空实现）
    // 5. 抽象方法 onShutdown(): void
}

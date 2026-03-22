import { ModuleBase } from './ModuleBase';

/**
 * 游戏框架入口（门面模式）
 * 提供统一的 API 访问框架功能
 *
 * 设计参考：Unity GameFramework 的 GameEntry
 *
 * @example
 * ```typescript
 * // 注册模块
 * GameEntry.registerModule(new EventManager());
 * GameEntry.registerModule(new UIManager());
 *
 * // 获取模块
 * const eventMgr = GameEntry.getModule<EventManager>('EventManager');
 *
 * // 主循环中调用
 * GameEntry.update(deltaTime);
 *
 * // 游戏结束时
 * GameEntry.shutdown();
 * ```
 */
export class GameEntry {
    // TODO: 大圆，请实现以下内容：
    // 委托给 GameModule 的门面方法：
    // 1. static registerModule(module: ModuleBase): void
    // 2. static getModule<T extends ModuleBase>(name: string): T
    // 3. static update(deltaTime: number): void
    // 4. static shutdown(): void
}

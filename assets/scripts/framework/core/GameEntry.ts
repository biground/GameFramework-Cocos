import { GameModule } from './GameModule';
import { ModuleBase } from './ModuleBase';

/**
 * 游戏框架入口（门面模式 Facade）
 * 提供统一的 API 访问框架功能
 *
 * 设计参考：Unity GameFramework 的 GameEntry
 * - 门面模式的价值在于：对外提供简洁统一的 API
 * - 未来可以在这里加日志、性能监控等横切关注点
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
    /** 注册模块到框架 */
    static registerModule(mod: ModuleBase): void {
        GameModule.register(mod);
    }
    /** 获取已注册的模块 */
    static getModule<T extends ModuleBase>(name: string): T {
        return GameModule.getModule<T>(name);
    }
    /** 驱动所有模块更新 */
    static update(deltaTime: number): void {
        GameModule.update(deltaTime);
    }
    /** 关闭所有模块 */
    static shutdown(): void {
        GameModule.shutdownAll();
    }
}

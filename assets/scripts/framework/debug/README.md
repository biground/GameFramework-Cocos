# Logger（日志管理器）

## 职责

统一管理游戏日志的输出、级别过滤、格式化功能。**不负责**日志持久化（文件写入）、远程日志上报、可视化调试面板（DebugPanel 独立模块）。

## 核心概念

### 静态 API + ModuleBase 混合方案

Logger 采用 **Static Singleton + Lifecycle** 混合设计：

- **静态 API**：`Logger.info('tag', ...args)` 全局便捷调用，无需获取模块引用
- **ModuleBase 生命周期**：通过框架注册，`onInit()` 绑定静态实例引用，`onShutdown()` 清理并重置

为什么不用纯静态？框架需要统一管理所有模块的初始化/销毁顺序，Logger 作为 priority=0 保证最先初始化、最后销毁。

### 级别过滤

```
Debug(0) < Info(1) < Warn(2) < Error(3) < None(4)
```

设置级别后，低于该级别的日志被过滤，对应的 `console` 方法不会被调用（零开销）。

### 格式化输出

所有日志按 `[LEVEL][tag] ...args` 格式输出：

```
[DEBUG][ResourceManager] 开始加载资源, {id: "hero.png"}
[WARN][Network] 连接超时, retryCount: 3
```

### 性能优化

- **rest params**：使用 `...args: unknown[]` 代替模板字符串，避免被过滤的日志触发字符串拼接
- **静态常量映射**：`_levelLabels` 和 `_consoleMethodNames` 为 `static readonly`，避免热路径上的对象分配
- **isDebugEnabled 守卫**：用于昂贵的调试逻辑的惰性求值

```typescript
// 避免不必要的序列化开销
if (Logger.isDebugEnabled) {
    Logger.debug('ECS', '实体快照', JSON.stringify(entity));
}
```

## 文件清单

| 文件 | 职责 |
|------|------|
| `LoggerDefs.ts` | LogLevel 枚举定义 |
| `Logger.ts` | Logger 类实现（静态 API + ModuleBase） |

## 对外 API

```typescript
class Logger extends ModuleBase {
    // 日志输出（静态 API）
    static debug(tag: string, ...args: unknown[]): void;
    static info(tag: string, ...args: unknown[]): void;
    static warn(tag: string, ...args: unknown[]): void;
    static error(tag: string, ...args: unknown[]): void;

    // 级别控制（静态 API）
    static setLevel(level: LogLevel): void;
    static getLevel(): LogLevel;
    static get isDebugEnabled(): boolean;

    // 实例方法（框架内部使用）
    setLogLevel(level: LogLevel): void;
    getLogLevel(): LogLevel;

    // ModuleBase
    readonly moduleName: string;  // "Logger"
    readonly priority: number;    // 0
    onInit(): void;
    onShutdown(): void;
}
```

## 使用示例

```typescript
// 基本日志输出
Logger.debug('GameLoop', '帧率', fps);
Logger.info('UI', '打开界面', formName);
Logger.warn('Pool', '对象池已满', poolName, currentSize);
Logger.error('Network', '连接失败', errorCode, errorMsg);

// 设置日志级别（生产环境只输出 Warn 以上）
Logger.setLevel(LogLevel.Warn);

// 惰性求值守卫（避免昂贵的序列化）
if (Logger.isDebugEnabled) {
    Logger.debug('State', '完整状态', JSON.stringify(state));
}
```

## 设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| priority = 0 | 基础设施最高优先级 | 其他所有模块可能在 onInit 中输出日志，Logger 必须最先就绪 |
| 混合方案而非纯静态 | Static Singleton + Lifecycle | 既保留 `Logger.info()` 的便捷调用，又纳入框架生命周期管理 |
| rest params | `...args: unknown[]` | 避免模板字符串 `${obj}` 在日志被过滤时仍触发 toString 求值 |
| _levelLabels 静态常量 | `static readonly Record` | 避免 _log 每次调用都创建临时对象，减少 GC 压力 |
| _consoleMethodNames 映射 | 字符串名而非引用 | 使用 `console[methodName]` 动态调用，确保 Jest mock 生效 |
| _defaultLevel 降级 | 实例化前也能用 | `Logger._instance` 为 null 时回退到静态默认级别 |
| onShutdown 重置 | 清理实例引用 + 重置默认级别 | 保证下次初始化时是干净状态 |

## 依赖

- 无（基础设施模块，priority=0）

## 被谁依赖

- 所有其他模块（可选依赖，用于日志输出）

## 已知限制

- 无日志持久化（文件写入、远程上报）
- 无运行时动态切换输出目标（如切换到自定义 writer）
- 无彩色输出支持（浏览器/Node.js 不同环境的 ANSI 颜色）
- 无 DebugPanel 可视化面板（独立模块，待开发）

## 后续拓展方向

1. **ILogWriter 策略注入**：支持自定义日志输出目标（文件、远程服务器、UI 面板）
2. **日志缓冲区**：缓存最近 N 条日志，供 DebugPanel 显示
3. **条件编译**：通过宏定义在发布包中完全移除 Debug 级别代码
4. **Tag 过滤**：按模块 tag 过滤日志，而非仅按级别

## 关联测试

- 测试文件路径：`tests/debug/logger.test.ts`
- 测试数量：19 个
- 覆盖场景：初始化/优先级、级别过滤（Debug/Warn/Error/None）、格式化输出、静态 API、isDebugEnabled 守卫、性能考量（过滤时零调用）、生命周期（onInit/onShutdown）

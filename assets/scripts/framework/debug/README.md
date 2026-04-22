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

| 文件            | 职责                                                       |
| --------------- | ---------------------------------------------------------- |
| `LoggerDefs.ts` | LogLevel 枚举、LogEntry 条目、ILogOutput 输出策略接口      |
| `Logger.ts`     | Logger 类实现（静态 API + ModuleBase）、ConsoleLogOutput   |

## 对外 API

```typescript
class Logger extends ModuleBase {
    // ─── 日志输出（静态 API） ────────────
    static debug(tag: string, ...args: unknown[]): void;
    static info(tag: string, ...args: unknown[]): void;
    static warn(tag: string, ...args: unknown[]): void;
    static error(tag: string, ...args: unknown[]): void;

    // ─── 级别控制 ────────────────────────
    static setLevel(level: LogLevel): void;
    static getLevel(): LogLevel;
    static get isDebugEnabled(): boolean;

    // ─── Tag 过滤 ────────────────────────
    static disableTag(tag: string): void;
    static enableTag(tag: string): void;
    static disableTags(tags: string[]): void;
    static enableAllTags(): void;
    static getDisabledTags(): string[];

    // ─── ILogOutput 输出策略 ─────────────
    static addOutput(output: ILogOutput): void;
    static removeOutput(output: ILogOutput): void;
    static getOutputs(): readonly ILogOutput[];
    static clearOutputs(): void;

    // ─── 历史缓冲（环形缓冲区） ─────────
    static getHistory(): LogEntry[];
    static clearHistory(): void;
    static setHistoryCapacity(capacity: number): void;
    static getHistoryCount(): number;

    // ─── 性能计时 ────────────────────────
    static time(label: string): void;
    static timeEnd(label: string): number;

    // ─── 实例方法（框架内部） ────────────
    setLogLevel(level: LogLevel): void;
    getLogLevel(): LogLevel;

    // ModuleBase
    readonly moduleName: string; // "Logger"
    readonly priority: number;   // 0
    onInit(): void;
    onShutdown(): void;
}
```

### ILogOutput 接口

```typescript
interface ILogOutput {
    log(entry: LogEntry): void;
}
```

### ConsoleLogOutput（默认输出策略）

```typescript
class ConsoleLogOutput implements ILogOutput {
    setColorEnabled(enabled: boolean): void;
    get colorEnabled(): boolean;
    log(entry: LogEntry): void;
}
```

默认已注册，支持浏览器环境的颜色编码输出。格式：`[HH:MM:SS.mmm][LEVEL][tag] ...args`。

### LogEntry 日志条目

```typescript
interface LogEntry {
    level: LogLevel;
    tag: string;
    timestamp: number;  // Date.now()
    args: unknown[];
    stack?: string;     // Error 级别自动附带
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

// Tag 过滤：屏蔽高频模块日志
Logger.disableTags(['GameLoop', 'Physics']);
Logger.enableTag('GameLoop'); // 恢复单个
Logger.enableAllTags();       // 全部恢复

// 自定义输出目标
class RemoteLogOutput implements ILogOutput {
    log(entry: LogEntry): void {
        fetch('/api/logs', {
            method: 'POST',
            body: JSON.stringify(entry),
        });
    }
}
Logger.addOutput(new RemoteLogOutput());

// 历史回溯（供 DebugPanel 读取）
const history = Logger.getHistory();
Logger.setHistoryCapacity(200); // 扩大缓冲
Logger.clearHistory();

// 性能计时
Logger.time('loadScene');
// ... 加载场景 ...
const ms = Logger.timeEnd('loadScene');
// [INFO][loadScene] 耗时: 123.45ms
```

## 设计决策

| 决策                      | 选择                         | 原因                                                       |
| ------------------------- | ---------------------------- | ---------------------------------------------------------- |
| priority = 0              | 基础设施最高优先级           | 其他所有模块可能在 onInit 中输出日志，Logger 必须最先就绪  |
| 混合方案而非纯静态        | Static Singleton + Lifecycle | 既保留 `Logger.info()` 的便捷调用，又纳入框架生命周期管理  |
| rest params               | `...args: unknown[]`         | 避免模板字符串 `${obj}` 在日志被过滤时仍触发 toString 求值 |
| \_levelLabels 静态常量    | `static readonly Record`     | 避免 \_log 每次调用都创建临时对象，减少 GC 压力            |
| \_consoleMethodNames 映射 | 字符串名而非引用             | 使用 `console[methodName]` 动态调用，确保 Jest mock 生效   |
| \_defaultLevel 降级       | 实例化前也能用               | `Logger._instance` 为 null 时回退到静态默认级别            |
| onShutdown 重置           | 清理实例引用 + 重置默认级别  | 保证下次初始化时是干净状态                                 |
| 环形缓冲区                | 固定容量 + head 指针         | O(1) 写入，自动淘汰最旧条目，无内存增长                   |
| GFC_DEBUG 宏裁剪          | 编译期常量守卫               | 生产环境 debug/info 零开销（代码路径完全跳过）             |
| ILogOutput 策略           | 数组多目标分发               | 可同时输出到控制台、文件、远程服务器，运行时动态增删       |

## 依赖

- 无（基础设施模块，priority=0）

## 被谁依赖

- 所有其他模块（可选依赖，用于日志输出）
- DebugManager（通过 `Logger.getHistory()` 读取日志缓冲）

## 已知限制

- 无日志持久化（文件写入需自行实现 ILogOutput）
- 无远程日志批量上报（需自行实现带批量队列的 ILogOutput）
- 环形缓冲区满后自动覆盖最旧条目，无溢出通知

## 后续拓展方向

1. **批量远程上报**：实现带队列、重试的 RemoteLogOutput
2. **文件日志**：Node.js 环境下的 FileLogOutput
3. **日志搜索**：按 tag/level/时间范围检索历史

## 关联测试

- 测试文件路径：`tests/debug/logger.test.ts`
- 覆盖场景：初始化/优先级、级别过滤（Debug/Warn/Error/None）、格式化输出、静态 API、isDebugEnabled 守卫、Tag 过滤、ILogOutput 多目标输出、历史缓冲（环形缓冲区）、性能计时（time/timeEnd）、GFC_DEBUG 条件编译、ConsoleLogOutput 颜色、生命周期（onInit/onShutdown）

---

# DebugPanel（调试面板 / 运行时可观测性）

## 职责

运行时采集并展示游戏框架内部状态（模块注册情况、事件绑定统计等），为开发者提供可观测性支持。**不负责**日志输出（Logger 模块）、性能 Profiler（独立工具）、可视化 UI 渲染（由 Runtime 层桥接）。

## 核心概念

### DataSource 插件化采集

DebugPanel 采用 **DataSource 插件模式**：

- **IDebugDataSource 接口**：所有数据源实现 `collect()` 方法，返回统一的 `DebugSectionData` 结构
- **DebugManager 管理器**：负责 DataSource 的注册/注销、定时采集、格式化输出
- **容错隔离**：每个 DataSource 的 `collect()` 独立 try-catch，单个异常不中断其他采集

### 采集频率分层

通过 `collectPriority` 控制不同数据源的采集频率：

| 优先级   | 行为                       | 适用场景           |
| -------- | -------------------------- | ------------------ |
| `high`   | 每次 collectAll 都采集     | 关键指标（FPS 等） |
| `normal` | 按 collectInterval 采集    | 常规状态信息       |
| `low`    | 每 5 次 collectAll 采集 1 次 | 低频变化的数据     |

### 快照缓存

`getLastSnapshot()` 返回上次采集的缓存快照，不触发新采集，适用于 UI 层按需读取。

## 文件清单

| 文件                            | 职责                                         |
| ------------------------------- | -------------------------------------------- |
| `DebugDefs.ts`                  | 类型定义（DebugEntry / DebugSectionData / DebugSnapshot / IDebugDataSource / DebugManagerConfig） |
| `DebugManager.ts`               | 调试管理器（DataSource 注册/注销、定时采集、格式化输出） |
| `datasources/ModuleDataSource.ts` | 模块状态数据源（采集已注册模块及 priority）   |
| `datasources/EventDataSource.ts`  | 事件统计数据源（采集事件类型数及监听器数量）   |

## 对外 API

```typescript
class DebugManager extends ModuleBase {
    // 模块信息
    readonly moduleName: string;  // "DebugManager"
    readonly priority: number;    // 400

    // 生命周期
    onInit(): void;
    onUpdate(deltaTime: number): void;
    onShutdown(): void;

    // 配置
    setConfig(config: Partial<DebugManagerConfig>): void;

    // DataSource 管理
    registerDataSource(source: IDebugDataSource): void;
    unregisterDataSource(name: string): boolean;
    getDataSource(name: string): IDebugDataSource | undefined;

    // 数据采集
    collectAll(): DebugSnapshot;
    getLastSnapshot(): DebugSnapshot | null;
    getSnapshot(): string;  // 格式化字符串输出
}
```

### IDebugDataSource 接口

```typescript
interface IDebugDataSource {
    readonly name: string;
    readonly collectPriority?: 'high' | 'normal' | 'low';
    collect(): DebugSectionData;
}
```

### DebugManagerConfig 配置

```typescript
interface DebugManagerConfig {
    collectInterval: number;  // 自动采集间隔（秒），默认 1
    autoCollect: boolean;     // 是否自动采集，默认 true
}
```

## 已有 DataSource

### ModuleDataSource

采集 `GameModule.getRegisteredModules()` 返回的所有模块信息：

- 模块数量
- 各模块名称及 priority

### EventDataSource

采集 `EventManager.getEventStats()` 返回的事件系统统计：

- 事件类型数
- 总监听器数
- 各事件的监听器数量

## 自定义 DataSource 示例

```typescript
import { IDebugDataSource, DebugSectionData } from '@framework/debug/DebugDefs';

class FpsDataSource implements IDebugDataSource {
    readonly name = 'FPS';
    readonly collectPriority = 'high' as const;

    private _frameCount = 0;
    private _elapsed = 0;
    private _fps = 0;

    tick(dt: number): void {
        this._frameCount++;
        this._elapsed += dt;
        if (this._elapsed >= 1) {
            this._fps = this._frameCount / this._elapsed;
            this._frameCount = 0;
            this._elapsed = 0;
        }
    }

    collect(): DebugSectionData {
        return {
            title: 'Performance',
            entries: [{ label: 'FPS', value: Math.round(this._fps) }],
        };
    }
}

// 注册
debugManager.registerDataSource(new FpsDataSource());
```

## 使用示例

```typescript
// 获取 DebugManager
const debugMgr = GameModule.getModule<DebugManager>('DebugManager');

// 注册数据源
debugMgr.registerDataSource(new ModuleDataSource());
debugMgr.registerDataSource(new EventDataSource());

// 手动采集
const snapshot = debugMgr.collectAll();

// 获取格式化输出
const text = debugMgr.getSnapshot();
// === Debug Snapshot [12:34:56.789] ===
// [Modules]
//   模块数量: 5
// [Events]
//   事件类型数: 3
//   总监听器数: 12
// ===================================

// 获取上次缓存快照（不触发新采集）
const cached = debugMgr.getLastSnapshot();

// 修改配置
debugMgr.setConfig({ collectInterval: 2, autoCollect: false });

// 注销数据源
debugMgr.unregisterDataSource('Modules');
```

## 设计决策

| 决策                  | 选择                          | 原因                                                         |
| --------------------- | ----------------------------- | ------------------------------------------------------------ |
| priority = 400        | 调试工具层                    | 确保在所有业务模块之后初始化，能采集到完整的模块状态         |
| DataSource 插件模式   | IDebugDataSource 接口         | 可扩展性强，新增数据源无需修改 DebugManager                   |
| collectAll 容错       | try-catch 每个 DataSource     | 单个数据源异常不中断全局采集                                   |
| 快照缓存              | getLastSnapshot()             | 避免 UI 层频繁触发采集，减少性能开销                           |
| 分层采集频率          | high / normal / low           | 不同数据源变化频率不同，避免低频数据的无效采集                 |
| autoCollect 开关      | DebugManagerConfig.autoCollect | 支持按需模式，生产环境可关闭自动采集                           |

## 依赖

- Logger（日志输出）
- GameModule（ModuleDataSource 依赖 getRegisteredModules）
- EventManager（EventDataSource 依赖 getEventStats）

## 被谁依赖

- 无（顶层调试工具）

## 已知限制

- 无可视化 UI 渲染（需 Runtime 层桥接 CocosCreator UI 组件）
- 无网络远程调试支持
- 无历史快照回溯（仅缓存最近一次快照）

## 关联测试

- 测试文件路径：`tests/debug/debug-manager.test.ts`
- 测试数量：69+ 个
- 覆盖场景：DataSource 注册/注销/重复注册、collectAll 采集与容错、分层采集频率、autoCollect 开关、快照缓存、格式化输出、onUpdate 节流、setConfig 运行时配置修改

# Timer（定时器管理）

## 职责

管理所有游戏内定时器的创建、更新、暂停/恢复和销毁，支持单次触发、有限重复、无限重复、时间缩放和标签分组批量操作。
**不负责**帧驱动（由 `GameEntry` 的主循环调用 `onUpdate`），也不提供协程或 Promise 式延迟能力。

## 对外 API

```typescript
// === TimerManager（定时器管理器，priority = 10） ===

// 属性
TimerManager.timeScale: number        // 全局时间缩放（getter/setter）
TimerManager.activeCount: number      // 活跃定时器数量（getter）

// 创建 & 移除
TimerManager.addTimer(delay, callback, options?): number   // 添加定时器，返回 ID
TimerManager.removeTimer(id: number): boolean              // 移除定时器
TimerManager.removeAllTimers(): void                       // 移除所有
TimerManager.removeTimersByTag(tag: string): number        // 按标签移除

// 暂停 & 恢复
TimerManager.pauseTimer(id: number): boolean               // 暂停
TimerManager.resumeTimer(id: number): boolean              // 恢复
TimerManager.pauseAllTimers(): void                        // 暂停所有
TimerManager.resumeAllTimers(): void                       // 恢复所有
TimerManager.pauseTimersByTag(tag: string): number         // 按标签暂停
TimerManager.resumeTimersByTag(tag: string): number        // 按标签恢复

// 查询
TimerManager.getTimerInfo(id: number): ITimerInfo | null   // 获取定时器信息
TimerManager.hasTimer(id: number): boolean                 // 是否存在

// === ITimerOptions（定时器配置） ===
interface ITimerOptions {
    repeat?: number;        // 重复次数：0=一次 | N=重复N次 | -1=无限
    initialDelay?: number;  // 首次触发延迟（默认等于 delay）
    useTimeScale?: boolean; // 是否受时间缩放影响（默认 true）
    tag?: string;           // 可选标签（用于批量操作）
}

// === ITimerInfo（只读外部视图） ===
interface ITimerInfo { id; delay; elapsed; repeat; paused; tag; }
```

## 设计决策

| 决策         | 选择                                   | 原因                                               |
| ------------ | -------------------------------------- | -------------------------------------------------- |
| 遍历安全     | 标记删除 + 延迟清理                    | 回调中调用 removeTimer 不破坏当前帧遍历            |
| 查找性能     | `Map<id, entry>` 哈希索引              | removeTimer / pauseTimer 等操作 O(1)               |
| 时间精度     | 保留溢出量 `elapsed -= currentDelay`   | 防止误差累积，保证长期运行精度                     |
| initialDelay | 首次触发可独立配置                     | 支持"立即触发一次 + 后续按间隔重复"模式（设为 0）  |
| 时间缩放     | 全局 `timeScale` + 单个 `useTimeScale` | 慢动作/加速场景，UI 动画可豁免缩放                 |
| 标签分组     | `tag` 字段 + 批量操作 API              | 按场景批量暂停/恢复/移除（如 'combat'、'ui-anim'） |
| 清理策略     | swap-and-pop 单遍扫描                  | 延迟清理时 O(n) 紧凑数组，避免频繁 splice          |

## 依赖

- **Core**（`ModuleBase`）— TimerManager 继承 ModuleBase
- **Logger** — 日志输出

## 被谁依赖

- Game 层业务逻辑（倒计时、周期任务、延迟触发等）
- 业务层通过 `ITimerManager` 接口使用

## 已知限制

- 不支持协程式等待（`await delay(3)`），仅回调模式
- 定时器 ID 为简单自增数字，不支持持久化或跨 session 恢复
- `timeScale` 为负数时被拦截（不支持时间倒流）
- 本帧新添加的定时器不参与当帧遍历，下一帧才开始计时

## 关联测试

- `tests/timer/`

## 状态

✅ 已完成 — 核心功能就绪，通过全部单元测试

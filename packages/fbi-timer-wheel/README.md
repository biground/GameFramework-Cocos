# @fbi/timer-wheel

> Framework Blaze Ignite 的时间轮定时器插件：O(1) 添加/触发，适合海量定时器（千级以上）的高吞吐场景。可替换默认 TimerManager。

## 安装

`@fbi/timer-wheel` 是 Framework Blaze Ignite 的独立插件包，位于 `packages/fbi-timer-wheel/`。

```jsonc
// package.json
{
    "peerDependencies": {
        "@fbi/core": ">=0.1.0"
    }
}
```

在项目中直接引用：

```typescript
import { WheelTimerManager } from '@fbi/timer-wheel';
```

## 原理

基于**哈希时间轮**（Hashed Timing Wheel）算法，将时间切分为 `wheelSize` 个等距 slot，每个 slot 的粒度为 `tickInterval` 秒。

```
时间轮（wheelSize=8, tickInterval=0.1s）

    slot 0 → [timer A]
    slot 1 → []
    slot 2 → [timer B, timer C]
    slot 3 → []          ← currentSlot
    slot 4 → [timer D]
    slot 5 → []
    slot 6 → []
    slot 7 → [timer E]

    一圈范围 = 8 × 0.1s = 0.8s
    超出范围的定时器用 remainingRounds 记录需要转几圈
```

- **添加 O(1)**：根据 `delay` 直接计算目标 slot 索引，push 到 slot 数组
- **每帧只扫当前 slot**：指针前进到 `currentSlot`，遍历该 slot 的定时器——O(k/N)
- **超范围支持**：delay 超过一圈范围时，用 `remainingRounds` 记录圈数，每转一圈递减

### 精度特性

时间轮的精度由 `tickInterval` 决定。例如 `tickInterval=0.1` 时，所有定时器的实际触发时间会被量化到 0.1 秒的整数倍。如果需要毫秒级精度，应选择 `fbi-timer-heap`。

## 快速开始

### 注册为默认 TimerManager

```typescript
import { GameModule } from '@framework/core/GameModule';
import { WheelTimerManager } from '@fbi/timer-wheel';

// 自定义时间轮参数
GameModule.register('TimerManager',
    new WheelTimerManager({ tickInterval: 0.1, wheelSize: 256 }),
    { allowReplace: true }
);
```

### 构造参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `tickInterval` | `number` | `0.1` | 每个 slot 的时间粒度（秒），必须 > 0 |
| `wheelSize` | `number` | `256` | 格子数量，必须为正整数。范围 = tickInterval × wheelSize |

**参数调优：**
- `wheelSize` 越大，hash 冲突越少，但内存占用越大
- `tickInterval` 越小，精度越高，但每秒需要处理更多 tick
- 默认配置（0.1s × 256）= 25.6 秒范围，适合大多数游戏场景

### 基本使用

```typescript
const timerMgr = GameModule.getModule<ITimerManager>('TimerManager');

// 一次性定时器（2 秒后触发）
const id1 = timerMgr.addTimer(2.0, () => {
    console.log('2 秒到！');
});

// 重复定时器（每 0.5 秒触发，共 10 次）
const id2 = timerMgr.addTimer(0.5, () => {
    console.log('tick');
}, { repeat: 10 });

// 无限重复（repeat: -1）
const id3 = timerMgr.addTimer(1.0, () => {
    console.log('每秒心跳');
}, { repeat: -1 });

// 带标签（用于批量操作）
const id4 = timerMgr.addTimer(1.0, callback, {
    repeat: -1,
    tag: 'combat',
});
```

### 暂停 & 恢复

```typescript
// 暂停单个
timerMgr.pauseTimer(id1);
timerMgr.resumeTimer(id1);

// 按标签批量操作
timerMgr.pauseTimersByTag('combat');
timerMgr.resumeTimersByTag('combat');

// 全部暂停/恢复
timerMgr.pauseAllTimers();
timerMgr.resumeAllTimers();
```

### 时间缩放

```typescript
// 全局时间缩放
timerMgr.timeScale = 2.0; // 2 倍速
timerMgr.timeScale = 0.5; // 半速

// 不受时间缩放影响的定时器
timerMgr.addTimer(1.0, callback, { useTimeScale: false });
```

## API

### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `timeScale` | `number` | 全局时间缩放倍率（≥ 0），默认 1.0 |
| `activeCount` | `number` | 当前活跃定时器数量（含暂停中的） |

### 方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `addTimer(delay, callback, options?)` | `number` | 添加定时器，返回唯一 ID |
| `removeTimer(id)` | `boolean` | 移除指定定时器 |
| `removeAllTimers()` | `void` | 移除所有定时器 |
| `removeTimersByTag(tag)` | `number` | 按标签批量移除，返回移除数量 |
| `pauseTimer(id)` | `boolean` | 暂停指定定时器 |
| `resumeTimer(id)` | `boolean` | 恢复指定定时器 |
| `pauseAllTimers()` | `void` | 暂停所有定时器 |
| `resumeAllTimers()` | `void` | 恢复所有定时器 |
| `pauseTimersByTag(tag)` | `number` | 按标签批量暂停 |
| `resumeTimersByTag(tag)` | `number` | 按标签批量恢复 |
| `getTimerInfo(id)` | `ITimerInfo \| null` | 查询定时器状态 |
| `hasTimer(id)` | `boolean` | 检查定时器是否存在 |

### ITimerOptions

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `repeat` | `number` | `0` | 重复次数（0 = 一次性，-1 = 无限） |
| `initialDelay` | `number` | `delay` | 首次触发延迟 |
| `useTimeScale` | `boolean` | `true` | 是否受全局时间缩放影响 |
| `tag` | `string` | - | 可选标签，用于批量操作 |

## 内部结构

### Slot 遍历与标记删除

遍历当前 slot 时使用**快照长度**（遍历中新添加的不在本轮处理）。删除采用 `removed` 标记延迟删除，遍历结束后统一清理，避免数组索引错乱。

### 浮点修正

- `_rawAccumulator / tickInterval` 计算目标 tick 数时加 `+1e-10` epsilon 修正（`0.3 / 0.1 = 2.999...` → 应为 3）
- `_calcSlot` 中 `delay / tickInterval` 使用 `-1e-10` epsilon 修正 ceil 向上取整的浮点误差

### 暂停机制

暂停时计算 `remainingTime = (remainingRounds × wheelSize + slotsAhead) × tickInterval`，存入 `_pausedMap`。恢复时重新计算 slot 和 rounds，创建新 entry 放入时间轮。

## 与 fbi-timer-heap 对比

| 特性 | fbi-timer-wheel（时间轮） | fbi-timer-heap（最小堆） |
|------|--------------------------|-------------------------|
| 添加定时器 | **O(1)** | O(log n) |
| 无触发帧开销 | O(1)（空 slot 跳过） | **O(1)**（peek 堆顶） |
| 触发开销 | **O(k)**（k = 当前 slot 到期数） | O(log n)（pop + re-push） |
| 移除定时器 | **O(1)**（标记删除） | O(log n) |
| 时间精度 | 受 tickInterval 粒度限制 | **精确**（绝对到期时间） |
| 内存占用 | 较大（wheelSize 个 slot 数组） | 较小（紧凑堆数组） |
| 适用规模 | **海量**（千级以上） | 中等（百级） |
| 适用场景 | 高吞吐、精度要求不高 | 精确调度、中等数量 |

**选型建议：**
- 定时器数量 > 1000 且可接受 tickInterval 级别精度 → `fbi-timer-wheel`
- 定时器数量 < 500 且需要高精度 → `fbi-timer-heap`

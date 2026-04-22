# @fbi/timer-heap

> Framework Blaze Ignite 的最小堆定时器插件：O(1) 无触发帧 + O(log n) 触发/添加。可替换默认 TimerManager，适合定时器数量中等（百级）且需要精确调度的场景。

## 安装

`@fbi/timer-heap` 是 Framework Blaze Ignite 的独立插件包，位于 `packages/fbi-timer-heap/`。

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
import { HeapTimerManager } from '@fbi/timer-heap';
```

## 原理

基于**最小堆**（Min-Heap）数据结构，所有活跃定时器按**绝对到期时间**（`expireTime`）排序。

```
              [0.5s]
             /      \
         [1.2s]    [2.0s]
         /    \
     [3.0s]  [1.5s]
```

- **无触发帧**：`peek` 堆顶，如果 `expireTime > currentTime` 就直接跳过——O(1)
- **触发帧**：弹出到期的堆顶，执行回调，重复定时器重算 `expireTime` 后重新入堆——O(log n)
- **添加/移除**：通过 `heapIndex` 反向索引实现 O(1) 定位 + O(log n) 堆调整

与默认数组实现的关键区别：
- 使用绝对到期时间 `expireTime`，而非每帧累加 `elapsed`
- `pause` 时从堆中取出保存剩余时间，`resume` 时重算 `expireTime` 入堆

## 快速开始

### 注册为默认 TimerManager

```typescript
import { GameModule } from '@framework/core/GameModule';
import { HeapTimerManager } from '@fbi/timer-heap';

// allowReplace: true 替换默认的数组实现
GameModule.register('TimerManager', new HeapTimerManager(), { allowReplace: true });
```

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

// 自定义首次延迟（3 秒后首次触发，之后每 1 秒触发）
const id4 = timerMgr.addTimer(1.0, () => {
    console.log('延迟启动');
}, { repeat: -1, initialDelay: 3.0 });
```

### 暂停 & 恢复

```typescript
// 暂停单个
timerMgr.pauseTimer(id1);
timerMgr.resumeTimer(id1);

// 按标签批量操作
timerMgr.addTimer(1.0, callback, { repeat: -1, tag: 'combat' });
timerMgr.pauseTimersByTag('combat');
timerMgr.resumeTimersByTag('combat');

// 全部暂停/恢复
timerMgr.pauseAllTimers();
timerMgr.resumeAllTimers();
```

### 时间缩放

```typescript
// 全局时间缩放（影响所有 useTimeScale=true 的定时器）
timerMgr.timeScale = 2.0; // 2 倍速
timerMgr.timeScale = 0.5; // 半速

// 不受时间缩放影响的定时器（如 UI 倒计时）
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

### MinHeap

独立的最小堆实现，按 `expireTime` 排序：

- 数组存储：父节点 `i` → 左子 `2i+1`，右子 `2i+2`
- 每个 entry 维护 `heapIndex` 反向索引，实现 O(1) 定位
- 支持 `push`、`pop`、`peek`、`removeAt`、`clear`

### 暂停机制

暂停时从堆中取出 entry，计算 `remainingTime = expireTime - currentTime`，存入 `_pausedMap`。恢复时重算 `expireTime = currentTime + remainingTime` 后重新入堆。

## 与 fbi-timer-wheel 对比

| 特性 | fbi-timer-heap（最小堆） | fbi-timer-wheel（时间轮） |
|------|-------------------------|--------------------------|
| 添加定时器 | O(log n) | **O(1)** |
| 无触发帧开销 | **O(1)**（peek 堆顶） | O(1)（空 slot 跳过） |
| 触发开销 | O(log n)（pop + re-push） | **O(k)**（k = 当前 slot 到期数） |
| 移除定时器 | O(log n) | O(1)（标记删除） |
| 时间精度 | **精确**（绝对到期时间） | 受 tickInterval 粒度限制 |
| 内存占用 | 较小（紧凑堆数组） | 较大（wheelSize 个 slot 数组） |
| 适用规模 | 中等（百级） | **海量**（千级以上） |
| 适用场景 | 精确调度、中等数量 | 高吞吐、精度要求不高 |

**选型建议：**
- 定时器数量 < 500 且需要高精度 → `fbi-timer-heap`
- 定时器数量 > 1000 且可接受 tickInterval 级别精度 → `fbi-timer-wheel`

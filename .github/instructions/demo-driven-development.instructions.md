---
description: 'Demo 驱动开发规范。当开发 Demo 项目时加载，确保严格使用框架架构，禁止胶水代码，发现框架缺口时提出优化方向。'
---

# Demo 驱动开发规范

> 本指令与 `game-layer.instructions.md` 同范围但不重叠：
> game-layer 管**编码规范**，本文件管**架构遵循与反馈机制**。

---

## 一、核心原则

- Demo 开发的**终极目标**：通过实际使用来验证和提升框架的可用性
- 每个 Demo 必须是框架能力的「试金石」，不是独立的小项目
- 框架的价值由 Demo 的实际使用体验来证明——如果写 Demo 时不得不绕过框架，说明框架需要改进

---

## 二、框架优先铁律

**所有功能必须通过框架模块实现**，对应关系如下：

| 需求场景 | 必须使用的框架模块 | 禁止的做法 |
| --- | --- | --- |
| 状态管理 | `FsmManager` | 手写 switch/if-else 状态机 |
| 流程控制 | `ProcedureManager` | 手写流程链（if/switch 切换阶段） |
| 事件通信 | `EventManager` | 直接回调、手写观察者/EventEmitter |
| 对象复用 | `ObjectPool` | 频繁 new/destroy 不入池 |
| 定时任务 | `TimerManager` | 裸 `setTimeout` / `setInterval` |
| 实体管理 | `EntityManager` | 纯对象数组管理游戏实体 |
| UI 管理 | `UIManager` | 直接 DOM 操作管理 UI 层级 |
| 资源加载 | `ResourceManager` | 绕过引用计数直接加载 |
| 数据配置 | `DataTableManager` | 硬编码配置数据在 TypeScript 中 |
| 音频播放 | `AudioManager` | 直接调用引擎音频 API |
| 场景切换 | `SceneManager` | 手动管理场景生命周期 |
| 网络通信 | `NetworkManager` | 裸 WebSocket / fetch |
| 多语言 | `LocalizationManager` | 硬编码多语言字符串 |
| 热更新 | `HotUpdateManager` | 手写版本检查逻辑 |
| 调试信息 | `DebugManager` | 自行实现调试面板 |
| 日志输出 | `Logger` | `console.log/warn/error/info/debug` |
| 依赖注入 | `Container` | 手动管理依赖（推荐使用 `bootstrapWithDI`） |

**唯一例外**：当框架确实不提供该能力时，按「第三节 胶水代码处理流程」执行。

---

## 三、胶水代码检测与处理（核心！）

### 3.1 定义

**胶水代码**：为了让 Demo 功能正常运行，但不通过框架模块而是自行实现的代码。

### 3.2 胶水代码特征清单（检测 checklist）

在编写或 Review Demo 代码时，逐项检查以下特征：

- [ ] 自行实现了状态机（手写 `switch` + `currentState` 变量）
- [ ] 自行实现了事件系统（callback 数组、EventEmitter 仿写）
- [ ] 自行实现了对象池（空闲数组 + 手动回收）
- [ ] 自行实现了定时器（裸 `setTimeout` / `setInterval`，DemoBase 主循环除外）
- [ ] 自行实现了存档系统（直接 `JSON.stringify` 到 `localStorage`）
- [ ] 自行实现了配置加载（`import` JSON 文件 / 硬编码配置对象）
- [ ] 用纯 JS 对象数组管理游戏实体而不用 `EntityManager`
- [ ] 直接操作 DOM 管理 UI 层级而不用 `UIManager`
- [ ] 手写流程链（if/switch 切换阶段而不用 `Procedure`）
- [ ] 在 Procedure 间传递数据时绕过 `context` 机制
- [ ] 跨模块直接引用实现类而不走 `EventManager` 通信

### 3.3 发现胶水代码后的处理流程（强制执行）

```
发现胶水代码
    │
    ├─ 1. 停止当前实现（不要继续写胶水代码）
    │
    ├─ 2. 分析原因
    │       │
    │       ├─ 开发者不了解框架 API → 使用正确的框架 API 重写
    │       │
    │       └─ 框架缺少该能力 → 进入步骤 3
    │
    └─ 3. 框架缺口处理
            │
            ├─ a. 在实现文件顶部写注释标记：
            │     // FRAMEWORK-GAP: [GAP-ID] 简要描述
            │
            ├─ b. 在代码中注释说明：
            │     // 当前临时方案：...
            │     // 框架理想方案：...
            │
            └─ c. 在 agent 返回结果中包含 framework_gaps 字段
```

#### framework_gaps 输出格式

当 agent 返回结果的 `extra` 中应包含：

```yaml
framework_gaps:
  - id: GAP-XXX
    module: 受影响的模块名
    description: 简要描述缺口
    current_workaround: 当前临时方案的描述
    ideal_solution: 框架应提供的理想方案
    severity: critical | important | nice-to-have
    affected_demos: [demo1, demo3]
```

---

## 四、Demo 与 demo-design.md 的关系

- 实现时**必须对照**设计文档的：
  - 模块覆盖矩阵（哪些模块标记为 ◉ 深度使用）
  - Procedure 流程设计
  - FSM 状态机设计
  - DataTable 数据结构
  - EventKey 定义
- 如果发现设计文档的模块使用方案不合理，应**提出修改建议**而非偏离设计
- 偏离设计文档时必须在 agent 返回中说明原因

---

## 五、框架可用性反馈循环

Demo 开发不是单向的「消费框架」，而是双向的反馈循环：

```
Demo 需求 ──→ 尝试用框架 API 实现
                    │
                    ├─ 顺利实现 → 记录正面体验
                    │
                    └─ 遇到摩擦 → 记录 FRAMEWORK-GAP
                                      │
                                      ↓
                              框架改进（修复 GAP）
                                      │
                                      ↓
                              Demo 移除胶水代码，改用框架 API
```

### 每个 Demo 完成后必须回顾

1. 哪些模块使用顺畅？
2. 哪些模块 API 有摩擦？具体场景是什么？
3. 产生了哪些 `FRAMEWORK-GAP`？
4. 哪些 GAP 值得立即修复（用于后续 Demo）？

---

## 六、模块覆盖验证


- **◉（深度使用）** 的模块必须充分利用其核心 API，不能浅尝辄止
- 每个 Demo 至少有 **3 个 ◉ 模块**
- Demo 完成后验证：该 Demo 标记为 ◉ 的模块是否真正深度使用
- 如果某个 ◉ 模块在实际实现中只是浅层调用，必须分析原因：
  - 设计文档高估了该模块的使用深度？→ 建议修改设计
  - 实现偷懒用了胶水代码？→ 按第三节处理

---

## 七、已知框架缺口（持续更新）

以下是已识别的框架缺口，开发 Demo 时遇到相关场景应特别关注：

### Important 级别

| ID | 描述 | 影响 |
| --- | --- | --- |
| IMP-001 | EntityManager 未在 RPG Demo 中使用，角色用纯 CharacterState 对象管理 | Demo2 架构不符合框架规范 |
| IMP-002 | 没有框架级 SaveManager，Demo1 自行实现存档 | 存档逻辑散落在业务层 |
| IMP-003 | DemoBase bootstrap boilerplate 仍然冗长 | 每个 Demo 重复大量注册代码 |
| IMP-004 | Procedure context 类型安全不足，字符串键取回 unknown | 编译期无法检测类型错误 |
| IMP-005 | UIManager 不支持 async 加载 | 资源加载场景受限 |
| IMP-006 | 配置数据硬编码在 TypeScript 中，DataTable + Resource 联合加载未验证 | 数据驱动能力未充分验证 |

### Nice-to-Have 级别

| ID | 描述 |
| --- | --- |
| NTH-001 | ObjectPool 缺少 warmUp / preAllocate 预热 API |
| NTH-002 | EventManager 缺少 once 便捷方法的返回值（用于取消注册） |
| NTH-003 | FsmManager 缺少状态转换历史记录（调试用） |
| NTH-004 | TimerManager 缺少 pause/resume 单个定时器的能力 |
| NTH-005 | ProcedureManager 缺少并行 Procedure 支持 |
| NTH-006 | NetworkManager 缺少重连策略配置 |
| NTH-007 | DataTableManager 缺少运行时热重载能力 |

> 新发现的缺口应追加到本列表，并通过 `FRAMEWORK-GAP` 注释和 `framework_gaps` 输出报告。
